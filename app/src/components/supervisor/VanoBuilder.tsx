'use client'

import { useState } from 'react'
import type { VanoInput, VanoResultado, Sistema } from '@/lib/cotizador/cotizar-multi'
import type { AlcanceTerminacion } from '@/lib/cotizador/skin/tipos'
import type { AlcanceClad } from '@/lib/cotizador/clad/tipos'

const COLORES_ACM = [
  'Dorado KR309',
  'Gris anodizado KR200',
  'Gris Silver KR201',
  'Negro KR150',
  'Blanco KR101',
]

interface Props {
  materialesSkin: string[]
  materialesLama: string[]
  materialesACM: string[]
  disenos: string[]
  margenPct: number
  onAgregar: (input: VanoInput, resultado: VanoResultado) => void
  accionCotizar: (raw: unknown) => Promise<VanoResultado>
}

const SISTEMAS: Sistema[] = ['Skin', 'Rail', 'Clad', 'SkinRail']
// Aluminio/acero: pintado siempre incluye estructura; o anodizado (solo panel, sin estructura)
const ALCANCES_ALUMINIO: AlcanceTerminacion[] = ['Completo + Estructura', 'Anodizado']
// ACM: viene pintado de fábrica, sin anodizado
const ALCANCES_ACM: AlcanceTerminacion[] = ['Completo (solo panel)', 'Completo + Estructura']
const ALCANCES_CLAD: AlcanceClad[] = ['Pintado', 'Crudo (sin pintura)']
const ALCANCES_RAIL: AlcanceTerminacion[] = ['Crudo (sin pintura)', 'Completo (solo panel)', 'Completo + Estructura']

const fmt = (n: number) => n.toLocaleString('es-AR', { maximumFractionDigits: 2 })
const usd = (n: number) => `u$d ${fmt(n)}`

function alcancesPorSistema(s: Sistema, esACM: boolean) {
  if (s === 'Clad') return ALCANCES_CLAD
  if (s === 'Rail') return ALCANCES_RAIL
  return esACM ? ALCANCES_ACM : ALCANCES_ALUMINIO
}

