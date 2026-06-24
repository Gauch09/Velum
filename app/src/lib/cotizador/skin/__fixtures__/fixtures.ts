import type { SkinInput, SkinParams } from '../tipos'

export const PARAMS_FIXTURE: SkinParams = {
  galvDensidad: 7850, galvPrecioTon: 1400,
  costillaAreaM2: 0.522, costillaEspesorMm: 1.6,
  mensulaAreaM2: 0.02584, mensulaEspesorMm: 2.5,
  empalmeAreaM2: 0.0387, empalmeEspesorMm: 1.6,
  acmAccPorPanel: 4, acmAccCosto: 1.5,
  areaPlaca: 7.5, fabPlaca: 8.367600287643281,
  fabPanelSkin: 8.55375093906211, fabCostilla3000: 2.4564944134921567,
  fabMensula: 0.5462489105425525, fabEmpalme: 0.5935479114662887,
  paranteBase: 0,
  polvo: 14, cobertura: 9, sobreaplic: 1.3, costoHorneada: 27.5, piezasHorneada: 100,
  brocaCosto: 0.62, autoperfCosto: 0.0285, fresadoCostoM2: 6, anodizadoCostoM2: 38,
  mensulaSpacingM: 2,
}

export const INPUT_COMPOSITE: SkinInput = {
  ancho: 30, alto: 25, modAncho: 1, modAlto: 1, sepParedMm: 0,
  margenPct: 1.5, kp: 1.6, espesorMm: 4,
  familia: { nombre: 'Al. Compuesto', densidad: 1900, precioTon: 5000, precioM2: 37 },
  alcance: 'Completo + Estructura',
}
