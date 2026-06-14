export function calcularSugerenciaConteo(
  cantidadTotal: number,
  maxPorLote = 30
): number[] {
  if (cantidadTotal <= 0) return []
  if (cantidadTotal <= maxPorLote) return [cantidadTotal]
  const nLotes = Math.ceil(cantidadTotal / maxPorLote)
  const base = Math.floor(cantidadTotal / nLotes)
  const resto = cantidadTotal % nLotes
  return Array.from({ length: nLotes }, (_, i) => (i < resto ? base + 1 : base))
}
