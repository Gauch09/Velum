import type { FamiliaParams } from '@/lib/cotizador/skin/tipos'
export type { FamiliaParams }

export type AlcanceClad = 'Pintado' | 'Crudo (sin pintura)'

export interface CladInput {
  ancho: number
  alto: number
  margenPct: number
  kp: number
  espesorMm: number
  familia: FamiliaParams
  alcance: AlcanceClad
}

export interface CladParams {
  galvDensidad: number
  galvPrecioTon: number
  lamaAnchoM: number
  lamaAltoMaxM: number
  omegaArea3m: number
  omegaEspMm: number
  omegaTramoMaxM: number
  sepOmegaVertM: number
  empalmeCAreaM2: number
  costoT1: number
  costoTaco: number
  costoTirafondo: number
  polvo: number
  cobertura: number
  sobreaplic: number
  costoHorneada: number
  piezasHorneada: number
  fabLama: number
  fabOmegaM: number
  fabEmpalleC: number
}

export interface CladGeometria {
  area: number
  lamasAncho: number
  lamasFilas: number
  lamas: number
  omegas: number
  mlOmega: number
  empallesC: number
  tacosTirafondos: number
  fijacionesPanelOmega: number
}

export interface CladResultado {
  geometria: CladGeometria
  material: number
  fab: number
  pintura: number
  tornilleria: number
  costoTotal: number
  costoM2: number
  precioVenta: number
  precioM2: number
}
