import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import OrdenCard from '@/components/operario/OrdenCard'

export const dynamic = 'force-dynamic'

export default async function OperarioPage() {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  const admin = createSupabaseAdminClient() as any

  const { data: usuario } = await admin
    .from('Usuario')
    .select('id, nombre')
    .eq('email', user!.email!)
    .single()

  const { data: ejecucionesActivas } = await admin
    .from('EjecucionEtapa')
    .select(`
      id,
      porcentajeActual,
      estado,
      maquina:Maquina ( id, nombre ),
      etapaRuta:EtapaRuta ( nombreEtapa, ordenSecuencia, umbralActivacion ),
      orden:OrdenProduccion (
        id,
        sistema,
        producto,
        cantidad,
        unidad,
        prioridad,
        proyecto:Proyecto ( nombre )
      )
    `)
    .eq('estado', 'ACTIVA')
    .order('created_at', { ascending: true })

  const ejecuciones = ejecucionesActivas ?? []

  return (
    <main className="min-h-screen bg-gray-950 p-4 pb-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-white text-xl font-bold">VELUM · Producción</h1>
        <span className="text-gray-400 text-sm">{usuario?.nombre}</span>
      </div>

      {ejecuciones.length === 0 ? (
        <p className="text-gray-500 text-center mt-16">No hay etapas activas en este momento.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {ejecuciones.map((ej: any) => (
            <OrdenCard key={ej.id} ejecucion={ej} />
          ))}
        </div>
      )}
    </main>
  )
}
