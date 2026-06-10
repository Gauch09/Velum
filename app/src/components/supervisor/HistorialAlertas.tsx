type EntradaLog = {
  id: string
  ordenNombre: string
  etapaNombre: string
  tipo: string
  severidad: string
  disparadaEn: string
  resueltaEn: string | null
}

function formatDuracion(desde: string, hasta: string | null): string {
  const fin = hasta ? new Date(hasta) : new Date()
  const mins = Math.round((fin.getTime() - new Date(desde).getTime()) / 60_000)
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h} h ${m} min` : `${h} h`
}

function formatFecha(iso: string): string {
  return new Date(iso).toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const TIPO_LABEL: Record<string, string> = {
  sin_actividad: 'Sin actividad',
  riesgo_entrega: 'Riesgo entrega',
  ambas: 'Sin act. + riesgo',
}

export default function HistorialAlertas({ entradas }: { entradas: EntradaLog[] }) {
  if (entradas.length === 0) return null

  return (
    <details className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden mt-2">
      <summary className="px-4 py-3 cursor-pointer select-none flex items-center justify-between list-none">
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-sm font-semibold">📋 Historial de alertas</span>
          <span className="bg-gray-800 text-gray-500 text-xs px-2 py-0.5 rounded-full">
            {entradas.length}
          </span>
        </div>
        <span className="text-gray-600 text-xs">▾</span>
      </summary>

      <div className="border-t border-gray-800 overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-800 text-gray-500 uppercase tracking-widest">
              <th className="text-left px-4 py-2 font-medium">Disparada</th>
              <th className="text-left px-4 py-2 font-medium">Orden / Etapa</th>
              <th className="text-left px-4 py-2 font-medium">Tipo</th>
              <th className="text-left px-4 py-2 font-medium">Severidad</th>
              <th className="text-left px-4 py-2 font-medium">Duración</th>
            </tr>
          </thead>
          <tbody>
            {entradas.map(e => (
              <tr key={e.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                <td className="px-4 py-2 text-gray-400 whitespace-nowrap">
                  {formatFecha(e.disparadaEn)}
                </td>
                <td className="px-4 py-2">
                  <span className="text-gray-200">{e.ordenNombre}</span>
                  <span className="text-gray-500 ml-1">· {e.etapaNombre}</span>
                </td>
                <td className="px-4 py-2 text-gray-400 whitespace-nowrap">
                  {TIPO_LABEL[e.tipo] ?? e.tipo}
                </td>
                <td className="px-4 py-2 whitespace-nowrap">
                  {e.severidad === 'rojo' ? (
                    <span className="text-red-400 font-semibold">🔴 Crítica</span>
                  ) : (
                    <span className="text-amber-400">🟡 Moderada</span>
                  )}
                </td>
                <td className="px-4 py-2 whitespace-nowrap">
                  {e.resueltaEn ? (
                    <span className="text-green-500">{formatDuracion(e.disparadaEn, e.resueltaEn)}</span>
                  ) : (
                    <span className="text-orange-400 font-semibold">Abierta</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  )
}
