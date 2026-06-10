import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { evaluarCascada } from '@/lib/cascada'
import type { EtapaProgreso } from '@/lib/cascada'
import { createId } from '@paralleldrive/cuid2'
import { createClient } from '@supabase/supabase-js'

const broadcastClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json()
  const { ejecucionEtapaId, cantidadRegistrada, notas, fueOverride, motivoOverride } = body

  if (!ejecucionEtapaId || cantidadRegistrada == null) {
    return NextResponse.json(
      { error: 'ejecucionEtapaId y cantidadRegistrada son requeridos' },
      { status: 400 }
    )
  }

  // Authenticate user
  const supabaseAuth = createSupabaseServerClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const supabase = createSupabaseAdminClient() as any

  // Get user from DB
  const { data: usuario } = await supabase
    .from('Usuario')
    .select('id')
    .eq('email', user.email!)
    .single()

  if (!usuario) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })

  // Load order
  const { data: orden, error: ordenError } = await supabase
    .from('OrdenProduccion')
    .select('id, cantidad')
    .eq('id', params.id)
    .single()

  if (ordenError || !orden) return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 })

  // Load all executions for this order
  const { data: ejecuciones, error: ejError } = await supabase
    .from('EjecucionEtapa')
    .select('id, ordenId, etapaRutaId, maquinaId, operarioId, porcentajeActual, estado, etapaRuta:EtapaRuta ( ordenSecuencia, umbralActivacion )')
    .eq('ordenId', params.id)
    .order('etapaRuta(ordenSecuencia)', { ascending: true })

  if (ejError || !ejecuciones) return NextResponse.json({ error: 'Error cargando ejecuciones' }, { status: 500 })

  const ejecucionActual = ejecuciones.find((e: any) => e.id === ejecucionEtapaId)
  if (!ejecucionActual) return NextResponse.json({ error: 'Ejecución no encontrada' }, { status: 404 })

  // Validate operario assignment — if assigned, only that operario can register
  if (ejecucionActual.operarioId && ejecucionActual.operarioId !== usuario.id) {
    return NextResponse.json({ error: 'No estás asignado a esta etapa' }, { status: 403 })
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
    usuarioId: usuario.id,
    cantidadRegistrada,
    porcentajeRegistrado: nuevoPorcentaje,
    notas: notas ?? null,
    fueOverride: fueOverride ?? false,
    motivoOverride: motivoOverride ?? null,
  })

  if (logError) return NextResponse.json({ error: logError.message }, { status: 500 })

  // Update current execution
  const { error: updateEjError } = await supabase
    .from('EjecucionEtapa')
    .update({
      porcentajeActual: nuevoPorcentaje,
      estado: nuevoPorcentaje >= 100 ? 'COMPLETADA' : 'ACTIVA',
      fechaFin: nuevoPorcentaje >= 100 ? new Date().toISOString() : null,
    })
    .eq('id', ejecucionEtapaId)

  if (updateEjError) return NextResponse.json({ error: updateEjError.message }, { status: 500 })

  // Activate cascaded stages (etapasAActivar contains etapaRutaId values)
  if (etapasAActivar.length > 0) {
    const { error: cascadeError } = await supabase
      .from('EjecucionEtapa')
      .update({ estado: 'ACTIVA', fechaInicio: new Date().toISOString() })
      .eq('ordenId', params.id)
      .in('etapaRutaId', etapasAActivar)

    if (cascadeError) return NextResponse.json({ error: cascadeError.message }, { status: 500 })
  }

  // Update global percentage on order
  const { error: ordenUpdateError } = await supabase
    .from('OrdenProduccion')
    .update({ porcentajeGlobal })
    .eq('id', params.id)

  if (ordenUpdateError) return NextResponse.json({ error: ordenUpdateError.message }, { status: 500 })

  // Broadcast via Supabase Realtime
  await broadcastClient.channel('ordenes').send({
    type: 'broadcast',
    event: 'progreso',
    payload: { ordenId: params.id, porcentajeGlobal, etapasActivadas: etapasAActivar },
  })

  return NextResponse.json({ porcentajeGlobal, etapasActivadas: etapasAActivar })
}
