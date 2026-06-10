'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Props = {
  ordenId: string
  ordenNombre: string
}

export default function CancelarOrdenButton({ ordenId, ordenNombre }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleCancelar() {
    if (!confirm(`¿Cancelar la orden "${ordenNombre}"?\n\nLas etapas activas quedarán pausadas. Esta acción no se puede deshacer.`)) return

    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/ordenes/${ordenId}/cancelar`, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Error al cancelar')
        return
      }
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <button
        onClick={handleCancelar}
        disabled={loading}
        className="text-gray-600 hover:text-red-400 text-xs px-2 py-1 rounded border border-gray-800 hover:border-red-900 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        title="Cancelar orden"
      >
        {loading ? '...' : 'Cancelar'}
      </button>
      {error && (
        <p className="text-red-400 text-xs mt-1 text-right">{error}</p>
      )}
    </div>
  )
}
