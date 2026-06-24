import Link from 'next/link'
import { notFound } from 'next/navigation'
import { leerCotizacion } from '@/lib/cotizador/repo-cotizaciones'

const fmt = (n: number) => n.toLocaleString('es-AR', { maximumFractionDigits: 2 })
const usd = (n: number) => `u$d ${fmt(n)}`

const ESTADO_COLOR: Record<string, string> = {
  BORRADOR:  'text-gray-400 bg-gray-800',
  ENVIADA:   'text-blue-300 bg-blue-950',
  VISTA:     'text-purple-300 bg-purple-950',
  ACEPTADA:  'text-green-300 bg-green-950',
  RECHAZADA: 'text-red-300 bg-red-950',
}

interface Props { params: { id: string } }

export default async function CotizacionPage({ params }: Props) {
  let cot: any
  try {
    cot = await leerCotizacion(params.id)
  } catch {
    notFound()
  }

  const contactoPrincipal = cot.cliente?.contactos?.[0]

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Encabezado */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-gray-500 font-mono text-sm">{cot.numero}</span>
              <span className={`text-xs px-2 py-0.5 rounded ${ESTADO_COLOR[cot.estado] ?? 'text-gray-400 bg-gray-800'}`}>
                {cot.estado}
              </span>
            </div>
            <h1 className="text-2xl font-semibold mt-1">{cot.cliente?.razonSocial}</h1>
            {cot.ubicacionObra && <p className="text-gray-500 text-sm">{cot.ubicacionObra}</p>}
          </div>
          <div className="flex items-center gap-3">
            <a
              href={`/cotizaciones/${cot.id}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm border border-gray-600 text-gray-300 px-3 py-1.5 rounded hover:border-gray-400 hover:text-white"
            >
              Descargar PDF
            </a>
            <Link href="/cotizaciones" className="text-gray-500 text-sm hover:text-white">← Volver</Link>
          </div>
        </div>

        {/* Cliente */}
        <div className="bg-gray-900 rounded-lg p-4">
          <p className="text-gray-500 text-xs uppercase tracking-wider mb-3">Cliente</p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-500">CUIT</span>
              <p className="text-white">{cot.cliente?.cuit ?? '—'}</p>
            </div>
            <div>
              <span className="text-gray-500">Cond. IVA</span>
              <p className="text-white">{cot.cliente?.condicionIva?.replace(/_/g, ' ') ?? '—'}</p>
            </div>
            {contactoPrincipal && (
              <>
                <div>
                  <span className="text-gray-500">Contacto</span>
                  <p className="text-white">{contactoPrincipal.nombre}{contactoPrincipal.cargo ? ` — ${contactoPrincipal.cargo}` : ''}</p>
                </div>
                <div>
                  <span className="text-gray-500">Email</span>
                  <p className="text-white">{contactoPrincipal.email}</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Vanos */}
        <div className="bg-gray-900 rounded-lg p-4">
          <p className="text-gray-500 text-xs uppercase tracking-wider mb-3">Provisión de materiales</p>
          <div className="space-y-2">
            {(cot.vanos ?? []).map((v: any) => (
              <div key={v.id} className="flex items-center gap-3 text-sm">
                <span className="text-gray-500 w-14">{v.sistema}</span>
                <span className="text-white flex-1">{v.material} — {v.terminacion}</span>
                <span className="text-gray-400 text-xs">{fmt(v.ancho)}×{fmt(v.alto)} m</span>
                <span className="text-green-400 w-28 text-right">{usd(v.precio)}</span>
              </div>
            ))}
            <div className="flex justify-between font-semibold border-t border-gray-800 pt-2 mt-2 text-sm">
              <span className="text-gray-300">Total provisión</span>
              <span className="text-green-400">{usd(cot.totalProducto)}</span>
            </div>
          </div>
        </div>

        {/* Montaje */}
        {cot.montaje && (
          <div className="bg-gray-900 rounded-lg p-4">
            <p className="text-gray-500 text-xs uppercase tracking-wider mb-3">Montaje e instalación</p>
            <div className="text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">Elevación</span>
                <span className="text-white">{cot.montaje.medio?.nombre ?? '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Operarios</span>
                <span className="text-white">{cot.montaje.nOperarios}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Días estimados</span>
                <span className="text-white">{cot.montaje.diasObra}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Ing. H&S presencial</span>
                <span className="text-white">{cot.montaje.hsPresencial ? 'Sí' : 'No'}</span>
              </div>
              <div className="border-t border-gray-800 pt-2 mt-1 space-y-1">
                <div className="flex justify-between text-gray-400">
                  <span>Costo elevación</span>
                  <span>{usd(cot.montaje.costoElevacion)}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Costo operarios</span>
                  <span>{usd(cot.montaje.costoOperarios)}</span>
                </div>
                {cot.montaje.costoHS > 0 && (
                  <div className="flex justify-between text-gray-400">
                    <span>H&S</span>
                    <span>{usd(cot.montaje.costoHS)}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold pt-1">
                  <span className="text-gray-300">Precio montaje</span>
                  <span className="text-green-400">{usd(cot.montaje.precioVenta)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Total obra */}
        {cot.montaje && (
          <div className="bg-gray-900 rounded-lg p-4">
            <div className="flex justify-between text-base font-semibold">
              <span className="text-white">Total obra (provisión + montaje)</span>
              <span className="text-green-400">{usd((cot.totalProducto ?? 0) + (cot.totalMontaje ?? 0))}</span>
            </div>
          </div>
        )}

        {/* Condiciones */}
        {cot.condiciones && (
          <div className="bg-gray-900 rounded-lg p-4">
            <p className="text-gray-500 text-xs uppercase tracking-wider mb-3">Condiciones comerciales</p>
            <div className="text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">Forma de pago</span>
                <span className="text-white">{cot.condiciones.formaPagoProducto}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">TC utilizado</span>
                <span className="text-white">$ {fmt(cot.tcUsado)}</span>
              </div>
              {(cot.condiciones.retenciones ?? []).length > 0 && (
                <div className="pt-2">
                  <p className="text-gray-500 text-xs mb-2">Retenciones</p>
                  {(cot.condiciones.retenciones as any[]).map((r: any) => (
                    <div key={r.id} className="flex justify-between text-xs text-gray-400">
                      <span>{r.tipo}</span>
                      <span>{r.porcentaje}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
