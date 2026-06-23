import type { CladInput, CladParams } from '../tipos'

const TASA = 17046.553144129102
const TC   = 1460.0
const cf   = (upds: number[]) => upds.reduce((s, u) => s + 8 / u, 0) * TASA / TC

export const PARAMS_FIXTURE: CladParams = {
  galvDensidad:    7850,
  galvPrecioTon:   1400,
  lamaAnchoM:      0.3,
  lamaAltoMaxM:    3.0,
  omegaArea3m:     0.57,
  omegaEspMm:      1.6,
  omegaTramoMaxM:  3.0,
  sepOmegaVertM:   1.5,
  empalmeCAreaM2:  0.0242,
  costoT1:         0.007,
  costoTaco:       0.34,
  costoTirafondo:  0.34,
  polvo:           14,
  cobertura:       9,
  sobreaplic:      1.3,
  costoHorneada:   27.5,
  piezasHorneada:  100,
  fabLama:    cf([24, 320, 480, 80, 400]),       // MultiSlim Standard
  fabOmegaM:  cf([56, 736, 160, 1200]) / 3,      // Costilla 3000 / 3
  fabEmpalleC: cf([432, 688, 667, 920]),          // Empalme Costilla
}

export const INPUT_CLAD_30x25: CladInput = {
  ancho:     30,
  alto:      25,
  margenPct: 0.6,
  kp:        1.45,   // MultiSlim.A
  espesorMm: 0.7,
  familia:   { nombre: 'Acero Galvanizado', densidad: 7850, precioTon: 1400, precioM2: 0 },
  alcance:   'Pintado',
}
