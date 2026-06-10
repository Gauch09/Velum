import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import ProyectoCard from '@/components/gerencia/ProyectoCard'
import MaquinaEstado from '@/components/gerencia/MaquinaEstado'
import GerenciaRealtimeListener from '@/components/gerencia/GerenciaRealtimeListener'
import GerenciaReloj from '@/components/gerencia/GerenciaReloj'
import AlertasBanner from '@/components/shared/AlertasBanner'
import { calcularAlertas } from '@/lib/alertas'
import type { EjecucionParaAlerta } from '@/lib/alertas'

export const dynamic = 'force-dynamic'

type Proyecto = {
  id: string
  nombre: string
  fechaEntrega: string
}

type Maquina = {
  id: string
  nombre: string
  estadoActual: 'OPERATIVA' | 'MANTENIMIENTO' | 'FUERA_DE_SERVICIO'
}

function calcularProgresoMap(ordenes: { proyectoId: string | null; porcentajeGlobal: number }[]): Map<string, number> {
  const groups = new Map<string, number[]>()
  for (const orden of ordenes) {
    if (!orden.proyectoId) continue
    const arr = groups.get(orden.proyectoId) ?? []
    arr.push(orden.porcentajeGlobal)
    groups.set(orden.proyectoId, arr)
  }
  const result = new Map<string, number>()
  for (const [id, valores] of Array.from(groups.entries())) {
    result.set(id, valores.reduce((a, b) => a + b, 0) / valores.length)
  }
  return result
}

export default async function GerenciaPage() {
  const supabase = createSupabaseAdminClient() as any

  const [{ data: proyectos }, { data: ordenes }, { data: maquinas }, { data: config }] =
    await Promise.all([
      supabase
        .from('Proyecto')
        .select('id, nombre, fechaEntrega')
        .eq('estado', 'ACTIVO')
        .order('fechaEntrega', { ascending: true }),
      supabase
        .from('OrdenProduccion')
        .select(`
          id, sistema, producto, porcentajeGlobal, proyectoId,
          proyecto:Proyecto ( nombre, fechaEntrega ),
          ejecuciones:EjecucionEtapa (
            id, estado, porcentajeActual, ultimoProgresoEn, fechaInicio,
            etapaRuta:EtapaRuta ( nombreEtapa )
          )
        `)
        .not('proyectoId', 'is', null)
        .in('estado', ['PENDIENTE', 'EN_PRODUCCION', 'EN_ESPERA']),
      supabase
        .from('Maquina')
        .select('id, nombre, estadoActual')
        .order('nombre', { ascending: true }),
      supabase
        .from('Configuracion')
        .select('horasSinActividadAlerta')
        .eq('id', 'singleton')
        .single(),
    ])

  const umbralHoras: number = config?.horasSinActividadAlerta ?? 4

  const ejecucionesParaAlerta: EjecucionParaAlerta[] = ((ordenes ?? []) as any[]).flatMap(
    (orden) =>
      ((orden.ejecuciones ?? []) as any[]).map((ej: any) => ({
        id: ej.id,
        estado: ej.estado,
        ultimoProgresoEn: ej.ultimoProgresoEn ?? null,
        fechaInicio: ej.fechaInicio ?? null,
        porcentajeActual: ej.porcentajeActual,
        orden: {
          id: orden.id,
          sistema: orden.sistema,
          producto: orden.producto,
          porcentajeGlobal: orden.porcentajeGlobal,
          fechaEntrega: orden.proyecto?.fechaEntrega ?? null,
          proyecto: orden.proyecto ? { nombre: orden.proyecto.nombre } : null,
        },
        etapaRuta: { nombreEtapa: ej.etapaRuta?.nombreEtapa ?? '' },
      }))
  )

  const alertas = calcularAlertas(ejecucionesParaAlerta, umbralHoras)

  const progresoMap = calcularProgresoMap((ordenes ?? []) as any[])

  const ordenPorId = new Map(((ordenes ?? []) as any[]).map((o: any) => [o.id, o]))
  const proyectosConAlerta = new Set(
    alertas
      .map(a => ordenPorId.get(a.ordenId)?.proyectoId)
      .filter(Boolean)
  )

  return (
    <main className="min-h-screen bg-[#0f0f0f] flex flex-col">
      <GerenciaRealtimeListener />

      <header className="px-8 py-4 border-b border-gray-800 flex justify-between items-center shrink-0">
        <span className="text-[#c9a96e] font-bold tracking-widest text-lg">VELUM</span>
        <GerenciaReloj />
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Proyectos — 65% */}
        <section className="flex-1 p-8 border-r border-gray-800 overflow-y-auto">
          <AlertasBanner alertas={alertas} readonly={true} umbralHoras={umbralHoras} />

          <p className="text-gray-500 text-xs font-semibold uppercase tracking-widest mb-6">
            Proyectos Activos
          </p>
          {!proyectos || proyectos.length === 0 ? (
            <p className="text-gray-600 text-sm">Sin proyectos activos.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {(proyectos as Proyecto[]).map((p) => (
                <ProyectoCard
                  key={p.id}
                  nombre={p.nombre}
                  fechaEntrega={p.fechaEntrega}
                  progreso={progresoMap.get(p.id) ?? 0}
                  tieneAlerta={proyectosConAlerta.has(p.id)}
                />
              ))}
            </div>
          )}
        </section>

        {/* Máquinas — 35% (fixed width) */}
        <aside className="w-80 p-8 bg-[#0d0d0d] overflow-y-auto">
          <p className="text-gray-500 text-xs font-semibold uppercase tracking-widest mb-6">
            Estado Máquinas
          </p>
          <div className="flex flex-col gap-2">
            {((maquinas ?? []) as Maquina[]).map((m) => (
              <MaquinaEstado
                key={m.id}
                nombre={m.nombre}
                estadoActual={m.estadoActual}
              />
            ))}
          </div>
        </aside>
      </div>
    </main>
  )
}
