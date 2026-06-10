import { describe, it, expect } from 'vitest'
import { calcularAlertas } from '../../src/lib/alertas'
import type { EjecucionParaAlerta } from '../../src/lib/alertas'

// Fixed reference time for deterministic tests
const AHORA = new Date('2026-06-10T12:00:00.000Z')
const UMBRAL = 4

function horasAntes(h: number): string {
  return new Date(AHORA.getTime() - h * 3_600_000).toISOString()
}

function diasDespues(n: number): string {
  return new Date(AHORA.getTime() + n * 86_400_000).toISOString()
}

function mkOrden(overrides: Partial<EjecucionParaAlerta['orden']> = {}): EjecucionParaAlerta['orden'] {
  return {
    id: 'ord1',
    sistema: 'Sheet',
    producto: 'MultiSlim.A',
    porcentajeGlobal: 50,
    fechaEntrega: diasDespues(10), // far delivery — no risk
    proyecto: null,
    ...overrides,
  }
}

function mkEj(overrides: Partial<EjecucionParaAlerta> = {}): EjecucionParaAlerta {
  return {
    id: 'ej1',
    estado: 'ACTIVA',
    ultimoProgresoEn: horasAntes(5), // 5h > threshold 4h → triggers sin_actividad
    fechaInicio: null,
    porcentajeActual: 50,
    orden: mkOrden(),
    etapaRuta: { nombreEtapa: 'Plegado' },
    ...overrides,
  }
}

describe('calcularAlertas', () => {
  it('devuelve vacío cuando no hay ejecuciones ACTIVA', () => {
    const result = calcularAlertas([mkEj({ estado: 'PENDIENTE' })], UMBRAL, AHORA)
    expect(result).toHaveLength(0)
  })

  it('devuelve vacío cuando ACTIVA pero dentro del umbral', () => {
    const result = calcularAlertas(
      [mkEj({ ultimoProgresoEn: horasAntes(2) })],
      UMBRAL,
      AHORA
    )
    expect(result).toHaveLength(0)
  })

  it('devuelve sin_actividad ambar cuando supera umbral y entrega es lejana', () => {
    const result = calcularAlertas([mkEj()], UMBRAL, AHORA)
    expect(result).toHaveLength(1)
    expect(result[0].tipo).toBe('sin_actividad')
    expect(result[0].severidad).toBe('ambar')
    expect(result[0].minutosInactivo).toBe(300) // 5h × 60
    expect(result[0].etapaNombre).toBe('Plegado')
  })

  it('devuelve sin_actividad rojo cuando entrega es en ≤ 3 días', () => {
    const result = calcularAlertas(
      [mkEj({ orden: mkOrden({ fechaEntrega: diasDespues(2) }) })],
      UMBRAL,
      AHORA
    )
    expect(result).toHaveLength(1)
    expect(result[0].tipo).toBe('sin_actividad')
    expect(result[0].severidad).toBe('rojo')
  })

  it('devuelve riesgo_entrega ambar cuando semáforo es ambar y actividad es reciente', () => {
    // semáforo ambar: ≤7 días y porcentajeGlobal < 60
    const result = calcularAlertas(
      [mkEj({
        ultimoProgresoEn: horasAntes(1), // recent — no sin_actividad
        orden: mkOrden({ fechaEntrega: diasDespues(5), porcentajeGlobal: 30 }),
      })],
      UMBRAL,
      AHORA
    )
    expect(result).toHaveLength(1)
    expect(result[0].tipo).toBe('riesgo_entrega')
    expect(result[0].severidad).toBe('ambar')
  })

  it('devuelve ambas con severidad rojo cuando ambas condiciones se cumplen', () => {
    const result = calcularAlertas(
      [mkEj({
        // sin_actividad: 5h > 4h threshold
        // riesgo_entrega: 5 days ≤7 and 30% < 60
        orden: mkOrden({ fechaEntrega: diasDespues(5), porcentajeGlobal: 30 }),
      })],
      UMBRAL,
      AHORA
    )
    expect(result).toHaveLength(1)
    expect(result[0].tipo).toBe('ambas')
    expect(result[0].severidad).toBe('rojo')
  })

  it('dispara alerta en el umbral exacto (minutosInactivo === umbral × 60)', () => {
    // exactly 4h = 240 min ≥ 240 → alert
    const result = calcularAlertas(
      [mkEj({ ultimoProgresoEn: horasAntes(4) })],
      UMBRAL,
      AHORA
    )
    expect(result).toHaveLength(1)
  })

  it('devuelve vacío cuando ultimoProgresoEn y fechaInicio son null', () => {
    const result = calcularAlertas(
      [mkEj({ ultimoProgresoEn: null, fechaInicio: null })],
      UMBRAL,
      AHORA
    )
    expect(result).toHaveLength(0)
  })

  it('usa fechaInicio como fallback cuando ultimoProgresoEn es null', () => {
    const result = calcularAlertas(
      [mkEj({ ultimoProgresoEn: null, fechaInicio: horasAntes(5) })],
      UMBRAL,
      AHORA
    )
    expect(result).toHaveLength(1)
    expect(result[0].tipo).toBe('sin_actividad')
  })

  it('ordena rojo antes que ambar', () => {
    const ejAmbar = mkEj({ id: 'ej1', orden: mkOrden({ fechaEntrega: diasDespues(10) }) }) // ambar
    const ejRojo = mkEj({ id: 'ej2', orden: mkOrden({ id: 'ord2', fechaEntrega: diasDespues(2) }) }) // rojo
    const result = calcularAlertas([ejAmbar, ejRojo], UMBRAL, AHORA)
    expect(result[0].severidad).toBe('rojo')
    expect(result[1].severidad).toBe('ambar')
  })
})
