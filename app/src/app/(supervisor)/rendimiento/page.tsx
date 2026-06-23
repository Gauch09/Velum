import Link from 'next/link'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import ExportarCsvButton from '@/components/shared/ExportarCsvButton'
import FactoresUtilizacion from '@/components/supervisor/FactoresUtilizacion'

export const dynamic = 'force-dynamic'

function formatMins(mins: number): string {
  if (mins < 60) return `${Math.round(mins)} min`
  const h = Math.floor(mins / 60)
  const m = Math.round(mins % 60)
  return m > 0 ? `${h} h ${m} min` : `${h} h`
}

type PromedioEtapa = { nombre: string; avgMins: number; count: number }
type CuelloEtapa   = { nombre: string; total: number; rojas: number }

const PERIODOS = [
  { label: '7 días',   value: '7d',  dias: 7   },
  { label: '30 días',  value: '30d', dias: 30  },
  { label: '90 días',  value: '90d', dias: 90  },
  { label: 'Todo',     value: 'todo', dias: null },
] as const

type PeriodoValue = typeof PERIODOS[number]['value']

function fromDate(periodo: PeriodoValue): string | null {
  const p = PERIODOS.find(p => p.value === periodo)
  if (!p || p.dias === null) return null
  const d = new Date()
  d.setDate(d.getDate() - p.dias)
  return d.toISOString()
}

export default async function RendimientoPage({
  searchParams,
}: {
  searchParams: { periodo?: string }
}) {
  const periodo = (PERIODOS.some(p => p.value === searchParams.periodo)
    ? searchParams.periodo
    : '30d') as PeriodoValue

  const desde = fromDate(periodo)
  const supabase = createSupabaseAdminClient() as any

  let ejQuery = supabase
    .from('EjecucionEtapa')
    .select('fechaInicio, fechaFin, etapaRuta:EtapaRuta(nombreEtapa)')
    .eq('estado', 'COMPLETADA')
    .not('fechaInicio', 'is', null)
    .not('fechaFin', 'is', null)
  if (desde) ejQuery = ejQuery.gte('fechaFin', desde)

  let logQuery = supabase.from('AlertaLog').select('etapaNombre, severidad')
  if (desde) logQuery = logQuery.gte('disparadaEn', desde)

  const [{ data: ejecuciones }, { data: alertaLogs }] = await Promise.all([ejQuery, logQuery])

  // --- promedios ---
  const durMap = new Map<string, { totalMins: number; count: number }>()
  for (const ej of (ejecuciones ?? []) as any[]) {
    const mins = (new Date(ej.fechaFin).getTime() - new Date(ej.fechaInicio).getTime()) / 60_000
    if (mins <= 0) continue
    const nombre: string = ej.etapaRuta?.nombreEtapa ?? 'Desconocida'
    const prev = durMap.get(nombre) ?? { totalMins: 0, count: 0 }
    durMap.set(nombre, { totalMins: prev.totalMins + mins, count: prev.count + 1 })
  }

  const promedios: PromedioEtapa[] = Array.from(durMap.entries())
    .map(([nombre, { totalMins, count }]) => ({ nombre, avgMins: totalMins / count, count }))
    .sort((a, b) => b.avgMins - a.avgMins)

  const maxAvg = promedios[0]?.avgMins ?? 1
  const totalCompletadas = promedios.reduce((s, p) => s + p.count, 0)
  const promedioGeneral = promedios.length > 0
    ? promedios.reduce((s, p) => s + p.avgMins * p.count, 0) / totalCompletadas
    : 0

  // --- cuellos ---
  const alertaMap = new Map<string, { total: number; rojas: number }>()
  for (const log of (alertaLogs ?? []) as any[]) {
    const prev = alertaMap.get(log.etapaNombre) ?? { total: 0, rojas: 0 }
    alertaMap.set(log.etapaNombre, {
      total: prev.total + 1,
      rojas: prev.rojas + (log.severidad === 'rojo' ? 1 : 0),
    })
  }

  const cuellos: CuelloEtapa[] = Array.from(alertaMap.entries())
    .map(([nombre, { total, rojas }]) => ({ nombre, total, rojas }))
    .sort((a, b) => b.total - a.total)

  const maxAlertas = cuellos[0]?.total ?? 1

  return (
    <main className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-5xl mx-auto">

        {/* header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link href="/dashboard" className="text-gray-600 hover:text-gray-400 text-xs transition-colors mb-1 block">
              ← Volver a planta
            </Link>
            <h1 className="text-white text-2xl font-bold">VELUM · Rendimiento</h1>
          </div>

          {/* export + period selector */}
          <div className="flex items-center gap-3">
          <ExportarCsvButton tipo="alertas" label="alertas" />
          <ExportarCsvButton tipo="trazabilidad" label="trazabilidad" />
          <div className="flex bg-gray-900 border border-gray-800 rounded-lg p-1 gap-1">
            {PERIODOS.map(p => (
              <Link
                key={p.value}
                href={`?periodo=${p.value}`}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  periodo === p.value
                    ? 'bg-gray-700 text-white'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {p.label}
              </Link>
            ))}
          </div>
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
            <p className="text-gray-600 text-sm">Sin etapas completadas en este período.</p>
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
          <h2 className="text-gray-300 text-sm font-semibold mb-4">Cuellos de botella</h2>
          {cuellos.length === 0 ? (
            <p className="text-gray-600 text-sm">Sin alertas en este período.</p>
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

        <FactoresUtilizacion desde={desde} />

      </div>
    </main>
  )
}

function KpiCard({
  label, value, sub, color = 'default',
}: {
  label: string; value: string; sub?: string; color?: 'default' | 'amber' | 'red'
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
