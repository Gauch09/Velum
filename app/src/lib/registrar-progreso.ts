/**
 * Fuente única de verdad para la lógica de registro de progreso de producción.
 * Movido tal cual desde app/api/ordenes/[id]/progreso/route.ts (refactor Task 5).
 * No modificar aquí sin replicar el cambio en todos los consumidores.
 */
import { evaluarCascada } from '@/lib/cascada'
import type { EtapaProgreso } from '@/lib/cascada'
import { createId } from '@paralleldrive/cuid2'

export interface RegistrarProgresoInput {
  ordenId: string
  ejecucionEtapaId: string
  usuarioId: string
  cantidadRegistrada: number
  notas?: string | null
  fueOverride?: boolean
  motivoOverride?: string | null
}

export type RegistrarProgresoResult =
  | { ok: true; porcentajeGlobal: number; etapasActivadas: string[]; ordenCompleta: boolean }
  | { ok: false; error: string; status: number }

export async function registrarProgreso(
  supabase: any,
  broadcastClient: any,
  input: RegistrarProgresoInput
): Promise<RegistrarProgresoResult> {
  const { ordenId, ejecucionEtapaId, usuarioId, cantidadRegistrada, notas, fueOverride, motivoOverride } = input

  // Load order
  const { data: orden, error: ordenError } = await supabase
    .from('OrdenProduccion')
    .select('id, cantidad')
    .eq('id', ordenId)
    .single()

  if (ordenError || !orden) return { ok: false, error: 'Orden no encontrada', status: 404 }

  // Load all executions for this order
  const { data: ejecuciones, error: ejError } = await supabase
    .from('EjecucionEtapa')
    .select('id, ordenId, etapaRutaId, maquinaId, operarioId, porcentajeActual, estado, etapaRuta:EtapaRuta ( ordenSecuencia, umbralActivacion )')
    .eq('ordenId', ordenId)
    .order('etapaRuta(ordenSecuencia)', { ascending: true })

  if (ejError || !ejecuciones) return { ok: false, error: 'Error cargando ejecuciones', status: 500 }

  const ejecucionActual = ejecuciones.find((e: any) => e.id === ejecucionEtapaId)
  if (!ejecucionActual) return { ok: false, error: 'Ejecución no encontrada', status: 404 }

  // Validate operario assignment — if assigned, only that operario can register
  if (ejecucionActual.operarioId && ejecucionActual.operarioId !== usuarioId) {
    return { ok: false, error: 'No estás asignado a esta etapa', status: 403 }
  }

  // Calculate new percentage
  const cantidadAnterior = (ejecucionActual.porcentajeActual / 100) * orden.cantidad
  const nuevaCantidadTotal = cantidadAnterior + cantidadRegistrada
  const nuevoPorcentaje = Math.min((nuevaCantidadTotal / orden.cantidad) * 100, 100)

  // Build cascade input
  const etapasProgreso: EtapaProgreso[] = ejecuciones.map((e: any) => ({
    id:               e.id,
    ordenSecuencia:   e.etapaRuta.ordenSecuencia,
    umbralActivacion: e.etapaRuta.umbralActivacion,
    porcentajeActual: e.porcentajeActual,
    estado:           e.estado as EtapaProgreso['estado'],
    etapaRutaId:      e.etapaRutaId,
    maquinaId:        e.maquinaId,
  }))

  const { etapasAActivar, porcentajeGlobal } = evaluarCascada(
    etapasProgreso,
    ejecucionEtapaId,
    nuevoPorcentaje
  )

  // Write immutable progress log
  const { error: logError } = await supabase.from('RegistroProgreso').insert({
    id: createId(),
    ejecucionEtapaId,
    usuarioId,
    cantidadRegistrada,
    porcentajeRegistrado: nuevoPorcentaje,
    notas: notas ?? null,
    fueOverride: fueOverride ?? false,
    motivoOverride: motivoOverride ?? null,
  })

  if (logError) return { ok: false, error: logError.message, status: 500 }

  // Update current execution
  const { error: updateEjError } = await supabase
    .from('EjecucionEtapa')
    .update({
      porcentajeActual: nuevoPorcentaje,
      estado: nuevoPorcentaje >= 100 ? 'COMPLETADA' : 'ACTIVA',
      fechaFin: nuevoPorcentaje >= 100 ? new Date().toISOString() : null,
      ultimoProgresoEn: new Date().toISOString(),
    })
    .eq('id', ejecucionEtapaId)

  if (updateEjError) return { ok: false, error: updateEjError.message, status: 500 }

  // Activate cascaded stages (etapasAActivar contains etapaRutaId values)
  if (etapasAActivar.length > 0) {
    const { error: cascadeError } = await supabase
      .from('EjecucionEtapa')
      .update({ estado: 'ACTIVA', fechaInicio: new Date().toISOString() })
      .eq('ordenId', ordenId)
      .in('etapaRutaId', etapasAActivar)

    if (cascadeError) return { ok: false, error: cascadeError.message, status: 500 }
  }

  // Update global percentage on order — auto-close when all stages complete
  const ordenCompleta = porcentajeGlobal >= 100
  const { error: ordenUpdateError } = await supabase
    .from('OrdenProduccion')
    .update({
      porcentajeGlobal,
      ...(ordenCompleta ? { estado: 'COMPLETADA' } : {}),
    })
    .eq('id', ordenId)

  if (ordenUpdateError) return { ok: false, error: ordenUpdateError.message, status: 500 }

  // Auto-close proyecto if all its orders are now COMPLETADA
  if (ordenCompleta) {
    const { data: ordenCerrada } = await supabase
      .from('OrdenProduccion')
      .select('proyectoId')
      .eq('id', ordenId)
      .single()

    if (ordenCerrada?.proyectoId) {
      const { count: pendientes } = await supabase
        .from('OrdenProduccion')
        .select('id', { count: 'exact', head: true })
        .eq('proyectoId', ordenCerrada.proyectoId)
        .neq('estado', 'COMPLETADA')
        .neq('estado', 'CANCELADA')

      if ((pendientes ?? 0) === 0) {
        await supabase
          .from('Proyecto')
          .update({ estado: 'COMPLETADO' })
          .eq('id', ordenCerrada.proyectoId)
      }
    }
  }

  // Broadcast via Supabase Realtime
  await broadcastClient.channel('ordenes').send({
    type: 'broadcast',
    event: 'progreso',
    payload: { ordenId, porcentajeGlobal, etapasActivadas: etapasAActivar, completada: ordenCompleta },
  })

  return { ok: true, porcentajeGlobal, etapasActivadas: etapasAActivar, ordenCompleta }
}
