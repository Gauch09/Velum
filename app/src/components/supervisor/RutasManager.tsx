'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import RutaFormModal, { type RutaCompleta } from './RutaFormModal'

type Props = {
  rutas: RutaCompleta[]
  maquinas: { id: string; nombre: string }[]
}

export default function RutasManager({ rutas: initialRutas, maquinas }: Props) {
  const router = useRouter()
  const [creando, setCreando] = useState(false)
  const [editando, setEditando] = useState<RutaCompleta | null>(null)
  const [eliminando, setEliminando] = useState<string | null>(null)
  const [errorEliminar, setErrorEliminar] = useState('')

  function handleSaved() {
    setCreando(false)
    setEditando(null)
    router.refresh()
  }

  async function handleDelete(ruta: RutaCompleta) {
    if (!confirm(`¿Eliminar la ruta "${ruta.sistema} / ${ruta.producto}"? Esta acción no se puede deshacer.`)) return
    setEliminando(ruta.id)
    setErrorEliminar('')
    try {
      const res = await fetch(`/api/rutas/${ruta.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        setErrorEliminar(data.error ?? 'Error al eliminar')
        return
      }
      router.refresh()
    } finally {
      setEliminando(null)
    }
  }

  return (
    <>
      {(creando || editando) && (
        <RutaFormModal
          ruta={editando ?? undefined}
          maquinas={maquinas}
          onClose={() => { setCreando(false); setEditando(null) }}
          onSaved={handleSaved}
        />
      )}

      <div className="flex justify-between items-center mb-6">
        <div>
          <p className="text-gray-500 text-sm">{initialRutas.length} ruta{initialRutas.length !== 1 ? 's' : ''} configurada{initialRutas.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setCreando(true)}
          className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg font-semibold text-sm transition-colors"
        >
          + Nueva ruta
        </button>
      </div>

      {errorEliminar && (
        <div className="bg-red-950 border border-red-800 rounded-lg px-4 py-3 mb-4 text-red-300 text-sm">
          {errorEliminar}
        </div>
      )}

      {initialRutas.length === 0 ? (
        <p className="text-gray-600 text-sm mt-8">No hay rutas configuradas.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {initialRutas.map(ruta => (
            <div
              key={ruta.id}
              className="bg-gray-900 border border-gray-800 rounded-xl p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-white font-bold text-sm">{ruta.sistema} / {ruta.producto}</span>
                    {ruta.tieneOrdenesActivas && (
                      <span className="text-amber-400 text-xs">En producción</span>
                    )}
                  </div>
                  {ruta.descripcion && (
                    <p className="text-gray-500 text-xs mb-2">{ruta.descripcion}</p>
                  )}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {ruta.etapas.map((e, i) => (
                      <span
                        key={e.id}
                        className="bg-gray-800 text-gray-300 text-xs px-2 py-0.5 rounded-full"
                      >
                        {i + 1}. {e.nombreEtapa}
                        <span className="text-gray-600 ml-1">· {e.maquinaNombre}</span>
                        {e.umbralActivacion < 100 && (
                          <span className="text-gray-600 ml-1">{e.umbralActivacion}%</span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => setEditando(ruta)}
                    className="text-gray-500 hover:text-gray-300 text-xs px-2 py-1 rounded border border-gray-700 hover:border-gray-500 transition-colors"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(ruta)}
                    disabled={eliminando === ruta.id || ruta.tieneOrdenesActivas}
                    className="text-red-700 hover:text-red-400 text-xs px-2 py-1 rounded border border-red-900 hover:border-red-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    title={ruta.tieneOrdenesActivas ? 'No se puede eliminar con órdenes activas' : ''}
                  >
                    {eliminando === ruta.id ? '...' : 'Eliminar'}
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
