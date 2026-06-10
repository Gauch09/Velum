'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  umbralActual: number
  onClose: () => void
}

export default function ConfiguracionModal({ umbralActual, onClose }: Props) {
  const router = useRouter()
  const [horas, setHoras] = useState(umbralActual)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleGuardar() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/configuracion', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ horasSinActividadAlerta: horas }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Error al guardar')
        return
      }
      onClose()
      router.refresh()
    } catch {
      setError('Error de red')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-80 shadow-2xl">
        <div className="flex items-center gap-3 mb-5">
          <div className="bg-gray-700 rounded-lg p-2 text-xl">⚙️</div>
          <div>
            <h2 className="text-white font-bold">Umbral de alerta</h2>
            <p className="text-gray-400 text-xs">Horas sin actividad</p>
          </div>
        </div>

        <label className="block text-gray-400 text-xs uppercase tracking-wider mb-2">
          Horas sin actividad para alertar
        </label>
        <div className="flex items-center gap-3 mb-3">
          <input
            type="number"
            min={1}
            max={72}
            value={horas}
            onChange={e => setHoras(Number(e.target.value))}
            className="w-20 bg-gray-800 text-white border border-gray-600 rounded-lg px-3 py-2 text-base font-bold focus:outline-none focus:border-purple-500"
          />
          <span className="text-gray-400 text-sm">horas</span>
        </div>

        <div className="bg-gray-800 rounded-lg p-3 mb-5 text-xs text-gray-400">
          Con umbral {horas} h: una etapa ACTIVA sin registros de progreso por más de{' '}
          {horas} horas dispara una alerta.
        </div>

        {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg py-2 text-sm transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleGuardar}
            disabled={loading || horas < 1 || horas > 72}
            className="flex-1 bg-purple-700 hover:bg-purple-600 disabled:opacity-50 text-white rounded-lg py-2 text-sm font-bold transition-colors"
          >
            {loading ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}
