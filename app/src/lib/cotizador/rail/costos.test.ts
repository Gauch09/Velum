import { describe, it, expect } from 'vitest'
import { costoMaterial, costoFab, costoPintura, costoTornilleria } from './costos'
import { contarRail } from './geometria'
import { PARAMS_FIXTURE, INPUT_RAIL_2x3 } from './__fixtures__/fixtures'

const g = contarRail(INPUT_RAIL_2x3, PARAMS_FIXTURE)
const close = (a: number, b: number) => expect(Math.abs(a - b) / b).toBeLessThan(1e-6)

describe('costoMaterial', () => {
  it('vano 2x3 = 77.73227', () => {
    close(costoMaterial(INPUT_RAIL_2x3, PARAMS_FIXTURE, g), 77.73227)
  })
})

describe('costoFab', () => {
  it('vano 2x3 = 45.916695940804', () => {
    close(costoFab(PARAMS_FIXTURE, g), 45.916695940804)
  })
})

describe('costoPintura', () => {
  it('vano 2x3 = 30.7834782222222', () => {
    close(costoPintura(INPUT_RAIL_2x3, PARAMS_FIXTURE, g), 30.7834782222222)
  })
})

describe('costoTornilleria', () => {
  it('vano 2x3 = 5.612', () => {
    close(costoTornilleria(PARAMS_FIXTURE, g), 5.612)
  })
})
