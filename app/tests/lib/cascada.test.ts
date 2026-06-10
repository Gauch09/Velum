import { describe, it, expect } from 'vitest'
import { evaluarCascada } from '../../src/lib/cascada'

const etapasBase = [
  { id: 'ej1', ordenSecuencia: 1, umbralActivacion: 0,   porcentajeActual: 0, estado: 'ACTIVA'    as const, etapaRutaId: 'er1', maquinaId: 'm1' },
  { id: 'ej2', ordenSecuencia: 2, umbralActivacion: 50,  porcentajeActual: 0, estado: 'PENDIENTE' as const, etapaRutaId: 'er2', maquinaId: 'm2' },
  { id: 'ej3', ordenSecuencia: 3, umbralActivacion: 40,  porcentajeActual: 0, estado: 'PENDIENTE' as const, etapaRutaId: 'er3', maquinaId: 'm3' },
  { id: 'ej4', ordenSecuencia: 4, umbralActivacion: 100, porcentajeActual: 0, estado: 'PENDIENTE' as const, etapaRutaId: 'er4', maquinaId: 'm4' },
]

describe('evaluarCascada', () => {
  it('no activa la siguiente etapa si no se alcanza el umbral', () => {
    const result = evaluarCascada(etapasBase, 'ej1', 40)
    expect(result.etapasAActivar).toEqual([])
  })

  it('activa la siguiente etapa exactamente al alcanzar el umbral', () => {
    const result = evaluarCascada(etapasBase, 'ej1', 50)
    expect(result.etapasAActivar).toContain('er2')
    expect(result.etapasAActivar).not.toContain('er3')
  })

  it('no activa una etapa que ya está ACTIVA', () => {
    const etapas = etapasBase.map((e, i) =>
      i === 1 ? { ...e, estado: 'ACTIVA' as const, porcentajeActual: 20 } : e
    )
    const result = evaluarCascada(etapas, 'ej1', 80)
    expect(result.etapasAActivar).not.toContain('er2')
  })

  it('activa en cascada si la etapa recién actualizada ya supera el siguiente umbral', () => {
    const etapas = [
      { ...etapasBase[0], porcentajeActual: 80, estado: 'ACTIVA' as const },
      { ...etapasBase[1], porcentajeActual: 40, estado: 'ACTIVA' as const },
      { ...etapasBase[2] },
      { ...etapasBase[3] },
    ]
    const result = evaluarCascada(etapas, 'ej2', 40)
    expect(result.etapasAActivar).toContain('er3')
  })

  it('calcula porcentajeGlobal como promedio de todas las etapas', () => {
    const result = evaluarCascada(etapasBase, 'ej1', 60)
    expect(result.porcentajeGlobal).toBeCloseTo(15)
  })

  it('no activa etapas COMPLETADAS', () => {
    const etapas = etapasBase.map((e, i) =>
      i === 1 ? { ...e, estado: 'COMPLETADA' as const, porcentajeActual: 100 } : e
    )
    const result = evaluarCascada(etapas, 'ej1', 80)
    expect(result.etapasAActivar).not.toContain('er2')
  })

  it('retorna porcentajeGlobal 100 cuando todas las etapas llegan al 100%', () => {
    const etapas = [
      { id: 'ej1', ordenSecuencia: 1, umbralActivacion: 0,   porcentajeActual: 100, estado: 'COMPLETADA' as const, etapaRutaId: 'er1', maquinaId: 'm1' },
      { id: 'ej2', ordenSecuencia: 2, umbralActivacion: 50,  porcentajeActual: 100, estado: 'COMPLETADA' as const, etapaRutaId: 'er2', maquinaId: 'm2' },
      { id: 'ej3', ordenSecuencia: 3, umbralActivacion: 40,  porcentajeActual: 100, estado: 'COMPLETADA' as const, etapaRutaId: 'er3', maquinaId: 'm3' },
      { id: 'ej4', ordenSecuencia: 4, umbralActivacion: 100, porcentajeActual: 90,  estado: 'ACTIVA'     as const, etapaRutaId: 'er4', maquinaId: 'm4' },
    ]
    const result = evaluarCascada(etapas, 'ej4', 100)
    expect(result.porcentajeGlobal).toBe(100)
    expect(result.etapasAActivar).toHaveLength(0)
  })
})
