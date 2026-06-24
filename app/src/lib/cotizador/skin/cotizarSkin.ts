import type { SkinInput, SkinParams, SkinResultado } from './tipos'
import { contarSkin } from './geometria'
import { costoMaterial, costoFab, costoPintura, costoTornilleria, costoParantes, calcularCompras } from './costos'

export function cotizarSkin(i: SkinInput, p: SkinParams): SkinResultado {
  const geometria = contarSkin(i, p.mensulaSpacingM)
  const compras = calcularCompras(i, p, geometria)
  const material = costoMaterial(i, p, geometria)
  const fab = costoFab(i, p, geometria)
  const pintura = costoPintura(i, p, geometria)
  const tornilleria = costoTornilleria(p, geometria)
  const parantes = costoParantes(i, p, geometria)
  const costoTotal = material + fab + pintura + tornilleria + parantes
  const costoM2 = costoTotal / geometria.area
  const precioVenta = costoTotal * (1 + i.margenPct)
  const precioM2 = precioVenta / geometria.area
  return { geometria, compras, material, fab, pintura, tornilleria, parantes, costoTotal, costoM2, precioVenta, precioM2 }
}
