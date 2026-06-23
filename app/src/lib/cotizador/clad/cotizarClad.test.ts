import { describe, it, expect } from 'vitest'
import { cotizarClad } from './cotizarClad'
import { PARAMS_FIXTURE, INPUT_CLAD_30x25 } from './__fixtures__/fixtures'

const close = (a: number, b: number) => expect(Math.abs(a - b) / b).toBeLessThan(1e-6)

describe('cotizarClad', () => {
  it('vano 30x25 Galv 0.7mm Pintado reproduce el golden', () => {
    const r = cotizarClad(INPUT_CLAD_30x25, PARAMS_FIXTURE)
    close(r.material,    10135.1336184)
    close(r.fab,         5709.9507339737)
    close(r.pintura,     3714.815)
    close(r.tornilleria, 48.32)
    close(r.costoTotal,  19608.2193523737)
    close(r.costoM2,     26.1442924698316)
    close(r.precioVenta, 31373.1509637979)
  })

  it('vano 30x25 Crudo: pintura = 0 y costoTotal menor', () => {
    const r = cotizarClad({ ...INPUT_CLAD_30x25, alcance: 'Crudo (sin pintura)' }, PARAMS_FIXTURE)
    expect(r.pintura).toBe(0)
    const rPintado = cotizarClad(INPUT_CLAD_30x25, PARAMS_FIXTURE)
    expect(r.costoTotal).toBeLessThan(rPintado.costoTotal)
  })

  it('geometría golden: lamas=900, omegas=17, empallesC=153, tacos=34, fijaciones=3600', () => {
    const r = cotizarClad(INPUT_CLAD_30x25, PARAMS_FIXTURE)
    expect(r.geometria.lamas).toBe(900)
    expect(r.geometria.omegas).toBe(17)
    expect(r.geometria.empallesC).toBe(153)
    expect(r.geometria.tacosTirafondos).toBe(34)
    expect(r.geometria.fijacionesPanelOmega).toBe(3600)
  })
})
