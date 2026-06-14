'use client'

/*
 * PROTOTIPO — Dashboard de Producción (datos del sistema HULL).
 * Boceto descartable para que el usuario elija un diseño antes de programar el real.
 * 3 variantes radicalmente distintas, conmutables con ?variant=A|B|C, flechas ← → o la barra inferior.
 * Datos 100% de ejemplo (mock). No toca Supabase ni la base de HULL. Borrar cuando se decida el diseño.
 */

import { useEffect, useState, useCallback } from 'react'

// ----------------------------- DATOS DE EJEMPLO (mock) -----------------------------

type Proyecto = {
  id: string
  nombre: string
  cliente: string
  total: number
  completadas: number
  prioridad: 'ALTA' | 'MEDIA' | 'BAJA'
  atrasado: boolean
  entrega: string
}

const PROYECTOS: Proyecto[] = [
  { id: '1273', nombre: 'Gran Tortola', cliente: 'Constructora del Sur', total: 142, completadas: 88, prioridad: 'ALTA', atrasado: false, entrega: '24 jun' },
  { id: '1268', nombre: 'Mirador Norte', cliente: 'Grupo Aliaga', total: 96, completadas: 71, prioridad: 'MEDIA', atrasado: false, entrega: '19 jun' },
  { id: '1281', nombre: 'Edificio Aurora', cliente: 'Inmobiliaria Vega', total: 210, completadas: 35, prioridad: 'ALTA', atrasado: true, entrega: '16 jun' },
  { id: '1275', nombre: 'Casa del Puente', cliente: 'Estudio Roan', total: 54, completadas: 54, prioridad: 'BAJA', atrasado: false, entrega: '12 jun' },
  { id: '1279', nombre: 'Torre Liena', cliente: 'Constructora del Sur', total: 168, completadas: 102, prioridad: 'MEDIA', atrasado: false, entrega: '02 jul' },
]

type Proceso = {
  nombre: string
  operario: string
  pendientes: number
  enProceso: number
  capacidadDia: number
}

const PROCESOS: Proceso[] = [
  { nombre: 'Corte Láser', operario: 'ERIK', pendientes: 64, enProceso: 142, capacidadDia: 120 },
  { nombre: 'Plegado', operario: 'CRISTIAN', pendientes: 41, enProceso: 38, capacidadDia: 90 },
  { nombre: 'Pintura', operario: 'ERIK', pendientes: 22, enProceso: 0, capacidadDia: 60 },
  { nombre: 'Armado', operario: 'CRISTIAN', pendientes: 19, enProceso: 12, capacidadDia: 45 },
]

type OT = {
  numero: string
  proyecto: string
  proceso: string
  operario: string
  descripcion: string
  piezas: number
  avance: number
  estado: 'EN PROCESO' | 'EN ESPERA' | 'PENDIENTE'
}

const ORDENES: OT[] = [
  { numero: 'OT-1816', proyecto: '1273 · Gran Tortola', proceso: 'Corte Láser', operario: 'ERIK', descripcion: 'Perfil Omega Inclinado · Chapa Galv. 1.2mm Crudo', piezas: 142, avance: 62, estado: 'EN PROCESO' },
  { numero: 'OT-1809', proyecto: '1268 · Mirador Norte', proceso: 'Plegado', operario: 'CRISTIAN', descripcion: 'Bandeja lisa · Chapa Luxider 0.6mm Gris Grafito', piezas: 96, avance: 74, estado: 'EN PROCESO' },
  { numero: 'OT-1822', proyecto: '1281 · Edificio Aurora', proceso: 'Corte Láser', operario: 'ERIK', descripcion: 'Panel perforado · Chapa Galv. 0.7mm Crudo', piezas: 210, avance: 17, estado: 'EN ESPERA' },
  { numero: 'OT-1827', proyecto: '1279 · Torre Liena', proceso: 'Plegado', operario: 'CRISTIAN', descripcion: 'Cassette plegado · Chapa Luxider 0.8mm Gris Grafito', piezas: 168, avance: 61, estado: 'EN PROCESO' },
  { numero: 'OT-1831', proyecto: '1281 · Edificio Aurora', proceso: 'Pintura', operario: 'ERIK', descripcion: 'Terminación gris grafito mate', piezas: 64, avance: 0, estado: 'PENDIENTE' },
]

