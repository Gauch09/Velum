import type { SkinRailInput, SkinRailParams } from '../tipos'

const TASA = 17046.553144129102
const TC   = 1460.0
const cf   = (upds: number[]) => upds.reduce((s, u) => s + 8 / u, 0) * TASA / TC

export const PARAMS_FIXTURE: SkinRailParams = {
  // --- Skin base params ---
  galvDensidad: 7850, galvPrecioTon: 1400,
  costillaAreaM2: 0.522, costillaEspesorMm: 1.6,
  mensulaAreaM2: 0.02584, mensulaEspesorMm: 2.5,
  empalmeAreaM2: 0.0387, empalmeEspesorMm: 1.6,
  acmAccPorPanel: 4, acmAccCosto: 1.5,
  areaPlaca: 7.5, fabPlaca: 8.367600287643281,
  fabPanelSkin:    cf([16, 192, 53, 200]),
  fabCostilla3000: cf([56, 736, 160, 1200]),
  fabMensula:      cf([760, 680, 667, 640]),
  fabEmpalme:      cf([432, 688, 667, 920]),
  paranteBase: 0,
  polvo: 14, cobertura: 9, sobreaplic: 1.3,
  costoHorneada: 27.5, piezasHorneada: 100,
  brocaCosto: 0.62, autoperfCosto: 0.0285, fresadoCostoM2: 6, anodizadoCostoM2: 38,
  // --- Omega extra ---
  omegaArea3m:     0.57,
  omegaEspMm:      1.6,
  omegaTramoMaxM:  3.0,
  empalmeCAreaM2:  0.0242,
  fabOmegaM:  cf([56, 736, 160, 1200]) / 3,
  fabEmpalleC: cf([432, 688, 667, 920]),
}

export const INPUT_SKINRAIL_30x25: SkinRailInput = {
  ancho: 30, alto: 25,
  modAncho: 1.0, modAlto: 1.0,
  sepParedMm: 0,
  margenPct: 1.5,
  kp: 1.2,
  espesorMm: 1.5,
  familia: { nombre: 'Aluminio', densidad: 2700, precioTon: 8000, precioM2: 0 },
  alcance: 'Completo + Estructura',
}
