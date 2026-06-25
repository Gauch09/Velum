'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ClienteForm from './ClienteForm'
import VanoBuilder from './VanoBuilder'
import MontajeStep, { type MontajeSeleccion } from './MontajeStep'
import type { ClienteRow } from '@/lib/cotizador/repo-clientes'
import type { VanoInput, VanoResultado } from '@/lib/cotizador/cotizar-multi'
import type { MedioElevacion } from '@/lib/cotizador/montaje/params-repo'
import type { MontajeResultado } from '@/lib/cotizador/montaje/calcularMontaje'

interface RetencionesPct {
  iva: number
  ganancias: number
  iibb: number
  suss: number
}

interface Props {
  clientes: ClienteRow[]
  materialesSkin: string[]
  materialesLama: string[]
  materialesACM: string[]
  materialesLuxsteel: string[]
  disenos: string[]
  tcDefault: number
  retencionesPct: RetencionesPct
  mediosElevacion: MedioElevacion[]
  accionCrearCliente: (raw: unknown) => Promise<ClienteRow>
  accionCotizarVano: (raw: unknown) => Promise<VanoResultado>
  accionCalcularMontaje: (raw: unknown) => Promise<MontajeResultado>
  accionCrearCotizacion: (raw: unknown) => Promise<{ id: string; numero: string }>
}

type VanoItem = { input: VanoInput; resultado: VanoResultado; cantidad: number; cara: string; key: number }

const fmt = (n: number) => n.toLocaleString('es-AR', { maximumFractionDigits: 2 })
const usd = (n: number) => `u$d ${fmt(n)}`
const RETENCIONES_TIPOS = ['IVA', 'GANANCIAS', 'IIBB', 'SUSS']
const PASOS = ['Cliente', 'Vanos', 'Montaje', 'Condiciones'] as const
type Paso = 1 | 2 | 3 | 4

