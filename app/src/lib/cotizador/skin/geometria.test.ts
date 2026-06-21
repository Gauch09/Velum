import { describe, it, expect } from 'vitest'
import { contarSkin } from './geometria'
import type { SkinInput } from './tipos'

const base = {
  ancho: 30, alto: 25, modAncho: 1, modAlto: 1, sepParedMm: 0,
  margenPct: 1.5, kp: 1.6, espesorMm: 4,
  familia: { nombre: 'Al. Compuesto', densidad: 1900, precioTon: 5000, precioM2: 37 },
  alcance: 'Completo + Estructura',
} satisfies SkinInput

describe('contarSkin', () => {
  it('reproduce la geometría del Simulador (30x25)', () => {
    const g = contarSkin(base)
    expect(g.paneles).toBe(750)
    expect(g.costillas).toBe(31)
    expect(g.mlCostilla).toBe(775)
    expect(g.piezasCostilla).toBe(259)
    expect(g.mensulasTotal).toBe(806)
    expect(g.brocas).toBe(1612)
    expect(g.autoperf).toBe(3224)
    expect(g.empalmesJ).toBe(248)
    expect(g.parantes).toBe(0)
  })
  it('con separación de pared cambia autoperf (8x) y agrega parantes', () => {
    const g = contarSkin({ ...base, sepParedMm: 50 })
    expect(g.autoperf).toBe(8 * 806)
    expect(g.parantes).toBe(806)
  })
})
