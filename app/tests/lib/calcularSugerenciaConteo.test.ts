import { describe, it, expect } from 'vitest'
import { calcularSugerenciaConteo } from '../../src/lib/calcularSugerenciaConteo'

describe('calcularSugerenciaConteo', () => {
  it('cantidad divisible da lotes iguales', () => {
    expect(calcularSugerenciaConteo(60, 30)).toEqual([30, 30])
  })
  it('cantidad no divisible distribuye uniformemente', () => {
    // 72 ÷ 3 lotes = [24, 24, 24]
    const lotes = calcularSugerenciaConteo(72, 30)
    expect(lotes).toEqual([24, 24, 24])
  })
  it('suma de lotes es cantidadTotal', () => {
    const lotes = calcularSugerenciaConteo(48, 30)
    expect(lotes.reduce((a, b) => a + b, 0)).toBe(48)
  })
  it('cantidad menor al máximo da un solo lote', () => {
    expect(calcularSugerenciaConteo(12, 30)).toEqual([12])
  })
  it('cantidad cero devuelve vacío', () => {
    expect(calcularSugerenciaConteo(0)).toEqual([])
  })
})
