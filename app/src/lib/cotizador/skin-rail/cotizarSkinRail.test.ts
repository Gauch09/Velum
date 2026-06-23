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
    close(r.material,    34041.1856408)
    close(r.fab,         8145.80097913767)
    close(r.pintura,     4659.19956622222)
    close(r.tornilleria, 1150.433)
    expect(r.parantes).toBe(0)
    close(r.costoTotal,  47996.61918615992)
    close(r.costoM2,     63.995492248213)
  })
})
