import AnilloProgreso from './AnilloProgreso'

export interface OrdenHull {
  numero: string
  proceso: string | null
  operario: string | null
  avance: number
  estado: string
}

export interface ProyectoHull {
  proyectoId: string
  nombre: string
  cliente: string | null
  totalPiezas: number
  completadas: number
  prioridad: string
  fechaEntrega: string | null
  atrasado: boolean
  ordenes: OrdenHull[]
}

export interface EstimacionCard {
  diasEstimados: number
  piezasSinTiempo: number
}

interface ProyectoCardHullProps {
  proyecto: ProyectoHull
  estimacion?: EstimacionCard | null
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

function formatFecha(fecha: string | null): string {
  if (!fecha) return '—'
  const d = new Date(`${fecha}T00:00:00`)
  return `${d.getDate().toString().padStart(2, '0')} ${MESES[d.getMonth()]}`
}

function tonoBarra(estado: string): string {
  if (estado === 'EN PROCESO') return 'bg-emerald-500'
  if (estado === 'EN ESPERA') return 'bg-amber-500'
  return 'bg-sky-500'
}

/** Muestra el trabajo restante en horas si es < 1 día, si no en días. */
function formatCarga(dias: number, horasDia = 8): string {
  const horas = dias * horasDia
  if (horas < horasDia) return `${horas.toLocaleString('es-AR', { maximumFractionDigits: 1 })} h`
  return `${dias.toLocaleString('es-AR', { maximumFractionDigits: 1 })} días`
}

export default function ProyectoCardHull({ proyecto, estimacion }: ProyectoCardHullProps) {
  const pendientes = proyecto.totalPiezas - proyecto.completadas
  const avance = proyecto.totalPiezas > 0 ? Math.round((proyecto.completadas / proyecto.totalPiezas) * 100) : 0

  return (
    <article className={`rounded-2xl border bg-gray-900 p-5 ${proyecto.atrasado ? 'border-red-500/40' : 'border-gray-800'}`}>
      <header className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-gray-500">#{proyecto.proyectoId}</span>
            {proyecto.prioridad === 'ALTA' && (
              <span className="rounded bg-indigo-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-300">PRIORIDAD</span>
            )}
            {proyecto.atrasado && (
              <span className="rounded bg-red-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-red-400">ATRASADO</span>
            )}
          </div>
          <h3 className="mt-1 text-lg font-bold text-white">{proyecto.nombre}</h3>
          {proyecto.cliente && <p className="text-xs text-gray-500">{proyecto.cliente}</p>}
        </div>
        <AnilloProgreso valor={avance} />
      </header>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-gray-800/50 py-2">
          <div className="text-lg font-bold text-emerald-400">{proyecto.completadas}</div>
          <div className="text-[10px] uppercase text-gray-500">Listas</div>
        </div>
        <div className="rounded-lg bg-gray-800/50 py-2">
          <div className="text-lg font-bold text-sky-400">{pendientes}</div>
          <div className="text-[10px] uppercase text-gray-500">Pendientes</div>
        </div>
        <div className="rounded-lg bg-gray-800/50 py-2">
          <div className={`text-lg font-bold ${proyecto.atrasado ? 'text-red-400' : 'text-gray-200'}`}>{formatFecha(proyecto.fechaEntrega)}</div>
          <div className="text-[10px] uppercase text-gray-500">Entrega</div>
        </div>
      </div>

      <div className="mt-4 space-y-1.5">
        {proyecto.ordenes.length === 0 && <div className="text-xs text-gray-600">Sin órdenes activas</div>}
        {proyecto.ordenes.map((o) => (
          <div key={o.numero} className="flex items-center gap-2 text-xs">
            <span className="w-28 shrink-0 truncate text-gray-400">{o.proceso ?? '—'}</span>
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-800">
              <div className={`h-full rounded-full ${tonoBarra(o.estado)}`} style={{ width: `${o.avance}%` }} />
            </div>
            <span className="w-8 text-right text-gray-500">{o.avance}%</span>
            <div className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-indigo-500/20 text-[9px] font-bold text-indigo-300">
              {(o.operario ?? '··').slice(0, 2)}
            </div>
          </div>
        ))}
      </div>

      {estimacion && (
        <footer className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-gray-800 pt-3 text-xs">
          <span className="text-gray-300">
            ⏱ <span className="font-semibold text-white">~{formatCarga(estimacion.diasEstimados)}</span> de máquina restante
          </span>
          {estimacion.piezasSinTiempo > 0 && (
            <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-amber-400/90">{estimacion.piezasSinTiempo} sin tiempo cargado</span>
          )}
        </footer>
      )}
    </article>
  )
}
