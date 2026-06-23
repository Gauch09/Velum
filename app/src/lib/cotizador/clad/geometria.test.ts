import { describe, it, expect } from 'vitest'
import { contarClad } from './geometria'
import { PARAMS_FIXTURE, INPUT_CLAD_30x25 } from './__fixtures__/fixtures'

describe('contarClad', () => {
  it('reproduce la geometría golden (vano 30x25)', () => {
    const g = contarClad(INPUT_CLAD_30x25, PARAMS_FIXTURE)
    expect(g.area).toBe(750)
    expect(g.lamasAncho).toBe(100)
    expect(g.lamasFilas).toBe(9)
    expect(g.lamas).toBe(900)
    expect(g.omegas).toBe(17)
    expect(g.mlOmega).toBe(510)
    expect(g.empallesC).toBe(153)
    expect(g.tacosTirafondos).toBe(34)
    expect(g.fijacionesPanelOmega).toBe(3600)
  })

  it('sin empalles cuando ancho <= omegaTramoMaxM', () => {
    const g = contarClad({ ...INPUT_CLAD_30x25, ancho: 3 }, PARAMS_FIXTURE)
    expect(g.empallesC).toBe(0)
  })

  it('un empalle cuando ancho es exactamente 6m', () => {
    const g = contarClad({ ...INPUT_CLAD_30x25, ancho: 6 }, PARAMS_FIXTURE)
    // omegas = ceil(25/1.5) = 17, ceil(6/3)-1 = 1 → empallesC = 17
    expect(g.empallesC).toBe(17)
  })
})
