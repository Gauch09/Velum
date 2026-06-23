import { describe, it, expect } from 'vitest'
import { costoMaterial, costoFab, costoPintura, costoTornilleria } from './costos'
import { contarClad } from './geometria'
import { PARAMS_FIXTURE, INPUT_CLAD_30x25 } from './__fixtures__/fixtures'

const g = contarClad(INPUT_CLAD_30x25, PARAMS_FIXTURE)
const close = (a: number, b: number) => expect(Math.abs(a - b) / b).toBeLessThan(1e-6)

describe('costoMaterial', () => {
  it('vano 30x25 Galv 0.7mm = 10135.1336184', () => {
    close(costoMaterial(INPUT_CLAD_30x25, PARAMS_FIXTURE, g), 10135.1336184)
  })
})

describe('costoFab', () => {
  it('vano 30x25 = 5709.9507339737', () => {
    close(costoFab(INPUT_CLAD_30x25, PARAMS_FIXTURE, g), 5709.9507339737)
  })
})

describe('costoPintura', () => {
  it('Pintado = 3714.815', () => {
    close(costoPintura(INPUT_CLAD_30x25, PARAMS_FIXTURE, g), 3714.815)
  })

  it('Crudo (sin pintura) = 0', () => {
    expect(costoPintura({ ...INPUT_CLAD_30x25, alcance: 'Crudo (sin pintura)' }, PARAMS_FIXTURE, g)).toBe(0)
  })
})

describe('costoTornilleria', () => {
  it('tacos + T1 = 48.32', () => {
    close(costoTornilleria(PARAMS_FIXTURE, g), 48.32)
  })
})
