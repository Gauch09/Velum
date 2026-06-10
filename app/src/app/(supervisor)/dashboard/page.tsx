import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import OrdenCascadaCard from '@/components/supervisor/OrdenCascadaCard'
import MaquinasStatus from '@/components/supervisor/MaquinasStatus'
import RealtimeListener from '@/components/supervisor/RealtimeListener'
import NuevaOrdenModal from '@/components/supervisor/NuevaOrdenModal'

export const dynamic = 'force-dynamic'

export default async function SupervisorDashboard() {
  const supabase = createSupabaseAdminClient() as any

  const [{ data: ordenes }, { data: maquinas }] = await Promise.all([
    supabase
      .from('OrdenProduccion')
      .select(`
        id, sistema, producto, cantidad, unidad, porcentajeGlobal, estado, prioridad,
        proyecto:Proyecto ( nombre, cliente ),
        ejecuciones:EjecucionEtapa (
          id, porcentajeActual, estado, fechaInicio, fueOverride,
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
  ])

  return (
    <main className="min-h-screen bg-gray-950 p-6">
      <RealtimeListener />
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-white text-2xl font-bold">VELUM · Planta en vivo</h1>
        <NuevaOrdenModal />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <div className="xl:col-span-3 flex flex-col gap-4">
          {(!ordenes || ordenes.length === 0) ? (
            <p className="text-gray-500 mt-8">No hay órdenes activas.</p>
          ) : (
            ordenes.map((orden: any) => (
              <OrdenCascadaCard key={orden.id} orden={orden} />
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
