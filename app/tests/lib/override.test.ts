import { describe, it, expect } from 'vitest'
import { validarMotivoOverride } from '../../src/lib/override'

describe('validarMotivoOverride', () => {
  it('devuelve true con 10 caracteres exactos', () => {
    expect(validarMotivoOverride('1234567890')).toBe(true)
  })

  it('devuelve true con texto válido real', () => {
    expect(validarMotivoOverride('Proveedor entregó material antes de lo previsto')).toBe(true)
  })

  it('devuelve false con menos de 10 caracteres', () => {
    expect(validarMotivoOverride('corto')).toBe(false)
  })

  it('devuelve false con string vacío', () => {
    expect(validarMotivoOverride('')).toBe(false)
  })

  it('devuelve false con solo espacios en blanco', () => {
    expect(validarMotivoOverride('          ')).toBe(false)
  })

  it('devuelve false con null', () => {
    expect(validarMotivoOverride(null)).toBe(false)
  })

  it('devuelve false con undefined', () => {
    expect(validarMotivoOverride(undefined)).toBe(false)
  })
})
