import type { SkinRailInput, SkinRailParams, SkinRailResultado } from './tipos'
import { contarSkinRail } from './geometria'
import { calcularCompras } from '@/lib/cotizador/skin/costos'
import {
  costoMaterialSkinRail,
  costoFabSkinRail,
  costoPinturaSkinRail,
  costoTornilleriaSkinRail,
  costoParantesSkinRail,
} from './costos'

export function cotizarSkinRail(i: SkinRailInput, p: SkinRailParams): SkinRailResultado {
  const geometria = contarSkinRail(i, p.mensulaSpacingM)
  // Omegas y empalles C también son galv 1.6mm → se suman al extra
  const extraGalv16M2 = geometria.piezasOmegaHorno * p.omegaArea3m + geometria.empallesC * p.empalmeCAreaM2
  const compras    = calcularCompras(i, p, geometria, extraGalv16M2)
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

  return { geometria, compras, material, fab, pintura, tornilleria, parantes, costoTotal, costoM2, precioVenta, precioM2 }
}
