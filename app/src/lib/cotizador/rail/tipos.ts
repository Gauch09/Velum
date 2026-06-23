import type { FamiliaParams } from '@/lib/cotizador/skin/tipos'
export type { FamiliaParams }

export interface RailInput {
  ancho: number        // metros
  alto: number         // metros
  margenPct: number    // fracción (ej. 0.6)
  kp: number           // lookup por material en DisenoKp
  espesorMm: number    // de MaterialVariante
  familia: FamiliaParams
}

export interface RailParams {
  galvDensidad: number      // 7850
  galvPrecioTon: number     // 1400
  lamaAnchoM: number        // 0.3
  lamaAltoMaxM: number      // 3.0
  omegaArea3m: number       // 0.57
  omegaEspMm: number        // 1.6
  omegaTramoMaxM: number    // 3.0
  sepOmegaVertM: number     // 1.5
  picAreaM2: number         // 0.02584
  picEspMm: number          // 2.5
  empalmeCAreaM2: number    // 0.0242
  costoT1: number           // 0.007
  costoBroca: number        // 0.62
  costoAutoperf: number     // 0.0285
  polvo: number             // 14
  cobertura: number         // 9
  sobreaplic: number        // 1.3
  costoHorneada: number     // 27.5
  piezasHorneada: number    // 100
  fabLama: number           // calcFab(['MultiSlim Standard'])
  fabOmegaM: number         // calcFab(['Costilla 3000']) / 3
  fabPIC: number            // calcFab(['PIC 150 (mensula)'])
  fabEmpalleC: number       // calcFab(['Empalme Costilla'])
}

export interface RailGeometria {
  area: number
  lamasAncho: number
  lamasFilas: number
  lamas: number
  omegas: number
  mlOmega: number
  empallesC: number
  PIC: number
  brocas: number
  autoperf: number
  T1: number
}

export interface RailResultado {
  geometria: RailGeometria
  material: number
  fab: number
  pintura: number
  tornilleria: number
  costoTotal: number
  costoM2: number
  precioVenta: number
  precioM2: number
}
