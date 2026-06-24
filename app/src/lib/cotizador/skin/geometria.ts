import type { SkinInput, SkinGeometria } from './tipos'

const TRAMO_M = 3  // todas las costillas son piezas de 3000 mm

export function contarSkin(i: SkinInput, mensulaSpacingM: number): SkinGeometria {
  const area = i.ancho * i.alto
  const columnas = Math.ceil(i.ancho / i.modAncho)
  const filas = Math.ceil(i.alto / i.modAlto)
  const paneles = columnas * filas
  const costillas = columnas + 1
  const mlCostilla = costillas * i.alto

  // PIC150: se ubican cada mensulaSpacingM metros, independiente del módulo de panel
  const nivelesMenusula = Math.floor(i.alto / mensulaSpacingM) + 1
  const mensulasTotal = costillas * nivelesMenusula

  // Costillas: siempre piezas de 3000 mm; la última se corta en obra
  const piezasPorCostilla = Math.ceil(i.alto / TRAMO_M)
  const piezas3000 = piezasPorCostilla * costillas
  const piezasCostilla = piezas3000

  const brocas = 2 * mensulasTotal
  const autoperf = (i.sepParedMm > 0 ? 8 : 4) * mensulasTotal
  const empalmesJ = costillas * (piezasPorCostilla - 1)
  const parantes = i.sepParedMm > 0 ? mensulasTotal : 0

  return { area, columnas, filas, paneles, costillas, mlCostilla, piezasCostilla, piezas3000, nivelesMenusula, mensulasTotal, brocas, autoperf, empalmesJ, parantes }
}
