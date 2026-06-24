import { cotizarSkin } from './skin/cotizarSkin'
import { cargarSkinParams, cargarFamilia, cargarKp } from './skin/params-repo'
import { cotizarRail } from './rail/cotizarRail'
import { cargarRailParams } from './rail/params-repo'
import { cotizarClad } from './clad/cotizarClad'
import { cargarCladParams } from './clad/params-repo'
import { cotizarSkinRail } from './skin-rail/cotizarSkinRail'
import { cargarSkinRailParams } from './skin-rail/params-repo'
import type { AlcanceTerminacion } from './skin/tipos'
import type { AlcanceClad } from './clad/tipos'

export type Sistema = 'Skin' | 'Rail' | 'Clad' | 'SkinRail'

export interface VanoInput {
  sistema: Sistema
  material: string
  diseno?: string        // Skin / SkinRail
  terminacion: string
  ancho: number
  alto: number
  modAncho?: number      // Skin / SkinRail, default 1
  modAlto?: number       // Skin / SkinRail, default 1
  margenPct: number
}

export interface VanoResultado {
  sistema: Sistema
  material: string
  terminacion: string
  ancho: number
  alto: number
  area: number
  costoMaterial: number
  costoFab: number
  costoPintura: number
  costoTornilleria: number
  costoTotal: number
  costoM2: number
  precioVenta: number
  precioM2: number
}

export async function cotizarVano(input: VanoInput): Promise<VanoResultado> {
  const { sistema, material, diseno, terminacion, ancho, alto, modAncho = 1, modAlto = 1, margenPct } = input
  const area = ancho * alto

  if (sistema === 'Skin') {
    const [params, fam, kp] = await Promise.all([
      cargarSkinParams(),
      cargarFamilia(material),
      cargarKp(diseno ?? 'Standard'),
    ])
    const r = cotizarSkin({
      ancho, alto, modAncho, modAlto, sepParedMm: 0, margenPct,
      kp, espesorMm: fam.espesorMm, familia: fam,
      alcance: terminacion as AlcanceTerminacion,
    }, params)
    return { sistema, material, terminacion, ancho, alto, area, costoMaterial: r.material, costoFab: r.fab, costoPintura: r.pintura, costoTornilleria: r.tornilleria, costoTotal: r.costoTotal, costoM2: r.costoM2, precioVenta: r.precioVenta, precioM2: r.precioM2 }
  }

  if (sistema === 'SkinRail') {
    const [params, fam, kp] = await Promise.all([
      cargarSkinRailParams(),
      cargarFamilia(material),
      cargarKp(diseno ?? 'Standard'),
    ])
    const r = cotizarSkinRail({
      ancho, alto, modAncho, modAlto, sepParedMm: 0, margenPct,
      kp, espesorMm: fam.espesorMm, familia: fam,
      alcance: terminacion as AlcanceTerminacion,
    }, params)
    return { sistema, material, terminacion, ancho, alto, area, costoMaterial: r.material, costoFab: r.fab, costoPintura: r.pintura, costoTornilleria: r.tornilleria, costoTotal: r.costoTotal, costoM2: r.costoM2, precioVenta: r.precioVenta, precioM2: r.precioM2 }
  }

  if (sistema === 'Rail') {
    const [params, fam, kp] = await Promise.all([
      cargarRailParams(),
      cargarFamilia(material),
      cargarKp(material), // Rail: Kp key = nombre del material
    ])
    const r = cotizarRail({ ancho, alto, margenPct, kp, espesorMm: fam.espesorMm, familia: fam }, params)
    return { sistema, material, terminacion, ancho, alto, area, costoMaterial: r.material, costoFab: r.fab, costoPintura: r.pintura, costoTornilleria: r.tornilleria, costoTotal: r.costoTotal, costoM2: r.costoM2, precioVenta: r.precioVenta, precioM2: r.precioM2 }
  }

  // Clad
  const [params, fam, kp] = await Promise.all([
    cargarCladParams(),
    cargarFamilia(material),
    cargarKp(material),
  ])
  const r = cotizarClad({ ancho, alto, margenPct, kp, espesorMm: fam.espesorMm, familia: fam, alcance: terminacion as AlcanceClad }, params)
  return { sistema, material, terminacion, ancho, alto, area, costoMaterial: r.material, costoFab: r.fab, costoPintura: r.pintura, costoTornilleria: r.tornilleria, costoTotal: r.costoTotal, costoM2: r.costoM2, precioVenta: r.precioVenta, precioM2: r.precioM2 }
}
