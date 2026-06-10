'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type Operario = {
  id: string
  nombre: string
}

type Props = {
  ejecucionId: string
  ordenNombre: string
  etapaNombre: string
  onClose: () => void
}

export default function AsignarOperarioModal({ ejecucionId, ordenNombre, etapaNombre, onClose }: Props) {
  const router = useRouter()
  const [operarios, setOperarios] = useState<Operario[]>([])
  const [selectedId, setSelectedId] = useState<string>('')
  const [isFetching, setIsFetching] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/operarios')
      .then(r => r.json())
      .then((data: Operario[]) => {
        setOperarios(data)
        if (data.length > 0) setSelectedId(data[0].id)
      })
      .catch(() => setError('Error al cargar operarios'))
      .finally(() => setIsFetching(false))
  }, [])

  async function handleConfirm() {
    if (!selectedId) return
    setIsSubmitting(true)
    setError('')
    try {
      const res = await fetch(`/api/ejecuciones/${ejecucionId}/asignar`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operarioId: selectedId }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Error al asignar operario')
        return
      }
      onClose()
      router.refresh()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-gray-900 rounded-xl w-full max-w-md shadow-2xl border border-gray-700">
        <div className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 bg-blue-900 rounded-lg flex items-center justify-center text-lg flex-shrink-0">
              👤
            </div>
            <div>
              <h3 className="text-white font-bold text-base">Asignar operario</h3>
              <p className="text-gray-400 text-xs">{ordenNombre} · {etapaNombre}</p>
            </div>
          </div>

          {isFetching ? (
            <p className="text-gray-500 text-sm text-center py-4">Cargando operarios...</p>
          ) : operarios.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-4">No hay operarios disponibles.</p>
          ) : (
            <>
              <label className="block text-gray-400 text-xs uppercase tracking-widest mb-2">
                Operario <span className="text-red-400">*</span>
              </label>
              <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-1">
                {operarios.map(op => (
                  <button
                    key={op.id}
                    type="button"
                    onClick={() => setSelectedId(op.id)}
                    className={`text-left px-3 py-2 rounded-lg text-sm transition-colors border ${
                      selectedId === op.id
                        ? 'bg-blue-900 border-blue-600 text-white font-semibold'
                        : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500'
                    }`}
                  >
                    {op.nombre}
                  </button>
                ))}
              </div>
            </>
          )}

          {error && <p className="text-red-400 text-xs mt-3">{error}</p>}

          <div className="flex gap-3 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg font-medium text-sm transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!selectedId || isSubmitting || isFetching}
              className="flex-1 bg-blue-700 hover:bg-blue-600 text-white py-2 rounded-lg font-bold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Asignando...' : 'Asignar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
