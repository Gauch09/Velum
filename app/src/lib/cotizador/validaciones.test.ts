import { describe, it, expect } from 'vitest'
import { validarCuit, normalizarEmail } from './validaciones'

describe('validarCuit', () => {
  it('acepta un CUIT válido', () => {
    expect(validarCuit('30-71044766-3')).toBe(true)
  })
  it('rechaza un CUIT con dígito verificador incorrecto', () => {
    expect(validarCuit('30-71044766-4')).toBe(false)
  })
  it('rechaza longitud inválida', () => {
    expect(validarCuit('123')).toBe(false)
  })
})

describe('normalizarEmail', () => {
  it('normaliza y valida', () => {
    expect(normalizarEmail('  Foo@Bar.COM ')).toBe('foo@bar.com')
  })
  it('devuelve null si es inválido', () => {
    expect(normalizarEmail('no-es-mail')).toBeNull()
  })
})
