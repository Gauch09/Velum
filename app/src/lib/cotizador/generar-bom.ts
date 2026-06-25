import type { VanoGeometria } from './cotizar-multi'
import type { SkinCompras } from './skin/tipos'

export interface VanoBOM {
  cara: string | null
  sistema: string
  geometria: VanoGeometria | null
  compras: SkinCompras | null
}

export interface LineaBOM {
  area: 'COMPRAS' | 'PRODUCCION'
  cara: string | null            // null = consolidado de obra
  insumo: string
  unidad: 'un' | 'kg' | 'm2' | 'chapa'
  cantidad: number
  cantidadCalc: number
  origen: 'CALCULADA'
}

export interface BOMConfig {
  kgPorChapaGalv16: number
  kgPorChapaGalv25: number
}

// Peso físico de cada chapa galvanizada 3000×1220 (acero 7850 kg/m³):
//   1.6mm → 3.0·1.22·0.0016·7850 ≈ 45.97 kg ; 2.5mm ≈ 71.83 kg
export const BOM_CONFIG_DEFAULT: BOMConfig = { kgPorChapaGalv16: 45.97, kgPorChapaGalv25: 71.83 }

const PIEZAS: Array<{ key: keyof VanoGeometria; insumo: string }> = [
  { key: 'paneles',       insumo: 'Paneles' },
  { key: 'mensulasTotal', insumo: 'PIC150' },
  { key: 'piezas3000',    insumo: 'Costilla 3000mm' },
  { key: 'empalmesJ',     insumo: 'Empalme J' },
  { key: 'brocas',        insumo: 'Broca' },
  { key: 'autoperf',      insumo: 'Autoperforante' },
  { key: 'parantes',      insumo: 'Parante' },
]

function linea(area: LineaBOM['area'], cara: string | null, insumo: string, unidad: LineaBOM['unidad'], cantidad: number): LineaBOM {
  return { area, cara, insumo, unidad, cantidad, cantidadCalc: cantidad, origen: 'CALCULADA' }
}

// Devuelve las caras en orden de primera aparición.
function carasEnOrden(vanos: VanoBOM[]): Array<string | null> {
  const vistas = new Map<string | null, true>()
  for (const v of vanos) vistas.set(v.cara, true)
  return Array.from(vistas.keys())
}

export function generarBOM(vanos: VanoBOM[], config: BOMConfig = BOM_CONFIG_DEFAULT): LineaBOM[] {
  const conDespiece = vanos.filter(v => v.geometria || v.compras)
  if (conDespiece.length === 0) return []

  const caras = carasEnOrden(conDespiece)
  const compras: LineaBOM[] = []
  const produccion: LineaBOM[] = []

  // ── COMPRAS: por cara (consumo) ──
  for (const cara of caras) {
    const vc = conDespiece.filter(v => v.cara === cara)
    const kg16 = vc.reduce((a, v) => a + (v.compras?.kgGalv16 ?? 0), 0)
    const kg25 = vc.reduce((a, v) => a + (v.compras?.kgGalv25 ?? 0), 0)
    const acm  = vc.reduce((a, v) => a + (v.compras?.chapasACM ?? 0), 0)
    if (acm  > 0) compras.push(linea('COMPRAS', cara, 'Chapa ACM 5000×1500', 'chapa', acm))
    if (kg16 > 0) compras.push(linea('COMPRAS', cara, 'Galvanizado 1.6mm', 'kg', round2(kg16)))
    if (kg25 > 0) compras.push(linea('COMPRAS', cara, 'Galvanizado 2.5mm', 'kg', round2(kg25)))
  }

  // ── COMPRAS: consolidado de obra ──
  const acmTotal  = conDespiece.reduce((a, v) => a + (v.compras?.chapasACM ?? 0), 0)   // suma de chapas por paño
  const kg16Total = conDespiece.reduce((a, v) => a + (v.compras?.kgGalv16 ?? 0), 0)
  const kg25Total = conDespiece.reduce((a, v) => a + (v.compras?.kgGalv25 ?? 0), 0)
  if (acmTotal > 0) compras.push(linea('COMPRAS', null, 'Chapa ACM 5000×1500', 'chapa', acmTotal))
  if (kg16Total > 0) compras.push(linea('COMPRAS', null, 'Chapa Galv 1.6 3000×1220', 'chapa', Math.ceil(kg16Total / config.kgPorChapaGalv16)))
  if (kg25Total > 0) compras.push(linea('COMPRAS', null, 'Chapa Galv 2.5 3000×1220', 'chapa', Math.ceil(kg25Total / config.kgPorChapaGalv25)))

  // ── PRODUCCIÓN: por cara + consolidado ──
  for (const cara of caras) {
    const vc = conDespiece.filter(v => v.cara === cara)
    for (const p of PIEZAS) {
      const n = vc.reduce((a, v) => a + (v.geometria?.[p.key] ?? 0), 0)
      if (n > 0) produccion.push(linea('PRODUCCION', cara, p.insumo, 'un', n))
    }
  }
  for (const p of PIEZAS) {
    const n = conDespiece.reduce((a, v) => a + (v.geometria?.[p.key] ?? 0), 0)
    if (n > 0) produccion.push(linea('PRODUCCION', null, p.insumo, 'un', n))
  }

  return [...compras, ...produccion]
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
