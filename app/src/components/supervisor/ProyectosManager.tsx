'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ProyectoFormModal from './ProyectoFormModal'
import type { ProyectoItem } from './ProyectoFormModal'

type Props = {
  proyectos: ProyectoItem[]
}

const ESTADO_LABEL: Record<string, string> = {
  ACTIVO: 'Activo',
  COMPLETADO: 'Completado',
  CANCELADO: 'Cancelado',
}

const ESTADO_COLOR: Record<string, string> = {
  ACTIVO: 'text-green-400',
  COMPLETADO: 'text-blue-400',
  CANCELADO: 'text-gray-600',
}

function diasRestantes(fechaEntrega: string): string {
  const dias = Math.ceil((new Date(fechaEntrega).getTime() - Date.now()) / 86_400_000)
  if (dias < 0) return 'Vencido'
  if (dias === 0) return 'Hoy'
  return `${dias}d`
}

function semaforo(fechaEntrega: string, estado: string): string {
  if (estado !== 'ACTIVO') return 'text-gray-600'
  const dias = Math.ceil((new Date(fechaEntrega).getTime() - Date.now()) / 86_400_000)
  if (dias < 0) return 'text-red-400'
  if (dias <= 7) return 'text-amber-400'
  return 'text-gray-400'
}

export default function ProyectosManager({ proyectos: initialProyectos }: Props) {
  const router = useRouter()
  const [creando, setCreando] = useState(false)
  const [editando, setEditando] = useState<ProyectoItem | null>(null)
  const [eliminando, setEliminando] = useState<string | null>(null)
  const [cancelando, setCancelando] = useState<string | null>(null)
  const [error, setError] = useState('')

  function handleSaved() {
    setCreando(false)
    setEditando(null)
    router.refresh()
  }

  async function handleCancelar(proyecto: ProyectoItem) {
    const msg = proyecto.tieneOrdenesActivas
      ? `¿Cancelar "${proyecto.nombre}"? Sus órdenes en producción también serán canceladas.`
      : `¿Cancelar el proyecto "${proyecto.nombre}"?`
    if (!confirm(msg)) return
    setCancelando(proyecto.id)
    setError('')
    try {
      const res = await fetch(`/api/proyectos/${proyecto.id}/cancelar`, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Error al cancelar')
        return
      }
      router.refresh()
    } finally {
      setCancelando(null)
    }
  }

  async function handleDelete(proyecto: ProyectoItem) {
    if (!confirm(`¿Eliminar el proyecto "${proyecto.nombre}"? Esta acción no se puede deshacer.`)) return
    setEliminando(proyecto.id)
    setError('')
    try {
      const res = await fetch(`/api/proyectos/${proyecto.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Error al eliminar')
        return
      }
      router.refresh()
    } finally {
      setEliminando(null)
    }
  }

  const activos = initialProyectos.filter(p => p.estado === 'ACTIVO')
  const otros = initialProyectos.filter(p => p.estado !== 'ACTIVO')

  return (
    <>
      {(creando || editando) && (
        <ProyectoFormModal
          proyecto={editando ?? undefined}
          onClose={() => { setCreando(false); setEditando(null) }}
          onSaved={handleSaved}
        />
      )}

      <div className="flex justify-between items-center mb-6">
        <p className="text-gray-500 text-sm">
          {activos.length} activo{activos.length !== 1 ? 's' : ''} · {initialProyectos.length} total
        </p>
        <button
          onClick={() => setCreando(true)}
          className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg font-semibold text-sm transition-colors"
        >
          + Nuevo proyecto
        </button>
      </div>

      {error && (
        <div className="bg-red-950 border border-red-800 rounded-lg px-4 py-3 mb-4 text-red-300 text-sm">
          {error}
        </div>
      )}

      {initialProyectos.length === 0 ? (
        <p className="text-gray-600 text-sm mt-8">No hay proyectos.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {[...activos, ...otros].map(proyecto => (
            <div
              key={proyecto.id}
              className="bg-gray-900 border border-gray-800 rounded-xl p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-white font-bold text-sm">{proyecto.nombre}</span>
                    <span className={`text-xs ${ESTADO_COLOR[proyecto.estado] ?? 'text-gray-600'}`}>
                      {ESTADO_LABEL[proyecto.estado] ?? proyecto.estado}
                    </span>
                    {proyecto.tieneOrdenesActivas && (
                      <span className="text-amber-400 text-xs">En producción</span>
                    )}
                  </div>
                  <p className="text-gray-500 text-xs">{proyecto.cliente}</p>
                  <p className={`text-xs mt-1 ${semaforo(proyecto.fechaEntrega, proyecto.estado)}`}>
                    Entrega: {new Date(proyecto.fechaEntrega).toLocaleDateString('es-AR')}
                    {proyecto.estado === 'ACTIVO' && (
                      <span className="ml-1">· {diasRestantes(proyecto.fechaEntrega)}</span>
                    )}
                  </p>
                </div>

                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => setEditando(proyecto)}
                    className="text-gray-500 hover:text-gray-300 text-xs px-2 py-1 rounded border border-gray-700 hover:border-gray-500 transition-colors"
                  >
                    Editar
                  </button>
                  {proyecto.estado === 'ACTIVO' && (
                    <button
                      onClick={() => handleCancelar(proyecto)}
                      disabled={cancelando === proyecto.id}
                      className="text-gray-600 hover:text-amber-400 text-xs px-2 py-1 rounded border border-gray-800 hover:border-amber-900 transition-colors disabled:opacity-40"
                    >
                      {cancelando === proyecto.id ? '...' : 'Cancelar'}
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(proyecto)}
                    disabled={eliminando === proyecto.id || proyecto.tieneOrdenesActivas}
                    className="text-red-700 hover:text-red-400 text-xs px-2 py-1 rounded border border-red-900 hover:border-red-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    title={proyecto.tieneOrdenesActivas ? 'No se puede eliminar con órdenes activas' : ''}
                  >
                    {eliminando === proyecto.id ? '...' : 'Eliminar'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
