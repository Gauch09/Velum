import Link from 'next/link'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

function formatMins(mins: number): string {
  if (mins < 60) return `${Math.round(mins)} min`
  const h = Math.floor(mins / 60)
  const m = Math.round(mins % 60)
  return m > 0 ? `${h} h ${m} min` : `${h} h`
}

type PromedioEtapa = {
  nombre: string
  avgMins: number
  count: number
}

type CuelloEtapa = {
  nombre: string
  total: number
  rojas: number
}

export default async function RendimientoPage() {
  const supabase = createSupabaseAdminClient() as any

  const [{ data: ejecuciones }, { data: alertaLogs }] = await Promise.all([
    supabase
      .from('EjecucionEtapa')
      .select('fechaInicio, fechaFin, etapaRuta:EtapaRuta(nombreEtapa)')
      .eq('estado', 'COMPLETADA')
      .not('fechaInicio', 'is', null)
      .not('fechaFin', 'is', null),
    supabase
      .from('AlertaLog')
      .select('etapaNombre, severidad'),
  ])

  // --- compute tiempos promedio por etapa ---
  const durMap = new Map<string, { totalMins: number; count: number }>()
  for (const ej of (ejecuciones ?? []) as any[]) {
    const mins =
      (new Date(ej.fechaFin).getTime() - new Date(ej.fechaInicio).getTime()) / 60_000
    if (mins <= 0) continue
    const nombre: string = ej.etapaRuta?.nombreEtapa ?? 'Desconocida'
    const prev = durMap.get(nombre) ?? { totalMins: 0, count: 0 }
    durMap.set(nombre, { totalMins: prev.totalMins + mins, count: prev.count + 1 })
  }

  const promedios: PromedioEtapa[] = [...durMap.entries()]
    .map(([nombre, { totalMins, count }]) => ({ nombre, avgMins: totalMins / count, count }))
    .sort((a, b) => b.avgMins - a.avgMins)

  const maxAvg = promedios[0]?.avgMins ?? 1
  const totalCompletadas = promedios.reduce((s, p) => s + p.count, 0)
  const promedioGeneral =
    promedios.length > 0
      ? promedios.reduce((s, p) => s + p.avgMins * p.count, 0) / totalCompletadas
      : 0

  // --- compute cuellos históricos ---
  const alertaMap = new Map<string, { total: number; rojas: number }>()
  for (const log of (alertaLogs ?? []) as any[]) {
    const prev = alertaMap.get(log.etapaNombre) ?? { total: 0, rojas: 0 }
    alertaMap.set(log.etapaNombre, {
      total: prev.total + 1,
      rojas: prev.rojas + (log.severidad === 'rojo' ? 1 : 0),
    })
  }

  const cuellos: CuelloEtapa[] = [...alertaMap.entries()]
    .map(([nombre, { total, rojas }]) => ({ nombre, total, rojas }))
    .sort((a, b) => b.total - a.total)

  const maxAlertas = cuellos[0]?.total ?? 1

  return (
    <main className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-5xl mx-auto">

        {/* header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link
              href="/dashboard"
              className="text-gray-600 hover:text-gray-400 text-xs transition-colors mb-1 block"
            >
              ← Volver a planta
            </Link>
            <h1 className="text-white text-2xl font-bold">VELUM · Rendimiento</h1>
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
          <KpiCard label="Etapas completadas" value={String(totalCompletadas)} />
          <KpiCard label="Tiempo promedio" value={totalCompletadas > 0 ? formatMins(promedioGeneral) : '—'} />
          <KpiCard
            label="Etapa más lenta"
            value={promedios[0]?.nombre ?? '—'}
            sub={promedios[0] ? formatMins(promedios[0].avgMins) : undefined}
            color="amber"
          />
          <KpiCard
            label="Etapa más alertada"
            value={cuellos[0]?.nombre ?? '—'}
            sub={cuellos[0] ? `${cuellos[0].total} alertas` : undefined}
            color="red"
          />
        </div>

        {/* tiempos promedio */}
        <section className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
          <h2 className="text-gray-300 text-sm font-semibold mb-4">Tiempo promedio por etapa</h2>
          {promedios.length === 0 ? (
            <p className="text-gray-600 text-sm">Sin etapas completadas aún.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {promedios.map(p => (
                <div key={p.nombre}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-gray-300 text-sm">{p.nombre}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-gray-500 text-xs">{p.count} completada{p.count !== 1 ? 's' : ''}</span>
                      <span className="text-blue-300 text-xs font-semibold w-20 text-right">
                        {formatMins(p.avgMins)}
                      </span>
                    </div>
                  </div>
                  <div className="bg-gray-800 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${(p.avgMins / maxAvg) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* cuellos históricos */}
        <section className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-gray-300 text-sm font-semibold mb-4">Cuellos de botella históricos</h2>
          {cuellos.length === 0 ? (
            <p className="text-gray-600 text-sm">Sin alertas registradas aún.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {cuellos.map(c => (
                <div key={c.nombre}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-gray-300 text-sm">{c.nombre}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-red-400 text-xs">{c.rojas} crítica{c.rojas !== 1 ? 's' : ''}</span>
                      <span className="text-gray-400 text-xs font-semibold w-20 text-right">
                        {c.total} alerta{c.total !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                  <div className="bg-gray-800 rounded-full h-2 flex overflow-hidden">
                    <div
                      className="bg-red-600 h-2 transition-all"
                      style={{ width: `${(c.rojas / maxAlertas) * 100}%` }}
                    />
                    <div
                      className="bg-amber-600 h-2 transition-all"
                      style={{ width: `${((c.total - c.rojas) / maxAlertas) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

      </div>
    </main>
  )
}

function KpiCard({
  label,
  value,
  sub,
  color = 'default',
}: {
  label: string
  value: string
  sub?: string
  color?: 'default' | 'amber' | 'red'
}) {
  const valueColor =
    color === 'amber' ? 'text-amber-300' :
    color === 'red'   ? 'text-red-300' :
    'text-white'

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <p className="text-gray-500 text-xs uppercase tracking-widest mb-2">{label}</p>
      <p className={`font-bold text-lg leading-tight truncate ${valueColor}`}>{value}</p>
      {sub && <p className="text-gray-500 text-xs mt-1">{sub}</p>}
    </div>
  )
}
