import { describe, it, expect } from 'vitest'
import { validarCuit, formatCuit } from './validar-cuit'

describe('validarCuit', () => {
  // 20-05536168-2: suma=141, resto=9, verificador=2 ✓
  it('acepta CUIT válido sin guiones', () => {
    expect(validarCuit('20055361682')).toBe(true)
  })
  it('acepta CUIT válido con guiones', () => {
    expect(validarCuit('20-05536168-2')).toBe(true)
  })
  it('rechaza dígito verificador incorrecto', () => {
    expect(validarCuit('20055361689')).toBe(false)
  })
  it('rechaza longitud incorrecta', () => {
    expect(validarCuit('201234567')).toBe(false)
  })
  it('rechaza vacío', () => {
    expect(validarCuit('')).toBe(false)
  })
})

describe('formatCuit', () => {
  it('formatea 11 dígitos como XX-XXXXXXXX-X', () => {
    expect(formatCuit('20123456782')).toBe('20-12345678-2')
  })
  it('formatea parcial sin crash', () => {
    expect(formatCuit('201')).toBe('20-1')
  })
})
