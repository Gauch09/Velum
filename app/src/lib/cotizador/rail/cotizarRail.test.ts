import { describe, it, expect } from 'vitest'
import { cotizarRail } from './cotizarRail'
import { PARAMS_FIXTURE, INPUT_RAIL_2x3 } from './__fixtures__/fixtures'

const close = (a: number, b: number) => expect(Math.abs(a - b) / b).toBeLessThan(1e-6)

describe('cotizarRail', () => {
  it('vano 2x3 MultiSlim Standard reproduce el Golden', () => {
    const r = cotizarRail(INPUT_RAIL_2x3, PARAMS_FIXTURE)

    // Geometría
    expect(r.geometria.lamas).toBe(7)
    expect(r.geometria.omegas).toBe(2)
    expect(r.geometria.mlOmega).toBe(4)
    expect(r.geometria.empallesC).toBe(0)
    expect(r.geometria.PIC).toBe(4)
    expect(r.geometria.brocas).toBe(8)
    expect(r.geometria.autoperf).toBe(16)
    expect(r.geometria.T1).toBe(28)

    // Costos
    close(r.material,    77.73227)
    close(r.fab,         45.916695940804)
    close(r.pintura,     30.7834782222222)
    close(r.tornilleria, 5.612)
    close(r.costoTotal,  160.044444163026)
    close(r.costoM2,     26.674074027171)
    close(r.precioVenta, 256.071110660842)
    close(r.precioM2,    42.6785184434737)
  })
})
