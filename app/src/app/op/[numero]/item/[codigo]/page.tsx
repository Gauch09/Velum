'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

type Item = {
  id: string
  codigo: number
  nombre: string
  cantidadTotal: number
  cantidadCompletada: number
  cantidadRehacer: number
}

export default function OperarioItemPage() {
  const params = useParams()
  const [item, setItem] = useState<Item | null>(null)
  const [completada, setCompletada] = useState(0)
  const [rehacer, setRehacer] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/ordenes-primarias?numero=${params.numero}`)
      .then(r => r.json())
      .then((ordenes: any[]) => {
        const op = ordenes?.[0]
        const found = op?.items?.find((i: any) => String(i.codigo) === String(params.codigo))
        if (found) {
          setItem(found)
          setCompletada(found.cantidadCompletada)
          setRehacer(found.cantidadRehacer)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [params.numero, params.codigo])

  async function handleSave() {
    if (!item) return
    setSaving(true)
    setError('')
    const res = await fetch(`/api/items-produccion/${item.id}/progreso`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cantidadCompletada: completada, cantidadRehacer: rehacer }),
    })
    setSaving(false)
    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 2000) }
    else setError('Error al guardar')
  }

  if (loading) return (
    <main className="min-h-screen bg-gray-950 flex items-center justify-center">
      <p className="text-gray-400">Cargando...</p>
    </main>
  )

  if (!item) return (
    <main className="min-h-screen bg-gray-950 flex items-center justify-center">
      <p className="text-red-400">Pieza no encontrada</p>
    </main>
  )

  const pct = item.cantidadTotal > 0 ? Math.round((completada / item.cantidadTotal) * 100) : 0

  return (
    <main className="min-h-screen bg-gray-950 p-6 max-w-sm mx-auto">
      <p className="text-gray-500 text-xs mb-1">OP {params.numero} · ID {item.codigo}</p>
      <h1 className="text-white font-bold text-lg mb-1">{item.nombre}</h1>
      <p className="text-gray-400 text-sm mb-4">Necesarios: {item.cantidadTotal}</p>

      <div className="h-2 bg-gray-800 rounded-full mb-6">
        <div className="h-2 bg-green-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>

      <div className="mb-4">
        <label className="text-gray-400 text-sm mb-2 block">Completados</label>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setCompletada(v => Math.max(0, v - 1))}
            className="w-12 h-12 rounded-full bg-gray-800 text-white text-xl font-bold"
          >−</button>
          <span className="text-white text-3xl font-bold w-16 text-center">{completada}</span>
          <button
            type="button"
            onClick={() => setCompletada(v => Math.min(item.cantidadTotal, v + 1))}
            className="w-12 h-12 rounded-full bg-gray-800 text-white text-xl font-bold"
          >+</button>
        </div>
      </div>

      <div className="mb-8">
        <label className="text-gray-400 text-sm mb-2 block">Rehacer</label>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setRehacer(v => Math.max(0, v - 1))}
            className="w-12 h-12 rounded-full bg-gray-800 text-white text-xl font-bold"
          >−</button>
          <span className="text-red-400 text-3xl font-bold w-16 text-center">{rehacer}</span>
          <button
            type="button"
            onClick={() => setRehacer(v => v + 1)}
            className="w-12 h-12 rounded-full bg-gray-800 text-white text-xl font-bold"
          >+</button>
        </div>
      </div>

      {error && <p className="text-red-400 text-sm mb-2">{error}</p>}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className={`w-full py-4 rounded-xl font-bold text-white text-base transition-colors ${
          saved ? 'bg-green-700' : 'bg-green-600 hover:bg-green-500'
        } disabled:opacity-50`}
      >
        {saved ? '✓ Guardado' : saving ? 'Guardando...' : 'Guardar progreso'}
      </button>
    </main>
  )
}
