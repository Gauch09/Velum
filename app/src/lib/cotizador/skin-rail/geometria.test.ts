import { describe, it, expect } from 'vitest'
import { contarSkinRail } from './geometria'
import { INPUT_SKINRAIL_30x25 } from './__fixtures__/fixtures'

describe('contarSkinRail', () => {
  it('reproduce la geometría base Skin (30x25)', () => {
    const g = contarSkinRail(INPUT_SKINRAIL_30x25)
    expect(g.columnas).toBe(30)
    expect(g.filas).toBe(25)
    expect(g.paneles).toBe(750)
    expect(g.costillas).toBe(31)
    expect(g.mlCostilla).toBe(775)
    expect(g.piezasCostilla).toBe(259)
    expect(g.mensulasTotal).toBe(806)
    expect(g.brocas).toBe(1612)
    expect(g.autoperf).toBe(3224)
    expect(g.empalmesJ).toBe(248)
    expect(g.parantes).toBe(0)
  })

  it('calcula geometría omega (30x25)', () => {
    const g = contarSkinRail(INPUT_SKINRAIL_30x25)
    expect(g.omegas).toBe(17)
    expect(g.mlOmega).toBe(510)
    expect(g.empallesC).toBe(153)
    expect(g.autoperfCostillaOmega).toBe(1054)
    expect(g.autoperfOmegaPanel).toBe(1020)
    expect(g.piezasOmegaHorno).toBe(170)
  })
})
