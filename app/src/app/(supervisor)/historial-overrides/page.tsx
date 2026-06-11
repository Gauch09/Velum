import Link from 'next/link'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

function formatFecha(iso: string) {
  return new Date(iso).toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

export default async function HistorialOverridesPage() {
  const supabase = createSupabaseAdminClient() as any

  const { data: registros } = await supabase
    .from('RegistroProgreso')
    .select(`
      id,
      timestamp,
      motivoOverride,
      porcentajeRegistrado,
      usuario:Usuario ( nombre ),
      ejecucionEtapa:EjecucionEtapa (
        etapaRuta:EtapaRuta ( nombreEtapa ),
        orden:OrdenProduccion (
          sistema,
          producto,
          proyecto:Proyecto ( nombre )
        )
      )
    `)
    .eq('fueOverride', true)
    .order('timestamp', { ascending: false })
    .limit(100)

  const items = (registros ?? []) as any[]

  return (
    <main className="min-h-screen bg-gray-950 p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/dashboard" className="text-gray-600 hover:text-gray-400 text-sm transition-colors">
          ← Dashboard
        </Link>
        <h1 className="text-white text-2xl font-bold">Historial de overrides</h1>
      </div>

      {items.length === 0 ? (
        <p className="text-gray-600 text-sm mt-8">No hay overrides registrados.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((r: any) => {
            const orden = r.ejecucionEtapa?.orden
            const etapa = r.ejecucionEtapa?.etapaRuta?.nombreEtapa ?? '—'
            const nombre = orden ? `${orden.sistema} / ${orden.producto}` : '—'
            const proyecto = orden?.proyecto?.nombre ?? null

            return (
              <div key={r.id} className="bg-gray-900 border border-gray-800 rounded-xl px-5 py-4">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-violet-400 text-xs font-bold uppercase tracking-wide">⚡ Override</span>
                      <span className="text-white text-sm font-semibold">{nombre}</span>
                      {proyecto && (
                        <span className="text-gray-500 text-xs">{proyecto}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500 flex-wrap">
                      <span>{etapa}</span>
                      <span>·</span>
                      <span>{Number(r.porcentajeRegistrado).toFixed(0)}% al momento del override</span>
                      <span>·</span>
                      <span>{r.usuario?.nombre ?? '—'}</span>
                    </div>
                  </div>
                  <span className="text-gray-600 text-xs flex-shrink-0 tabular-nums">
                    {formatFecha(r.timestamp)}
                  </span>
                </div>

                <div className="border-l-2 border-violet-900 pl-3">
                  <p className="text-gray-400 text-xs leading-relaxed italic">"{r.motivoOverride}"</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </main>
  )
}
