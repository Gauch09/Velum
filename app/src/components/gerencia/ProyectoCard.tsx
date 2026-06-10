import { calcularSemaforo } from '@/lib/semaforo'

const SEMAFORO_CONFIG = {
  verde: {
    border: 'border-green-500',
    text: 'text-green-400',
    bar: 'bg-green-500',
  },
  ambar: {
    border: 'border-yellow-500',
    text: 'text-yellow-400',
    bar: 'bg-yellow-500',
  },
  rojo: {
    border: 'border-red-500',
    text: 'text-red-400',
    bar: 'bg-red-500',
  },
} as const

type Props = {
  nombre: string
  fechaEntrega: string
  progreso: number
  tieneAlerta?: boolean
}

export default function ProyectoCard({
  nombre,
  fechaEntrega,
  progreso,
  tieneAlerta = false,
}: Props) {
  const semaforo = calcularSemaforo(new Date(fechaEntrega), progreso)
  const config = SEMAFORO_CONFIG[semaforo]

  const diasRestantes = Math.ceil(
    (new Date(fechaEntrega).getTime() - Date.now()) / 86_400_000
  )
  const diasLabel =
    diasRestantes < 0
      ? 'VENCIDO'
      : diasRestantes === 0
        ? 'HOY'
        : `${diasRestantes}d`

  return (
    <div className={`bg-gray-900 rounded-lg p-4 border-l-4 ${config.border}`}>
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <span className="text-white font-semibold">{nombre}</span>
          {tieneAlerta && (
            <span className="text-amber-400 text-xs font-bold" title="Cuello de botella activo">
              ⚠
            </span>
          )}
        </div>
        <span className={`${config.text} text-sm font-medium`}>{diasLabel}</span>
      </div>
      <div className="bg-gray-800 rounded-full h-2 mb-2">
        <div
          className={`h-2 rounded-full transition-all ${config.bar}`}
          style={{ width: `${Math.max(2, progreso)}%` }}
        />
      </div>
      <div className="flex justify-end">
        <span className={`${config.text} text-sm font-bold`}>
          {Math.round(progreso)}%
        </span>
      </div>
    </div>
  )
}
