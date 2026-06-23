import type { SkinInput, SkinParams, SkinGeometria, FamiliaParams } from '@/lib/cotizador/skin/tipos'
export type { SkinInput, SkinParams, SkinGeometria, FamiliaParams }

// SkinRail uses the same input as Skin
export type SkinRailInput = SkinInput

export interface SkinRailParams extends SkinParams {
  omegaArea3m: number      // 0.57
  omegaEspMm: number       // 1.6
  omegaTramoMaxM: number   // 3.0
  empalmeCAreaM2: number   // 0.0242
  fabOmegaM: number        // calcFab(Costilla 3000)/3
  fabEmpalleC: number      // calcFab(EmpalleC)
}

export interface SkinRailGeometria extends SkinGeometria {
  omegas: number
  mlOmega: number
  empallesC: number
  autoperfCostillaOmega: number
  autoperfOmegaPanel: number
  piezasOmegaHorno: number
}

export interface SkinRailResultado {
  geometria: SkinRailGeometria
  material: number
  fab: number
  pintura: number
  tornilleria: number
  parantes: number
  costoTotal: number
  costoM2: number
  precioVenta: number
  precioM2: number
}