export default function VanoBuilder({ materialesSkin, materialesLama, materialesACM, disenos, margenPct, onAgregar, accionCotizar }: Props) {
  const [sistema, setSistema] = useState<Sistema>('Skin')
  const [material, setMaterial] = useState(materialesSkin[0] ?? '')
  const [colorACM, setColorACM] = useState(COLORES_ACM[0])
  const [diseno, setDiseno] = useState(disenos[0] ?? '')
  const [terminacion, setTerminacion] = useState<string>(ALCANCES_ALUMINIO[0])
  const [ancho, setAncho] = useState('30')
  const [alto, setAlto] = useState('25')
  const [modAncho, setModAncho] = useState('1')
  const [modAlto, setModAlto] = useState('1')
  const [sepPared, setSepPared] = useState('0')
  const [resultado, setResultado] = useState<VanoResultado | null>(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleSistema(s: Sistema) {
    setSistema(s)
    const esSkin = s === 'Skin' || s === 'SkinRail'
    const esLama = s === 'Rail' || s === 'Clad'
    const nuevoMaterial = esSkin ? (materialesSkin[0] ?? '') : (materialesLama[0] ?? '')
    if (esSkin) setMaterial(nuevoMaterial)
    if (esLama) setMaterial(nuevoMaterial)
    const nuevoEsACM = materialesACM.includes(nuevoMaterial)
    const nuevosAlcances = alcancesPorSistema(s, nuevoEsACM)
    setTerminacion(nuevosAlcances[0])
    setResultado(null)
  }

  function handleMaterial(m: string) {
    setMaterial(m)
    const nuevoEsACM = materialesACM.includes(m)
    const nuevosAlcances = alcancesPorSistema(sistema, nuevoEsACM)
    if (!(nuevosAlcances as string[]).includes(terminacion)) {
      setTerminacion(nuevosAlcances[0])
    }
    setResultado(null)
  }

  const materiales = (sistema === 'Rail' || sistema === 'Clad') ? materialesLama : materialesSkin
  const esACM = materialesACM.includes(material)
  const alcances = alcancesPorSistema(sistema, esACM)
  const necesitaDiseno = sistema === 'Skin' || sistema === 'SkinRail'
  const usaModulo = sistema === 'Skin' || sistema === 'SkinRail'  // Rail/Clad: módulo fijo por sistema
  const usaParante = sistema === 'Skin' || sistema === 'SkinRail'

  async function calcular() {
    setCargando(true)
    setError(null)
    try {
      const input: VanoInput = {
        sistema,
        material,
        colorACM: esACM ? colorACM : undefined,
        diseno: necesitaDiseno ? diseno : undefined,
        terminacion,
        ancho: Number(ancho),
        alto: Number(alto),
        modAncho: usaModulo ? Number(modAncho) : 1,
        modAlto:  usaModulo ? Number(modAlto)  : 1,
        sepParedMm: usaParante ? Number(sepPared) : 0,
        margenPct,
      }
      const r = await accionCotizar(input)
      setResultado(r)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al calcular')
    } finally {
      setCargando(false)
    }
  }

  function agregar() {
    if (!resultado) return
    const input: VanoInput = {
      sistema, material, colorACM: esACM ? colorACM : undefined,
      diseno: necesitaDiseno ? diseno : undefined,
      terminacion, ancho: Number(ancho), alto: Number(alto),
      modAncho: usaModulo ? Number(modAncho) : 1,
      modAlto:  usaModulo ? Number(modAlto)  : 1,
      sepParedMm: usaParante ? Number(sepPared) : 0,
      margenPct,
    }
    onAgregar(input, resultado)
    setResultado(null)
  }

  const sel = 'bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-gray-500 w-full'
  const inp = `${sel}`

  return (
    <div className="bg-gray-900 rounded-lg p-4 space-y-4">
      <p className="text-gray-400 text-xs uppercase tracking-wider">Agregar vano</p>

      {/* Sistema */}
      <div className="flex gap-2">
        {SISTEMAS.map(s => (
          <button
            key={s}
            onClick={() => handleSistema(s)}
            type="button"
            className={`flex-1 py-1.5 text-xs rounded border ${sistema === s ? 'bg-white text-gray-900 border-white font-semibold' : 'bg-transparent text-gray-400 border-gray-700 hover:border-gray-500'}`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-gray-500 text-xs mb-1">Material</label>
          <select value={material} onChange={e => handleMaterial(e.target.value)} className={sel}>
            {materiales.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        {esACM && (
          <div>
            <label className="block text-gray-500 text-xs mb-1">Color ACM</label>
            <select value={colorACM} onChange={e => { setColorACM(e.target.value); setResultado(null) }} className={sel}>
              {COLORES_ACM.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        )}
        {necesitaDiseno && (
          <div>
            <label className="block text-gray-500 text-xs mb-1">Diseño</label>
            <select value={diseno} onChange={e => { setDiseno(e.target.value); setResultado(null) }} className={sel}>
              {disenos.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        )}
        <div className={necesitaDiseno ? '' : 'col-span-2'}>
          <label className="block text-gray-500 text-xs mb-1">Terminación</label>
          <select value={terminacion} onChange={e => { setTerminacion(e.target.value); setResultado(null) }} className={sel}>
            {alcances.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-gray-500 text-xs mb-1">Ancho (m)</label>
          <input value={ancho} onChange={e => { setAncho(e.target.value); setResultado(null) }} type="number" step="0.1" className={inp} />
        </div>
        <div>
          <label className="block text-gray-500 text-xs mb-1">Alto (m)</label>
          <input value={alto} onChange={e => { setAlto(e.target.value); setResultado(null) }} type="number" step="0.1" className={inp} />
        </div>
        {usaModulo && (
          <>
            <div>
              <label className="block text-gray-500 text-xs mb-1">Módulo panel — ancho (m)</label>
              <input value={modAncho} onChange={e => { setModAncho(e.target.value); setResultado(null) }} type="number" step="0.05" min="0.1" className={inp} />
            </div>
            <div>
              <label className="block text-gray-500 text-xs mb-1">Módulo panel — alto (m)</label>
              <input value={modAlto} onChange={e => { setModAlto(e.target.value); setResultado(null) }} type="number" step="0.05" min="0.1" className={inp} />
            </div>
          </>
        )}
        {usaParante && (
          <div>
            <label className="block text-gray-500 text-xs mb-1">Separación de pared (mm · 0 = pegado)</label>
            <input value={sepPared} onChange={e => { setSepPared(e.target.value); setResultado(null) }} type="number" step="50" min="0" className={inp} />
          </div>
        )}
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {resultado && (
        <div className="bg-gray-800 rounded p-3 space-y-1 text-sm">
          <div className="flex justify-between text-gray-400">
            <span>Área</span><span className="text-white">{fmt(resultado.area)} m²</span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>Costo total</span><span className="text-white">{usd(resultado.costoTotal)}</span>
          </div>
          <div className="flex justify-between text-gray-300 font-semibold border-t border-gray-700 pt-1 mt-1">
            <span>Precio venta</span><span className="text-green-400">{usd(resultado.precioVenta)}</span>
          </div>
          <div className="flex justify-between text-gray-400 text-xs">
            <span>Precio / m²</span><span>{usd(resultado.precioM2)}/m²</span>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={calcular}
          disabled={cargando}
          className="flex-1 border border-gray-600 text-gray-300 text-sm py-2 rounded hover:border-gray-400 hover:text-white disabled:opacity-40"
        >
          {cargando ? 'Calculando…' : 'Calcular'}
        </button>
        {resultado && (
          <button
            type="button"
            onClick={agregar}
            className="flex-1 bg-white text-gray-900 text-sm font-semibold py-2 rounded hover:bg-gray-100"
          >
            Agregar vano
          </button>
        )}
      </div>
    </div>
  )
}
