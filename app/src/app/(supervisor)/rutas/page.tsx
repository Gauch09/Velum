import Link from 'next/link'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import RutasManager from '@/components/supervisor/RutasManager'

export const dynamic = 'force-dynamic'

export default async function RutasPage() {
  const supabase = createSupabaseAdminClient() as any

  const [{ data: rutasRaw }, { data: maquinas }] = await Promise.all([
    supabase
      .from('Ruta')
      .select(`
        id, sistema, producto, descripcion,
        etapas:EtapaRuta(id, nombreEtapa, ordenSecuencia, umbralActivacion, maquinaId, maquina:Maquina(nombre)),
        ordenes:OrdenProduccion(estado)
      `)
      .order('sistema')
      .order('producto'),
    supabase
      .from('Maquina')
      .select('id, nombre')
      .order('nombre', { ascending: true }),
  ])

  const rutas = (rutasRaw ?? []).map((r: any) => ({
    id: r.id,
    sistema: r.sistema,
    producto: r.producto,
    descripcion: r.descripcion ?? null,
    tieneOrdenesActivas: (r.ordenes ?? []).some((o: any) =>
      ['EN_PRODUCCION', 'EN_ESPERA'].includes(o.estado)
    ),
    etapas: [...(r.etapas ?? [])]
      .sort((a: any, b: any) => a.ordenSecuencia - b.ordenSecuencia)
      .map((e: any) => ({
        id: e.id,
        nombreEtapa: e.nombreEtapa,
        ordenSecuencia: e.ordenSecuencia,
        umbralActivacion: e.umbralActivacion,
        maquinaId: e.maquinaId,
        maquinaNombre: e.maquina?.nombre ?? '',
      })),
  }))

  return (
    <main className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="text-gray-600 hover:text-gray-400 text-xs transition-colors mb-1 block"
          >
            ← Volver a planta
          </Link>
          <h1 className="text-white text-2xl font-bold">VELUM · Rutas de producción</h1>
        </div>

        <RutasManager rutas={rutas} maquinas={maquinas ?? []} />
      </div>
    </main>
  )
}
