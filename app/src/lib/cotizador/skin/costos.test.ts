import { describe, it, expect } from 'vitest'
import { costoMaterial, costoFab, costoPintura, costoTornilleria, costoParantes } from './costos'
import { contarSkin } from './geometria'
import { PARAMS_FIXTURE, INPUT_COMPOSITE } from './__fixtures__/fixtures'

const g = contarSkin(INPUT_COMPOSITE)
const close = (a: number, b: number) => expect(Math.abs(a - b) / b).toBeLessThan(1e-6)

describe('costoMaterial', () => {
  it('rama ACM (Bond 4mm) = 52012.1895224', () => {
    close(costoMaterial(INPUT_COMPOSITE, PARAMS_FIXTURE, g), 52012.1895224)
  })
})
describe('costoFab', () => {
  it('rama ACM (Bond 4mm) = 2560.8869401160027', () => {
    close(costoFab(INPUT_COMPOSITE, PARAMS_FIXTURE, g), 2560.8869401160027)
  })
})
describe('costoPintura', () => {
  it('pintura = 0 cuando override ACM', () => {
    expect(costoPintura(INPUT_COMPOSITE, PARAMS_FIXTURE, g)).toBe(0)
  })
})
describe('costoTornilleria', () => {
  it('tornilleria = 1091.324', () => {
    close(costoTornilleria(PARAMS_FIXTURE, g), 1091.3239999999998)
  })
})
describe('costoParantes', () => {
  it('parantes = 0 sin separacion', () => {
    expect(costoParantes(INPUT_COMPOSITE, PARAMS_FIXTURE, g)).toBe(0)
  })
})
