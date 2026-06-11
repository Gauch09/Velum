'use client'

import { useRouter, usePathname } from 'next/navigation'

type Props = {
  proyectos: string[]
  proyectoActivo: string
  estadoActivo: string
  total: number
  filtradas: number
}

const ESTADOS = [
  { label: 'Todos', value: '' },
  { label: 'En producción', value: 'EN_PRODUCCION' },
  { label: 'En espera', value: 'EN_ESPERA' },
]

export default function FiltrosPlanta({
  proyectos,
  proyectoActivo,
  estadoActivo,
  total,
  filtradas,
}: Props) {
  const router = useRouter()
  const pathname = usePathname()

  function navegar(proyecto: string, estado: string) {
    const params = new URLSearchParams()
    if (proyecto) params.set('proyecto', proyecto)
    if (estado) params.set('estado', estado)
    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
  }

  const hayFiltros = !!(proyectoActivo || estadoActivo)

  return (
    <div className="flex flex-wrap items-center gap-2 mb-3">
      {ESTADOS.map(op => (
        <button
          key={op.value}
          onClick={() => navegar(proyectoActivo, op.value)}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            estadoActivo === op.value
              ? 'bg-blue-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:text-gray-200 border border-gray-700'
          }`}
        >
          {op.label}
        </button>
      ))}

      {proyectos.length > 1 && (
        <select
          value={proyectoActivo}
          onChange={e => navegar(e.target.value, estadoActivo)}
          className="bg-gray-800 text-gray-300 text-xs px-3 py-1.5 rounded-full border border-gray-700 outline-none focus:border-blue-500 cursor-pointer"
        >
          <option value="">Todos los proyectos</option>
          {proyectos.map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      )}

      {hayFiltros && (
        <>
          <button
            onClick={() => navegar('', '')}
            className="text-gray-600 hover:text-gray-400 text-xs transition-colors"
          >
            × Limpiar
          </button>
          <span className="text-gray-600 text-xs">
            {filtradas} de {total} orden{total !== 1 ? 'es' : ''}
          </span>
        </>
      )}
    </div>
  )
}
