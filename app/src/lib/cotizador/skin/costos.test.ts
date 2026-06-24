import { describe, it, expect } from 'vitest'
import { costoMaterial, costoFab, costoPintura, costoTornilleria, costoParantes } from './costos'
import { contarSkin } from './geometria'
import { PARAMS_FIXTURE, INPUT_COMPOSITE } from './__fixtures__/fixtures'

const g = contarSkin(INPUT_COMPOSITE, 2)
const close = (a: number, b: number) => expect(Math.abs(a - b) / b).toBeLessThan(1e-6)

describe('costoMaterial', () => {
  it('rama ACM (Bond 4mm)', () => {
    close(costoMaterial(INPUT_COMPOSITE, PARAMS_FIXTURE, g), 51726.0780604)
  })
})
describe('costoFab', () => {
  it('rama ACM (Bond 4mm) incluye fresado', () => {
    close(costoFab(INPUT_COMPOSITE, PARAMS_FIXTURE, g), 9540.748629167354)
  })
})
describe('costoPintura', () => {
  it('ACM + Completo+Estructura pinta la estructura', () => {
    close(costoPintura(INPUT_COMPOSITE, PARAMS_FIXTURE, g), 818.6917031111113)
  })
})
describe('costoTornilleria', () => {
  it('403 ménsulas → 806 brocas + 1612 autoperf', () => {
    close(costoTornilleria(PARAMS_FIXTURE, g), 545.6619999999999)
  })
})
describe('costoParantes', () => {
  it('parantes = 0 sin separacion', () => {
    expect(costoParantes(INPUT_COMPOSITE, PARAMS_FIXTURE, g)).toBe(0)
  })
})
