import Link from 'next/link'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import ProyectosManager from '@/components/supervisor/ProyectosManager'
import type { ProyectoItem } from '@/components/supervisor/ProyectoFormModal'

export const dynamic = 'force-dynamic'

export default async function ProyectosPage() {
  const supabase = createSupabaseAdminClient() as any

  const { data: rawProyectos } = await supabase
    .from('Proyecto')
    .select(`
      id, nombre, cliente, fechaEntrega, estado,
      ordenes:OrdenProduccion(estado)
    `)
    .order('estado', { ascending: true })
    .order('fechaEntrega', { ascending: true })

  const proyectos: ProyectoItem[] = (rawProyectos ?? []).map((p: any) => ({
    id: p.id,
    nombre: p.nombre,
    cliente: p.cliente,
    fechaEntrega: p.fechaEntrega,
    estado: p.estado,
    tieneOrdenesActivas: (p.ordenes ?? []).some((o: any) =>
      ['PENDIENTE', 'EN_PRODUCCION', 'EN_ESPERA'].includes(o.estado)
    ),
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
          <h1 className="text-white text-2xl font-bold">VELUM · Proyectos</h1>
        </div>

        <ProyectosManager proyectos={proyectos} />
      </div>
    </main>
  )
}
