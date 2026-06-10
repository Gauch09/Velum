import type { OrdenConEjecuciones } from '@/types'
import OverridePanel from './OverridePanel'
import CancelarOrdenButton from './CancelarOrdenButton'

const ESTADO_PILL: Record<string, string> = {
  ACTIVA:     'bg-green-900 text-green-300 border border-green-700',
  PENDIENTE:  'bg-gray-800 text-gray-500',
  EN_ESPERA:  'bg-yellow-900 text-yellow-300 border border-yellow-700',
  COMPLETADA: 'bg-blue-900 text-blue-300',
}

export default function OrdenCascadaCard({ orden }: { orden: OrdenConEjecuciones }) {
  const borderColor = orden.prioridad > 0 ? 'border-red-500' : 'border-green-800'

  const ejecucionesOrdenadas = [...(orden.ejecuciones ?? [])].sort(
    (a, b) => (a.etapaRuta?.ordenSecuencia ?? 0) - (b.etapaRuta?.ordenSecuencia ?? 0)
  )

  const pendientes = ejecucionesOrdenadas
    .filter(ej => ej.estado === 'PENDIENTE')
    .map(ej => ({
      id: ej.id,
      etapaNombre: ej.etapaRuta?.nombreEtapa ?? '',
      umbralActivacion: ej.etapaRuta?.umbralActivacion ?? 0,
      porcentajeActual: ej.porcentajeActual,
    }))

  const ordenNombre = `${orden.sistema} / ${orden.producto}`

  return (
    <div className={`bg-gray-900 rounded-xl p-4 border-l-4 ${borderColor}`}>
      <div className="flex justify-between items-center mb-3">
        <div>
          <span className="text-white font-bold text-base">{orden.sistema} / {orden.producto}</span>
          {orden.proyecto && (
            <span className="text-gray-400 text-sm ml-3">{orden.proyecto.nombre}</span>
          )}
          {orden.prioridad > 0 && (
            <span className="ml-2 text-red-400 text-xs font-bold uppercase">Urgente</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-green-400 font-bold text-lg">
            {Number(orden.porcentajeGlobal).toFixed(0)}%
          </span>
          <CancelarOrdenButton ordenId={orden.id} ordenNombre={ordenNombre} />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        {ejecucionesOrdenadas.map((ej: any) => (
          <span key={ej.id} className={`px-2 py-1 rounded-md text-xs font-medium ${ESTADO_PILL[ej.estado] ?? ''}`}>
            {ej.etapaRuta?.nombreEtapa}
            {ej.estado === 'ACTIVA' && ` ${Number(ej.porcentajeActual).toFixed(0)}%`}
            {ej.estado === 'ACTIVA' && ej.fueOverride && ' ⚡'}
            {ej.estado === 'PENDIENTE' && ` ⏳ ${ej.etapaRuta?.umbralActivacion}%`}
          </span>
        ))}
      </div>

      <div className="bg-gray-700 rounded-full h-1.5">
        <div
          className="bg-green-500 h-1.5 rounded-full transition-all duration-500"
          style={{ width: `${Math.min(Number(orden.porcentajeGlobal), 100)}%` }}
        />
      </div>

      <OverridePanel ejecuciones={pendientes} ordenNombre={ordenNombre} />
    </div>
  )
}
