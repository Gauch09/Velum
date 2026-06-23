import { describe, it, expect } from 'vitest'
import { ProbadorInputSchema, construirSkinInput } from './probador-input'
import type { FamiliaConEspesor } from './params-repo'

const familiaComposite: FamiliaConEspesor = {
  nombre: 'Composite', densidad: 0, precioTon: 0, precioM2: 70, espesorMm: 4,
}

const dorado = {
  ancho: 30, alto: 25, modAncho: 1, modAlto: 1, sepParedMm: 0,
  margenPct: 150, material: 'Bond 4mm', diseno: 'Composite',
  alcance: 'Completo + Estructura',
}

describe('ProbadorInputSchema', () => {
  it('acepta el caso dorado', () => {
    expect(ProbadorInputSchema.safeParse(dorado).success).toBe(true)
  })
  it('rechaza dimensiones no positivas', () => {
    expect(ProbadorInputSchema.safeParse({ ...dorado, ancho: 0 }).success).toBe(false)
  })
  it('rechaza margen negativo', () => {
    expect(ProbadorInputSchema.safeParse({ ...dorado, margenPct: -1 }).success).toBe(false)
  })
  it('rechaza alcance fuera del enum', () => {
    expect(ProbadorInputSchema.safeParse({ ...dorado, alcance: 'Otro' }).success).toBe(false)
  })
})

describe('construirSkinInput', () => {
  it('convierte margen% a fracción (150 -> 1.5) y cablea familia/kp/espesor', () => {
    const datos = ProbadorInputSchema.parse(dorado)
    const input = construirSkinInput(datos, familiaComposite, 1.2)
    expect(input.margenPct).toBe(1.5)
    expect(input.espesorMm).toBe(4)
    expect(input.kp).toBe(1.2)
    expect(input.familia.precioM2).toBe(70)
    expect(input.alcance).toBe('Completo + Estructura')
  })
})
