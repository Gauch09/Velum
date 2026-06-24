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

const g = contarSkinRail(INPUT_SKINRAIL_30x25, 2)
const close = (a: number, b: number) => expect(Math.abs(a - b) / b).toBeLessThan(1e-6)

describe('costoMaterialSkinRail', () => {
  it('vano 30x25 Aluminio 1.5mm', () => {
    close(costoMaterialSkinRail(INPUT_SKINRAIL_30x25, PARAMS_FIXTURE, g), 33755.07417880001)
  })
})

describe('costoFabSkinRail', () => {
  it('vano 30x25', () => {
    close(costoFabSkinRail(INPUT_SKINRAIL_30x25, PARAMS_FIXTURE, g), 7925.66266818902)
  })
})

describe('costoPinturaSkinRail', () => {
  it('Completo + Estructura', () => {
    close(costoPinturaSkinRail(INPUT_SKINRAIL_30x25, PARAMS_FIXTURE, g), 4553.981663111112)
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
  it('vano 30x25 con 403 ménsulas', () => {
    close(costoTornilleriaSkinRail(PARAMS_FIXTURE, g), 604.771)
  })
})

describe('costoParantesSkinRail', () => {
  it('parantes = 0 sin separacion', () => {
    expect(costoParantesSkinRail(INPUT_SKINRAIL_30x25, PARAMS_FIXTURE, g)).toBe(0)
  })
})
