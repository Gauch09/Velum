'use client'
import { useState } from 'react'

interface Maquina {
  id: string
  nombre: string
  estadoActual: string
}

const ESTADO_STYLE: Record<string, string> = {
  OPERATIVA:         'bg-green-900 text-green-300 border border-green-700',
  MANTENIMIENTO:     'bg-yellow-900 text-yellow-300 border border-yellow-700',
  FUERA_DE_SERVICIO: 'bg-red-900 text-red-300 border border-red-700',
}

export default function MaquinasStatus({ maquinas }: { maquinas: Maquina[] }) {
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

  return (
    <div className="bg-gray-900 rounded-xl p-4">
      <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-4">Máquinas</h3>
      <div className="flex flex-col gap-2">
        {lista.map(m => (
          <button
            key={m.id}
            onClick={() => toggleEstado(m.id, m.estadoActual)}
            className={`text-left px-3 py-2 rounded-lg text-xs font-medium ${ESTADO_STYLE[m.estadoActual] ?? ''}`}
          >
            {m.nombre}
            <span className="float-right opacity-70">
              {m.estadoActual === 'OPERATIVA' ? '●' : '⚠'}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
