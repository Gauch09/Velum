'use client'

import { useState } from 'react'
import { cambiarEstado, type EstadoCotizacion } from '@/app/(supervisor)/cotizaciones/[id]/actions'

const TRANSICIONES: Record<EstadoCotizacion, EstadoCotizacion[]> = {
  BORRADOR:  ['ENVIADA'],
  ENVIADA:   ['VISTA', 'ACEPTADA', 'RECHAZADA'],
  VISTA:     ['ACEPTADA', 'RECHAZADA'],
  ACEPTADA:  [],
  RECHAZADA: [],
}

const LABEL: Record<EstadoCotizacion, string> = {
  BORRADOR:  'Borrador',
  ENVIADA:   'Marcar enviada',
  VISTA:     'Marcar vista',
  ACEPTADA:  'Aceptar',
  RECHAZADA: 'Rechazar',
}

const ESTILO: Record<EstadoCotizacion, string> = {
  BORRADOR:  'border-gray-600 text-gray-300 hover:border-gray-400 hover:text-white',
  ENVIADA:   'border-blue-700 text-blue-300 hover:border-blue-500 hover:text-blue-100',
  VISTA:     'border-purple-700 text-purple-300 hover:border-purple-500 hover:text-purple-100',
  ACEPTADA:  'border-green-700 text-green-300 hover:border-green-500 hover:text-green-100',
  RECHAZADA: 'border-red-800 text-red-400 hover:border-red-600 hover:text-red-200',
}

interface Props {
  cotizacionId: string
  estadoActual: EstadoCotizacion
}

export default function CambiarEstadoButtons({ cotizacionId, estadoActual }: Props) {
  const [cargando, setCargando] = useState<EstadoCotizacion | null>(null)
  const [error, setError] = useState<string | null>(null)

  const siguientes = TRANSICIONES[estadoActual] ?? []
  if (siguientes.length === 0) return null

  async function handleCambio(nuevoEstado: EstadoCotizacion) {
    setCargando(nuevoEstado)
    setError(null)
    const res = await cambiarEstado(cotizacionId, nuevoEstado)
    if (res && 'error' in res) setError(res.error as string)
    setCargando(null)
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {siguientes.map(estado => (
        <button
          key={estado}
          onClick={() => handleCambio(estado)}
          disabled={cargando !== null}
          className={`text-xs border px-3 py-1.5 rounded disabled:opacity-40 ${ESTILO[estado]}`}
        >
          {cargando === estado ? '…' : LABEL[estado]}
        </button>
      ))}
      {error && <span className="text-red-400 text-xs">{error}</span>}
    </div>
  )
}
