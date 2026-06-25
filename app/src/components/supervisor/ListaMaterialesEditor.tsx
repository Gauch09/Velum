'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  actionEditarCantidad, actionAgregarLinea, actionBorrarLinea, actionLiberar,
} from '@/app/(supervisor)/cotizaciones/[id]/materiales/actions'

interface Linea {
  id: string; area: string; cara: string | null; insumo: string; unidad: string
  cantidad: number; cantidadCalc: number | null; origen: string; nota: string | null; orden: number
}
interface Props { cotizacionId: string; listaId: string; estado: string; lineas: Linea[] }

const fmt = (n: number) => n.toLocaleString('es-AR', { maximumFractionDigits: 2 })
const AREAS = ['COMPRAS', 'PRODUCCION'] as const

export default function ListaMaterialesEditor({ listaId, estado, lineas }: Props) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const editable = estado === 'EN_REVISION'

  async function correr(fn: () => Promise<{ ok: true } | { error: string }>) {
    setGuardando(true); setError(null)
    const r = await fn()
    setGuardando(false)
    if ('error' in r) { setError(r.error); return }
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className={`text-xs px-2 py-0.5 rounded ${editable ? 'text-amber-300 bg-amber-950' : 'text-green-300 bg-green-950'}`}>
          {editable ? 'EN REVISIÓN' : 'LIBERADA'}
        </span>
        {editable && (
          <button
            type="button"
            disabled={guardando}
            onClick={() => correr(() => actionLiberar({ listaId }))}
            className="text-sm bg-white text-gray-900 font-semibold px-3 py-1.5 rounded hover:bg-gray-100 disabled:opacity-40"
          >
            Liberar ▸
          </button>
        )}
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {AREAS.map(area => {
        const delArea = lineas.filter(l => l.area === area)
        if (delArea.length === 0) return null
        const caras = Array.from(new Map(delArea.map(l => [l.cara, true])).keys())
        return (
          <div key={area} className="bg-gray-900 rounded-lg p-4">
            <p className="text-gray-400 text-xs uppercase tracking-wider mb-3">{area === 'COMPRAS' ? 'Compras' : 'Producción'}</p>
            {caras.map(cara => (
              <div key={String(cara)} className="mb-3">
                <p className="text-gray-500 text-xs mb-1">{cara ?? 'Consolidado de obra'}</p>
                <div className="divide-y divide-gray-800/60">
                  {delArea.filter(l => l.cara === cara).map(l => (
                    <LineaRow
                      key={l.id} linea={l} editable={editable} guardando={guardando}
                      onEditar={(cantidad) => correr(() => actionEditarCantidad({ lineaId: l.id, cantidad }))}
                      onBorrar={() => correr(() => actionBorrarLinea({ lineaId: l.id }))}
                    />
                  ))}
                </div>
              </div>
            ))}
            {editable && (
              <AgregarLinea area={area} guardando={guardando}
                onAgregar={(p) => correr(() => actionAgregarLinea({ listaId, area, ...p }))} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function LineaRow({ linea, editable, guardando, onEditar, onBorrar }: {
  linea: Linea; editable: boolean; guardando: boolean
  onEditar: (n: number) => void; onBorrar: () => void
}) {
  const [val, setVal] = useState(String(linea.cantidad))
  const ajustada = linea.cantidadCalc != null && linea.cantidad !== linea.cantidadCalc
  return (
    <div className="flex items-center gap-3 py-1.5 text-sm">
      <span className="flex-1 text-gray-300">{linea.insumo}</span>
      {linea.origen === 'MANUAL' && <span className="text-[10px] text-blue-300 bg-blue-950 rounded px-1">manual</span>}
      {ajustada && <span className="text-[10px] text-amber-300">ajustada</span>}
      {editable ? (
        <input
          value={val} onChange={e => setVal(e.target.value)}
          onBlur={() => { const n = Number(val); if (!Number.isNaN(n) && n !== linea.cantidad) onEditar(n) }}
          type="number" step="0.01" min="0"
          className="w-24 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-right text-white"
        />
      ) : (
        <span className="w-24 text-right text-white">{fmt(linea.cantidad)}</span>
      )}
      <span className="w-10 text-gray-500 text-xs">{linea.unidad}</span>
      {editable && linea.origen === 'MANUAL'
        ? <button type="button" disabled={guardando} onClick={onBorrar} className="text-gray-600 hover:text-red-400 text-xs">✕</button>
        : <span className="w-3" />}
    </div>
  )
}

function AgregarLinea({ area, guardando, onAgregar }: {
  area: string; guardando: boolean
  onAgregar: (p: { insumo: string; unidad: 'un'|'kg'|'m2'|'chapa'; cantidad: number; nota?: string }) => void
}) {
  const [insumo, setInsumo] = useState('')
  const [unidad, setUnidad] = useState<'un'|'kg'|'m2'|'chapa'>(area === 'COMPRAS' ? 'un' : 'un')
  const [cantidad, setCantidad] = useState('1')
  const inp = 'bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white text-sm'
  return (
    <div className="flex gap-2 mt-2 pt-2 border-t border-gray-800">
      <input value={insumo} onChange={e => setInsumo(e.target.value)} placeholder="Insumo (ej: Sellador)" className={`${inp} flex-1`} />
      <input value={cantidad} onChange={e => setCantidad(e.target.value)} type="number" min="0" step="0.01" className={`${inp} w-20`} />
      <select value={unidad} onChange={e => setUnidad(e.target.value as any)} className={inp}>
        <option value="un">un</option><option value="kg">kg</option><option value="m2">m²</option><option value="chapa">chapa</option>
      </select>
      <button
        type="button" disabled={guardando || !insumo.trim()}
        onClick={() => { onAgregar({ insumo: insumo.trim(), unidad, cantidad: Number(cantidad) || 0 }); setInsumo(''); setCantidad('1') }}
        className="text-sm border border-gray-600 text-gray-300 px-3 rounded hover:border-gray-400 disabled:opacity-40"
      >+ agregar</button>
    </div>
  )
}
