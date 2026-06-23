import type { RailInput, RailParams } from '../tipos'

const TASA = 17046.553144129102
const TC   = 1460.0
const cf   = (upds: number[]) => upds.reduce((s, u) => s + 8 / u, 0) * TASA / TC

export const PARAMS_FIXTURE: RailParams = {
  galvDensidad:   7850,
  galvPrecioTon:  1400,
  lamaAnchoM:     0.3,
  lamaAltoMaxM:   3.0,
  omegaArea3m:    0.57,
  omegaEspMm:     1.6,
  omegaTramoMaxM: 3.0,
  sepOmegaVertM:  1.5,
  picAreaM2:      0.02584,
  picEspMm:       2.5,
  empalmeCAreaM2: 0.0242,
  costoT1:        0.007,
  costoBroca:     0.62,
  costoAutoperf:  0.0285,
  polvo:          14,
  cobertura:      9,
  sobreaplic:     1.3,
  costoHorneada:  27.5,
  piezasHorneada: 100,
  fabLama:        cf([24, 320, 480, 80, 400]),       // MultiSlim Standard
  fabOmegaM:      cf([56, 736, 160, 1200]) / 3,      // Costilla 3000 / 3
  fabPIC:         cf([760, 680, 667, 640]),           // PIC 150 (mensula)
  fabEmpalleC:    cf([432, 688, 667, 920]),           // Empalme Costilla
}

export const INPUT_RAIL_2x3: RailInput = {
  ancho:     2,
  alto:      3,
  margenPct: 0.6,
  kp:        1.333,
  espesorMm: 0.7,
  familia: { nombre: 'Acero Galvanizado', densidad: 7850, precioTon: 1400, precioM2: 0 },
}
