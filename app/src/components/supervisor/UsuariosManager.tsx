'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import UsuarioFormModal, { type UsuarioItem } from './UsuarioFormModal'

type Maquina = { id: string; nombre: string }

const ROL_LABEL: Record<string, string> = {
  OPERARIO: 'Operario',
  SUPERVISOR: 'Supervisor',
  GERENCIA: 'Gerencia',
}

const ROL_COLOR: Record<string, string> = {
  OPERARIO: 'bg-blue-900 text-blue-300 border border-blue-700',
  SUPERVISOR: 'bg-green-900 text-green-300 border border-green-700',
  GERENCIA: 'bg-purple-900 text-purple-300 border border-purple-700',
}

export default function UsuariosManager({
  usuarios,
  maquinas,
}: {
  usuarios: UsuarioItem[]
  maquinas: Maquina[]
}) {
  const router = useRouter()
  const [modal, setModal] = useState<{ open: boolean; usuario?: UsuarioItem }>({ open: false })
  const [deleteError, setDeleteError] = useState<Record<string, string>>({})

  function onSaved() {
    setModal({ open: false })
    router.refresh()
  }

  async function handleDelete(usuario: UsuarioItem) {
    const ok = confirm(`¿Eliminar a ${usuario.nombre}? Esta acción no se puede deshacer.`)
    if (!ok) return
    setDeleteError(prev => { const n = { ...prev }; delete n[usuario.id]; return n })

    const res = await fetch(`/api/usuarios/${usuario.id}`, { method: 'DELETE' })
    if (!res.ok) {
      const data = await res.json()
      setDeleteError(prev => ({ ...prev, [usuario.id]: data.error ?? 'Error al eliminar' }))
      return
    }
    router.refresh()
  }

  const ordenados = [...usuarios].sort((a, b) => {
    const rolOrd = ['SUPERVISOR', 'GERENCIA', 'OPERARIO']
    return rolOrd.indexOf(a.rol) - rolOrd.indexOf(b.rol) || a.nombre.localeCompare(b.nombre)
  })

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-white text-2xl font-bold">Gestión de usuarios</h1>
        <button
          onClick={() => setModal({ open: true })}
          className="bg-green-700 hover:bg-green-600 text-white font-bold px-4 py-2 rounded-lg text-sm transition-colors"
        >
          + Nuevo usuario
        </button>
      </div>

      {ordenados.length === 0 ? (
        <p className="text-gray-500 mt-8">No hay usuarios registrados.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {ordenados.map(u => (
            <div
              key={u.id}
              className="bg-gray-900 rounded-xl px-5 py-4 border border-gray-800 flex flex-col sm:flex-row sm:items-center gap-3"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-white font-semibold">{u.nombre}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${ROL_COLOR[u.rol] ?? ''}`}>
                    {ROL_LABEL[u.rol] ?? u.rol}
                  </span>
                </div>
                <div className="text-gray-500 text-sm mt-0.5">{u.email}</div>
                {u.maquina && (
                  <div className="text-gray-600 text-xs mt-0.5">Máquina: {u.maquina.nombre}</div>
                )}
                {deleteError[u.id] && (
                  <p className="text-red-400 text-xs mt-1">{deleteError[u.id]}</p>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => setModal({ open: true, usuario: u })}
                  className="text-gray-400 hover:text-white text-sm border border-gray-700 hover:border-gray-500 px-3 py-1.5 rounded-lg transition-colors"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(u)}
                  className="text-gray-600 hover:text-red-400 text-sm border border-gray-800 hover:border-red-900 px-3 py-1.5 rounded-lg transition-colors"
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal.open && (
        <UsuarioFormModal
          usuario={modal.usuario}
          maquinas={maquinas}
          onClose={() => setModal({ open: false })}
          onSaved={onSaved}
        />
      )}
    </div>
  )
}
