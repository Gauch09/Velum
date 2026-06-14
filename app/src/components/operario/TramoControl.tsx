'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { MotivoPausa, TipoTramo } from '@/lib/tramos'

export interface TramoAbierto {
  id: string
  tipo: TipoTramo
  inicio: string
  ejecucionEtapaId: string
  maquinaNombre: string
}

export interface MaquinaOpcion {
  id: string
  nombre: string
}

interface Props {
  ejecucionId: string
  unidad: string
  maquinas: MaquinaOpcion[]          // instancias del tipo de la etapa
  tramoAbierto: TramoAbierto | null  // tramo abierto del operario (cualquier tarea)
}

const MOTIVOS: { value: MotivoPausa; label: string }[] = [
  { value: 'MATERIAL',   label: 'Material' },
  { value: 'OTRA_ORDEN', label: 'Otra orden' },
  { value: 'AVERIA',     label: 'Avería' },
  { value: 'OTRO',       label: 'Otro' },
]

function minutosDesde(inicioIso: string, ahora: number): number {
  return Math.max(0, Math.floor((ahora - new Date(inicioIso).getTime()) / 60_000))
}

export default function TramoControl({ ejecucionId, unidad, maquinas, tramoAbierto }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [ahora, setAhora] = useState(Date.now())
  // Pasos del flujo de apertura/cierre
  const [eligiendoMaquina, setEligiendoMaquina] = useState<TipoTramo | null>(null)
  const [eligiendoMotivo, setEligiendoMotivo] = useState(false)
  const [terminando, setTerminando] = useState(false)
  const [cantidad, setCantidad] = useState(10)

  const esMio = tramoAbierto?.ejecucionEtapaId === ejecucionId
  const enOtraTarea = tramoAbierto != null && !esMio

  // Cronómetro: refresco cada 30 s
  useEffect(() => {
    if (!esMio) return
    const id = setInterval(() => setAhora(Date.now()), 30_000)
    return () => clearInterval(id)
  }, [esMio])

  async function abrir(tipo: TipoTramo, maquinaId: string) {
    setLoading(true)
    try {
      const res = await fetch('/api/tramos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ejecucionEtapaId: ejecucionId, maquinaId, tipo }),
      })
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: 'Error desconocido' }))
        alert(`Error: ${error}`)
        return
      }
      try { localStorage.setItem('velum.ultimaMaquina', maquinaId) } catch {}
      setEligiendoMaquina(null)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  function iniciarApertura(tipo: TipoTramo) {
    if (enOtraTarea) {
      const mins = minutosDesde(tramoAbierto!.inicio, Date.now())
      if (!confirm(`Cerrando tramo abierto en otra tarea (${mins} min). ¿Continuar?`)) return
    }
    if (maquinas.length === 1) {
      void abrir(tipo, maquinas[0].id)
      return
    }
    setEligiendoMaquina(tipo)
  }

  async function cerrar(payload: Record<string, unknown>) {
    if (!tramoAbierto) return
    setLoading(true)
    try {
      const res = await fetch(`/api/tramos/${tramoAbierto.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: 'Error desconocido' }))
        alert(`Error: ${error}`)
        return
      }
      setEligiendoMotivo(false)
      setTerminando(false)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  // ---- Render ----

  if (eligiendoMaquina) {
    const ultima = (() => { try { return localStorage.getItem('velum.ultimaMaquina') } catch { return null } })()
    return (
      <div className="mb-3 bg-gray-800 rounded-xl p-3">
        <p className="text-gray-300 text-sm mb-2">¿En cuál máquina?</p>
        <div className="flex gap-2">
          {maquinas.map(m => (
            <button
              key={m.id}
              disabled={loading}
              onClick={() => abrir(eligiendoMaquina, m.id)}
              className={`flex-1 py-4 rounded-xl font-bold text-sm touch-manipulation disabled:opacity-50 ${
                m.id === ultima ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-200 active:bg-gray-600'
              }`}
            >
              {m.nombre}
            </button>
          ))}
        </div>
        <button onClick={() => setEligiendoMaquina(null)} className="text-gray-500 text-xs mt-2">
          Cancelar
        </button>
      </div>
    )
  }

  if (esMio && tramoAbierto) {
    const mins = minutosDesde(tramoAbierto.inicio, ahora)
    const esSetup = tramoAbierto.tipo === 'PREPARACION'

    if (eligiendoMotivo) {
      return (
        <div className="mb-3 bg-gray-800 rounded-xl p-3">
          <p className="text-gray-300 text-sm mb-2">¿Motivo de la pausa? (opcional)</p>
          <div className="grid grid-cols-2 gap-2">
            {MOTIVOS.map(m => (
              <button
                key={m.value}
                disabled={loading}
                onClick={() => cerrar({ accion: 'pausar', motivoPausa: m.value })}
                className="bg-gray-700 text-gray-200 py-3 rounded-xl text-sm font-semibold touch-manipulation active:bg-gray-600 disabled:opacity-50"
              >
                {m.label}
              </button>
            ))}
          </div>
          <button
            disabled={loading}
            onClick={() => cerrar({ accion: 'pausar' })}
            className="text-gray-500 text-xs mt-2"
          >
            Saltear
          </button>
        </div>
      )
    }

    if (terminando) {
      return (
        <div className="mb-3 bg-gray-800 rounded-xl p-3">
          <p className="text-gray-300 text-sm mb-2">¿Cuántas hiciste en este tramo?</p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCantidad(c => Math.max(0, c - 10))}
              className="bg-gray-700 text-white w-14 h-14 rounded-xl text-2xl font-light touch-manipulation active:bg-gray-600"
            >
              −
            </button>
            <div className="flex-1 text-center">
              <span className="text-white text-3xl font-bold">{cantidad}</span>
              <p className="text-gray-500 text-xs">{unidad.toLowerCase()}</p>
            </div>
            <button
              onClick={() => setCantidad(c => c + 10)}
              className="bg-gray-700 text-white w-14 h-14 rounded-xl text-2xl font-light touch-manipulation active:bg-gray-600"
            >
              +
            </button>
            <button
              disabled={loading}
              onClick={() => cerrar({ accion: 'terminar', cantidadProducida: cantidad })}
              className="flex-1 bg-green-600 active:bg-green-700 text-white py-4 rounded-xl font-bold disabled:opacity-50 touch-manipulation min-h-[56px]"
            >
              {loading ? '...' : 'Confirmar'}
            </button>
          </div>
          <button onClick={() => setTerminando(false)} className="text-gray-500 text-xs mt-2">
            Cancelar
          </button>
        </div>
      )
    }

    return (
      <div className="mb-3 bg-gray-800 rounded-xl p-3">
        <p className={`text-sm font-bold mb-2 ${esSetup ? 'text-amber-400' : 'text-blue-400'}`}>
          ⏱ {esSetup ? 'PREPARANDO' : 'PRODUCIENDO'} en {tramoAbierto.maquinaNombre} · {mins} min
        </p>
        <div className="flex gap-2">
          {esSetup && (
            <button
              disabled={loading}
              onClick={() => iniciarApertura('PRODUCCION')}
              className="flex-1 bg-blue-600 active:bg-blue-700 text-white py-4 rounded-xl font-bold text-sm touch-manipulation disabled:opacity-50"
            >
              ▶ Producir
            </button>
          )}
          <button
            disabled={loading}
            onClick={() => setEligiendoMotivo(true)}
            className="flex-1 bg-gray-700 active:bg-gray-600 text-gray-200 py-4 rounded-xl font-bold text-sm touch-manipulation disabled:opacity-50"
          >
            ⏸ Pausar
          </button>
          <button
            disabled={loading}
            onClick={() => setTerminando(true)}
            className="flex-1 bg-green-600 active:bg-green-700 text-white py-4 rounded-xl font-bold text-sm touch-manipulation disabled:opacity-50"
          >
            ■ Terminar
          </button>
        </div>
      </div>
    )
  }

  // Sin tramo en esta tarea
  return (
    <div className="mb-3 flex gap-2">
      <button
        disabled={loading}
        onClick={() => iniciarApertura('PREPARACION')}
        className="flex-1 bg-amber-600 active:bg-amber-700 text-white py-4 rounded-xl font-bold text-sm touch-manipulation disabled:opacity-50"
      >
        ▶ Preparar
      </button>
      <button
        disabled={loading}
        onClick={() => iniciarApertura('PRODUCCION')}
        className="flex-1 bg-blue-600 active:bg-blue-700 text-white py-4 rounded-xl font-bold text-sm touch-manipulation disabled:opacity-50"
      >
        ▶ Producir
      </button>
    </div>
  )
}
