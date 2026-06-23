export function calcularBach(
  largo_mm: number,
  ancho_mm: number,
  capacidadM2: number
): number {
  if (largo_mm <= 0 || ancho_mm <= 0 || capacidadM2 <= 0) return 0
  const areaM2 = (largo_mm / 1000) * (ancho_mm / 1000)
  if (areaM2 === 0) return 0
  return Math.floor(Math.round(capacidadM2 / areaM2 * 1e10) / 1e10)
}
