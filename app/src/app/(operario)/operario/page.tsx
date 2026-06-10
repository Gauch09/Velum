import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import OrdenCard from '@/components/operario/OrdenCard'
import OperarioRealtimeListener from '@/components/operario/OperarioRealtimeListener'

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

  if (!usuario) {
    return (
      <main className="min-h-screen bg-gray-950 p-4 flex items-center justify-center">
        <p className="text-red-400 text-sm">Error: usuario no encontrado para {user!.email}</p>
      </main>
    )
  }

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
    .eq('operarioId', usuario.id)
    .order('createdAt', { ascending: true })

  const ejecuciones = ejecucionesActivas ?? []

  return (
    <main className="min-h-screen bg-gray-950 p-4 pb-10">
      <OperarioRealtimeListener />
      <header className="flex justify-between items-center mb-6 pt-2">
        <h1 className="text-white text-xl font-bold tracking-tight">VELUM · Producción</h1>
        <span className="text-gray-400 text-sm truncate max-w-[120px]">{usuario?.nombre}</span>
      </header>

      {ejecuciones.length === 0 ? (
        <div className="flex flex-col items-center justify-center mt-24 gap-3 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center text-3xl select-none">
            ⏸
          </div>
          <p className="text-gray-300 font-semibold text-lg">Sin etapas activas</p>
          <p className="text-gray-500 text-sm px-8">
            Las etapas aparecen aquí cuando el supervisor las activa
          </p>
        </div>
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
