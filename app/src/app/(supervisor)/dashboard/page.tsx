import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import OrdenCascadaCard from '@/components/supervisor/OrdenCascadaCard'
import MaquinasStatus from '@/components/supervisor/MaquinasStatus'
import RealtimeListener from '@/components/supervisor/RealtimeListener'
import NuevaOrdenModal from '@/components/supervisor/NuevaOrdenModal'
import AlertasBanner from '@/components/shared/AlertasBanner'
import AlertaOverlay from '@/components/supervisor/AlertaOverlay'
import { calcularAlertas } from '@/lib/alertas'
import type { EjecucionParaAlerta } from '@/lib/alertas'

export const dynamic = 'force-dynamic'

export default async function SupervisorDashboard() {
  const supabase = createSupabaseAdminClient() as any

  const [{ data: ordenes }, { data: maquinas }, { data: config }] = await Promise.all([
    supabase
      .from('OrdenProduccion')
      .select(`
        id, sistema, producto, cantidad, unidad, porcentajeGlobal, estado, prioridad,
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
  const alertasRojas = alertas.filter(a => a.severidad === 'rojo')

  return (
    <main className="min-h-screen bg-gray-950 p-6">
      <RealtimeListener />
      <AlertaOverlay alertasRojas={alertasRojas} />
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-white text-2xl font-bold">VELUM · Planta en vivo</h1>
        <NuevaOrdenModal />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <div className="xl:col-span-3 flex flex-col gap-4">
          <AlertasBanner alertas={alertas} readonly={false} umbralHoras={umbralHoras} />
          {(!ordenes || ordenes.length === 0) ? (
            <p className="text-gray-500 mt-8">No hay órdenes activas.</p>
          ) : (
            ordenes.map((orden: any) => (
              <div id={`orden-${orden.id}`} key={orden.id}>
                <OrdenCascadaCard orden={orden} />
              </div>
            ))
          )}
        </div>
        <div>
          <MaquinasStatus maquinas={maquinas ?? []} />
        </div>
      </div>
    </main>
  )
}
