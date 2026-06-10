const ESTADO_CONFIG = {
  OPERATIVA: {
    bg: 'bg-green-900',
    text: 'text-green-300',
    border: 'border-green-700',
    label: 'ACTIVA',
    icon: '●',
  },
  MANTENIMIENTO: {
    bg: 'bg-yellow-900',
    text: 'text-yellow-300',
    border: 'border-yellow-700',
    label: 'MANT.',
    icon: '⚠',
  },
  FUERA_DE_SERVICIO: {
    bg: 'bg-red-900',
    text: 'text-red-300',
    border: 'border-red-700',
    label: 'FUERA',
    icon: '✕',
  },
} as const

type EstadoMaquina = keyof typeof ESTADO_CONFIG

type Props = {
  nombre: string
  estadoActual: EstadoMaquina
}

export default function MaquinaEstado({ nombre, estadoActual }: Props) {
  const config = ESTADO_CONFIG[estadoActual] ?? ESTADO_CONFIG.FUERA_DE_SERVICIO
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-gray-300 text-sm">{nombre}</span>
      <span
        className={`${config.bg} ${config.text} border ${config.border} text-xs px-2 py-0.5 rounded font-medium`}
      >
        {config.label} {config.icon}
      </span>
    </div>
  )
}
