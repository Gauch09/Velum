interface AnilloProgresoProps {
  valor: number
  size?: number
}

function tono(valor: number): string {
  if (valor >= 90) return '#10b981' // emerald-500
  if (valor >= 40) return '#f59e0b' // amber-500
  return '#ef4444' // red-500
}

export default function AnilloProgreso({ valor, size = 96 }: AnilloProgresoProps) {
  const stroke = 10
  const r = (size - stroke - 2) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (Math.min(100, Math.max(0, valor)) / 100) * circ
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#1f2937" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={tono(valor)}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="absolute text-lg font-bold text-gray-100">{valor}%</span>
    </div>
  )
}
