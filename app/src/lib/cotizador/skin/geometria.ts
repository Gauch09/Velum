import type { SkinInput, SkinGeometria } from './tipos'

const TRAMO_COSTILLA = 3

export function contarSkin(i: SkinInput): SkinGeometria {
  const area = i.ancho * i.alto
  const columnas = Math.ceil(i.ancho / i.modAncho)
  const filas = Math.ceil(i.alto / i.modAlto)
  const paneles = columnas * filas
  const costillas = columnas + 1
  const mlCostilla = costillas * i.alto
  const piezasCostilla = Math.ceil(mlCostilla / TRAMO_COSTILLA)
  const mensulasTotal = costillas * (filas + 1)
  const brocas = 2 * mensulasTotal
  const autoperf = (i.sepParedMm > 0 ? 8 : 4) * mensulasTotal
  const empalmesJ = costillas * Math.max(Math.ceil(i.alto / 3) - 1, 0)
  const parantes = i.sepParedMm > 0 ? mensulasTotal : 0
  return { area, columnas, filas, paneles, costillas, mlCostilla, piezasCostilla, mensulasTotal, brocas, autoperf, empalmesJ, parantes }
}
