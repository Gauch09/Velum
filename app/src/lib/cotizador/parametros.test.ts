import { describe, it, expect } from 'vitest'
import { retencionDefault, RETENCIONES_DEFAULT } from './parametros'

describe('retencionDefault', () => {
  it('usa el valor de la DB si existe', () => {
    const params = [{ clave: 'retencion_default_iva', valor: 8, unidad: '%', descripcion: null }]
    expect(retencionDefault('IVA', params)).toBe(8)
  })
  it('cae al default hardcodeado si no está en la DB', () => {
    expect(retencionDefault('IVA', [])).toBe(RETENCIONES_DEFAULT.IVA)
  })
})
