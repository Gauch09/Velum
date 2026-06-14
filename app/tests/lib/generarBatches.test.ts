import { describe, it, expect } from 'vitest'
import { generarBatches } from '../../src/lib/generarBatches'

describe('generarBatches', () => {
  it('genera cantidad correcta de batches', () => {
    expect(generarBatches(72, 30)).toHaveLength(3)
  })
  it('último batch tiene el resto', () => {
    const b = generarBatches(72, 30)
    expect(b[b.length - 1].cantidadPiezas).toBe(12)
  })
  it('suma de piezas es cantidadTotal', () => {
    const suma = generarBatches(72, 30).reduce((acc, b) => acc + b.cantidadPiezas, 0)
    expect(suma).toBe(72)
  })
  it('numerados desde 1', () => {
    const b = generarBatches(60, 30)
    expect(b[0].numero).toBe(1)
    expect(b[1].numero).toBe(2)
  })
  it('cantidad exacta no genera batch vacío', () => {
    expect(generarBatches(30, 30)).toHaveLength(1)
  })
  it('piezasPorBach 0 devuelve vacío', () => {
    expect(generarBatches(72, 0)).toEqual([])
  })
})
