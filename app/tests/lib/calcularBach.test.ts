import { describe, it, expect } from 'vitest'
import { calcularBach } from '../../src/lib/calcularBach'

describe('calcularBach', () => {
  it('pieza pequeña da bach grande', () => {
    // 100×100mm = 0.01m², capacidad 2m² → 200
    expect(calcularBach(100, 100, 2.0)).toBe(200)
  })
  it('pieza más grande que la máquina da 0', () => {
    // 3000×1000mm = 3m², capacidad 2m² → 0
    expect(calcularBach(3000, 1000, 2.0)).toBe(0)
  })
  it('área exacta da 1', () => {
    // 2000×1000mm = 2m², capacidad 2m² → 1
    expect(calcularBach(2000, 1000, 2.0)).toBe(1)
  })
  it('trunca decimales', () => {
    // 300×200mm = 0.06m², capacidad 2m² → 33.33 → 33
    expect(calcularBach(300, 200, 2.0)).toBe(33)
  })
  it('horno mayor capacidad que lavado', () => {
    expect(calcularBach(400, 200, 6.0)).toBeGreaterThan(calcularBach(400, 200, 2.0))
  })
})
