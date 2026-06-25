'use client'

import { useState } from 'react'
import type { MedioElevacion } from '@/lib/cotizador/montaje/params-repo'
import type { MontajeResultado } from '@/lib/cotizador/montaje/calcularMontaje'

export interface MontajeSeleccion {
  medioElevacionId: string
  medioElevacionCostoMes: number
  nOperarios: number
  hsPresencial: boolean
  resultado: MontajeResultado
}

interface Props {
  totalM2: number
  margenPct: number
  mediosElevacion: MedioElevacion[]
  accionCalcular: (raw: unknown) => Promise<MontajeResultado>
  onChange: (sel: MontajeSeleccion | null) => void
}

const fmt = (n: number) => n.toLocaleString('es-AR', { maximumFractionDigits: 2 })
const usd = (n: number) => `u$d ${fmt(n)}`

export default function MontajeStep({ totalM2, margenPct, mediosElevacion, accionCalcular, onChange }: Props) {
  const [conMontaje, setConMontaje] = useState(true)
  const [medioId, setMedioId] = useState(mediosElevacion[0]?.id ?? '')
  const [nOperarios, setNOperarios] = useState('3')
  const [hsPresencial, setHsPresencial] = useState(false)
  const [resultado, setResultado] = useState<MontajeResultado | null>(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const medioSeleccionado = mediosElevacion.find(m => m.id === medioId)

  // Al cambiar cualquier parámetro, el cálculo previo deja de ser válido:
  // limpiamos el resultado local y avisamos al wizard que ya no hay montaje seleccionado.
  function invalidar() {
    setResultado(null)
    onChange(null)
  }

  function handleToggle(val: boolean) {
    setConMontaje(val)
    if (!val) invalidar()
  }

  async function calcular() {
    if (!medioSeleccionado) return
    setCargando(true)
    setError(null)
    try {
      const r = await accionCalcular({
        medioElevacionCostoMes: medioSeleccionado.costoMes,
        nOperarios: Number(nOperarios),
        totalM2,
        hsPresencial,
        margenPct,
      })
      setResultado(r)
      onChange({
        medioElevacionId: medioId,
        medioElevacionCostoMes: medioSeleccionado.costoMes,
        nOperarios: Number(nOperarios),
        hsPresencial,
        resultado: r,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al calcular')
    } finally {
      setCargando(false)
    }
  }

  const sel = 'w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-gray-500'

  return (
    <div className="space-y-4">
      {/* Toggle con/sin montaje */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => handleToggle(false)}
          className={`flex-1 py-2 text-sm rounded border ${!conMontaje ? 'bg-white text-gray-900 border-white font-semibold' : 'bg-transparent text-gray-400 border-gray-700 hover:border-gray-500'}`}
        >
          Solo provisión
        </button>
        <button
          type="button"
          onClick={() => handleToggle(true)}
          className={`flex-1 py-2 text-sm rounded border ${conMontaje ? 'bg-white text-gray-900 border-white font-semibold' : 'bg-transparent text-gray-400 border-gray-700 hover:border-gray-500'}`}
        >
          Con montaje
        </button>
      </div>

      {conMontaje && (
        <div className="bg-gray-900 rounded-lg p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-gray-500 text-xs mb-1">Medio de elevación</label>
              <select
                value={medioId}
                onChange={e => { setMedioId(e.target.value); invalidar() }}
                className={sel}
              >
                {mediosElevacion.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.nombre} — u$d {fmt(m.costoMes)}/mes (hasta {m.alturaMaxM} m)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-gray-500 text-xs mb-1">Operarios</label>
              <input
                type="number"
                min="1"
                max="20"
                value={nOperarios}
                onChange={e => { setNOperarios(e.target.value); invalidar() }}
                className={sel}
              />
            </div>

            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hsPresencial}
                  onChange={e => { setHsPresencial(e.target.checked); invalidar() }}
                  className="accent-blue-500 w-4 h-4"
                />
                <span className="text-gray-300 text-sm">Ing. H&S presencial</span>
              </label>
            </div>
          </div>

          <div className="text-xs text-gray-600 bg-gray-800 rounded px-3 py-2">
            Área total: {fmt(totalM2)} m² · Rendimiento: {Number(nOperarios)} op × 20 m²/día →
            <span className="text-gray-400"> {resultado ? `${resultado.diasObra} días estimados` : '— días'}</span>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          {resultado && (
            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-gray-400">
                <span>Elevación ({resultado.diasObra} días)</span>
                <span className="text-white">{usd(resultado.costoElevacion)}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Operarios</span>
                <span className="text-white">{usd(resultado.costoOperarios)}</span>
              </div>
              {resultado.costoHS > 0 && (
                <div className="flex justify-between text-gray-400">
                  <span>Ing. H&S</span>
                  <span className="text-white">{usd(resultado.costoHS)}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-400 border-t border-gray-800 pt-1 mt-1">
                <span>Costo montaje</span>
                <span className="text-white">{usd(resultado.costoTotal)}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span className="text-gray-300">Precio montaje</span>
                <span className="text-green-400">{usd(resultado.precioVenta)}</span>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={calcular}
            disabled={cargando || !medioId}
            className="w-full border border-gray-600 text-gray-300 text-sm py-2 rounded hover:border-gray-400 hover:text-white disabled:opacity-40"
          >
            {cargando ? 'Calculando…' : resultado ? 'Recalcular' : 'Calcular montaje'}
          </button>
        </div>
      )}
    </div>
  )
}
