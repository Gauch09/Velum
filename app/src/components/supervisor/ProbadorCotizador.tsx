'use client'

import { useState } from 'react'
import { cotizarVanoAction, type CotizarVanoResult } from '@/app/(supervisor)/cotizador/actions'
import { ALCANCES } from '@/lib/cotizador/skin/probador-input'

type Props = { materiales: string[]; disenos: string[] }

type FormState = {
  ancho: string
  alto: string
  modAncho: string
  modAlto: string
  sepParedMm: string
  margenPct: string
  material: string
  diseno: string
  alcance: string
}

const DEFAULTS: FormState = {
  ancho: '30',
  alto: '25',
  modAncho: '1',
  modAlto: '1',
  sepParedMm: '0',
  margenPct: '150',
  material: 'Bond 4mm',
  diseno: 'Composite',
  alcance: 'Completo + Estructura',
}

const fmt = (n: number) => n.toLocaleString('es-AR', { maximumFractionDigits: 2 })

export default function ProbadorCotizador({ materiales, disenos }: Props) {
  const [form, setForm] = useState<FormState>(DEFAULTS)
  const [res, setRes] = useState<CotizarVanoResult | null>(null)
  const [cargando, setCargando] = useState(false)

  function set<K extends keyof FormState>(k: K, v: string) {
    setForm(prev => ({ ...prev, [k]: v }))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setCargando(true)
    try {
      const r = await cotizarVanoAction({
        ancho: Number(form.ancho),
        alto: Number(form.alto),
        modAncho: Number(form.modAncho),
        modAlto: Number(form.modAlto),
        sepParedMm: Number(form.sepParedMm),
        margenPct: Number(form.margenPct),
        material: form.material,
        diseno: form.diseno,
        alcance: form.alcance,
      })
      setRes(r)
    } finally {
      setCargando(false)
    }
  }

  const numInput = 'w-full bg-gray-800 text-white rounded px-2 py-1 text-sm'
  const label = 'block text-gray-400 text-xs mb-1'

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="bg-gray-900 rounded p-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div>
          <label htmlFor="ancho" className={label}>Ancho (m)</label>
          <input id="ancho" className={numInput} type="number" step="any" value={form.ancho} onChange={e => set('ancho', e.target.value)} />
        </div>
        <div>
          <label htmlFor="alto" className={label}>Alto (m)</label>
          <input id="alto" className={numInput} type="number" step="any" value={form.alto} onChange={e => set('alto', e.target.value)} />
        </div>
        <div>
          <label htmlFor="margenPct" className={label}>Margen (%)</label>
          <input id="margenPct" className={numInput} type="number" step="any" value={form.margenPct} onChange={e => set('margenPct', e.target.value)} />
        </div>
        <div>
          <label htmlFor="modAncho" className={label}>Módulo ancho (m)</label>
          <input id="modAncho" className={numInput} type="number" step="any" value={form.modAncho} onChange={e => set('modAncho', e.target.value)} />
        </div>
        <div>
          <label htmlFor="modAlto" className={label}>Módulo alto (m)</label>
          <input id="modAlto" className={numInput} type="number" step="any" value={form.modAlto} onChange={e => set('modAlto', e.target.value)} />
        </div>
        <div>
          <label htmlFor="sepParedMm" className={label}>Sep. pared (mm)</label>
          <input id="sepParedMm" className={numInput} type="number" step="any" value={form.sepParedMm} onChange={e => set('sepParedMm', e.target.value)} />
        </div>
        <div>
          <label htmlFor="material" className={label}>Material</label>
          <select id="material" className={numInput} value={form.material} onChange={e => set('material', e.target.value)}>
            {materiales.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="diseno" className={label}>Diseño</label>
          <select id="diseno" className={numInput} value={form.diseno} onChange={e => set('diseno', e.target.value)}>
            {disenos.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="alcance" className={label}>Alcance</label>
          <select id="alcance" className={numInput} value={form.alcance} onChange={e => set('alcance', e.target.value)}>
            {ALCANCES.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div className="col-span-2 sm:col-span-3">
          <button type="submit" disabled={cargando} className="bg-gray-700 hover:bg-gray-600 text-white rounded px-4 py-2 text-sm disabled:opacity-50">
            {cargando ? 'Cotizando…' : 'Cotizar'}
          </button>
        </div>
      </form>

      {res && !res.ok && (
        <p className="text-red-400 text-sm bg-red-950/40 rounded p-3">{res.error}</p>
      )}

      {res && res.ok && <Resultado res={res} />}
    </div>
  )
}

function Resultado({ res }: { res: Extract<CotizarVanoResult, { ok: true }> }) {
  const { resultado: r, resumen: s } = res
  const card = 'bg-gray-900 rounded p-3'
  const big = 'text-white text-xl font-bold'
  const cap = 'text-gray-500 text-xs'
  const row = 'flex justify-between text-sm py-1 border-b border-gray-800'

  return (
    <div className="space-y-4">
      <p className="text-gray-400 text-xs">
        Vano {fmt(s.ancho)}×{fmt(s.alto)} m · {s.material} ({s.familia}, {s.espesorMm}mm) · {s.diseno} (Kp {s.kp}) · {s.alcance} · margen {s.margenPct}%
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className={card}><div className={big}>u$d {fmt(r.costoTotal)}</div><div className={cap}>Costo total</div></div>
        <div className={card}><div className={big}>{fmt(r.costoM2)}</div><div className={cap}>Costo u$d/m²</div></div>
        <div className={card}><div className={big}>u$d {fmt(r.precioVenta)}</div><div className={cap}>Precio de venta</div></div>
        <div className={card}><div className={big}>{fmt(r.precioM2)}</div><div className={cap}>Precio u$d/m²</div></div>
      </div>

      <div className={card}>
        <h2 className="text-white text-sm font-semibold mb-2">Desglose de costo</h2>
        <div className={row}><span className="text-gray-400">Material</span><span className="text-white">u$d {fmt(r.material)}</span></div>
        <div className={row}><span className="text-gray-400">Fabricación</span><span className="text-white">u$d {fmt(r.fab)}</span></div>
        <div className={row}><span className="text-gray-400">Pintura</span><span className="text-white">u$d {fmt(r.pintura)}</span></div>
        <div className={row}><span className="text-gray-400">Tornillería</span><span className="text-white">u$d {fmt(r.tornilleria)}</span></div>
        <div className={row}><span className="text-gray-400">Parantes</span><span className="text-white">u$d {fmt(r.parantes)}</span></div>
      </div>

      <div className={card}>
        <h2 className="text-white text-sm font-semibold mb-2">Conteo geométrico</h2>
        <div className={row}><span className="text-gray-400">Área fachada</span><span className="text-white">{fmt(r.geometria.area)} m²</span></div>
        <div className={row}><span className="text-gray-400">Columnas × filas</span><span className="text-white">{r.geometria.columnas} × {r.geometria.filas}</span></div>
        <div className={row}><span className="text-gray-400">Paneles</span><span className="text-white">{r.geometria.paneles}</span></div>
        <div className={row}><span className="text-gray-400">Costillas (piezas)</span><span className="text-white">{r.geometria.costillas} ({r.geometria.piezasCostilla})</span></div>
        <div className={row}><span className="text-gray-400">Ménsulas</span><span className="text-white">{r.geometria.mensulasTotal}</span></div>
        <div className={row}><span className="text-gray-400">Empalmes J</span><span className="text-white">{r.geometria.empalmesJ}</span></div>
        <div className={row}><span className="text-gray-400">Brocas / autoperf.</span><span className="text-white">{r.geometria.brocas} / {r.geometria.autoperf}</span></div>
      </div>

      <p className="text-gray-500 text-xs italic bg-gray-900 rounded p-3">
        Precios aproximados. La cotización final se confirma una vez aceptada, tras el relevamiento en obra, donde se definen cierres, detalles y posibles interferencias no previstas en planos.
      </p>
    </div>
  )
}
