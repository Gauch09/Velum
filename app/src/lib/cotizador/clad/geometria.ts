import type { CladInput, CladParams, CladGeometria } from './tipos'

export function contarClad(i: CladInput, p: CladParams): CladGeometria {
  const area = i.ancho * i.alto
  const lamasAncho = Math.ceil(i.ancho / p.lamaAnchoM)
  const lamasFilas = Math.ceil(i.alto / p.lamaAltoMaxM)
  const lamas = lamasAncho * lamasFilas
  const omegas = Math.ceil(i.alto / p.sepOmegaVertM)
  const mlOmega = omegas * i.ancho
  const empallesC = omegas * Math.max(Math.ceil(i.ancho / p.omegaTramoMaxM) - 1, 0)
  const tacosTirafondos = 2 * omegas
  const fijacionesPanelOmega = 4 * lamas
  return { area, lamasAncho, lamasFilas, lamas, omegas, mlOmega, empallesC, tacosTirafondos, fijacionesPanelOmega }
}
