'use client'

import { useState } from 'react'
import { createId } from '@paralleldrive/cuid2'

export type RutaCompleta = {
  id: string
  sistema: string
  producto: string
  descripcion: string | null
  tieneOrdenesActivas: boolean
  etapas: {
    id: string
    nombreEtapa: string
    ordenSecuencia: number
    umbralActivacion: number
    maquinaId: string
    maquinaNombre: string
  }[]
}

type EtapaForm = {
  key: string
  nombreEtapa: string
  maquinaId: string
  umbralActivacion: number
}

type Props = {
  ruta?: RutaCompleta
  maquinas: { id: string; nombre: string }[]
  onClose: () => void
  onSaved: () => void
}

function emptyEtapa(maquinaId: string): EtapaForm {
  return { key: createId(), nombreEtapa: '', maquinaId, umbralActivacion: 100 }
}

export default function RutaFormModal({ ruta, maquinas, onClose, onSaved }: Props) {
  const isEdit = !!ruta
  const defaultMaquinaId = maquinas[0]?.id ?? ''

  const [sistema, setSistema] = useState(ruta?.sistema ?? '')
  const [producto, setProducto] = useState(ruta?.producto ?? '')
  const [descripcion, setDescripcion] = useState(ruta?.descripcion ?? '')
  const [etapas, setEtapas] = useState<EtapaForm[]>(
    ruta?.etapas.map(e => ({
      key: e.id,
      nombreEtapa: e.nombreEtapa,
      maquinaId: e.maquinaId,
      umbralActivacion: e.umbralActivacion,
    })) ?? [emptyEtapa(defaultMaquinaId)]
  )
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  function addEtapa() {
    setEtapas(prev => [...prev, emptyEtapa(defaultMaquinaId)])
  }

  function removeEtapa(key: string) {
    setEtapas(prev => prev.filter(e => e.key !== key))
  }

  function updateEtapa(key: string, field: keyof Omit<EtapaForm, 'key'>, value: string | number) {
    setEtapas(prev => prev.map(e => e.key === key ? { ...e, [field]: value } : e))
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    if (etapas.length === 0) { setError('Agregá al menos una etapa'); return }
    if (etapas.some(e => !e.nombreEtapa.trim() || !e.maquinaId)) {
      setError('Completá nombre y máquina en todas las etapas')
      return
    }

    setIsLoading(true)
    setError('')
    try {
      const url = isEdit ? `/api/rutas/${ruta!.id}` : '/api/rutas'
      const method = isEdit ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sistema, producto, descripcion, etapas }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Error al guardar')
        return
      }
      onSaved()
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-gray-900 rounded-xl w-full max-w-2xl shadow-2xl border border-gray-700 max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center px-5 py-4 border-b border-gray-700 flex-shrink-0">
          <h2 className="text-white font-bold text-lg">
            {isEdit ? 'Editar ruta' : 'Nueva ruta'}
          </h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-white text-xl">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-5 py-4 overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Sistema *</label>
              <input
                value={sistema}
                onChange={e => setSistema(e.target.value)}
                placeholder="Sheet"
                required
                className="w-full bg-gray-800 text-white text-sm px-3 py-2 rounded-lg border border-gray-600 focus:border-green-500 outline-none"
              />
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Producto *</label>
              <input
                value={producto}
                onChange={e => setProducto(e.target.value)}
                placeholder="Vera"
                required
                className="w-full bg-gray-800 text-white text-sm px-3 py-2 rounded-lg border border-gray-600 focus:border-green-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-gray-400 text-xs mb-1 block">Descripción</label>
            <input
              value={descripcion}
              onChange={e => setDescripcion(e.target.value)}
              placeholder="Descripción opcional"
              className="w-full bg-gray-800 text-white text-sm px-3 py-2 rounded-lg border border-gray-600 focus:border-green-500 outline-none"
            />
          </div>

          {/* etapas */}
          <div>
            <label className="text-gray-400 text-xs uppercase tracking-widest mb-2 block">
              Etapas ({etapas.length})
            </label>
            <div className="flex flex-col gap-2">
              {etapas.map((etapa, i) => (
                <div key={etapa.key} className="bg-gray-800 rounded-lg px-3 py-2 flex items-center gap-2">
                  <span className="text-gray-600 text-xs w-5 flex-shrink-0">{i + 1}</span>
                  <input
                    value={etapa.nombreEtapa}
                    onChange={e => updateEtapa(etapa.key, 'nombreEtapa', e.target.value)}
                    placeholder="Nombre etapa"
                    className="flex-1 bg-gray-700 text-white text-sm px-2 py-1 rounded border border-gray-600 focus:border-green-500 outline-none min-w-0"
                  />
                  <select
                    value={etapa.maquinaId}
                    onChange={e => updateEtapa(etapa.key, 'maquinaId', e.target.value)}
                    className="bg-gray-700 text-white text-sm px-2 py-1 rounded border border-gray-600 focus:border-green-500 outline-none"
                  >
                    {maquinas.map(m => (
                      <option key={m.id} value={m.id}>{m.nombre}</option>
                    ))}
                  </select>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <input
                      type="number"
                      value={etapa.umbralActivacion}
                      onChange={e => updateEtapa(etapa.key, 'umbralActivacion', Number(e.target.value))}
                      min={1}
                      max={100}
                      className="w-14 bg-gray-700 text-white text-sm px-2 py-1 rounded border border-gray-600 focus:border-green-500 outline-none text-center"
                    />
                    <span className="text-gray-500 text-xs">%</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeEtapa(etapa.key)}
                    disabled={etapas.length === 1}
                    className="text-gray-600 hover:text-red-400 transition-colors disabled:opacity-30 flex-shrink-0"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addEtapa}
              className="mt-2 text-green-500 hover:text-green-400 text-sm transition-colors"
            >
              + Agregar etapa
            </button>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg font-medium text-sm transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-green-600 hover:bg-green-500 text-white py-2 rounded-lg font-bold text-sm transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear ruta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
