import type { SkinInput, SkinParams, SkinGeometria, SkinCompras } from './tipos'

const GALV_SHEET_M2 = 3.0 * 1.22  // chapa estándar 3000×1220mm

export function calcularCompras(i: SkinInput, p: SkinParams, g: SkinGeometria, extraGalv16M2 = 0): SkinCompras {
  const chapasACM = i.familia.precioM2 > 0 ? Math.ceil(g.area * i.kp / p.areaPlaca) : 0

  const areaGalv16 = g.piezas3000 * p.costillaAreaM2 + g.empalmesJ * p.empalmeAreaM2 + extraGalv16M2
  const chapasGalv16 = Math.ceil(areaGalv16 / GALV_SHEET_M2)
  const kgGalv16 = Math.round(chapasGalv16 * GALV_SHEET_M2 * (p.costillaEspesorMm / 1000) * p.galvDensidad)

  const areaGalv25 = g.mensulasTotal * p.mensulaAreaM2
  const chapasGalv25 = Math.ceil(areaGalv25 / GALV_SHEET_M2)
  const kgGalv25 = Math.round(chapasGalv25 * GALV_SHEET_M2 * (p.mensulaEspesorMm / 1000) * p.galvDensidad)

  return { chapasACM, chapasGalv16, kgGalv16, chapasGalv25, kgGalv25 }
}

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

  // Anodizado: proceso externo, se cobra por m² de superficie tratada (ambas caras del panel)
  if (i.alcance === 'Anodizado') {
    return g.area * i.kp * 2 * p.anodizadoCostoM2
  }

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
