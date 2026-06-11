import Link from 'next/link'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import OrdenCascadaCard from '@/components/supervisor/OrdenCascadaCard'
import MaquinasStatus from '@/components/supervisor/MaquinasStatus'
import RealtimeListener from '@/components/supervisor/RealtimeListener'
import NuevaOrdenModal from '@/components/supervisor/NuevaOrdenModal'
import AlertasBanner from '@/components/shared/AlertasBanner'
import AlertaOverlay from '@/components/supervisor/AlertaOverlay'
import HistorialAlertas from '@/components/supervisor/HistorialAlertas'
import FiltrosPlanta from '@/components/supervisor/FiltrosPlanta'
import { calcularAlertas } from '@/lib/alertas'
import { registrarAlertas } from '@/lib/registrar-alertas'
import type { EjecucionParaAlerta } from '@/lib/alertas'

export const dynamic = 'force-dynamic'

export default async function SupervisorDashboard({
  searchParams,
}: {
  searchParams: { proyecto?: string; estado?: string }
}) {
  const supabase = createSupabaseAdminClient() as any

  const [{ data: ordenes }, { data: maquinas }, { data: config }, { data: historial }] = await Promise.all([
    supabase
      .from('OrdenProduccion')
      .select(`
        id, sistema, producto, cantidad, unidad, porcentajeGlobal, estado, prioridad, notas,
        proyecto:Proyecto ( nombre, cliente, fechaEntrega ),
        ejecuciones:EjecucionEtapa (
          id, porcentajeActual, estado, fechaInicio, fueOverride, ultimoProgresoEn,
          maquina:Maquina ( id, nombre, tipo ),
          etapaRuta:EtapaRuta ( nombreEtapa, ordenSecuencia, umbralActivacion )
        )
      `)
      .in('estado', ['EN_PRODUCCION', 'EN_ESPERA'])
      .order('prioridad', { ascending: false })
      .order('createdAt', { ascending: false }),
    supabase
      .from('Maquina')
      .select('id, nombre, tipo, estadoActual')
      .order('nombre', { ascending: true }),
    supabase
      .from('Configuracion')
      .select('horasSinActividadAlerta')
      .eq('id', 'singleton')
      .single(),
    supabase
      .from('AlertaLog')
      .select('id, ordenNombre, etapaNombre, tipo, severidad, disparadaEn, resueltaEn')
      .order('disparadaEn', { ascending: false })
      .limit(50),
  ])

  const umbralHoras: number = config?.horasSinActividadAlerta ?? 4

  // --- filtros ---
  const proyectoFiltro = searchParams.proyecto ?? ''
  const estadoFiltro = searchParams.estado ?? ''

  const proyectosUnicos: string[] = Array.from(
    new Set(
      ((ordenes ?? []) as any[])
        .map((o: any) => o.proyecto?.nombre as string | undefined)
        .filter((n): n is string => !!n)
    )
  ).sort()

  const ordenesFiltradas = ((ordenes ?? []) as any[]).filter((o: any) => {
    if (proyectoFiltro && o.proyecto?.nombre !== proyectoFiltro) return false
    if (estadoFiltro && o.estado !== estadoFiltro) return false
    return true
  })

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
  const alertasRojas = alertas.filter(a => a.severidad === 'rojo')

  const todosEjecucionIds = ejecucionesParaAlerta.map(e => e.id)
  await registrarAlertas(alertas, todosEjecucionIds, supabase)

  const cargaMaquinas: Record<string, { activas: number; etapas: string[] }> = {}
  for (const orden of (ordenes ?? []) as any[]) {
    for (const ej of (orden.ejecuciones ?? []) as any[]) {
      if (ej.estado === 'ACTIVA' && ej.maquina?.id) {
        const prev = cargaMaquinas[ej.maquina.id] ?? { activas: 0, etapas: [] }
        cargaMaquinas[ej.maquina.id] = {
          activas: prev.activas + 1,
          etapas: [...prev.etapas, `${orden.sistema} / ${orden.producto} · ${ej.etapaRuta?.nombreEtapa ?? ''}`],
        }
      }
    }
  }

  return (
    <main className="min-h-screen bg-gray-950 p-6">
      <RealtimeListener />
      <AlertaOverlay alertasRojas={alertasRojas} />
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-white text-2xl font-bold">VELUM · Planta en vivo</h1>
        <div className="flex items-center gap-3">
          <Link
            href="/proyectos"
            className="text-gray-500 hover:text-gray-300 text-sm transition-colors"
          >
            📁 Proyectos
          </Link>
          <Link
            href="/calendario"
            className="text-gray-500 hover:text-gray-300 text-sm transition-colors"
          >
            📅 Entregas
          </Link>
          <Link
            href="/rendimiento"
            className="text-gray-500 hover:text-gray-300 text-sm transition-colors"
          >
            📊 Rendimiento
          </Link>
          <Link
            href="/rutas"
            className="text-gray-500 hover:text-gray-300 text-sm transition-colors"
          >
            🔧 Rutas
          </Link>
          <Link
            href="/usuarios"
            className="text-gray-500 hover:text-gray-300 text-sm transition-colors"
          >
            👥 Usuarios
          </Link>
          <Link
            href="/historial-overrides"
            className="text-gray-500 hover:text-gray-300 text-sm transition-colors"
          >
            ⚡ Overrides
          </Link>
          <NuevaOrdenModal />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <div className="xl:col-span-3 flex flex-col gap-4">
          <AlertasBanner alertas={alertas} readonly={false} umbralHoras={umbralHoras} />
          <FiltrosPlanta
            proyectos={proyectosUnicos}
            proyectoActivo={proyectoFiltro}
            estadoActivo={estadoFiltro}
            total={(ordenes ?? []).length}
            filtradas={ordenesFiltradas.length}
          />
          {ordenesFiltradas.length === 0 ? (
            <p className="text-gray-500 mt-4">
              {(ordenes ?? []).length === 0
                ? 'No hay órdenes activas.'
                : 'Ninguna orden coincide con los filtros.'}
            </p>
          ) : (
            ordenesFiltradas.map((orden: any) => (
              <div id={`orden-${orden.id}`} key={orden.id}>
                <OrdenCascadaCard orden={orden} />
              </div>
            ))
          )}
          <HistorialAlertas entradas={historial ?? []} />
        </div>
        <div>
          <MaquinasStatus maquinas={maquinas ?? []} cargas={cargaMaquinas} />
        </div>
      </div>
    </main>
  )
}
