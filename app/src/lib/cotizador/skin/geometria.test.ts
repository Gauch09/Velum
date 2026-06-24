import { describe, it, expect } from 'vitest'
import { contarSkin } from './geometria'
import type { SkinInput } from './tipos'

const base = {
  ancho: 30, alto: 25, modAncho: 1, modAlto: 1, sepParedMm: 0,
  margenPct: 1.5, kp: 1.6, espesorMm: 4,
  familia: { nombre: 'Al. Compuesto', densidad: 1900, precioTon: 5000, precioM2: 37 },
  alcance: 'Completo + Estructura',
} satisfies SkinInput

// Con mensulaSpacingM=2: PIC cada 2m → floor(25/2)+1=13 niveles × 31 costillas = 403
// Costillas: floor(25/3)=8 tramos 3000mm × 31 = 248; resto=1m → 31 pzas de 900mm
describe('contarSkin', () => {
  it('geometría 30×25 con PIC cada 2m', () => {
    const g = contarSkin(base, 2)
    expect(g.paneles).toBe(750)
    expect(g.costillas).toBe(31)
    expect(g.mlCostilla).toBe(775)
    expect(g.piezas3000).toBe(279)
    expect(g.piezasCostilla).toBe(279)
    expect(g.nivelesMenusula).toBe(13)
    expect(g.mensulasTotal).toBe(403)
    expect(g.brocas).toBe(806)
    expect(g.autoperf).toBe(1612)
    expect(g.empalmesJ).toBe(248)
    expect(g.parantes).toBe(0)
  })
  it('con separación de pared: autoperf 8× y parantes = mensulasTotal', () => {
    const g = contarSkin({ ...base, sepParedMm: 50 }, 2)
    expect(g.autoperf).toBe(3224)
    expect(g.parantes).toBe(403)
  })
})
