'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  ejecucion: {
    id: string
    porcentajeActual: number
    maquina: { nombre: string }
    etapaRuta: { nombreEtapa: string; umbralActivacion: number }
    orden: {
      id: string
      sistema: string
      producto: string
      cantidad: number
      unidad: string
      prioridad: number
      proyecto: { nombre: string } | null
    }
  }
}

export default function OrdenCard({ ejecucion }: Props) {
  const [cantidad, setCantidad] = useState(10)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const orden = ejecucion.orden
  const esUrgente = orden.prioridad > 0

  async function registrar() {
    setLoading(true)
    try {
      const res = await fetch(`/api/ordenes/${orden.id}/progreso`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ejecucionEtapaId: ejecucion.id,
          cantidadRegistrada: cantidad,
        }),
      })
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: 'Error desconocido' }))
        alert(`Error al registrar: ${error}`)
        return
      }
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`bg-gray-900 rounded-xl p-4 border-l-4 ${esUrgente ? 'border-red-500' : 'border-green-600'}`}>
      {esUrgente && (
        <span className="text-red-400 text-xs font-bold mb-2 block uppercase tracking-wide">
          Urgente
        </span>
      )}

      <div className="flex justify-between items-start mb-3">
        <div>
          <p className="text-white font-bold text-lg">{orden.sistema} / {orden.producto}</p>
          <p className="text-gray-400 text-sm">{orden.proyecto?.nombre ?? 'Orden manual'}</p>
        </div>
        <span className="text-gray-500 text-xs mt-1">{ejecucion.maquina.nombre}</span>
      </div>

      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-300">{ejecucion.etapaRuta.nombreEtapa}</span>
          <span className="text-green-400 font-bold">{ejecucion.porcentajeActual.toFixed(0)}%</span>
        </div>
        <div className="bg-gray-700 rounded-full h-2.5">
          <div
            className="bg-green-500 h-2.5 rounded-full transition-all duration-300"
            style={{ width: `${ejecucion.porcentajeActual}%` }}
          />
        </div>
        <p className="text-gray-500 text-xs mt-1">
          Activa siguiente etapa al {ejecucion.etapaRuta.umbralActivacion}%
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => setCantidad(c => Math.max(1, c - 10))}
          className="bg-gray-700 text-white w-12 h-12 rounded-xl text-2xl font-light flex items-center justify-center"
        >
          −
        </button>
        <div className="flex-1 text-center">
          <span className="text-white text-3xl font-bold">{cantidad}</span>
          <p className="text-gray-500 text-xs">{orden.unidad.toLowerCase()}</p>
        </div>
        <button
          onClick={() => setCantidad(c => c + 10)}
          className="bg-gray-700 text-white w-12 h-12 rounded-xl text-2xl font-light flex items-center justify-center"
        >
          +
        </button>
        <button
          onClick={registrar}
          disabled={loading}
          className="flex-1 bg-green-600 hover:bg-green-500 active:bg-green-700 text-white py-3 rounded-xl font-bold text-base disabled:opacity-50 transition-colors"
        >
          {loading ? '...' : 'Registrar'}
        </button>
      </div>
    </div>
  )
}
