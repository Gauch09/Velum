import type { CladInput, CladParams, CladGeometria } from './tipos'

export function costoMaterial(i: CladInput, p: CladParams, g: CladGeometria): number {
  const galvKgM3 = p.galvDensidad * p.galvPrecioTon / 1000
  const matPanel = g.area * i.kp * (i.espesorMm / 1000) * i.familia.densidad * i.familia.precioTon / 1000
  const matOmega = g.mlOmega * (p.omegaArea3m / 3) * (p.omegaEspMm / 1000) * galvKgM3
  const matEmpC  = g.empallesC * p.empalmeCAreaM2 * (1.6 / 1000) * galvKgM3
  return matPanel + matOmega + matEmpC
}

export function costoFab(_i: CladInput, p: CladParams, g: CladGeometria): number {
  const fabLamas   = g.lamas * p.fabLama
  const fabOmega   = g.mlOmega * p.fabOmegaM
  const fabEmpalles = g.empallesC * p.fabEmpalleC
  return fabLamas + fabOmega + fabEmpalles
}

export function costoPintura(i: CladInput, p: CladParams, g: CladGeometria): number {
  if (i.alcance === 'Crudo (sin pintura)') return 0
  const supPintura = g.area * 2 + g.mlOmega * (p.omegaArea3m / 3) * 2
  const piezasHorno = g.lamas + g.empallesC
  return supPintura * (p.polvo / p.cobertura) * p.sobreaplic +
    (piezasHorno / p.piezasHorneada) * p.costoHorneada
}

export function costoTornilleria(p: CladParams, g: CladGeometria): number {
  return g.tacosTirafondos * (p.costoTaco + p.costoTirafondo) +
    g.fijacionesPanelOmega * p.costoT1
}
