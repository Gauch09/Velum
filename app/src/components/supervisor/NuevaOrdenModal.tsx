'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

type RutaItem = {
  sistema: string
  producto: string
  primeraEtapaTipo: string | null
}

type Proyecto = {
  id: string
  nombre: string
  cliente: string
}

const UNIDADES = ['PIEZAS', 'METROS', 'M2'] as const
type Unidad = typeof UNIDADES[number]

export default function NuevaOrdenModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [rutas, setRutas] = useState<RutaItem[]>([])
  const [proyectos, setProyectos] = useState<Proyecto[]>([])
  const [errorMsg, setErrorMsg] = useState('')

  const [sistema, setSistema] = useState('')
  const [producto, setProducto] = useState('')
  const [cantidad, setCantidad] = useState('')
  const [unidad, setUnidad] = useState<Unidad>('PIEZAS')
  const [proyectoId, setProyectoId] = useState('')
  const [isUrgente, setIsUrgente] = useState(false)

  const router = useRouter()

  useEffect(() => {
    if (!isOpen) return
    const controller = new AbortController()

    Promise.all([
      fetch('/api/rutas', { signal: controller.signal }).then(r => r.json()),
      fetch('/api/proyectos', { signal: controller.signal }).then(r => r.json()),
    ])
      .then(([r, p]) => {
        setRutas(Array.isArray(r) ? r : [])
        setProyectos(Array.isArray(p) ? p : [])
      })
      .catch(() => {})

    return () => controller.abort()
  }, [isOpen])

  const sistemas = Array.from(new Set(rutas.map(r => r.sistema))).sort()
  const productosFiltrados = rutas
    .filter(r => r.sistema === sistema)
    .map(r => r.producto)
    .sort()

  function handleSistemaChange(s: string) {
    setSistema(s)
    setProducto('')
  }

  function resetForm() {
    setSistema('')
    setProducto('')
    setCantidad('')
    setUnidad('PIEZAS')
    setProyectoId('')
    setIsUrgente(false)
    setErrorMsg('')
  }

  function handleClose() {
    setIsOpen(false)
    resetForm()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!sistema || !producto || !cantidad || !unidad) {
      setErrorMsg('Completá todos los campos obligatorios')
      return
    }

    setIsLoading(true)
    setErrorMsg('')

    const body: Record<string, unknown> = {
      sistema,
      producto,
      cantidad: Number(cantidad),
      unidad,
      proyectoId: proyectoId || undefined,
      prioridad: isUrgente ? 1 : 0,
    }

    try {
      const res = await fetch('/api/ordenes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json()
        setErrorMsg(data.error ?? 'Error al crear la orden')
        return
      }

      handleClose()
      router.refresh()
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="bg-green-600 hover:bg-green-500 active:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold text-sm transition-colors"
      >
        + Nueva Orden
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          onClick={e => { if (e.target === e.currentTarget) handleClose() }}
        >
          <div className="bg-gray-900 rounded-xl w-full max-w-lg shadow-2xl border border-gray-700">
            <div className="flex justify-between items-center px-5 py-4 border-b border-gray-700">
              <h2 className="text-white font-bold text-lg">Nueva Orden de Producción</h2>
              <button
                type="button"
                onClick={handleClose}
                className="text-gray-400 hover:text-white text-xl leading-none"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-5 py-4 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Sistema *</label>
                  <select
                    value={sistema}
                    onChange={e => handleSistemaChange(e.target.value)}
                    className="w-full bg-gray-800 text-white text-sm px-3 py-2 rounded-lg border border-gray-600 focus:border-green-500 outline-none"
                    required
                  >
                    <option value="">Seleccionar...</option>
                    {sistemas.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Producto *</label>
                  <select
                    value={producto}
                    onChange={e => setProducto(e.target.value)}
                    disabled={!sistema}
                    className="w-full bg-gray-800 text-white text-sm px-3 py-2 rounded-lg border border-gray-600 focus:border-green-500 outline-none disabled:opacity-40"
                    required
                  >
                    <option value="">Seleccionar...</option>
                    {productosFiltrados.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-gray-400 text-xs mb-1 block">Cantidad *</label>
                  <input
                    type="number"
                    value={cantidad}
                    onChange={e => setCantidad(e.target.value)}
                    min="1"
                    placeholder="100"
                    className="w-full bg-gray-800 text-white text-sm px-3 py-2 rounded-lg border border-gray-600 focus:border-green-500 outline-none"
                    required
                  />
                </div>
                <div className="w-28">
                  <label className="text-gray-400 text-xs mb-1 block">Unidad *</label>
                  <select
                    value={unidad}
                    onChange={e => setUnidad(e.target.value as Unidad)}
                    className="w-full bg-gray-800 text-white text-sm px-3 py-2 rounded-lg border border-gray-600 focus:border-green-500 outline-none"
                  >
                    {UNIDADES.map(u => <option key={u} value={u}>{u.toLowerCase()}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-gray-400 text-xs mb-1 block">Proyecto (opcional)</label>
                <select
                  value={proyectoId}
                  onChange={e => setProyectoId(e.target.value)}
                  className="w-full bg-gray-800 text-white text-sm px-3 py-2 rounded-lg border border-gray-600 focus:border-green-500 outline-none"
                >
                  <option value="">Sin proyecto asignado</option>
                  {proyectos.map(p => (
                    <option key={p.id} value={p.id}>{p.nombre} — {p.cliente}</option>
                  ))}
                </select>
              </div>

              <label className="flex items-center gap-3 cursor-pointer select-none">
                <button
                  type="button"
                  role="switch"
                  aria-checked={isUrgente}
                  onClick={() => setIsUrgente(v => !v)}
                  className={`relative w-10 h-6 rounded-full transition-colors flex-shrink-0 ${
                    isUrgente ? 'bg-red-600' : 'bg-gray-600'
                  }`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                      isUrgente ? 'translate-x-5' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className="text-gray-300 text-sm">Marcar como urgente</span>
              </label>

              {errorMsg && (
                <p className="text-red-400 text-sm">{errorMsg}</p>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg font-medium text-sm transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 bg-green-600 hover:bg-green-500 text-white py-2 rounded-lg font-bold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Creando...' : 'Crear Orden'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
