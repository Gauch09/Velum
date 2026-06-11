import Link from 'next/link'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

function diasHasta(fechaIso: string): number {
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const entrega = new Date(fechaIso)
  entrega.setHours(0, 0, 0, 0)
  return Math.round((entrega.getTime() - hoy.getTime()) / 86_400_000)
}

function progresoProyecto(ordenes: { estado: string; porcentajeGlobal: number | null }[]): number {
  const activas = ordenes.filter(o => o.estado !== 'CANCELADA')
  if (activas.length === 0) return 0
  const suma = activas.reduce((acc, o) => {
    if (o.estado === 'COMPLETADA') return acc + 100
    return acc + (o.porcentajeGlobal ?? 0)
  }, 0)
  return Math.round(suma / activas.length)
}

function formatFecha(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function labelDias(dias: number): string {
  if (dias === 0) return 'Vence hoy'
  if (dias === 1) return 'Vence mañana'
  if (dias < 0) return `Venció hace ${Math.abs(dias)} día${Math.abs(dias) !== 1 ? 's' : ''}`
  return `${dias} día${dias !== 1 ? 's' : ''}`
}

type Urgencia = 'vencido' | 'critico' | 'proximo' | 'normal'

function getUrgencia(dias: number): Urgencia {
  if (dias < 0) return 'vencido'
  if (dias <= 7) return 'critico'
  if (dias <= 30) return 'proximo'
  return 'normal'
}

const SECCIONES: {
  id: Urgencia
  label: string
  titleColor: string
  borderColor: string
  badgeClass: string
  diasColor: string
}[] = [
  {
    id: 'vencido',
    label: 'Vencidos',
    titleColor: 'text-red-400',
    borderColor: 'border-red-900',
    badgeClass: 'bg-red-950 text-red-300 border border-red-800',
    diasColor: 'text-red-400',
  },
  {
    id: 'critico',
    label: 'Esta semana',
    titleColor: 'text-amber-400',
    borderColor: 'border-amber-900',
    badgeClass: 'bg-amber-950 text-amber-300 border border-amber-800',
    diasColor: 'text-amber-400',
  },
  {
    id: 'proximo',
    label: 'Este mes',
    titleColor: 'text-blue-400',
    borderColor: 'border-blue-900',
    badgeClass: 'bg-blue-950 text-blue-300 border border-blue-800',
    diasColor: 'text-blue-400',
  },
  {
    id: 'normal',
    label: 'Más adelante',
    titleColor: 'text-gray-500',
    borderColor: 'border-gray-800',
    badgeClass: 'bg-gray-800 text-gray-400 border border-gray-700',
    diasColor: 'text-gray-400',
  },
]

export default async function CalendarioPage() {
  const supabase = createSupabaseAdminClient() as any

  const { data: rawProyectos } = await supabase
    .from('Proyecto')
    .select(`
      id, nombre, cliente, fechaEntrega, estado,
      ordenes:OrdenProduccion ( estado, porcentajeGlobal )
    `)
    .not('estado', 'in', '("CANCELADO","COMPLETADO")')
    .not('fechaEntrega', 'is', null)
    .order('fechaEntrega', { ascending: true })

  type ProyectoRaw = {
    id: string
    nombre: string
    cliente: string | null
    fechaEntrega: string
    estado: string
    ordenes: { estado: string; porcentajeGlobal: number | null }[]
  }

  const proyectos = ((rawProyectos ?? []) as ProyectoRaw[]).map(p => {
    const dias = diasHasta(p.fechaEntrega)
    return {
      ...p,
      dias,
      urgencia: getUrgencia(dias),
      progreso: progresoProyecto(p.ordenes),
      totalOrdenes: p.ordenes.filter(o => o.estado !== 'CANCELADA').length,
      ordenesActivas: p.ordenes.filter(o => ['EN_PRODUCCION', 'EN_ESPERA'].includes(o.estado)).length,
      ordenesCompletadas: p.ordenes.filter(o => o.estado === 'COMPLETADA').length,
    }
  })

  const porUrgencia = {
    vencido:  proyectos.filter(p => p.urgencia === 'vencido'),
    critico:  proyectos.filter(p => p.urgencia === 'critico'),
    proximo:  proyectos.filter(p => p.urgencia === 'proximo'),
    normal:   proyectos.filter(p => p.urgencia === 'normal'),
  }

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
          <h1 className="text-white text-2xl font-bold">VELUM · Calendario de entregas</h1>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-4 gap-3 mb-8">
          <KpiCard label="Total" value={proyectos.length} color="default" />
          <KpiCard label="Vencidos" value={porUrgencia.vencido.length} color="red" />
          <KpiCard label="Esta semana" value={porUrgencia.critico.length} color="amber" />
          <KpiCard label="Este mes" value={porUrgencia.proximo.length} color="blue" />
        </div>

        {proyectos.length === 0 && (
          <p className="text-gray-600 text-sm mt-8">No hay proyectos activos con fecha de entrega.</p>
        )}

        {/* secciones */}
        <div className="flex flex-col gap-8">
          {SECCIONES.map(seccion => {
            const items = porUrgencia[seccion.id]
            if (items.length === 0) return null
            return (
              <section key={seccion.id}>
                <h2 className={`text-xs font-bold uppercase tracking-widest mb-3 ${seccion.titleColor}`}>
                  {seccion.label} · {items.length}
                </h2>
                <div className="flex flex-col gap-3">
                  {items.map(p => (
                    <div
                      key={p.id}
                      className={`bg-gray-900 border-l-4 ${seccion.borderColor} rounded-r-xl rounded-bl-xl px-5 py-4`}
                    >
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="min-w-0">
                          <p className="text-white font-semibold text-sm truncate">{p.nombre}</p>
                          {p.cliente && (
                            <p className="text-gray-500 text-xs mt-0.5">{p.cliente}</p>
                          )}
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <p className={`font-bold text-sm tabular-nums ${seccion.diasColor}`}>
                            {labelDias(p.dias)}
                          </p>
                          <p className="text-gray-600 text-xs mt-0.5">{formatFecha(p.fechaEntrega)}</p>
                        </div>
                      </div>

                      {/* barra de progreso */}
                      <div className="mb-2">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-gray-500 text-xs">Progreso general</span>
                          <span className="text-gray-300 text-xs font-semibold tabular-nums">{p.progreso}%</span>
                        </div>
                        <div className="bg-gray-800 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full transition-all ${
                              seccion.id === 'vencido' ? 'bg-red-500' :
                              seccion.id === 'critico' ? 'bg-amber-500' :
                              seccion.id === 'proximo' ? 'bg-blue-500' :
                              'bg-green-600'
                            }`}
                            style={{ width: `${p.progreso}%` }}
                          />
                        </div>
                      </div>

                      {/* badges órdenes */}
                      {p.totalOrdenes > 0 && (
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-gray-600 text-xs">{p.totalOrdenes} orden{p.totalOrdenes !== 1 ? 'es' : ''}</span>
                          {p.ordenesActivas > 0 && (
                            <span className="bg-green-950 text-green-400 border border-green-900 text-xs px-2 py-0.5 rounded-full">
                              {p.ordenesActivas} activa{p.ordenesActivas !== 1 ? 's' : ''}
                            </span>
                          )}
                          {p.ordenesCompletadas > 0 && (
                            <span className="bg-gray-800 text-gray-500 border border-gray-700 text-xs px-2 py-0.5 rounded-full">
                              {p.ordenesCompletadas} completada{p.ordenesCompletadas !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )
          })}
        </div>

      </div>
    </main>
  )
}

function KpiCard({
  label, value, color = 'default',
}: {
  label: string; value: number; color?: 'default' | 'red' | 'amber' | 'blue'
}) {
  const valueColor =
    color === 'red'   ? 'text-red-400' :
    color === 'amber' ? 'text-amber-400' :
    color === 'blue'  ? 'text-blue-400' :
    'text-white'

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <p className="text-gray-500 text-xs uppercase tracking-widest mb-1">{label}</p>
      <p className={`font-bold text-2xl ${valueColor}`}>{value}</p>
    </div>
  )
}
