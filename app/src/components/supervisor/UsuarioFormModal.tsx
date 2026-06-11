'use client'

import { useState } from 'react'

export type UsuarioItem = {
  id: string
  nombre: string
  email: string
  rol: 'OPERARIO' | 'SUPERVISOR' | 'GERENCIA'
  maquinaId: string | null
  maquina: { id: string; nombre: string } | null
}

type Maquina = { id: string; nombre: string }

type Props = {
  usuario?: UsuarioItem
  maquinas: Maquina[]
  onClose: () => void
  onSaved: () => void
}

const ROL_LABEL: Record<string, string> = {
  OPERARIO: 'Operario',
  SUPERVISOR: 'Supervisor',
  GERENCIA: 'Gerencia',
}

export default function UsuarioFormModal({ usuario, maquinas, onClose, onSaved }: Props) {
  const isEdit = !!usuario

  const [nombre, setNombre] = useState(usuario?.nombre ?? '')
  const [email, setEmail] = useState(usuario?.email ?? '')
  const [password, setPassword] = useState('')
  const [rol, setRol] = useState<string>(usuario?.rol ?? 'OPERARIO')
  const [maquinaId, setMaquinaId] = useState(usuario?.maquinaId ?? '')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    setIsLoading(true)
    setError('')
    try {
      const url = isEdit ? `/api/usuarios/${usuario!.id}` : '/api/usuarios'
      const method = isEdit ? 'PATCH' : 'POST'
      const body: Record<string, unknown> = { nombre, rol, maquinaId: maquinaId || null }
      if (!isEdit) {
        body.email = email
        body.password = password
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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
            {isEdit ? 'Editar usuario' : 'Nuevo usuario'}
          </h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-white text-xl">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-5 py-4">
          <div>
            <label className="text-gray-400 text-xs mb-1 block">Nombre *</label>
            <input
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              placeholder="Juan García"
              required
              className="w-full bg-gray-800 text-white text-sm px-3 py-2 rounded-lg border border-gray-600 focus:border-green-500 outline-none"
            />
          </div>

          {!isEdit && (
            <>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Email *</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="juan@velum.com"
                  required
                  className="w-full bg-gray-800 text-white text-sm px-3 py-2 rounded-lg border border-gray-600 focus:border-green-500 outline-none"
                />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Contraseña inicial *</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  required
                  minLength={8}
                  className="w-full bg-gray-800 text-white text-sm px-3 py-2 rounded-lg border border-gray-600 focus:border-green-500 outline-none"
                />
              </div>
            </>
          )}

          {isEdit && (
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Email</label>
              <p className="text-gray-500 text-sm px-3 py-2 bg-gray-800/50 rounded-lg border border-gray-700">
                {usuario!.email}
              </p>
            </div>
          )}

          <div>
            <label className="text-gray-400 text-xs mb-1 block">Rol *</label>
            <select
              value={rol}
              onChange={e => { setRol(e.target.value); setMaquinaId('') }}
              className="w-full bg-gray-800 text-white text-sm px-3 py-2 rounded-lg border border-gray-600 focus:border-green-500 outline-none"
            >
              {Object.entries(ROL_LABEL).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          {rol === 'OPERARIO' && (
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Máquina asignada</label>
              <select
                value={maquinaId}
                onChange={e => setMaquinaId(e.target.value)}
                className="w-full bg-gray-800 text-white text-sm px-3 py-2 rounded-lg border border-gray-600 focus:border-green-500 outline-none"
              >
                <option value="">Sin máquina asignada</option>
                {maquinas.map(m => (
                  <option key={m.id} value={m.id}>{m.nombre}</option>
                ))}
              </select>
              <p className="text-gray-600 text-xs mt-1">
                Las órdenes nuevas se pre-asignarán a este operario automáticamente.
              </p>
            </div>
          )}

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
              {isLoading ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
