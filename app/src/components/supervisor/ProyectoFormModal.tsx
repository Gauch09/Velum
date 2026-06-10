'use client'

import { useState } from 'react'

export type ProyectoItem = {
  id: string
  nombre: string
  cliente: string
  fechaEntrega: string
  estado: 'ACTIVO' | 'COMPLETADO' | 'CANCELADO'
  tieneOrdenesActivas: boolean
}

type Props = {
  proyecto?: ProyectoItem
  onClose: () => void
  onSaved: () => void
}

export default function ProyectoFormModal({ proyecto, onClose, onSaved }: Props) {
  const isEdit = !!proyecto

  const [nombre, setNombre] = useState(proyecto?.nombre ?? '')
  const [cliente, setCliente] = useState(proyecto?.cliente ?? '')
  const [fechaEntrega, setFechaEntrega] = useState(
    proyecto?.fechaEntrega ? proyecto.fechaEntrega.slice(0, 10) : ''
  )
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    if (!nombre.trim() || !cliente.trim() || !fechaEntrega) {
      setError('Completá todos los campos')
      return
    }

    setIsLoading(true)
    setError('')
    try {
      const url = isEdit ? `/api/proyectos/${proyecto!.id}` : '/api/proyectos'
      const method = isEdit ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: nombre.trim(), cliente: cliente.trim(), fechaEntrega }),
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
      <div className="bg-gray-900 rounded-xl w-full max-w-md shadow-2xl border border-gray-700">
        <div className="flex justify-between items-center px-5 py-4 border-b border-gray-700">
          <h2 className="text-white font-bold text-lg">
            {isEdit ? 'Editar proyecto' : 'Nuevo proyecto'}
          </h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-white text-xl">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-5 py-4">
          <div>
            <label className="text-gray-400 text-xs mb-1 block">Nombre del proyecto *</label>
            <input
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              placeholder="Edificio Vera"
              required
              className="w-full bg-gray-800 text-white text-sm px-3 py-2 rounded-lg border border-gray-600 focus:border-green-500 outline-none"
            />
          </div>

          <div>
            <label className="text-gray-400 text-xs mb-1 block">Cliente *</label>
            <input
              value={cliente}
              onChange={e => setCliente(e.target.value)}
              placeholder="Constructora XYZ"
              required
              className="w-full bg-gray-800 text-white text-sm px-3 py-2 rounded-lg border border-gray-600 focus:border-green-500 outline-none"
            />
          </div>

          <div>
            <label className="text-gray-400 text-xs mb-1 block">Fecha de entrega *</label>
            <input
              type="date"
              value={fechaEntrega}
              onChange={e => setFechaEntrega(e.target.value)}
              required
              className="w-full bg-gray-800 text-white text-sm px-3 py-2 rounded-lg border border-gray-600 focus:border-green-500 outline-none"
            />
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
              {isLoading ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear proyecto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