type Atrasada = {
  proyecto: string
  pieza: string
  proceso: string
  diasAtraso: number
  cantidad: number
}

const ATRASADAS: Atrasada[] = [
  { proyecto: '1281 · Edificio Aurora', pieza: 'Panel perforado 0.7mm', proceso: 'Corte Láser', diasAtraso: 3, cantidad: 48 },
  { proyecto: '1281 · Edificio Aurora', pieza: 'Marco perimetral', proceso: 'Plegado', diasAtraso: 2, cantidad: 24 },
  { proyecto: '1273 · Gran Tortola', pieza: 'Omega inclinado L=1273', proceso: 'Corte Láser', diasAtraso: 1, cantidad: 18 },
]

// Totales derivados
const totalPiezas = PROYECTOS.reduce((a, p) => a + p.total, 0)
const totalCompletadas = PROYECTOS.reduce((a, p) => a + p.completadas, 0)
const totalPendientes = totalPiezas - totalCompletadas
const avanceGlobal = Math.round((totalCompletadas / totalPiezas) * 100)
const otActivas = ORDENES.filter((o) => o.estado !== 'PENDIENTE').length
const piezasAtrasadas = ATRASADAS.reduce((a, x) => a + x.cantidad, 0)

const pct = (p: Proyecto) => Math.round((p.completadas / p.total) * 100)

// ----------------------------- ÁTOMOS COMPARTIDOS -----------------------------

function Barra({ valor, tono = 'emerald' }: { valor: number; tono?: 'emerald' | 'amber' | 'sky' | 'red' }) {
  const colores: Record<string, string> = {
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    sky: 'bg-sky-500',
    red: 'bg-red-500',
  }
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-800">
      <div className={`h-full rounded-full ${colores[tono]}`} style={{ width: `${Math.min(100, valor)}%` }} />
    </div>
  )
}

function Anillo({ valor, size = 96 }: { valor: number; size?: number }) {
  const r = (size - 12) / 2
  const c = 2 * Math.PI * r
  const off = c - (valor / 100) * c
  const tono = valor >= 90 ? '#10b981' : valor >= 40 ? '#f59e0b' : '#ef4444'
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} stroke="#1f2937" strokeWidth="10" fill="none" />
      <circle cx={size / 2} cy={size / 2} r={r} stroke={tono} strokeWidth="10" fill="none" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off} />
      <text x="50%" y="50%" dy="0.35em" textAnchor="middle" className="rotate-90" style={{ transformOrigin: 'center' }} fill="#f3f4f6" fontSize={size * 0.24} fontWeight={700}>
        {valor}%
      </text>
    </svg>
  )
}

