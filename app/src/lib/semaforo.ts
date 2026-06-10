export type Semaforo = 'verde' | 'ambar' | 'rojo'

export function calcularSemaforo(fechaEntrega: Date, progreso: number): Semaforo {
  const diasRestantes = Math.ceil(
    (fechaEntrega.getTime() - Date.now()) / 86_400_000
  )
  if (diasRestantes < 0) return 'rojo'
  if (diasRestantes <= 7 && progreso < 60) return 'ambar'
  return 'verde'
}
