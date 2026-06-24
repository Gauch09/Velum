import Link from 'next/link'
import { listarClientes } from '@/lib/cotizador/repo-clientes'

const IVA_LABEL: Record<string, string> = {
  RESPONSABLE_INSCRIPTO: 'Resp. Inscripto',
  MONOTRIBUTO: 'Monotributo',
  EXENTO: 'Exento',
}

export default async function ClientesPage() {
  const clientes = await listarClientes()

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold">Clientes</h1>
          <p className="text-gray-500 text-sm mt-1">{clientes.length} clientes registrados</p>
        </div>
        <Link
          href="/clientes/nuevo"
          className="bg-white text-gray-900 text-sm font-semibold px-4 py-2 rounded hover:bg-gray-100"
        >
          + Nuevo cliente
        </Link>
      </div>

      {clientes.length === 0 ? (
        <div className="text-center text-gray-600 py-24">
          <p className="text-lg">Sin clientes aún</p>
          <p className="text-sm mt-2">Agregá el primer cliente desde el botón de arriba.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {clientes.map(c => (
            <div key={c.id} className="flex items-center gap-4 bg-gray-900 rounded-lg px-4 py-3">
              <div className="flex-1">
                <p className="text-white text-sm font-medium">{c.razonSocial}</p>
                <p className="text-gray-500 text-xs mt-0.5">{c.cuit ? `${c.cuit.slice(0, 2)}-${c.cuit.slice(2, 10)}-${c.cuit.slice(10)}` : '—'}</p>
              </div>
              <span className="text-gray-400 text-xs">{IVA_LABEL[c.condicionIva] ?? c.condicionIva}</span>
              {c.esAgenteRetencion && (
                <span className="text-yellow-400 text-xs bg-yellow-950 px-2 py-0.5 rounded">Agente retencion</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
