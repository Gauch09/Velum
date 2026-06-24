import Link from 'next/link'
import { listarCotizaciones } from '@/lib/cotizador/repo-cotizaciones'

const ESTADO_COLOR: Record<string, string> = {
  BORRADOR:  'text-gray-400 bg-gray-800',
  ENVIADA:   'text-blue-300 bg-blue-950',
  VISTA:     'text-purple-300 bg-purple-950',
  ACEPTADA:  'text-green-300 bg-green-950',
  RECHAZADA: 'text-red-300 bg-red-950',
}

const fmt = (n: number) => n.toLocaleString('es-AR', { maximumFractionDigits: 2 })

export default async function CotizacionesPage() {
  const cots = await listarCotizaciones()

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold">Cotizaciones</h1>
          <p className="text-gray-500 text-sm mt-1">{cots.length} cotizaciones registradas</p>
        </div>
        <Link
          href="/cotizaciones/nueva"
          className="bg-white text-gray-900 text-sm font-semibold px-4 py-2 rounded hover:bg-gray-100"
        >
          + Nueva
        </Link>
      </div>

      {cots.length === 0 ? (
        <div className="text-center text-gray-600 py-24">
          <p className="text-lg">Sin cotizaciones aún</p>
          <p className="text-sm mt-2">Creá la primera desde el botón de arriba.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {cots.map(c => (
            <Link
              key={c.id}
              href={`/cotizaciones/${c.id}`}
              className="flex items-center gap-4 bg-gray-900 rounded-lg px-4 py-3 hover:bg-gray-800 transition-colors"
            >
              <span className="text-gray-500 text-xs font-mono w-36">{c.numero}</span>
              <span className="text-white text-sm flex-1">{c.cliente?.razonSocial ?? '—'}</span>
              <span className="text-green-400 text-sm w-32 text-right">u$d {fmt(c.totalProducto)}</span>
              <span className={`text-xs px-2 py-0.5 rounded ${ESTADO_COLOR[c.estado] ?? 'text-gray-400 bg-gray-800'}`}>
                {c.estado}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