export default function WizardCotizacion({
  clientes: clientesIniciales,
  materialesSkin,
  materialesLama,
  materialesACM,
  materialesLuxsteel,
  disenos,
  tcDefault,
  retencionesPct,
  mediosElevacion,
  accionCrearCliente,
  accionCotizarVano,
  accionCalcularMontaje,
  accionCrearCotizacion,
}: Props) {
  const router = useRouter()
  const [paso, setPaso] = useState<Paso>(1)
  const [clientes, setClientes] = useState<ClienteRow[]>(clientesIniciales)
  const [mostrarNuevoCliente, setMostrarNuevoCliente] = useState(false)

  // Paso 1
  const [clienteId, setClienteId] = useState(clientesIniciales[0]?.id ?? '')
  const [ubicacionObra, setUbicacionObra] = useState('')
  const [tc, setTc] = useState(String(tcDefault))
  const [margen, setMargen] = useState('150')

  // Paso 2
  const [vanos, setVanos] = useState<VanoItem[]>([])
  const [caraActual, setCaraActual] = useState('')

  // Paso 3
  const [montajeSeleccion, setMontajeSeleccion] = useState<MontajeSeleccion | null>(null)

  // Paso 4
  const [formaPago, setFormaPago] = useState('30 días factura')
  const [retencionesActivas, setRetencionesActivas] = useState<Set<string>>(new Set())
  const [retencionesCustom, setRetencionesCustom] = useState<Record<string, string>>({
    IVA:       String(retencionesPct.iva),
    GANANCIAS: String(retencionesPct.ganancias),
    IIBB:      String(retencionesPct.iibb),
    SUSS:      String(retencionesPct.suss),
  })

  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const totalVanos = vanos.reduce((acc, v) => acc + v.resultado.precioVenta * v.cantidad, 0)
  const totalM2 = vanos.reduce((acc, v) => acc + v.resultado.area * v.cantidad, 0)
  const totalMontaje = montajeSeleccion?.resultado.precioVenta ?? 0
  const totalObra = totalVanos + totalMontaje

  function agregarVano(input: VanoInput, resultado: VanoResultado, cantidad: number) {
    setVanos(prev => [...prev, { input, resultado, cantidad, cara: caraActual, key: Date.now() }])
    setMontajeSeleccion(null) // resetear montaje si cambian los vanos
  }

  function quitarVano(key: number) {
    setVanos(prev => prev.filter(v => v.key !== key))
    setMontajeSeleccion(null)
  }


  function toggleRetencion(tipo: string) {
    setRetencionesActivas(prev => {
      const s = new Set(prev)
      if (s.has(tipo)) s.delete(tipo)
      else s.add(tipo)
      return s
    })
  }

  async function emitir() {
    setGuardando(true)
    setError(null)
    try {
      const retenciones = Array.from(retencionesActivas).map(tipo => ({
        tipo,
        porcentaje: Number(retencionesCustom[tipo] ?? 0),
      }))
      const montajePayload = montajeSeleccion ? {
        medioElevacionId:      montajeSeleccion.medioElevacionId,
        nOperarios:            montajeSeleccion.nOperarios,
        hsPresencial:          montajeSeleccion.hsPresencial,
        margenPct:             Number(margen) / 100,
        resultado:             montajeSeleccion.resultado,
      } : null

      const result = await accionCrearCotizacion({
        clienteId,
        ubicacionObra: ubicacionObra || null,
        tcUsado: Number(tc),
        margenPct: Number(margen),
        vanos: vanos.flatMap(v => Array.from({ length: v.cantidad }, () => ({ ...v.resultado, cara: v.cara }))),
        montaje: montajePayload,
        condiciones: { formaPagoProducto: formaPago, retenciones },
      })
      router.push(`/cotizaciones/${result.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al emitir')
      setGuardando(false)
    }
  }

  const inp = 'w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-gray-500'
  const label = 'block text-gray-400 text-xs mb-1'

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Pasos */}
      <div className="flex gap-1 text-xs">
        {PASOS.map((nombre, i) => {
          const p = (i + 1) as Paso
          const clickable = p < paso || (p === 2 && !!clienteId) || (p === 3 && vanos.length > 0)
          return (
            <button
              key={p}
              type="button"
              onClick={() => { if (clickable) setPaso(p) }}
              className={`flex-1 py-1.5 rounded text-center ${paso === p ? 'bg-white text-gray-900 font-semibold' : 'bg-gray-800 text-gray-500 hover:text-gray-300'}`}
            >
              {nombre}
            </button>
          )
        })}
      </div>

      {/* Paso 1: Cliente */}
      {paso === 1 && (
        <div className="space-y-4">
          <div>
            <label className={label}>Cliente *</label>
            <select value={clienteId} onChange={e => setClienteId(e.target.value)} className={inp}>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.razonSocial}</option>)}
            </select>
          </div>
          <button
            type="button"
            onClick={() => setMostrarNuevoCliente(v => !v)}
            className="text-sm text-blue-400 hover:text-blue-300"
          >
            {mostrarNuevoCliente ? 'Cancelar nuevo cliente' : '+ Nuevo cliente'}
          </button>
          {mostrarNuevoCliente && (
            <div className="bg-gray-900 rounded-lg p-4">
              <ClienteForm
                accion={accionCrearCliente}
                submitLabel="Crear y seleccionar"
                onCreado={cl => {
                  setClientes(prev => [...prev, cl])
                  setClienteId(cl.id)
                  setMostrarNuevoCliente(false)
                }}
                onCancel={() => setMostrarNuevoCliente(false)}
              />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="col-span-2">
              <label className={label}>Ubicación obra</label>
              <input value={ubicacionObra} onChange={e => setUbicacionObra(e.target.value)} placeholder="Av. Aconquija 1500, Tucumán" className={inp} />
            </div>
            <div>
              <label className={label}>Tipo de cambio ($/u$d)</label>
              <input value={tc} onChange={e => setTc(e.target.value)} type="number" className={inp} />
            </div>
            <div>
              <label className={label}>Margen (%)</label>
              <input value={margen} onChange={e => setMargen(e.target.value)} type="number" className={inp} />
            </div>
          </div>
          <button
            type="button"
            disabled={!clienteId}
            onClick={() => setPaso(2)}
            className="w-full bg-white text-gray-900 text-sm font-semibold py-2 rounded hover:bg-gray-100 disabled:opacity-40"
          >
            Siguiente: Vanos
          </button>
        </div>
      )}

      {/* Paso 2: Vanos */}
      {paso === 2 && (
        <div className="space-y-4">
          <VanoBuilder
            materialesSkin={materialesSkin}
            materialesLama={materialesLama}
            materialesACM={materialesACM}
            materialesLuxsteel={materialesLuxsteel}
            disenos={disenos}
            margenPct={Number(margen)}
            caraNombre={caraActual}
            onCaraNombreChange={setCaraActual}
            onAgregar={agregarVano}
            accionCotizar={accionCotizarVano}
          />

          {vanos.length > 0 && (
            <div className="space-y-2">
              <p className="text-gray-400 text-xs uppercase tracking-wider">Paños cargados</p>
              {/* agrupar por cara en orden de aparición */}
              {Array.from(new Map(vanos.map(v => [v.cara, true])).keys()).map(c => {
                const vanosC = vanos.filter(v => v.cara === c)
                const m2Cara = vanosC.reduce((a, v) => a + v.resultado.area * v.cantidad, 0)
                const precioC = vanosC.reduce((a, v) => a + v.resultado.precioVenta * v.cantidad, 0)
                return (
                  <div key={c} className="rounded-lg border border-gray-800 overflow-hidden">
                    {/* Encabezado de cara */}
                    <div className="flex items-center justify-between bg-gray-800/60 px-3 py-2">
                      <span className="text-sm text-white font-semibold">{c || '(sin nombre)'}</span>
                      <span className="text-xs text-gray-400">{fmt(m2Cara)} m² · <span className="text-green-400">{usd(precioC)}</span></span>
                    </div>
                    {/* Paños de esta cara */}
                    <div className="divide-y divide-gray-800/60">
                      {vanosC.map(v => (
                        <div key={v.key} className="px-3 py-2 space-y-0.5">
                          <div className="flex items-center gap-3">
                            <div className="flex-1 min-w-0">
                              {v.resultado.descripcion && (
                                <p className="text-white text-sm font-medium truncate">{v.resultado.descripcion}</p>
                              )}
                              <p className={`text-xs ${v.resultado.descripcion ? 'text-gray-500' : 'text-gray-300'}`}>
                                <span className="text-gray-600 mr-1">{v.resultado.sistema}</span>
                                {v.resultado.material}{v.resultado.colorACM ? ` · ${v.resultado.colorACM}` : ''}
                              </p>
                            </div>
                            {v.cantidad > 1 && (
                              <span className="text-xs bg-gray-700 text-gray-300 rounded px-1.5 py-0.5 shrink-0">×{v.cantidad}</span>
                            )}
                            <span className="text-sm text-green-400 w-24 text-right shrink-0">{usd(v.resultado.precioVenta * v.cantidad)}</span>
                            <button type="button" onClick={() => quitarVano(v.key)} className="text-gray-600 hover:text-red-400 text-xs shrink-0">✕</button>
                          </div>
                          <div className="flex gap-3 text-xs text-gray-600">
                            <span>{fmt(v.resultado.ancho)}×{fmt(v.resultado.alto)} m</span>
                            <span>{fmt(v.resultado.area * v.cantidad)} m²</span>
                            <span>{v.resultado.terminacion}</span>
                            <span>{usd(v.resultado.precioM2)}/m²</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
              <div className="flex justify-between text-sm border-t border-gray-800 pt-2 mt-1">
                <span className="text-gray-400">Total provisión · {fmt(totalM2)} m²</span>
                <span className="text-green-400 font-semibold">{usd(totalVanos)}</span>
              </div>
            </div>
          )}
          <div className="flex gap-3">
            <button type="button" onClick={() => setPaso(1)} className="px-4 text-gray-400 text-sm hover:text-white">Atrás</button>
            <button
              type="button"
              disabled={vanos.length === 0}
              onClick={() => setPaso(3)}
              className="flex-1 bg-white text-gray-900 text-sm font-semibold py-2 rounded hover:bg-gray-100 disabled:opacity-40"
            >
              Siguiente: Montaje
            </button>
          </div>
        </div>
      )}

      {/* Paso 3: Montaje */}
      {paso === 3 && (
        <div className="space-y-4">
          <MontajeStep
            totalM2={totalM2}
            margenPct={Number(margen)}
            mediosElevacion={mediosElevacion}
            accionCalcular={accionCalcularMontaje}
            onChange={setMontajeSeleccion}
          />

          {/* Total obra: provisión + montaje, se actualiza al calcular */}
          <div className="bg-gray-900 rounded-lg p-4 space-y-1 text-sm">
            <div className="flex justify-between text-gray-400">
              <span>Provisión · {fmt(totalM2)} m²</span>
              <span className="text-white">{usd(totalVanos)}</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Montaje</span>
              <span className={totalMontaje > 0 ? 'text-white' : 'text-gray-600'}>
                {totalMontaje > 0 ? usd(totalMontaje) : 'sin calcular'}
              </span>
            </div>
            <div className="flex justify-between text-gray-300 font-semibold border-t border-gray-800 pt-2 mt-1">
              <span>Total obra</span>
              <span className="text-green-400">{usd(totalObra)}</span>
            </div>
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={() => setPaso(2)} className="px-4 text-gray-400 text-sm hover:text-white">Atrás</button>
            <button
              type="button"
              onClick={() => setPaso(4)}
              className="flex-1 bg-white text-gray-900 text-sm font-semibold py-2 rounded hover:bg-gray-100"
            >
              Siguiente: Condiciones
            </button>
          </div>
        </div>
      )}

      {/* Paso 4: Condiciones comerciales */}
      {paso === 4 && (
        <div className="space-y-4">
          <div>
            <label className={label}>Forma de pago</label>
            <input value={formaPago} onChange={e => setFormaPago(e.target.value)} placeholder="30 días factura" className={inp} />
          </div>

          <div>
            <p className={label}>Retenciones aplicables</p>
            <div className="grid grid-cols-2 gap-2">
              {RETENCIONES_TIPOS.map(tipo => {
                const activo = retencionesActivas.has(tipo)
                const llave = tipo.toLowerCase() as keyof RetencionesPct
                return (
                  <div key={tipo} className={`rounded border p-3 ${activo ? 'border-blue-500 bg-gray-800' : 'border-gray-700 bg-gray-900'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <input type="checkbox" checked={activo} onChange={() => toggleRetencion(tipo)} className="accent-blue-500" />
                      <span className="text-white text-sm">{tipo}</span>
                    </div>
                    {activo ? (
                      <input
                        type="number"
                        step="0.1"
                        value={retencionesCustom[tipo] ?? String(retencionesPct[llave] ?? 0)}
                        onChange={e => setRetencionesCustom(prev => ({ ...prev, [tipo]: e.target.value }))}
                        className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs"
                      />
                    ) : (
                      <span className="text-gray-600 text-xs">Default: {retencionesPct[llave]}%</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Resumen */}
          <div className="bg-gray-900 rounded-lg p-4 space-y-1 text-sm">
            <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">Resumen</p>
            <div className="flex justify-between text-gray-400">
              <span>Cliente</span>
              <span className="text-white">{clientes.find(c => c.id === clienteId)?.razonSocial ?? '—'}</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Vanos</span>
              <span className="text-white">{vanos.length} ({fmt(totalM2)} m²)</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Provisión</span>
              <span className="text-white">{usd(totalVanos)}</span>
            </div>
            {totalMontaje > 0 && (
              <div className="flex justify-between text-gray-400">
                <span>Montaje</span>
                <span className="text-white">{usd(totalMontaje)}</span>
              </div>
            )}
            <div className="flex justify-between text-gray-300 font-semibold border-t border-gray-800 pt-2 mt-2">
              <span>Total obra</span>
              <span className="text-green-400">{usd(totalObra)}</span>
            </div>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex gap-3">
            <button type="button" onClick={() => setPaso(3)} className="px-4 text-gray-400 text-sm hover:text-white">Atrás</button>
            <button
              type="button"
              disabled={guardando}
              onClick={emitir}
              className="flex-1 bg-white text-gray-900 text-sm font-semibold py-2 rounded hover:bg-gray-100 disabled:opacity-40"
            >
              {guardando ? 'Guardando…' : 'Emitir cotización'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