function Header() {
  return (
    <div className="mb-6 flex items-end justify-between border-b border-gray-800 pb-4">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-white">VELUM · Producción</h1>
          <span className="rounded bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-400 ring-1 ring-amber-500/30">BOCETO</span>
        </div>
        <p className="mt-1 text-sm text-gray-500">Datos en vivo desde HULL · actualizado hace 8 min</p>
      </div>
      <div className="text-right text-sm text-gray-400">
        <div className="font-mono text-lg text-white">{new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
        <div>5 proyectos activos</div>
      </div>
    </div>
  )
}

function EstadoChip({ estado }: { estado: OT['estado'] }) {
  const map: Record<OT['estado'], string> = {
    'EN PROCESO': 'bg-emerald-500/15 text-emerald-400 ring-emerald-500/30',
    'EN ESPERA': 'bg-amber-500/15 text-amber-400 ring-amber-500/30',
    PENDIENTE: 'bg-gray-500/15 text-gray-400 ring-gray-500/30',
  }
  return <span className={`rounded px-2 py-0.5 text-xs font-medium ring-1 ${map[estado]}`}>{estado}</span>
}

// ----------------------------- VARIANTE A — Centro de Control -----------------------------
// KPIs grandes arriba + tabla densa de proyectos + carga por proceso. Pensado para monitor de pared.

function VariantA() {
  const kpis = [
    { label: 'Piezas pendientes', valor: totalPendientes, sub: `de ${totalPiezas} totales`, tono: 'text-sky-400' },
    { label: 'Avance global', valor: `${avanceGlobal}%`, sub: `${totalCompletadas} completadas`, tono: 'text-emerald-400' },
    { label: 'OT activas', valor: otActivas, sub: `${ORDENES.length} en total`, tono: 'text-white' },
    { label: 'Piezas atrasadas', valor: piezasAtrasadas, sub: `${ATRASADAS.length} ítems`, tono: 'text-red-400' },
  ]
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-xl border border-gray-800 bg-gray-900 p-5">
            <div className="text-sm text-gray-400">{k.label}</div>
            <div className={`mt-2 text-4xl font-bold ${k.tono}`}>{k.valor}</div>
            <div className="mt-1 text-xs text-gray-500">{k.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border border-gray-800 bg-gray-900">
          <div className="border-b border-gray-800 px-5 py-3 text-sm font-semibold text-gray-300">Avance por proyecto</div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="px-5 py-2 font-medium">Proyecto</th>
                <th className="px-3 py-2 font-medium">Entrega</th>
                <th className="px-3 py-2 font-medium">Piezas</th>
                <th className="px-5 py-2 font-medium">Avance</th>
              </tr>
            </thead>
            <tbody>
              {PROYECTOS.map((p) => (
                <tr key={p.id} className="border-t border-gray-800/70">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      {p.atrasado && <span className="h-2 w-2 rounded-full bg-red-500 velum-alert-pulse" />}
                      <span className="font-medium text-white">{p.id} · {p.nombre}</span>
                    </div>
                    <div className="text-xs text-gray-500">{p.cliente}</div>
                  </td>
                  <td className={`px-3 py-3 ${p.atrasado ? 'text-red-400' : 'text-gray-300'}`}>{p.entrega}</td>
                  <td className="px-3 py-3 text-gray-300">{p.completadas}/{p.total}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <Barra valor={pct(p)} tono={pct(p) >= 100 ? 'emerald' : p.atrasado ? 'red' : 'sky'} />
                      <span className="w-9 text-right text-xs font-semibold text-gray-300">{pct(p)}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
            <div className="mb-4 text-sm font-semibold text-gray-300">Carga por proceso</div>
            <div className="space-y-4">
              {PROCESOS.map((pr) => {
                const carga = Math.round((pr.pendientes / pr.capacidadDia) * 100)
                return (
                  <div key={pr.nombre}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="text-gray-200">{pr.nombre}</span>
                      <span className="text-gray-500">{pr.pendientes} pend. · {pr.operario}</span>
                    </div>
                    <Barra valor={carga} tono={carga > 100 ? 'red' : carga > 70 ? 'amber' : 'emerald'} />
                  </div>
                )
              })}
            </div>
          </div>

          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-5">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-red-400">
              <span className="h-2 w-2 rounded-full bg-red-500 velum-alert-pulse" /> Atrasadas
            </div>
            <ul className="space-y-2 text-sm">
              {ATRASADAS.map((a, i) => (
                <li key={i} className="flex items-center justify-between">
                  <div>
                    <div className="text-gray-200">{a.pieza}</div>
                    <div className="text-xs text-gray-500">{a.proyecto} · {a.proceso}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-red-400">+{a.diasAtraso}d</div>
                    <div className="text-xs text-gray-500">{a.cantidad} pzs</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

// ----------------------------- VARIANTE B — Kanban por proceso -----------------------------
// Columnas por equipo/proceso. Las OT "fluyen" por las columnas. Operativo, visual, orientado a planta.

function VariantB() {
  const columnas = PROCESOS.map((pr) => ({
    proceso: pr,
    ordenes: ORDENES.filter((o) => o.proceso === pr.nombre),
  }))
  return (
    <div>
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Mini label="Pendientes" valor={totalPendientes} tono="text-sky-400" />
        <Mini label="En proceso" valor={ORDENES.filter((o) => o.estado === 'EN PROCESO').reduce((a, o) => a + o.piezas, 0)} tono="text-emerald-400" />
        <Mini label="OT activas" valor={otActivas} tono="text-white" />
        <Mini label="Atrasadas" valor={piezasAtrasadas} tono="text-red-400" />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {columnas.map(({ proceso, ordenes }) => {
          const carga = Math.round((proceso.pendientes / proceso.capacidadDia) * 100)
          return (
            <div key={proceso.nombre} className="flex flex-col rounded-xl border border-gray-800 bg-gray-900/60">
              <div className="rounded-t-xl border-b border-gray-800 bg-gray-900 px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white">{proceso.nombre}</span>
                  <span className="rounded bg-gray-800 px-2 py-0.5 text-xs text-gray-300">{proceso.pendientes} pzs</span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <div className="grid h-6 w-6 place-items-center rounded-full bg-indigo-500/20 text-[10px] font-bold text-indigo-300">
                    {proceso.operario.slice(0, 2)}
                  </div>
                  <span className="text-xs text-gray-400">{proceso.operario}</span>
                  <span className={`ml-auto text-xs font-medium ${carga > 100 ? 'text-red-400' : carga > 70 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {carga}% carga
                  </span>
                </div>
              </div>
              <div className="flex-1 space-y-3 p-3">
                {ordenes.length === 0 && <div className="py-8 text-center text-xs text-gray-600">Sin OT activas</div>}
                {ordenes.map((o) => (
                  <div key={o.numero} className="rounded-lg border border-gray-800 bg-gray-900 p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs text-gray-400">{o.numero}</span>
                      <EstadoChip estado={o.estado} />
                    </div>
                    <div className="mt-1 text-sm font-medium text-white">{o.proyecto}</div>
                    <div className="mt-0.5 text-xs text-gray-500">{o.descripcion}</div>
                    <div className="mt-2 flex items-center gap-2">
                      <Barra valor={o.avance} tono={o.estado === 'EN PROCESO' ? 'emerald' : 'amber'} />
                      <span className="w-9 text-right text-xs text-gray-400">{o.avance}%</span>
                    </div>
                    <div className="mt-1 text-right text-xs text-gray-600">{o.piezas} piezas</div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Mini({ label, valor, tono }: { label: string; valor: number; tono: string }) {
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900 px-4 py-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className={`text-2xl font-bold ${tono}`}>{valor}</div>
    </div>
  )
}

// ----------------------------- VARIANTE C — Foco en proyectos -----------------------------
// Tarjetas grandes por proyecto con anillo de avance, desglose por proceso, operarios y alertas. Menos ítems, más detalle.

function VariantC() {
  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {PROYECTOS.map((p) => {
        const otsProyecto = ORDENES.filter((o) => o.proyecto.startsWith(p.id))
        return (
          <div
            key={p.id}
            className={`rounded-2xl border bg-gray-900 p-5 ${p.atrasado ? 'border-red-500/40' : 'border-gray-800'}`}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-gray-500">#{p.id}</span>
                  {p.prioridad === 'ALTA' && <span className="rounded bg-indigo-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-300">PRIORIDAD</span>}
                  {p.atrasado && <span className="rounded bg-red-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-red-400">ATRASADO</span>}
                </div>
                <h3 className="mt-1 text-lg font-bold text-white">{p.nombre}</h3>
                <p className="text-xs text-gray-500">{p.cliente}</p>
              </div>
              <Anillo valor={pct(p)} />
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-gray-800/50 py-2">
                <div className="text-lg font-bold text-emerald-400">{p.completadas}</div>
                <div className="text-[10px] uppercase text-gray-500">Listas</div>
              </div>
              <div className="rounded-lg bg-gray-800/50 py-2">
                <div className="text-lg font-bold text-sky-400">{p.total - p.completadas}</div>
                <div className="text-[10px] uppercase text-gray-500">Pendientes</div>
              </div>
              <div className="rounded-lg bg-gray-800/50 py-2">
                <div className={`text-lg font-bold ${p.atrasado ? 'text-red-400' : 'text-gray-200'}`}>{p.entrega}</div>
                <div className="text-[10px] uppercase text-gray-500">Entrega</div>
              </div>
            </div>

            <div className="mt-4 space-y-1.5">
              {otsProyecto.length === 0 && <div className="text-xs text-gray-600">Sin órdenes activas</div>}
              {otsProyecto.map((o) => (
                <div key={o.numero} className="flex items-center gap-2 text-xs">
                  <span className="w-28 shrink-0 truncate text-gray-400">{o.proceso}</span>
                  <Barra valor={o.avance} tono={o.estado === 'EN PROCESO' ? 'emerald' : o.estado === 'EN ESPERA' ? 'amber' : 'sky'} />
                  <span className="w-8 text-right text-gray-500">{o.avance}%</span>
                  <div className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-indigo-500/20 text-[9px] font-bold text-indigo-300">{o.operario.slice(0, 2)}</div>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ----------------------------- SWITCHER + PAGE -----------------------------

const VARIANTS: Record<string, { nombre: string; comp: () => JSX.Element }> = {
  A: { nombre: 'Centro de Control', comp: VariantA },
  B: { nombre: 'Kanban por proceso', comp: VariantB },
  C: { nombre: 'Foco en proyectos', comp: VariantC },
}
const KEYS = Object.keys(VARIANTS)

export default function PrototipoProduccion() {
  const [variant, setVariant] = useState('A')

  useEffect(() => {
    const v = new URLSearchParams(window.location.search).get('variant')
    if (v && VARIANTS[v]) setVariant(v)
  }, [])

  const cambiar = useCallback((v: string) => {
    setVariant(v)
    const url = new URL(window.location.href)
    url.searchParams.set('variant', v)
    window.history.replaceState(null, '', url.toString())
  }, [])

  const mover = useCallback(
    (dir: number) => {
      const i = KEYS.indexOf(variant)
      cambiar(KEYS[(i + dir + KEYS.length) % KEYS.length])
    },
    [variant, cambiar]
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
      if (e.key === 'ArrowLeft') mover(-1)
      if (e.key === 'ArrowRight') mover(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mover])

  const Comp = VARIANTS[variant].comp

  return (
    <div className="min-h-screen bg-gray-950 px-6 py-6 text-gray-100">
      <div className="mx-auto max-w-7xl">
        <Header />
        <Comp />
      </div>

      {/* Barra flotante para cambiar de boceto */}
      <div className="fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1 rounded-full border border-gray-700 bg-gray-900/95 px-2 py-1.5 shadow-2xl ring-1 ring-black/40 backdrop-blur">
        <button onClick={() => mover(-1)} className="grid h-8 w-8 place-items-center rounded-full text-gray-400 hover:bg-gray-800 hover:text-white" aria-label="Anterior">←</button>
        <div className="px-3 text-sm">
          <span className="font-bold text-white">Boceto {variant}</span>
          <span className="ml-2 text-gray-400">{VARIANTS[variant].nombre}</span>
        </div>
        <button onClick={() => mover(1)} className="grid h-8 w-8 place-items-center rounded-full text-gray-400 hover:bg-gray-800 hover:text-white" aria-label="Siguiente">→</button>
        <div className="ml-1 flex gap-1 border-l border-gray-700 pl-2">
          {KEYS.map((k) => (
            <button
              key={k}
              onClick={() => cambiar(k)}
              className={`h-7 w-7 rounded-full text-xs font-bold ${k === variant ? 'bg-white text-gray-900' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
            >
              {k}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
