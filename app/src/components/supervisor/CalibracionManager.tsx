'use client'

import { useState } from 'react'
import { guardarParametro } from '@/app/(supervisor)/calibracion/actions'
import type { ParametroRow } from '@/lib/cotizador/parametros'

type Props = { parametros: ParametroRow[] }

export default function CalibracionManager({ parametros }: Props) {
  const [guardando, setGuardando] = useState<string | null>(null)
  const [errores, setErrores] = useState<Record<string, string>>({})

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>, clave: string) {
    e.preventDefault()
    setGuardando(clave)
    setErrores(prev => { const next = { ...prev }; delete next[clave]; return next })
    try {
      const formData = new FormData(e.currentTarget)
      const result = await guardarParametro(null, formData)
      if (result && 'error' in result) {
        setErrores(prev => ({ ...prev, [clave]: result.error as string }))
      }
    } finally {
      setGuardando(null)
    }
  }

  return (
    <div className="space-y-2">
      {parametros.map(p => (
        <div key={p.clave} className="space-y-1">
          <form
            onSubmit={e => handleSubmit(e, p.clave)}
            className="flex items-center gap-3 bg-gray-900 rounded p-3"
          >
            <input type="hidden" name="clave" value={p.clave} />
            <div className="flex-1">
              <div className="text-white text-sm">{p.descripcion ?? p.clave}</div>
              <div className="text-gray-500 text-xs">{p.clave}{p.unidad ? ` · ${p.unidad}` : ''}</div>
            </div>
            <input
              name="valor"
              type="number"
              step="any"
              defaultValue={p.valor}
              className="w-32 bg-gray-800 text-white rounded px-2 py-1 text-sm"
            />
            <button
              type="submit"
              disabled={guardando === p.clave}
              className="text-xs bg-gray-700 hover:bg-gray-600 text-white rounded px-3 py-1 disabled:opacity-50"
            >
              {guardando === p.clave ? '…' : 'Guardar'}
            </button>
          </form>
          {errores[p.clave] && (
            <p className="text-red-400 text-xs px-3">{errores[p.clave]}</p>
          )}
        </div>
      ))}
    </div>
  )
}
