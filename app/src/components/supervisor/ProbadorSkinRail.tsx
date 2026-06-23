'use client'

import { useState } from 'react'
import { cotizarSkinRailAction, type SkinRailResult } from '@/app/(supervisor)/cotizador/actions-f2'
import { ALCANCES } from '@/lib/cotizador/skin/probador-input'

type FormState = {
  ancho: string; alto: string; modAncho: string; modAlto: string
  sepParedMm: string; margenPct: string; material: string; diseno: string; alcance: string
}

const DEFAULTS: FormState = {
  ancho: '30', alto: '25', modAncho: '1', modAlto: '1',
  sepParedMm: '0', margenPct: '60', material: 'Bond 4mm', diseno: 'Composite',
  alcance: 'Completo + Estructura',
}

const fmt = (n: number) => n.toLocaleString('es-AR', { maximumFractionDigits: 2 })
const ni = 'w-full bg-gray-800 text-white rounded px-2 py-1 text-sm'
const lbl = 'block text-gray-400 text-xs mb-1'

export default function ProbadorSkinRail({ materiales, disenos }: { materiales: string[]; disenos: string[] }) {
  const [form, setForm] = useState<FormState>(DEFAULTS)
  const [res, setRes] = useState<SkinRailResult | null>(null)
  const [cargando, setCargando] = useState(false)

  function set<K extends keyof FormState>(k: K, v: string) {
    setForm(prev => ({ ...prev, [k]: v }))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setCargando(true)
    try {
      const r = await cotizarSkinRailAction({
        ancho: Number(form.ancho), alto: Number(form.alto),
        modAncho: Number(form.modAncho), modAlto: Number(form.modAlto),
        sepParedMm: Number(form.sepParedMm), margenPct: Number(form.margenPct),
        material: form.material, diseno: form.diseno, alcance: form.alcance,
      })
      setRes(r)
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="bg-gray-900 rounded p-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div><label className={lbl}>Ancho (m)</label><input className={ni} type="number" step="any" value={form.ancho} onChange={e => set('ancho', e.target.value)} /></div>
        <div><label className={lbl}>Alto (m)</label><input className={ni} type="number" step="any" value={form.alto} onChange={e => set('alto', e.target.value)} /></div>
        <div><label className={lbl}>Margen (%)</label><input className={ni} type="number" step="any" value={form.margenPct} onChange={e => set('margenPct', e.target.value)} /></div>
        <div><label className={lbl}>Módulo ancho (m)</label><input className={ni} type="number" step="any" value={form.modAncho} onChange={e => set('modAncho', e.target.value)} /></div>
        <div><label className={lbl}>Módulo alto (m)</label><input className={ni} type="number" step="any" value={form.modAlto} onChange={e => set('modAlto', e.target.value)} /></div>
        <div><label className={lbl}>Sep. pared (mm)</label><input className={ni} type="number" step="any" value={form.sepParedMm} onChange={e => set('sepParedMm', e.target.value)} /></div>
        <div>
          <label className={lbl}>Material</label>
          <select className={ni} value={form.material} onChange={e => set('material', e.target.value)}>
            {materiales.filter(m => !m.startsWith('MultiSlim')).map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className={lbl}>Diseño</label>
          <select className={ni} value={form.diseno} onChange={e => set('diseno', e.target.value)}>
            {disenos.filter(d => !d.startsWith('MultiSlim')).map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label className={lbl}>Alcance</label>
          <select className={ni} value={form.alcance} onChange={e => set('alcance', e.target.value)}>
            {ALCANCES.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div className="col-span-2 sm:col-span-3">
          <button type="submit" disabled={cargando} className="bg-gray-700 hover:bg-gray-600 text-white rounded px-4 py-2 text-sm disabled:opacity-50">
            {cargando ? 'Cotizando…' : 'Cotizar Skin.Rail'}
          </button>
        </div>
      </form>

      {res && !res.ok && <p className="text-red-400 text-sm bg-red-950/40 rounded p-3">{res.error}</p>}
      {res && res.ok && <ResultadoSkinRail res={res} />}
    </div>
  )
}

function ResultadoSkinRail({ res }: { res: Extract<SkinRailResult, { ok: true }> }) {
  const { resultado: r } = res
  const card = 'bg-gray-900 rounded p-3'
  const big = 'text-white text-xl font-bold'
  const cap = 'text-gray-500 text-xs'
  const row = 'flex justify-between text-sm py-1 border-b border-gray-800'
  const g = r.geometria

  return (
    <div className="space-y-4">
      <p className="text-gray-400 text-xs">
        Skin.Rail · {fmt(res.resumen.ancho)}×{fmt(res.resumen.alto)} m · {res.resumen.material} · Kp {res.resumen.kp} · {res.resumen.alcance} · margen {res.resumen.margenPct}%
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
        <div className={row}><span className="text-gray-400">Parantes</span><span className="text-white">u$d {fmt(r.parantes)}</span></div>
      </div>

      <div className={card}>
        <h2 className="text-white text-sm font-semibold mb-2">Geometría Skin + Omega</h2>
        <div className={row}><span className="text-gray-400">Área / paneles</span><span className="text-white">{fmt(g.area)} m² / {g.paneles}</span></div>
        <div className={row}><span className="text-gray-400">Costillas / piezas</span><span className="text-white">{g.costillas} / {g.piezasCostilla}</span></div>
        <div className={row}><span className="text-gray-400">Ménsulas</span><span className="text-white">{g.mensulasTotal}</span></div>
        <div className={row}><span className="text-gray-400">Omegas / ml</span><span className="text-white">{g.omegas} / {fmt(g.mlOmega)} m</span></div>
        <div className={row}><span className="text-gray-400">Empalles C</span><span className="text-white">{g.empallesC}</span></div>
      </div>

      <p className="text-gray-500 text-xs italic bg-gray-900 rounded p-3">
        Precios aproximados. La cotización final se confirma tras relevamiento en obra.
      </p>
    </div>
  )
}
