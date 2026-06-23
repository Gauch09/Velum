import type { SkinRailInput, SkinRailParams, SkinRailGeometria, SkinParams, SkinGeometria } from './tipos'
import {
  costoMaterial as costoMaterialSkin,
  costoFab as costoFabSkin,
  costoPintura as costoPinturaSkin,
  costoTornilleria as costoTornilleriaSkin,
  costoParantes as costoParantesSkin,
} from '@/lib/cotizador/skin/costos'

export function costoMaterialSkinRail(
  i: SkinRailInput,
  params: SkinRailParams,
  g: SkinRailGeometria,
): number {
  const skinParams: SkinParams = params
  const skinG: SkinGeometria = g

  const matSkin = costoMaterialSkin(i, skinParams, skinG)

  const galvFactor = params.galvDensidad * params.galvPrecioTon / 1000
  const matOmega = g.mlOmega * (params.omegaArea3m / 3) * (params.omegaEspMm / 1000) * galvFactor
  const matEmpC  = g.empallesC * params.empalmeCAreaM2 * (1.6 / 1000) * galvFactor

  return matSkin + matOmega + matEmpC
}

export function costoFabSkinRail(
  i: SkinRailInput,
  params: SkinRailParams,
  g: SkinRailGeometria,
): number {
  const skinParams: SkinParams = params
  const skinG: SkinGeometria = g

  const fabSkin = costoFabSkin(i, skinParams, skinG)

  const fabOmegaTotal = g.mlOmega * params.fabOmegaM
  const fabEmpCTotal  = g.empallesC * params.fabEmpalleC

  return fabSkin + fabOmegaTotal + fabEmpCTotal
}

export function costoPinturaSkinRail(
  i: SkinRailInput,
  params: SkinRailParams,
  g: SkinRailGeometria,
): number {
  if (i.familia.precioM2 > 0) return 0
  if (i.alcance === 'Crudo (sin pintura)') return 0

  const area = i.ancho * i.alto

  if (i.alcance === 'Completo (solo panel)') {
    const skinParams: SkinParams = params
    const skinG: SkinGeometria = g
    return costoPinturaSkin(i, skinParams, skinG)
  }

  // Completo + Estructura
  const supPintBase  = area * 2
    + g.piezasCostilla * params.costillaAreaM2 * 2
    + g.mensulasTotal * params.mensulaAreaM2 * 2

  const supPintOmega = g.mlOmega * (params.omegaArea3m / 3) * 2
    + g.empallesC * params.empalmeCAreaM2 * 2

  const supPintura = supPintBase + supPintOmega

  const piezasHornoBase  = g.paneles + g.piezasCostilla + g.mensulasTotal
  const piezasHornoExtra = g.piezasOmegaHorno + g.empallesC
  const piezasHorno = piezasHornoBase + piezasHornoExtra

  return (
    supPintura * (params.polvo / params.cobertura) * params.sobreaplic
    + (piezasHorno / params.piezasHorneada) * params.costoHorneada
  )
}

export function costoTornilleriaSkinRail(
  params: SkinRailParams,
  g: SkinRailGeometria,
): number {
  const skinParams: SkinParams = params
  const skinG: SkinGeometria = g

  const tornSkin = costoTornilleriaSkin(skinParams, skinG)
  const tornOmega = (g.autoperfCostillaOmega + g.autoperfOmegaPanel) * params.autoperfCosto

  return tornSkin + tornOmega
}

export function costoParantesSkinRail(
  i: SkinRailInput,
  params: SkinRailParams,
  g: SkinRailGeometria,
): number {
  const skinParams: SkinParams = params
  const skinG: SkinGeometria = g
  return costoParantesSkin(i, skinParams, skinG)
}

export interface DesgloseComponentesSkinRail {
  panel: number; costilla: number; mensula: number; empalleJ: number
  omega: number; empalleC: number
}

export function desgloseMateria(
  i: SkinRailInput,
  params: SkinRailParams,
  g: SkinRailGeometria,
): DesgloseComponentesSkinRail {
  const override = i.familia.precioM2
  const galv = params.galvDensidad * params.galvPrecioTon
  const galvF = galv / 1000
  return {
    panel: override > 0
      ? g.area * i.kp * override + g.paneles * params.acmAccPorPanel * params.acmAccCosto
      : g.area * i.kp * (i.espesorMm / 1000) * i.familia.densidad * i.familia.precioTon / 1000,
    costilla: g.mlCostilla * (params.costillaAreaM2 / 3) * (params.costillaEspesorMm / 1000) * galvF,
    mensula:  g.mensulasTotal * params.mensulaAreaM2 * (params.mensulaEspesorMm / 1000) * galvF,
    empalleJ: g.empalmesJ * params.empalmeAreaM2 * (params.empalmeEspesorMm / 1000) * galvF,
    omega:    g.mlOmega * (params.omegaArea3m / 3) * (params.omegaEspMm / 1000) * galvF,
    empalleC: g.empallesC * params.empalmeCAreaM2 * (1.6 / 1000) * galvF,
  }
}

export function desgloseFab(
  i: SkinRailInput,
  params: SkinRailParams,
  g: SkinRailGeometria,
): DesgloseComponentesSkinRail {
  const override = i.familia.precioM2
  return {
    panel: override > 0
      ? (g.area * i.kp / params.areaPlaca) * params.fabPlaca
      : g.paneles * params.fabPanelSkin,
    costilla: g.mlCostilla * (params.fabCostilla3000 / 3),
    mensula:  g.mensulasTotal * params.fabMensula,
    empalleJ: g.empalmesJ * params.fabEmpalme,
    omega:    g.mlOmega * params.fabOmegaM,
    empalleC: g.empallesC * params.fabEmpalleC,
  }
}
