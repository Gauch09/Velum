import { describe, it, expect } from 'vitest'
import { cotizarSkin } from './cotizarSkin'
import { PARAMS_FIXTURE, INPUT_COMPOSITE } from './__fixtures__/fixtures'
import goldenMetal from './__fixtures__/golden-metal.json'

const close = (a: number, b: number) => expect(Math.abs(a - b) / b).toBeLessThan(1e-6)

describe('cotizarSkin', () => {
  it('vano 30x25 Bond 4mm reproduce el Simulador', () => {
    const r = cotizarSkin(INPUT_COMPOSITE, PARAMS_FIXTURE)
    close(r.material, 52012.1895224)
    close(r.fab, 2560.8869401160027)
    expect(r.pintura).toBe(0)
    close(r.tornilleria, 1091.3239999999998)
    close(r.costoTotal, 55664.40046251601)
    close(r.costoM2, 74.21920061668801)
    close(r.precioVenta, 139161.00115629003)
    close(r.precioM2, 185.54800154172005)
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
    close(r.material,    goldenMetal.material)
    close(r.fab,         goldenMetal.fab)
    close(r.pintura,     goldenMetal.pintura)
    close(r.costoTotal,  goldenMetal.total)
    close(r.precioM2,    goldenMetal.precioM2)
  })
})
