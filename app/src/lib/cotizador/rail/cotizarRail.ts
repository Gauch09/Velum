import type { RailInput, RailParams, RailResultado } from './tipos'
import { contarRail } from './geometria'
import { costoMaterial, costoFab, costoPintura, costoTornilleria } from './costos'

export function cotizarRail(i: RailInput, p: RailParams): RailResultado {
  const geometria    = contarRail(i, p)
  const material     = costoMaterial(i, p, geometria)
  const fab          = costoFab(p, geometria)
  const pintura      = costoPintura(i, p, geometria)
  const tornilleria  = costoTornilleria(p, geometria)
  const costoTotal   = material + fab + pintura + tornilleria
  const costoM2      = costoTotal / geometria.area
  const precioVenta  = costoTotal * (1 + i.margenPct)
  const precioM2     = precioVenta / geometria.area
  return { geometria, material, fab, pintura, tornilleria, costoTotal, costoM2, precioVenta, precioM2 }
}
