'use client'

import { useState } from 'react'

type Tipo = 'trazabilidad' | 'overrides' | 'alertas' | 'factores'

interface Props {
  tipo: Tipo
  label?: string
}

export default function ExportarCsvButton({ tipo, label }: Props) {
  const [loading, setLoading] = useState(false)

  async function handleExport() {
    setLoading(true)
    try {
      const res = await fetch(`/api/exportar?tipo=${tipo}`)
      if (!res.ok) return
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = res.headers.get('Content-Disposition')?.match(/filename="(.+)"/)?.[1] ?? `${tipo}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      className="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 text-xs px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5"
    >
      {loading ? '...' : '↓ Exportar CSV'}
      {label && !loading && <span className="text-gray-500">({label})</span>}
    </button>
  )
}
