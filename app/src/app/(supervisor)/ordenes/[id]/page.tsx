import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

function formatFecha(iso: string) {
  return new Date(iso).toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

function duracion(inicio: string | null, fin: string | null): string | null {
  if (!inicio || !fin) return null
  const mins = Math.round((new Date(fin).getTime() - new Date(inicio).getTime()) / 60_000)
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h} h ${m} min` : `${h} h`
}

const ESTADO_ETAPA: Record<string, { label: string; color: string }> = {
  ACTIVA:     { label: 'Activa',      color: 'text-green-400' },
  PENDIENTE:  { label: 'Pendiente',   color: 'text-gray-500' },
  EN_ESPERA:  { label: 'En espera',   color: 'text-amber-400' },
  COMPLETADA: { label: 'Completada',  color: 'text-blue-400' },
}

const ESTADO_ORDEN: Record<string, { label: string; pill: string }> = {
  EN_PRODUCCION: { label: 'En producción', pill: 'bg-green-900 text-green-300 border border-green-700' },
  EN_ESPERA:     { label: 'En espera',     pill: 'bg-yellow-900 text-yellow-300 border border-yellow-700' },
  COMPLETADA:    { label: 'Completada',    pill: 'bg-blue-900 text-blue-300 border border-blue-700' },
  CANCELADA:     { label: 'Cancelada',     pill: 'bg-red-900 text-red-300 border border-red-700' },
  PENDIENTE:     { label: 'Pendiente',     pill: 'bg-gray-800 text-gray-400 border border-gray-700' },
}

export default async function HistorialOrdenPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = createSupabaseAdminClient() as any

  const { data: orden } = await supabase
    .from('OrdenProduccion')
    .select(`
      id, sistema, producto, cantidad, unidad, porcentajeGlobal, estado, prioridad, createdAt,
      proyecto:Proyecto ( nombre, cliente ),
      ejecuciones:EjecucionEtapa (
        id, porcentajeActual, estado, fechaInicio, fechaFin,
        etapaRuta:EtapaRuta ( nombreEtapa, ordenSecuencia, umbralActivacion ),
        maquina:Maquina ( nombre ),
        registros:RegistroProgreso (
          id, timestamp, cantidadRegistrada, porcentajeRegistrado,
          fueOverride, motivoOverride, notas,
          usuario:Usuario ( nombre )
        )
      )
    `)
    .eq('id', params.id)
    .single()

  if (!orden) notFound()

  const ejecuciones = [...(orden.ejecuciones ?? [])]
    .sort((a: any, b: any) => (a.etapaRuta?.ordenSecuencia ?? 0) - (b.etapaRuta?.ordenSecuencia ?? 0))
    .map((ej: any) => ({
      ...ej,
      registros: [...(ej.registros ?? [])].sort(
        (a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      ),
    }))

  const totalRegistros = ejecuciones.reduce((s: number, ej: any) => s + ej.registros.length, 0)
  const estadoOrden = ESTADO_ORDEN[orden.estado] ?? { label: orden.estado, pill: 'bg-gray-800 text-gray-400' }

  return (
    <main className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-3xl mx-auto">

        {/* header */}
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="text-gray-600 hover:text-gray-400 text-xs transition-colors mb-1 block"
          >
            ← Volver a planta
          </Link>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-white text-2xl font-bold">
                {orden.sistema} / {orden.producto}
              </h1>
              {orden.proyecto && (
                <p className="text-gray-400 text-sm mt-0.5">
                  {orden.proyecto.nombre}
                  {orden.proyecto.cliente && (
                    <span className="text-gray-600"> · {orden.proyecto.cliente}</span>
                  )}
                </p>
              )}
            </div>
            <span className={`text-xs px-2.5 py-1 rounded-full flex-shrink-0 ${estadoOrden.pill}`}>
              {estadoOrden.label}
            </span>
          </div>
        </div>

        {/* resumen */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-gray-500 text-xs uppercase tracking-widest mb-1">Progreso</p>
            <p className="text-white font-bold text-2xl">{Number(orden.porcentajeGlobal).toFixed(0)}%</p>
            <div className="bg-gray-800 rounded-full h-1 mt-2">
              <div
                className="bg-green-500 h-1 rounded-full"
                style={{ width: `${Math.min(Number(orden.porcentajeGlobal), 100)}%` }}
              />
            </div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-gray-500 text-xs uppercase tracking-widest mb-1">Cantidad</p>
            <p className="text-white font-bold text-2xl">{orden.cantidad}</p>
            <p className="text-gray-600 text-xs mt-1">{orden.unidad}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-gray-500 text-xs uppercase tracking-widest mb-1">Registros</p>
            <p className="text-white font-bold text-2xl">{totalRegistros}</p>
            <p className="text-gray-600 text-xs mt-1">
              {formatFecha(orden.createdAt)}
            </p>
          </div>
        </div>

        {/* etapas + registros */}
        <div className="flex flex-col gap-4">
          {ejecuciones.map((ej: any) => {
            const estadoEj = ESTADO_ETAPA[ej.estado] ?? { label: ej.estado, color: 'text-gray-400' }
            const dur = duracion(ej.fechaInicio, ej.fechaFin)

            return (
              <div key={ej.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                {/* cabecera etapa */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-gray-600 text-xs w-5 flex-shrink-0">
                      {ej.etapaRuta?.ordenSecuencia ?? '—'}
                    </span>
                    <span className="text-white text-sm font-semibold truncate">
                      {ej.etapaRuta?.nombreEtapa ?? '—'}
                    </span>
                    <span className="text-gray-600 text-xs flex-shrink-0">
                      · {ej.maquina?.nombre ?? '—'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {dur && <span className="text-gray-600 text-xs">{dur}</span>}
                    <span className={`text-xs font-medium ${estadoEj.color}`}>
                      {estadoEj.label}
                    </span>
                    <span className="text-gray-400 text-xs font-semibold tabular-nums">
                      {Number(ej.porcentajeActual).toFixed(0)}%
                    </span>
                  </div>
                </div>

                {/* registros */}
                {ej.registros.length === 0 ? (
                  <p className="text-gray-700 text-xs px-4 py-3">Sin registros.</p>
                ) : (
                  <div className="divide-y divide-gray-800/50">
                    {ej.registros.map((r: any) => (
                      <div
                        key={r.id}
                        className={`flex items-start gap-3 px-4 py-3 ${
                          r.fueOverride ? 'bg-violet-950/30' : ''
                        }`}
                      >
                        {/* indicador override */}
                        <span className="text-sm flex-shrink-0 mt-0.5">
                          {r.fueOverride ? '⚡' : '·'}
                        </span>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-gray-300 text-xs font-medium">
                              {r.usuario?.nombre ?? '—'}
                            </span>
                            <span className="text-gray-600 text-xs tabular-nums">
                              {formatFecha(r.timestamp)}
                            </span>
                          </div>
                          {r.fueOverride && r.motivoOverride && (
                            <p className="text-violet-300 text-xs mt-0.5 italic">
                              "{r.motivoOverride}"
                            </p>
                          )}
                          {r.notas && (
                            <p className="text-gray-500 text-xs mt-0.5">{r.notas}</p>
                          )}
                        </div>

                        <div className="text-right flex-shrink-0">
                          <p className="text-gray-300 text-xs font-semibold tabular-nums">
                            {Number(r.porcentajeRegistrado).toFixed(0)}%
                          </p>
                          {r.cantidadRegistrada != null && (
                            <p className="text-gray-600 text-xs tabular-nums">
                              +{r.cantidadRegistrada}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

      </div>
    </main>
  )
}
