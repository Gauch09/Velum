import type { SkinRailInput, SkinRailParams, SkinRailResultado } from './tipos'
import { contarSkinRail } from './geometria'
import {
  costoMaterialSkinRail,
  costoFabSkinRail,
  costoPinturaSkinRail,
  costoTornilleriaSkinRail,
  costoParantesSkinRail,
} from './costos'

export function cotizarSkinRail(i: SkinRailInput, p: SkinRailParams): SkinRailResultado {
  const geometria = contarSkinRail(i)
  const material   = costoMaterialSkinRail(i, p, geometria)
  const fab        = costoFabSkinRail(i, p, geometria)
  const pintura    = costoPinturaSkinRail(i, p, geometria)
  const tornilleria = costoTornilleriaSkinRail(p, geometria)
  const parantes   = costoParantesSkinRail(i, p, geometria)

  const costoTotal  = material + fab + pintura + tornilleria + parantes
  const area        = i.ancho * i.alto
  const costoM2     = costoTotal / area
  const precioVenta = costoTotal * (1 + i.margenPct)
  const precioM2    = precioVenta / area

  return {
    geometria,
    material,
    fab,
    pintura,
    tornilleria,
    parantes,
    costoTotal,
    costoM2,
    precioVenta,
    precioM2,
  }
}
