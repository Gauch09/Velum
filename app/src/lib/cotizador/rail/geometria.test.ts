import { describe, it, expect } from 'vitest'
import { contarRail } from './geometria'
import { PARAMS_FIXTURE, INPUT_RAIL_2x3 } from './__fixtures__/fixtures'

describe('contarRail', () => {
  it('reproduce la geometría del Excel (vano 2x3)', () => {
    const g = contarRail(INPUT_RAIL_2x3, PARAMS_FIXTURE)
    expect(g.area).toBe(6)
    expect(g.lamasAncho).toBe(7)
    expect(g.lamasFilas).toBe(1)
    expect(g.lamas).toBe(7)
    expect(g.omegas).toBe(2)
    expect(g.mlOmega).toBe(4)
    expect(g.empallesC).toBe(0)
    expect(g.PIC).toBe(4)
    expect(g.brocas).toBe(8)
    expect(g.autoperf).toBe(16)
    expect(g.T1).toBe(28)
  })
})
