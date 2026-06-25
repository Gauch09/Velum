import Link from 'next/link'
import { notFound } from 'next/navigation'
import { leerCotizacion } from '@/lib/cotizador/repo-cotizaciones'
import { leerLista } from '@/lib/cotizador/repo-materiales'
import ListaMaterialesEditor from '@/components/supervisor/ListaMaterialesEditor'

interface Props { params: { id: string } }

export default async function MaterialesPage({ params }: Props) {
  let cot: any
  try { cot = await leerCotizacion(params.id) } catch { notFound() }
  const lista = await leerLista(params.id)

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-gray-500 font-mono text-sm">{cot.numero}</span>
            <h1 className="text-2xl font-semibold mt-1">Lista de materiales</h1>
            <p className="text-gray-500 text-sm">{cot.cliente?.razonSocial}{cot.ubicacionObra ? ` — ${cot.ubicacionObra}` : ''}</p>
          </div>
          <Link href={`/cotizaciones/${params.id}`} className="text-gray-500 text-sm hover:text-white">← Cotización</Link>
        </div>

        {!lista ? (
          <div className="bg-gray-900 rounded-lg p-6 text-gray-400 text-sm">
            Todavía no hay lista de materiales. Se genera automáticamente cuando la cotización se acepta.
          </div>
        ) : (
          <ListaMaterialesEditor
            cotizacionId={params.id}
            listaId={lista.id}
            estado={lista.estado}
            lineas={lista.lineas}
          />
        )}
      </div>
    </div>
  )
}
