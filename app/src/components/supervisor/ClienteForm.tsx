'use client'

import { useState } from 'react'
import { formatCuit, validarCuit } from '@/lib/cotizador/validar-cuit'
import type { ClienteRow } from '@/lib/cotizador/repo-clientes'

interface Props {
  onCreado?: (cliente: ClienteRow) => void
  onCancel?: () => void
  submitLabel?: string
  accion: (raw: unknown) => Promise<ClienteRow>
}

const IVAS = [
  { value: 'RESPONSABLE_INSCRIPTO', label: 'Responsable Inscripto' },
  { value: 'MONOTRIBUTO', label: 'Monotributo' },
  { value: 'EXENTO', label: 'Exento' },
]

export default function ClienteForm({ onCreado, onCancel, submitLabel = 'Guardar cliente', accion }: Props) {
  const [cuit, setCuit] = useState('')
  const [cuitValido, setCuitValido] = useState<boolean | null>(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleCuitChange(v: string) {
    const fmt = formatCuit(v)
    setCuit(fmt)
    const digits = fmt.replace(/\D/g, '')
    if (digits.length === 11) setCuitValido(validarCuit(fmt))
    else setCuitValido(null)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!cuitValido) return
    const fd = new FormData(e.currentTarget)
    setCargando(true)
    setError(null)
    try {
      const payload = {
        cliente: {
          razonSocial:       fd.get('razonSocial') as string,
          cuit:              cuit.replace(/\D/g, ''),
          condicionIva:      fd.get('condicionIva') as string,
          domicilioFiscal:   fd.get('domicilioFiscal') as string || undefined,
          jurisdiccionIibb:  fd.get('jurisdiccionIibb') as string || undefined,
          esAgenteRetencion: fd.get('esAgenteRetencion') === 'on',
        },
        contacto: {
          nombre:   fd.get('contactoNombre') as string,
          cargo:    fd.get('contactoCargo') as string || undefined,
          email:    fd.get('contactoEmail') as string,
          telefono: fd.get('contactoTelefono') as string || undefined,
        },
      }
      const cl = await accion(payload)
      onCreado?.(cl)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setCargando(false)
    }
  }

  const input = 'w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-gray-500'
  const label = 'block text-gray-400 text-xs mb-1'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className={label}>Razón social *</label>
          <input name="razonSocial" required placeholder="VELUM S.A." className={input} />
        </div>
        <div>
          <label className={label}>
            CUIT *{' '}
            {cuitValido === true && <span className="text-green-400">✓</span>}
            {cuitValido === false && <span className="text-red-400">inválido</span>}
          </label>
          <input
            value={cuit}
            onChange={e => handleCuitChange(e.target.value)}
            placeholder="20-00000000-0"
            className={`${input} ${cuitValido === false ? 'border-red-500' : ''}`}
            required
          />
        </div>
        <div>
          <label className={label}>Condición IVA *</label>
          <select name="condicionIva" required className={input}>
            {IVAS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className={label}>Domicilio fiscal</label>
          <input name="domicilioFiscal" placeholder="Av. Siempreviva 742" className={input} />
        </div>
        <div>
          <label className={label}>Jurisdicción IIBB</label>
          <input name="jurisdiccionIibb" placeholder="Santa Fe" className={input} />
        </div>
        <div className="col-span-2 flex items-center gap-2">
          <input type="checkbox" name="esAgenteRetencion" id="agente" className="accent-blue-500" />
          <label htmlFor="agente" className="text-gray-400 text-sm">Es agente de retención</label>
        </div>
      </div>

      <div className="border-t border-gray-800 pt-4">
        <p className="text-gray-500 text-xs mb-3 uppercase tracking-wider">Contacto principal</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>Nombre *</label>
            <input name="contactoNombre" required placeholder="Juan Pérez" className={input} />
          </div>
          <div>
            <label className={label}>Cargo</label>
            <input name="contactoCargo" placeholder="Gerente de obra" className={input} />
          </div>
          <div>
            <label className={label}>Email *</label>
            <input name="contactoEmail" type="email" required placeholder="juan@empresa.com" className={input} />
          </div>
          <div>
            <label className={label}>Teléfono</label>
            <input name="contactoTelefono" placeholder="+54 9 341 000-0000" className={input} />
          </div>
        </div>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={cargando || cuitValido === false}
          className="flex-1 bg-white text-gray-900 text-sm font-semibold py-2 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {cargando ? 'Guardando…' : submitLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="px-4 text-gray-400 text-sm hover:text-white">
            Cancelar
          </button>
        )}
      </div>
    </form>
  )
}
