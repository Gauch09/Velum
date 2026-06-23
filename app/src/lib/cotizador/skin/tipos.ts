export type AlcanceTerminacion =
  | 'Crudo (sin pintura)'
  | 'Completo (solo panel)'
  | 'Completo + Estructura'

export interface SkinInput {
  ancho: number
  alto: number
  modAncho: number
  modAlto: number
  sepParedMm: number
  margenPct: number
  kp: number
  espesorMm: number
  familia: FamiliaParams
  alcance: AlcanceTerminacion
}

export interface FamiliaParams {
  nombre: string
  densidad: number
  precioTon: number
  precioM2: number // override ACM; 0 = por peso
}

export interface SkinParams {
  galvDensidad: number      // 7850
  galvPrecioTon: number     // 1400
  costillaAreaM2: number    // 0.522
  costillaEspesorMm: number // 1.6
  mensulaAreaM2: number     // 0.02584
  mensulaEspesorMm: number  // 2.5
  empalmeAreaM2: number     // 0.0387
  empalmeEspesorMm: number  // 1.6
  acmAccPorPanel: number    // 4
  acmAccCosto: number       // 1.5
  areaPlaca: number         // 7.5
  fabPlaca: number          // 8.367600287643281
  fabPanelSkin: number      // 8.55375093906211
  fabCostilla3000: number   // 2.4564944134921567
  fabMensula: number        // 0.5462489105425525
  fabEmpalme: number        // 0.5935479114662887
  paranteBase: number       // Capacidad Fab!B17
  polvo: number             // 14
  cobertura: number         // 9
  sobreaplic: number        // 1.3
  costoHorneada: number     // 27.5
  piezasHorneada: number    // 100
  brocaCosto: number        // 0.62
  autoperfCosto: number     // 0.0285
}

export interface SkinGeometria {
  area: number; columnas: number; filas: number; paneles: number
  costillas: number; mlCostilla: number; piezasCostilla: number
  mensulasTotal: number; brocas: number; autoperf: number
  empalmesJ: number; parantes: number
}

export interface SkinResultado {
  geometria: SkinGeometria
  material: number; fab: number; pintura: number; tornilleria: number; parantes: number
  costoTotal: number; costoM2: number; precioVenta: number; precioM2: number
}
