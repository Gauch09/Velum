import type { SkinInput, SkinParams, SkinGeometria } from './tipos'

export function costoMaterial(i: SkinInput, p: SkinParams, g: SkinGeometria): number {
  const override = i.familia.precioM2
  const panel = override > 0
    ? g.area * i.kp * override + g.paneles * p.acmAccPorPanel * p.acmAccCosto
    : g.area * i.kp * (i.espesorMm / 1000) * i.familia.densidad * i.familia.precioTon / 1000
  const galv = p.galvDensidad * p.galvPrecioTon
  const costilla = g.mlCostilla * (p.costillaAreaM2 / 3) * (p.costillaEspesorMm / 1000) * galv / 1000
  const mensula = g.mensulasTotal * p.mensulaAreaM2 * (p.mensulaEspesorMm / 1000) * galv / 1000
  const empalme = g.empalmesJ * p.empalmeAreaM2 * (p.empalmeEspesorMm / 1000) * galv / 1000
  return panel + costilla + mensula + empalme
}

export function costoFab(i: SkinInput, p: SkinParams, g: SkinGeometria): number {
  const override = i.familia.precioM2
  const panel = override > 0
    ? (g.area * i.kp / p.areaPlaca) * p.fabPlaca
    : g.paneles * p.fabPanelSkin
  const costilla = g.mlCostilla * (p.fabCostilla3000 / 3)
  const mensula = g.mensulasTotal * p.fabMensula
  const empalme = g.empalmesJ * p.fabEmpalme
  return panel + costilla + mensula + empalme
}
