'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ItemProduccionForm from './ItemProduccionForm'
import LoteChapaForm from './LoteChapaForm'

const TIPO_EQUIPO: Record<string, string[]> = {
  OPP: ['LASER', 'PUNZONADORA_CNC', 'FRESADORA'],
  OPS: ['PLEGADORA', 'PLEGADO_MANUAL', 'EXPANSORA'],
  OPB: ['LAVADO', 'HORNO'],
}

type Props = {
  proyectos: Array<{ id: string; nombre: string; cliente: string }>
  capLavado: number
  capHorno: number
}

export default function NuevaOrdenPrimariaWizard({ proyectos, capLavado, capHorno }: Props) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const [tipo, setTipo] = useState<'OPP' | 'OPS' | 'OPB'>('OPP')
  const [equipo, setEquipo] = useState('')
  const [colorHoja, setColorHoja] = useState('ROJO')
  const [responsable, setResponsable] = useState('')
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  const [proyectoId, setProyectoId] = useState('')

  const [items, setItems] = useState<any[]>([])
  const [lotes, setLotes] = useState<any[]>([])

  function handleTipoChange(t: 'OPP' | 'OPS' | 'OPB') {
    setTipo(t)
    setEquipo('')
    setColorHoja(t === 'OPP' ? 'ROJO' : t === 'OPS' ? 'CELESTE' : 'NARANJA')
  }

  async function crearOrden(): Promise<string | null> {
    const res = await fetch('/api/ordenes-primarias', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo, equipo, colorHoja, responsable, fecha, proyectoId: proyectoId || undefined, items, lotes }),
    })
    if (!res.ok) {
      setError((await res.json()).error ?? 'Error al crear')
      return null
    }
    const orden = await res.json()
    return orden.id
  }

  async function handleEmitir() {
    setIsLoading(true)
    setError('')
    try {
      const id = await crearOrden()
      if (!id) return
      const emitRes = await fetch(`/api/ordenes-primarias/${id}/emitir`, { method: 'POST' })
      if (!emitRes.ok) {
        setError((await emitRes.json()).error ?? 'Error al emitir')
        return
      }
      router.push('/ordenes-primarias')
      router.refresh()
    } finally {
      setIsLoading(false)
    }
  }

  async function handleBorrador() {
    setIsLoading(true)
    setError('')
    try {
      const id = await crearOrden()
      if (!id) return
      router.push('/ordenes-primarias')
      router.refresh()
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gray-950 p-6 max-w-3xl mx-auto">
      <h1 className="text-white text-2xl font-bold mb-6">Nueva Orden de Producción</h1>

      <div className="flex gap-2 mb-8">
        {['Encabezado', 'Piezas', 'Revisión'].map((label, i) => (
          <div key={i} className={`flex-1 h-1.5 rounded-full ${step > i ? 'bg-green-500' : 'bg-gray-700'}`} />
        ))}
      </div>

      {step === 1 && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-3">
            {(['OPP', 'OPS', 'OPB'] as const).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => handleTipoChange(t)}
                className={`py-3 rounded-xl font-bold text-sm border ${tipo === t ? 'border-green-500 bg-green-950 text-green-400' : 'border-gray-700 text-gray-400'}`}
              >
                {t}
              </button>
            ))}
          </div>

          <div>
            <label className="text-gray-400 text-xs mb-1 block">Equipo *</label>
            <select
              value={equipo}
              onChange={e => setEquipo(e.target.value)}
              className="w-full bg-gray-800 text-white text-sm px-3 py-2 rounded-lg border border-gray-600 outline-none"
              required
            >
              <option value="">Seleccionar...</option>
              {TIPO_EQUIPO[tipo].map(eq => <option key={eq} value={eq}>{eq}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Responsable *</label>
              <input
                className="w-full bg-gray-800 text-white text-sm px-3 py-2 rounded-lg border border-gray-600 outline-none"
                value={responsable}
                onChange={e => setResponsable(e.target.value)}
                placeholder="ERIK"
              />
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Color de hoja</label>
              <input
                className="w-full bg-gray-800 text-white text-sm px-3 py-2 rounded-lg border border-gray-600 outline-none"
                value={colorHoja}
                onChange={e => setColorHoja(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Fecha</label>
              <input
                type="date"
                className="w-full bg-gray-800 text-white text-sm px-3 py-2 rounded-lg border border-gray-600 outline-none"
                value={fecha}
                onChange={e => setFecha(e.target.value)}
              />
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Proyecto (opcional)</label>
              <select
                value={proyectoId}
                onChange={e => setProyectoId(e.target.value)}
                className="w-full bg-gray-800 text-white text-sm px-3 py-2 rounded-lg border border-gray-600 outline-none"
              >
                <option value="">Sin proyecto</option>
                {proyectos.map(p => <option key={p.id} value={p.id}>{p.nombre} — {p.cliente}</option>)}
              </select>
            </div>
          </div>

          <button
            type="button"
            disabled={!tipo || !equipo || !responsable}
            onClick={() => setStep(2)}
            className="mt-2 bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white py-2 rounded-lg font-bold text-sm"
          >
            Siguiente → Piezas
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-4">
          {tipo === 'OPP' && (
            <div>
              <h2 className="text-yellow-400 font-semibold text-sm mb-2">Lotes de Chapa (OT)</h2>
              {lotes.map((l, i) => (
                <div key={i} className="bg-gray-800 rounded-lg px-3 py-2 text-sm text-gray-300 flex justify-between mb-2">
                  <span>OT: {l.codigo} · {l.material} {l.medidaLargo}×{l.medidaAncho}m · {l.cantidadChapas} chapas</span>
                  <button type="button" onClick={() => setLotes(ls => ls.filter((_, j) => j !== i))}
                    className="text-red-400 ml-3">×</button>
                </div>
              ))}
              <LoteChapaForm onAdd={l => setLotes(ls => [...ls, l])} />
            </div>
          )}

          <div>
            <h2 className="text-green-400 font-semibold text-sm mb-2">Items de Producción</h2>
            {items.map((item, i) => (
              <div key={i} className="bg-gray-800 rounded-lg px-3 py-2 text-sm mb-2">
                <div className="flex justify-between">
                  <span className="text-white font-semibold">{item.nombre}</span>
                  <button type="button" onClick={() => setItems(is => is.filter((_, j) => j !== i))}
                    className="text-red-400">×</button>
                </div>
                <p className="text-gray-400">
                  {item.material} · {item.espesor}mm · {item.largo}×{item.ancho}mm · {item.cantidadTotal} pzas
                </p>
                <p className="text-gray-500 text-xs">
                  Bach Lavado: {item.bachLavado} · Bach Horno: {item.bachHorno}
                </p>
              </div>
            ))}
            <ItemProduccionForm
              capLavado={capLavado}
              capHorno={capHorno}
              onAdd={item => setItems(is => [...is, item])}
            />
          </div>

          <div className="flex gap-2 mt-2">
            <button type="button" onClick={() => setStep(1)}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg text-sm">
              ← Atrás
            </button>
            <button type="button" disabled={items.length === 0} onClick={() => setStep(3)}
              className="flex-1 bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white py-2 rounded-lg font-bold text-sm">
              Siguiente → Revisión
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="flex flex-col gap-4">
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <p className="text-white font-bold text-sm">{tipo} · {equipo} · Hoja {colorHoja}</p>
            <p className="text-gray-400 text-sm">Responsable: {responsable} · Fecha: {fecha}</p>
            {proyectoId && <p className="text-gray-400 text-sm">Proyecto: {proyectos.find(p => p.id === proyectoId)?.nombre}</p>}
          </div>

          {tipo === 'OPP' && lotes.length > 0 && (
            <div>
              <p className="text-yellow-400 text-sm font-semibold mb-1">Lotes de chapa: {lotes.length}</p>
              {lotes.map((l, i) => (
                <p key={i} className="text-gray-400 text-xs">OT: {l.codigo} · {l.cantidadChapas} chapas {l.medidaLargo}×{l.medidaAncho}m</p>
              ))}
            </div>
          )}

          <div>
            <p className="text-green-400 text-sm font-semibold mb-1">Piezas: {items.length} tipos</p>
            {items.map((item, i) => (
              <div key={i} className="bg-gray-800 rounded-lg px-3 py-1.5 text-sm mb-1">
                <p className="text-white">{item.nombre}</p>
                <p className="text-gray-400 text-xs">{item.cantidadTotal} pzas · Bach Lavado: {item.bachLavado} · Bach Horno: {item.bachHorno}</p>
              </div>
            ))}
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex gap-2 mt-2">
            <button type="button" onClick={() => setStep(2)}
              className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg text-sm">
              ← Atrás
            </button>
            <button type="button" onClick={handleBorrador} disabled={isLoading}
              className="flex-1 bg-gray-600 hover:bg-gray-500 text-white py-2 rounded-lg text-sm">
              Guardar borrador
            </button>
            <button type="button" onClick={handleEmitir} disabled={isLoading}
              className="flex-1 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white py-2 rounded-lg font-bold text-sm">
              {isLoading ? 'Emitiendo...' : 'Emitir orden →'}
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
