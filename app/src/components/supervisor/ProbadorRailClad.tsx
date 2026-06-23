'use client'

import { useState } from 'react'
import { cotizarRailAction, cotizarCladAction, type RailResult, type CladResult } from '@/app/(supervisor)/cotizador/actions-f2'
import TablaDesglose from './TablaDesglose'

type Sistema = 'Rail' | 'Clad'
type Variante = 'MultiSlim Standard' | 'MultiSlim.A'
type AlcanceClad = 'Pintado' | 'Crudo (sin pintura)'

type FormState = {
  ancho: string
  alto: string
  margenPct: string
  variante: Variante
  alcance: AlcanceClad
}

const DEFAULTS: FormState = {
  ancho: '10',
  alto: '8',
  margenPct: '60',
  variante: 'MultiSlim Standard',
  alcance: 'Pintado',
}

const fmt = (n: number) => n.toLocaleString('es-AR', { maximumFractionDigits: 2 })
const ni = 'w-full bg-gray-800 text-white rounded px-2 py-1 text-sm'
const lbl = 'block text-gray-400 text-xs mb-1'

export default function ProbadorRailClad({ sistema }: { sistema: Sistema }) {
  const [form, setForm] = useState<FormState>(DEFAULTS)
  const [res, setRes] = useState<RailResult | CladResult | null>(null)
  const [cargando, setCargando] = useState(false)

  function set<K extends keyof FormState>(k: K, v: string) {
    setForm(prev => ({ ...prev, [k]: v }))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setCargando(true)
    try {
      const base = { ancho: Number(form.ancho), alto: Number(form.alto), margenPct: Number(form.margenPct), variante: form.variante }
      const r = sistema === 'Rail'
        ? await cotizarRailAction(base)
        : await cotizarCladAction({ ...base, alcance: form.alcance })
      setRes(r)
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="bg-gray-900 rounded p-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div>
          <label className={lbl}>Ancho (m)</label>
          <input className={ni} type="number" step="any" value={form.ancho} onChange={e => set('ancho', e.target.value)} />
        </div>
        <div>
          <label className={lbl}>Alto (m)</label>
          <input className={ni} type="number" step="any" value={form.alto} onChange={e => set('alto', e.target.value)} />
        </div>
        <div>
          <label className={lbl}>Margen (%)</label>
          <input className={ni} type="number" step="any" value={form.margenPct} onChange={e => set('margenPct', e.target.value)} />
        </div>
        <div>
          <label className={lbl}>Variante de lama</label>
          <select className={ni} value={form.variante} onChange={e => set('variante', e.target.value as Variante)}>
            <option value="MultiSlim Standard">MultiSlim Standard (Kp 1.333)</option>
            <option value="MultiSlim.A">MultiSlim.A (Kp 1.45)</option>
          </select>
        </div>
        {sistema === 'Clad' && (
          <div>
            <label className={lbl}>Acabado</label>
            <select className={ni} value={form.alcance} onChange={e => set('alcance', e.target.value as AlcanceClad)}>
              <option value="Pintado">Pintado</option>
              <option value="Crudo (sin pintura)">Crudo (sin pintura)</option>
            </select>
          </div>
        )}
        <div className="col-span-2 sm:col-span-3">
          <button type="submit" disabled={cargando} className="bg-gray-700 hover:bg-gray-600 text-white rounded px-4 py-2 text-sm disabled:opacity-50">
            {cargando ? 'Cotizando…' : `Cotizar ${sistema}`}
          </button>
        </div>
      </form>

      {res && !res.ok && <p className="text-red-400 text-sm bg-red-950/40 rounded p-3">{res.error}</p>}
      {res && res.ok && <ResultadoF2 res={res} sistema={sistema} />}
    </div>
  )
}

function ResultadoF2({ res, sistema }: { res: Extract<RailResult | CladResult, { ok: true }>; sistema: Sistema }) {
  const { resultado: r } = res
  const card = 'bg-gray-900 rounded p-3'
  const big = 'text-white text-xl font-bold'
  const cap = 'text-gray-500 text-xs'
  const row = 'flex justify-between text-sm py-1 border-b border-gray-800'
  const g = r.geometria

  return (
    <div className="space-y-4">
      <p className="text-gray-400 text-xs">
        {sistema} · {fmt(res.resumen.ancho)}×{fmt(res.resumen.alto)} m · {res.resumen.variante} (Kp {res.resumen.kp})
        {sistema === 'Clad' && 'alcance' in res.resumen ? ` · ${res.resumen.alcance}` : ''}
        {' · margen '}{res.resumen.margenPct}%
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className={card}><div className={big}>u$d {fmt(r.costoTotal)}</div><div className={cap}>Costo total</div></div>
        <div className={card}><div className={big}>{fmt(r.costoM2)}</div><div className={cap}>Costo u$d/m²</div></div>
        <div className={card}><div className={big}>u$d {fmt(r.precioVenta)}</div><div className={cap}>Precio venta</div></div>
        <div className={card}><div className={big}>{fmt(r.precioM2)}</div><div className={cap}>Precio u$d/m²</div></div>
      </div>

      <div className={card}>
        <h2 className="text-white text-sm font-semibold mb-2">Desglose</h2>
        <div className={row}><span className="text-gray-400">Material</span><span className="text-white">u$d {fmt(r.material)}</span></div>
        <div className={row}><span className="text-gray-400">Fabricación</span><span className="text-white">u$d {fmt(r.fab)}</span></div>
        <div className={row}><span className="text-gray-400">Pintura</span><span className="text-white">u$d {fmt(r.pintura)}</span></div>
        <div className={row}><span className="text-gray-400">Tornillería</span><span className="text-white">u$d {fmt(r.tornilleria)}</span></div>
      </div>

      <div className={card}>
        <h2 className="text-white text-sm font-semibold mb-2">Geometría</h2>
        <div className={row}><span className="text-gray-400">Área</span><span className="text-white">{fmt(g.area)} m²</span></div>
        <div className={row}><span className="text-gray-400">Lamas</span><span className="text-white">{g.lamasAncho} × {g.lamasFilas} = {g.lamas}</span></div>
        <div className={row}><span className="text-gray-400">Omegas / ml</span><span className="text-white">{g.omegas} / {fmt(g.mlOmega)} m</span></div>
        <div className={row}><span className="text-gray-400">Empalles C</span><span className="text-white">{g.empallesC}</span></div>
        {'PIC' in g && <div className={row}><span className="text-gray-400">PIC / brocas</span><span className="text-white">{(g as { PIC: number }).PIC} / {(g as { brocas: number }).brocas}</span></div>}
      </div>

      <TablaDesglose filas={res.desglose} />

      <p className="text-gray-500 text-xs italic bg-gray-900 rounded p-3">
        Precios aproximados. La cotización final se confirma tras relevamiento en obra.
      </p>
    </div>
  )
}
