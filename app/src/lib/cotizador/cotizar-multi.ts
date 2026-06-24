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
  colorACM?: string      // solo para materiales ACM (Bond 4mm)
  diseno?: string        // Skin / SkinRail
  terminacion: string
  ancho: number
  alto: number
  modAncho?: number      // Skin / SkinRail, default 1
  modAlto?: number       // Skin / SkinRail, default 1
  sepParedMm?: number    // Skin / SkinRail, 0 = pegado a pared
  margenPct: number
}

export interface VanoGeometria {
  paneles: number
  piezasCostilla: number
  mensulasTotal: number
  brocas: number
  autoperf: number
  empalmesJ: number
  parantes: number
}

export interface VanoResultado {
  sistema: Sistema
  material: string
  colorACM?: string
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
  geometria?: VanoGeometria
}

function toVanoGeometria(g: { paneles: number; piezasCostilla: number; mensulasTotal: number; brocas: number; autoperf: number; empalmesJ: number; parantes: number }): VanoGeometria {
  return { paneles: g.paneles, piezasCostilla: g.piezasCostilla, mensulasTotal: g.mensulasTotal, brocas: g.brocas, autoperf: g.autoperf, empalmesJ: g.empalmesJ, parantes: g.parantes }
}

export async function cotizarVano(input: VanoInput): Promise<VanoResultado> {
  const { sistema, material, colorACM, diseno, terminacion, ancho, alto, modAncho = 1, modAlto = 1, sepParedMm = 0 } = input
  const margenPct = input.margenPct / 100  // UI envía %, motor espera fracción (ej. 150 → 1.5)
  const area = ancho * alto

  if (sistema === 'Skin') {
    const [params, fam, kp] = await Promise.all([
      cargarSkinParams(),
      cargarFamilia(material),
      cargarKp(diseno ?? 'Standard'),
    ])
    const r = cotizarSkin({
      ancho, alto, modAncho, modAlto, sepParedMm, margenPct,
      kp, espesorMm: fam.espesorMm, familia: fam,
      alcance: terminacion as AlcanceTerminacion,
    }, params)
    return { sistema, material, colorACM, terminacion, ancho, alto, area, costoMaterial: r.material, costoFab: r.fab, costoPintura: r.pintura, costoTornilleria: r.tornilleria, costoTotal: r.costoTotal, costoM2: r.costoM2, precioVenta: r.precioVenta, precioM2: r.precioM2, geometria: toVanoGeometria(r.geometria) }
  }

  if (sistema === 'SkinRail') {
    const [params, fam, kp] = await Promise.all([
      cargarSkinRailParams(),
      cargarFamilia(material),
      cargarKp(diseno ?? 'Standard'),
    ])
    const r = cotizarSkinRail({
      ancho, alto, modAncho, modAlto, sepParedMm, margenPct,
      kp, espesorMm: fam.espesorMm, familia: fam,
      alcance: terminacion as AlcanceTerminacion,
    }, params)
    return { sistema, material, colorACM, terminacion, ancho, alto, area, costoMaterial: r.material, costoFab: r.fab, costoPintura: r.pintura, costoTornilleria: r.tornilleria, costoTotal: r.costoTotal, costoM2: r.costoM2, precioVenta: r.precioVenta, precioM2: r.precioM2, geometria: toVanoGeometria(r.geometria) }
  }

  if (sistema === 'Rail') {
    const [params, fam, kp] = await Promise.all([
      cargarRailParams(),
      cargarFamilia(material),
      cargarKp(material), // Rail: Kp key = nombre del material
    ])
    const r = cotizarRail({ ancho, alto, margenPct, kp, espesorMm: fam.espesorMm, familia: fam }, params)
    return { sistema, material, colorACM, terminacion, ancho, alto, area, costoMaterial: r.material, costoFab: r.fab, costoPintura: r.pintura, costoTornilleria: r.tornilleria, costoTotal: r.costoTotal, costoM2: r.costoM2, precioVenta: r.precioVenta, precioM2: r.precioM2 }
  }

  // Clad
  const [params, fam, kp] = await Promise.all([
    cargarCladParams(),
    cargarFamilia(material),
    cargarKp(material),
  ])
  const r = cotizarClad({ ancho, alto, margenPct, kp, espesorMm: fam.espesorMm, familia: fam, alcance: terminacion as AlcanceClad }, params)
  return { sistema, material, colorACM, terminacion, ancho, alto, area, costoMaterial: r.material, costoFab: r.fab, costoPintura: r.pintura, costoTornilleria: r.tornilleria, costoTotal: r.costoTotal, costoM2: r.costoM2, precioVenta: r.precioVenta, precioM2: r.precioM2 }
}
