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
  const fresado = override > 0 ? g.area * i.kp * p.fresadoCostoM2 : 0
  const costilla = g.mlCostilla * (p.fabCostilla3000 / 3)
  const mensula = g.mensulasTotal * p.fabMensula
  const empalme = g.empalmesJ * p.fabEmpalme
  return panel + fresado + costilla + mensula + empalme
}

export function costoPintura(i: SkinInput, p: SkinParams, g: SkinGeometria): number {
  if (i.alcance === 'Crudo (sin pintura)') return 0
  const esACM = i.familia.precioM2 > 0
  const conEstructura = i.alcance === 'Completo + Estructura'
  // ACM viene pintado de fábrica: el panel no se pinta, la estructura sí cuando aplica
  if (esACM && !conEstructura) return 0
  const sup = esACM
    ? g.piezasCostilla * p.costillaAreaM2 * 2 + g.mensulasTotal * p.mensulaAreaM2 * 2
    : g.area * 2 + (conEstructura ? g.piezasCostilla * p.costillaAreaM2 * 2 + g.mensulasTotal * p.mensulaAreaM2 * 2 : 0)
  const piezasHorno = esACM
    ? g.piezasCostilla + g.mensulasTotal
    : g.paneles + (conEstructura ? g.piezasCostilla + g.mensulasTotal : 0)
  return sup * p.polvo / p.cobertura * p.sobreaplic + piezasHorno / p.piezasHorneada * p.costoHorneada
}

export function costoTornilleria(p: SkinParams, g: SkinGeometria): number {
  return g.brocas * p.brocaCosto + g.autoperf * p.autoperfCosto
}

export function costoParantes(i: SkinInput, p: SkinParams, g: SkinGeometria): number {
  return i.sepParedMm > 0 ? g.mensulasTotal * (p.paranteBase * (i.sepParedMm / 300)) : 0
}

export interface DesgloseComponentesSkin {
  panel: number; costilla: number; mensula: number; empalme: number
}

export function desgloseMateria(i: SkinInput, p: SkinParams, g: SkinGeometria): DesgloseComponentesSkin {
  const override = i.familia.precioM2
  const galv = p.galvDensidad * p.galvPrecioTon
  return {
    panel: override > 0
      ? g.area * i.kp * override + g.paneles * p.acmAccPorPanel * p.acmAccCosto
      : g.area * i.kp * (i.espesorMm / 1000) * i.familia.densidad * i.familia.precioTon / 1000,
    costilla: g.mlCostilla * (p.costillaAreaM2 / 3) * (p.costillaEspesorMm / 1000) * galv / 1000,
    mensula:  g.mensulasTotal * p.mensulaAreaM2 * (p.mensulaEspesorMm / 1000) * galv / 1000,
    empalme:  g.empalmesJ * p.empalmeAreaM2 * (p.empalmeEspesorMm / 1000) * galv / 1000,
  }
}

export function desgloseFab(i: SkinInput, p: SkinParams, g: SkinGeometria): DesgloseComponentesSkin {
  const override = i.familia.precioM2
  const fresado = override > 0 ? g.area * i.kp * p.fresadoCostoM2 : 0
  return {
    panel: (override > 0
      ? (g.area * i.kp / p.areaPlaca) * p.fabPlaca
      : g.paneles * p.fabPanelSkin) + fresado,
    costilla: g.mlCostilla * (p.fabCostilla3000 / 3),
    mensula:  g.mensulasTotal * p.fabMensula,
    empalme:  g.empalmesJ * p.fabEmpalme,
  }
}
