import { describe, it, expect } from 'vitest'
import { cotizarSkinRail } from './cotizarSkinRail'
import { PARAMS_FIXTURE, INPUT_SKINRAIL_30x25 } from './__fixtures__/fixtures'

const close = (a: number, b: number) => expect(Math.abs(a - b) / b).toBeLessThan(1e-6)

describe('cotizarSkinRail', () => {
  it('vano 30x25 Aluminio 1.5mm Completo+Estructura reproduce el Simulador', () => {
    const r = cotizarSkinRail(INPUT_SKINRAIL_30x25, PARAMS_FIXTURE)

    // Geometría
    expect(r.geometria.paneles).toBe(750)
    expect(r.geometria.costillas).toBe(31)
    expect(r.geometria.omegas).toBe(17)
    expect(r.geometria.mlOmega).toBe(510)
    expect(r.geometria.empallesC).toBe(153)
    expect(r.geometria.autoperfCostillaOmega).toBe(1054)
    expect(r.geometria.autoperfOmegaPanel).toBe(1020)
    expect(r.geometria.piezasOmegaHorno).toBe(170)

    // Costos
    close(r.material,    33755.07417880001)
    close(r.fab,         7925.66266818902)
    close(r.pintura,     4553.981663111112)
    close(r.tornilleria, 604.771)
    expect(r.parantes).toBe(0)
    close(r.costoTotal,  46839.48951010014)
    close(r.costoM2,     62.45265268013352)
  })
})
