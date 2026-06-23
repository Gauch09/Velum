import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function OrdenesPrimariasPage() {
  const supabase = createSupabaseAdminClient() as any
  const { data: ordenes } = await supabase
    .from('OrdenPrimaria')
    .select('*, proyecto:Proyecto(nombre,cliente), items:ItemProduccion(cantidadTotal,cantidadCompletada)')
    .order('creadoEn', { ascending: false })

  return (
    <main className="min-h-screen bg-gray-950 p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-white text-2xl font-bold">Órdenes de Producción</h1>
        <Link
          href="/ordenes-primarias/nueva"
          className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg font-semibold text-sm"
        >
          + Nueva OP
        </Link>
      </div>

      <div className="flex flex-col gap-3">
        {(ordenes ?? []).map((op: any) => {
          const totalPiezas = op.items?.reduce((s: number, i: any) => s + i.cantidadTotal, 0) ?? 0
          const completadas = op.items?.reduce((s: number, i: any) => s + i.cantidadCompletada, 0) ?? 0
          const pct = totalPiezas > 0 ? Math.round((completadas / totalPiezas) * 100) : 0
          return (
            <div key={op.id} className="bg-gray-800 rounded-xl p-4 border border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-white font-bold">
                    {op.numero ? `OP ${op.numero}` : 'BORRADOR'}
                  </span>
                  <span className="text-gray-400 text-sm ml-3">
                    {op.tipo} · {op.equipo} · {op.responsable}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                    op.estado === 'EMITIDA' ? 'bg-blue-900 text-blue-300' :
                    op.estado === 'BORRADOR' ? 'bg-gray-700 text-gray-300' :
                    op.estado === 'COMPLETADA' ? 'bg-green-900 text-green-300' :
                    'bg-yellow-900 text-yellow-300'
                  }`}>{op.estado}</span>
                  {op.numero ? (
                    <a
                      href={`/api/ordenes-primarias/${op.id}/pdf`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 text-sm hover:underline"
                    >
                      PDF →
                    </a>
                  ) : (
                    <span className="text-gray-600 text-sm">Sin emitir</span>
                  )}
                </div>
              </div>
              {op.proyecto && (
                <p className="text-gray-400 text-sm mt-1">{op.proyecto.nombre} — {op.proyecto.cliente}</p>
              )}
              {totalPiezas > 0 && (
                <div className="mt-2">
                  <div className="h-1.5 bg-gray-700 rounded-full">
                    <div className="h-1.5 bg-green-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-gray-500 text-xs mt-1">{completadas}/{totalPiezas} piezas · {pct}%</p>
                </div>
              )}
            </div>
          )
        })}
        {(!ordenes || ordenes.length === 0) && (
          <p className="text-gray-500 text-center py-12">No hay órdenes. Creá la primera.</p>
        )}
      </div>
    </main>
  )
}
