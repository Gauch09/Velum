import type { RailInput, RailParams, RailGeometria } from './tipos'

export function costoMaterial(i: RailInput, p: RailParams, g: RailGeometria): number {
  const galvBase = p.galvDensidad * p.galvPrecioTon / 1000
  const matPanel  = g.area * i.kp * (i.espesorMm / 1000) * i.familia.densidad * i.familia.precioTon / 1000
  const matOmega  = g.mlOmega * (p.omegaArea3m / 3) * (p.omegaEspMm / 1000) * galvBase
  const matPIC    = g.PIC * p.picAreaM2 * (p.picEspMm / 1000) * galvBase
  const matEmpC   = g.empallesC * p.empalmeCAreaM2 * (1.6 / 1000) * galvBase
  return matPanel + matOmega + matPIC + matEmpC
}

export function costoFab(p: RailParams, g: RailGeometria): number {
  return (
    g.lamas      * p.fabLama    +
    g.mlOmega    * p.fabOmegaM  +
    g.PIC        * p.fabPIC     +
    g.empallesC  * p.fabEmpalleC
  )
}

export function costoPintura(i: RailInput, p: RailParams, g: RailGeometria): number {
  const supPintura = (
    g.area * 2 +
    g.mlOmega * (p.omegaArea3m / 3) * 2 +
    g.PIC * p.picAreaM2 * 2
  )
  const piezasHorno = g.lamas + g.PIC + g.empallesC
  return (
    supPintura * (p.polvo / p.cobertura) * p.sobreaplic +
    (piezasHorno / p.piezasHorneada) * p.costoHorneada
  )
}

export function costoTornilleria(p: RailParams, g: RailGeometria): number {
  return (
    g.brocas   * p.costoBroca    +
    g.autoperf * p.costoAutoperf +
    g.T1       * p.costoT1
  )
}
