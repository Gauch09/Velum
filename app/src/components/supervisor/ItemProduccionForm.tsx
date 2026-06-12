'use client'
import { useState } from 'react'

type ItemDraft = {
  nombre: string
  material: string
  espesor: string
  largo: string
  ancho: string
  cantidadTotal: string
  proximoProceso: string
  notas: string
}

const EMPTY: ItemDraft = {
  nombre: '', material: 'Chapa Galv.', espesor: '0.7',
  largo: '', ancho: '', cantidadTotal: '', proximoProceso: 'Plegado', notas: ''
}

type Props = {
  capLavado: number
  capHorno: number
  onAdd: (item: ItemDraft & { bachLavado: number; bachHorno: number }) => void
}

export default function ItemProduccionForm({ capLavado, capHorno, onAdd }: Props) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<ItemDraft>(EMPTY)

  function calcBach(largo: number, ancho: number, cap: number) {
    if (!largo || !ancho || !cap) return 0
    const area = (largo / 1000) * (ancho / 1000)
    return area > 0 ? Math.floor(cap / area) : 0
  }

  const largo = parseFloat(form.largo) || 0
  const ancho = parseFloat(form.ancho) || 0
  const bachLavado = calcBach(largo, ancho, capLavado)
  const bachHorno = calcBach(largo, ancho, capHorno)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nombre || !form.largo || !form.ancho || !form.cantidadTotal) return
    onAdd({ ...form, bachLavado, bachHorno })
    setForm(EMPTY)
    setOpen(false)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-green-400 border border-green-700 hover:border-green-400 px-3 py-1.5 rounded-lg text-sm"
      >
        + Agregar pieza
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}
        >
          <form
            onSubmit={handleSubmit}
            className="bg-gray-900 rounded-xl w-full max-w-md border border-gray-700 p-5 flex flex-col gap-3"
          >
            <h3 className="text-white font-bold text-base">Nueva pieza</h3>

            {[
              { label: 'Nombre *', key: 'nombre', placeholder: 'MultiSlim.O - 1322 - 1400mm' },
              { label: 'Material *', key: 'material', placeholder: 'Chapa Galv.' },
            ].map(({ label, key, placeholder }) => (
              <div key={key}>
                <label className="text-gray-400 text-xs mb-1 block">{label}</label>
                <input
                  className="w-full bg-gray-800 text-white text-sm px-3 py-2 rounded-lg border border-gray-600 focus:border-green-500 outline-none"
                  value={(form as any)[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder}
                  required
                />
              </div>
            ))}

            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Espesor (mm)', key: 'espesor' },
                { label: 'Largo (mm)', key: 'largo' },
                { label: 'Ancho (mm)', key: 'ancho' },
              ].map(({ label, key }) => (
                <div key={key}>
                  <label className="text-gray-400 text-xs mb-1 block">{label}</label>
                  <input
                    type="number" step="0.1"
                    className="w-full bg-gray-800 text-white text-sm px-3 py-2 rounded-lg border border-gray-600 focus:border-green-500 outline-none"
                    value={(form as any)[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    required={key !== 'espesor'}
                  />
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Cantidad necesaria *</label>
                <input
                  type="number" min="1"
                  className="w-full bg-gray-800 text-white text-sm px-3 py-2 rounded-lg border border-gray-600 focus:border-green-500 outline-none"
                  value={form.cantidadTotal}
                  onChange={e => setForm(f => ({ ...f, cantidadTotal: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Próximo proceso</label>
                <input
                  className="w-full bg-gray-800 text-white text-sm px-3 py-2 rounded-lg border border-gray-600 focus:border-green-500 outline-none"
                  value={form.proximoProceso}
                  onChange={e => setForm(f => ({ ...f, proximoProceso: e.target.value }))}
                />
              </div>
            </div>

            {largo > 0 && ancho > 0 && (
              <p className="text-xs text-gray-500">
                Bach Lavado: <span className="text-blue-400">{bachLavado} pzas</span> ·
                Bach Horno: <span className="text-orange-400">{bachHorno} pzas</span>
              </p>
            )}

            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setOpen(false)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg text-sm">
                Cancelar
              </button>
              <button type="submit"
                className="flex-1 bg-green-600 hover:bg-green-500 text-white py-2 rounded-lg font-bold text-sm">
                Agregar
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}
