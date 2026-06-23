import type { RailInput, RailParams, RailGeometria } from './tipos'

export function contarRail(i: RailInput, p: RailParams): RailGeometria {
  const area = i.ancho * i.alto
  const lamasAncho = Math.ceil(i.ancho / p.lamaAnchoM)
  const lamasFilas = Math.ceil(i.alto / p.lamaAltoMaxM)
  const lamas = lamasAncho * lamasFilas
  const omegas = Math.ceil(i.alto / p.sepOmegaVertM)
  const mlOmega = omegas * i.ancho
  const empallesC = omegas * Math.max(Math.ceil(i.ancho / p.omegaTramoMaxM) - 1, 0)
  const PIC = omegas * Math.ceil(i.ancho / 1.0)
  const brocas = 2 * PIC
  const autoperf = 4 * PIC
  const T1 = 4 * lamas
  return { area, lamasAncho, lamasFilas, lamas, omegas, mlOmega, empallesC, PIC, brocas, autoperf, T1 }
}
