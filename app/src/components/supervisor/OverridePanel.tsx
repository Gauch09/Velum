'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { validarMotivoOverride } from '@/lib/override'

type EjecucionPendiente = {
  id: string
  etapaNombre: string
  umbralActivacion: number
  porcentajeActual: number
}

type Props = {
  ejecuciones: EjecucionPendiente[]
  ordenNombre: string
}

export default function OverridePanel({ ejecuciones, ordenNombre }: Props) {
  const router = useRouter()
  const [selected, setSelected] = useState<EjecucionPendiente | null>(null)
  const [motivo, setMotivo] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  if (ejecuciones.length === 0) return null

  function handleOpen(ej: EjecucionPendiente) {
    setSelected(ej)
    setMotivo('')
    setError('')
  }

  function handleClose() {
    setSelected(null)
    setMotivo('')
    setError('')
  }

  async function handleConfirm() {
    if (!selected || !validarMotivoOverride(motivo)) return
    setIsLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/ejecuciones/${selected.id}/override`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivoOverride: motivo }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Error al activar la etapa')
        return
      }
      handleClose()
      router.refresh()
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <div className="border-t border-gray-800 mt-3 pt-3">
        <p className="text-gray-600 text-xs uppercase tracking-widest mb-2">Override disponible</p>
        <div className="flex flex-col gap-2">
          {ejecuciones.map(ej => (
            <div
              key={ej.id}
              className="flex justify-between items-center bg-gray-800 px-3 py-2 rounded-lg"
            >
              <span className="text-gray-300 text-sm">
                {ej.etapaNombre}
                <span className="text-gray-500 text-xs ml-2">
                  {Number(ej.porcentajeActual).toFixed(0)}% actual · umbral {ej.umbralActivacion}%
                </span>
              </span>
              <button
                type="button"
                onClick={() => handleOpen(ej)}
                className="bg-violet-700 hover:bg-violet-600 text-white text-xs px-3 py-1.5 rounded-md font-semibold transition-colors"
              >
                Activar manualmente
              </button>
            </div>
          ))}
        </div>
      </div>

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          onClick={e => { if (e.target === e.currentTarget) handleClose() }}
        >
          <div className="bg-gray-900 rounded-xl w-full max-w-md shadow-2xl border border-gray-700">
            <div className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 bg-violet-900 rounded-lg flex items-center justify-center text-lg flex-shrink-0">
                  ⚡
                </div>
                <div>
                  <h3 className="text-white font-bold text-base">Override de umbral</h3>
                  <p className="text-gray-400 text-xs">{ordenNombre} · {selected.etapaNombre}</p>
                </div>
              </div>

              <div className="bg-amber-950 border border-amber-700 rounded-lg px-4 py-3 mb-4 flex gap-2">
                <span className="text-base">⚠️</span>
                <p className="text-amber-300 text-xs leading-relaxed">
                  Esta etapa está al{' '}
                  <strong>{Number(selected.porcentajeActual).toFixed(0)}%</strong> — el umbral
                  automático es <strong>{selected.umbralActivacion}%</strong>. Activarla ahora
                  saltea la validación de cascada.
                </p>
              </div>

              <label className="block text-gray-400 text-xs uppercase tracking-widest mb-2">
                Motivo <span className="text-red-400">*</span>
              </label>
              <textarea
                value={motivo}
                onChange={e => setMotivo(e.target.value)}
                placeholder="Describí por qué se activa esta etapa antes del umbral..."
                rows={3}
                className="w-full bg-gray-800 text-white text-sm px-3 py-2 rounded-lg border border-gray-600 focus:border-violet-500 outline-none resize-none"
              />
              {error && <p className="text-red-400 text-xs mt-2">{error}</p>}

              <div className="flex gap-3 mt-4">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg font-medium text-sm transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={!validarMotivoOverride(motivo) || isLoading}
                  className="flex-1 bg-violet-700 hover:bg-violet-600 text-white py-2 rounded-lg font-bold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Activando...' : 'Activar de todas formas'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
