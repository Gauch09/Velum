export function generarBatches(
  cantidadTotal: number,
  piezasPorBach: number
): Array<{ numero: number; cantidadPiezas: number }> {
  if (piezasPorBach <= 0 || cantidadTotal <= 0) return []
  const result: Array<{ numero: number; cantidadPiezas: number }> = []
  let restante = cantidadTotal
  let numero = 1
  while (restante > 0) {
    result.push({ numero, cantidadPiezas: Math.min(piezasPorBach, restante) })
    restante -= piezasPorBach
    numero++
  }
  return result
}
