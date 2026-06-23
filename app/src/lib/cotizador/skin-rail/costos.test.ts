import { describe, it, expect } from 'vitest'
import {
  costoMaterialSkinRail,
  costoFabSkinRail,
  costoPinturaSkinRail,
  costoTornilleriaSkinRail,
  costoParantesSkinRail,
} from './costos'
import { contarSkinRail } from './geometria'
import { PARAMS_FIXTURE, INPUT_SKINRAIL_30x25 } from './__fixtures__/fixtures'

const g = contarSkinRail(INPUT_SKINRAIL_30x25)
const close = (a: number, b: number) => expect(Math.abs(a - b) / b).toBeLessThan(1e-6)

describe('costoMaterialSkinRail', () => {
  it('vano 30x25 Aluminio 1.5mm = 34041.1856408', () => {
    close(costoMaterialSkinRail(INPUT_SKINRAIL_30x25, PARAMS_FIXTURE, g), 34041.1856408)
  })
})

describe('costoFabSkinRail', () => {
  it('vano 30x25 = 8145.80097913767', () => {
    close(costoFabSkinRail(INPUT_SKINRAIL_30x25, PARAMS_FIXTURE, g), 8145.80097913767)
  })
})

describe('costoPinturaSkinRail', () => {
  it('Completo + Estructura = 4659.19956622222', () => {
    close(costoPinturaSkinRail(INPUT_SKINRAIL_30x25, PARAMS_FIXTURE, g), 4659.19956622222)
  })

  it('retorna 0 cuando familia ACM (precioM2 > 0)', () => {
    const inputAcm = {
      ...INPUT_SKINRAIL_30x25,
      familia: { ...INPUT_SKINRAIL_30x25.familia, precioM2: 37 },
    }
    expect(costoPinturaSkinRail(inputAcm, PARAMS_FIXTURE, g)).toBe(0)
  })

  it('retorna 0 cuando alcance Crudo', () => {
    const inputCrudo = { ...INPUT_SKINRAIL_30x25, alcance: 'Crudo (sin pintura)' as const }
    expect(costoPinturaSkinRail(inputCrudo, PARAMS_FIXTURE, g)).toBe(0)
  })
})

describe('costoTornilleriaSkinRail', () => {
  it('vano 30x25 = 1150.433', () => {
    close(costoTornilleriaSkinRail(PARAMS_FIXTURE, g), 1150.433)
  })
})

describe('costoParantesSkinRail', () => {
  it('parantes = 0 sin separacion', () => {
    expect(costoParantesSkinRail(INPUT_SKINRAIL_30x25, PARAMS_FIXTURE, g)).toBe(0)
  })
})
