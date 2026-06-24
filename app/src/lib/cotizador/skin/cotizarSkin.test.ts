import { describe, it, expect } from 'vitest'
import { cotizarSkin } from './cotizarSkin'
import { PARAMS_FIXTURE, INPUT_COMPOSITE } from './__fixtures__/fixtures'
import goldenMetal from './__fixtures__/golden-metal.json'

const close = (a: number, b: number) => expect(Math.abs(a - b) / b).toBeLessThan(1e-6)

describe('cotizarSkin', () => {
  it('vano 30x25 Bond 4mm ACM + Completo+Estructura', () => {
    const r = cotizarSkin(INPUT_COMPOSITE, PARAMS_FIXTURE)
    close(r.material, 51726.0780604)
    close(r.fab, 9540.748629167354)
    close(r.pintura, 818.6917031111113)
    close(r.tornilleria, 545.6619999999999)
    close(r.costoTotal, 62631.18039267846)
    close(r.costoM2, 83.50824052357129)
    close(r.precioVenta, 156577.95098169617)
    close(r.precioM2, 208.7706013089282)
  })

  it('vano 30x25 Alum 1,5mm (metal, no-override) reproduce el Simulador', () => {
    const inputMetal = {
      ancho: 30, alto: 25, modAncho: 1, modAlto: 1, sepParedMm: 0,
      margenPct: 1.5,
      kp: goldenMetal.kp,
      espesorMm: goldenMetal.espesorMm,
      familia: {
        nombre: goldenMetal.familia,
        densidad: 2700,
        precioTon: 8000,
        precioM2: 0,  // metal branch: precio por peso, no override
      },
      alcance: 'Completo + Estructura' as const,
    }
    const r = cotizarSkin(inputMetal, PARAMS_FIXTURE)
    close(r.material,   goldenMetal.material)
    close(r.fab,        goldenMetal.fab)
    close(r.pintura,    goldenMetal.pintura)
    close(r.costoTotal, goldenMetal.total)
    close(r.precioM2,   goldenMetal.precioM2)
  })
})
