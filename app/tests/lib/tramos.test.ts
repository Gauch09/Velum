import { describe, it, expect } from 'vitest'
import { esHuerfano, duracionMinutos, HORAS_LIMITE_HUERFANO } from '../../src/lib/tramos'

const AHORA = new Date('2026-06-12T18:00:00.000Z')

function horasAntes(h: number): string {
  return new Date(AHORA.getTime() - h * 3_600_000).toISOString()
}

describe('esHuerfano', () => {
  it('false para tramo abierto hace menos de 12 h', () => {
    expect(esHuerfano(horasAntes(11.9), AHORA)).toBe(false)
  })

  it('true para tramo abierto hace más de 12 h', () => {
    expect(esHuerfano(horasAntes(12.1), AHORA)).toBe(true)
  })

  it('usa el límite configurado', () => {
    expect(HORAS_LIMITE_HUERFANO).toBe(12)
    expect(esHuerfano(horasAntes(3), AHORA, 2)).toBe(true)
  })
})

describe('duracionMinutos', () => {
  it('calcula minutos entre inicio y fin', () => {
    expect(duracionMinutos(horasAntes(1), AHORA.toISOString())).toBeCloseTo(60)
  })

  it('redondea a un decimal', () => {
    const inicio = new Date(AHORA.getTime() - 90_500).toISOString() // 90.5 s
    expect(duracionMinutos(inicio, AHORA.toISOString())).toBeCloseTo(1.5, 1)
  })
})
