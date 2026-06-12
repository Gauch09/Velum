'use client'
import { useState } from 'react'

type LoteDraft = {
  codigo: string
  material: string
  colorChapa: string
  medidaLargo: string
  medidaAncho: string
  espesor: string
  cantidadChapas: string
}

const EMPTY: LoteDraft = {
  codigo: '', material: 'Chapa Galv.', colorChapa: 'Crudo',
  medidaLargo: '3', medidaAncho: '1.2', espesor: '0.7', cantidadChapas: ''
}

type Props = { onAdd: (lote: LoteDraft) => void }

export default function LoteChapaForm({ onAdd }: Props) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<LoteDraft>(EMPTY)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.codigo || !form.cantidadChapas) return
    onAdd(form)
    setForm(EMPTY)
    setOpen(false)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-yellow-400 border border-yellow-700 hover:border-yellow-400 px-3 py-1.5 rounded-lg text-sm"
      >
        + Agregar lote de chapa (OT)
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}
        >
          <form
            onSubmit={handleSubmit}
            className="bg-gray-900 rounded-xl w-full max-w-sm border border-gray-700 p-5 flex flex-col gap-3"
          >
            <h3 className="text-white font-bold text-base">Nuevo lote de chapa (OT)</h3>

            <div>
              <label className="text-gray-400 text-xs mb-1 block">Código OT *</label>
              <input
                className="w-full bg-gray-800 text-white text-sm px-3 py-2 rounded-lg border border-gray-600 focus:border-yellow-500 outline-none"
                value={form.codigo}
                onChange={e => setForm(f => ({ ...f, codigo: e.target.value }))}
                placeholder="2026.4-L16"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Material', key: 'material' },
                { label: 'Color', key: 'colorChapa' },
              ].map(({ label, key }) => (
                <div key={key}>
                  <label className="text-gray-400 text-xs mb-1 block">{label}</label>
                  <input
                    className="w-full bg-gray-800 text-white text-sm px-3 py-2 rounded-lg border border-gray-600 outline-none"
                    value={(form as any)[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  />
                </div>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Largo (m)', key: 'medidaLargo' },
                { label: 'Ancho (m)', key: 'medidaAncho' },
                { label: 'ESP (mm)', key: 'espesor' },
              ].map(({ label, key }) => (
                <div key={key}>
                  <label className="text-gray-400 text-xs mb-1 block">{label}</label>
                  <input
                    type="number" step="0.01"
                    className="w-full bg-gray-800 text-white text-sm px-3 py-2 rounded-lg border border-gray-600 outline-none"
                    value={(form as any)[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  />
                </div>
              ))}
            </div>

            <div>
              <label className="text-gray-400 text-xs mb-1 block">Cantidad chapas *</label>
              <input
                type="number" min="1"
                className="w-full bg-gray-800 text-white text-sm px-3 py-2 rounded-lg border border-gray-600 focus:border-yellow-500 outline-none"
                value={form.cantidadChapas}
                onChange={e => setForm(f => ({ ...f, cantidadChapas: e.target.value }))}
                required
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setOpen(false)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg text-sm">Cancelar</button>
              <button type="submit"
                className="flex-1 bg-yellow-600 hover:bg-yellow-500 text-white py-2 rounded-lg font-bold text-sm">Agregar</button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}
