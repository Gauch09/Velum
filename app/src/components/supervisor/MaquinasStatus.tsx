'use client'

import { useState } from 'react'

interface Maquina {
  id: string
  nombre: string
  estadoActual: string
}

type CargaMaquina = {
  activas: number
  etapas: string[]
}

interface Props {
  maquinas: Maquina[]
  cargas: Record<string, CargaMaquina>
}

const ESTADO_ICON: Record<string, string> = {
  OPERATIVA:         '●',
  MANTENIMIENTO:     '⚠',
  FUERA_DE_SERVICIO: '✕',
}

function nivelCarga(activas: number): 'idle' | 'normal' | 'alta' | 'saturada' {
  if (activas === 0) return 'idle'
  if (activas === 1) return 'normal'
  if (activas === 2) return 'alta'
  return 'saturada'
}

const BARRA_COLOR: Record<string, string> = {
  idle:     'bg-gray-700',
  normal:   'bg-green-500',
  alta:     'bg-amber-500',
  saturada: 'bg-red-500',
}

const CARD_BORDER: Record<string, string> = {
  idle:     'border-gray-800',
  normal:   'border-green-900',
  alta:     'border-amber-900',
  saturada: 'border-red-900',
}

const LABEL_COLOR: Record<string, string> = {
  idle:     'text-gray-600',
  normal:   'text-green-400',
  alta:     'text-amber-400',
  saturada: 'text-red-400',
}

const NIVEL_TEXTO: Record<string, string> = {
  idle:     'Sin actividad',
  normal:   '1 activa',
  alta:     '2 activas',
  saturada: 'Saturada',
}

export default function MaquinasStatus({ maquinas, cargas }: Props) {
  const [lista, setLista] = useState<Maquina[]>(maquinas)

  async function toggleEstado(id: string, estadoActual: string) {
    const siguiente = estadoActual === 'OPERATIVA' ? 'MANTENIMIENTO' : 'OPERATIVA'
    const res = await fetch(`/api/maquinas/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estadoActual: siguiente }),
    })
    if (res.ok) {
      setLista(prev => prev.map(m => m.id === id ? { ...m, estadoActual: siguiente } : m))
    }
  }

  const saturadas = lista.filter(m => (cargas[m.id]?.activas ?? 0) >= 3).length
  const conCarga  = lista.filter(m => (cargas[m.id]?.activas ?? 0) > 0).length

  return (
    <div className="bg-gray-900 rounded-xl p-4">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-widest">Máquinas</h3>
        {saturadas > 0 && (
          <span className="text-red-400 text-xs font-bold">{saturadas} saturada{saturadas > 1 ? 's' : ''}</span>
        )}
      </div>
      <p className="text-gray-600 text-xs mb-4">{conCarga} con actividad · {lista.length} total</p>

      <div className="flex flex-col gap-2">
        {lista.map(m => {
          const carga = cargas[m.id] ?? { activas: 0, etapas: [] }
          const nivel = m.estadoActual !== 'OPERATIVA' ? 'idle' : nivelCarga(carga.activas)
          const pct   = m.estadoActual !== 'OPERATIVA' ? 0 : Math.min((carga.activas / 3) * 100, 100)

          return (
            <div
              key={m.id}
              className={`rounded-lg border ${CARD_BORDER[nivel]} bg-gray-800/50 overflow-hidden`}
            >
              <button
                onClick={() => toggleEstado(m.id, m.estadoActual)}
                className="w-full text-left px-3 pt-2 pb-1 flex items-center justify-between"
              >
                <span className="text-gray-200 text-xs font-medium truncate">{m.nombre}</span>
                <span className={`text-xs ml-2 flex-shrink-0 ${
                  m.estadoActual === 'OPERATIVA' ? LABEL_COLOR[nivel] : 'text-yellow-500'
                }`}>
                  {m.estadoActual !== 'OPERATIVA'
                    ? (m.estadoActual === 'MANTENIMIENTO' ? '⚠ Mant.' : '✕ Fuera')
                    : NIVEL_TEXTO[nivel]
                  }
                </span>
              </button>

              {/* load bar */}
              <div className="mx-3 mb-2 bg-gray-700 rounded-full h-1">
                <div
                  className={`h-1 rounded-full transition-all duration-500 ${BARRA_COLOR[nivel]}`}
                  style={{ width: `${pct}%` }}
                />
              </div>

              {/* active etapas */}
              {carga.etapas.length > 0 && (
                <div className="px-3 pb-2 flex flex-col gap-0.5">
                  {carga.etapas.map((e, i) => (
                    <span key={i} className="text-gray-500 text-xs truncate">· {e}</span>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
