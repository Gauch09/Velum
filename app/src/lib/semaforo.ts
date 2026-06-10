export type Semaforo = 'verde' | 'ambar' | 'rojo'

function inicioDelDia(date: Date): number {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export function calcularSemaforo(fechaEntrega: Date, progreso: number): Semaforo {
  const hoy = inicioDelDia(new Date())
  const entrega = inicioDelDia(new Date(fechaEntrega))
  const diasRestantes = Math.round((entrega - hoy) / 86_400_000)
  if (diasRestantes < 0) return 'rojo'
  if (diasRestantes <= 7 && progreso < 60) return 'ambar'
  return 'verde'
}
