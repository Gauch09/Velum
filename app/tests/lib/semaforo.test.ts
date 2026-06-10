import { describe, it, expect } from 'vitest'
import { calcularSemaforo } from '../../src/lib/semaforo'

const d = (offsetMs: number) => new Date(Date.now() + offsetMs)
const DAY = 86_400_000

describe('calcularSemaforo', () => {
  it('devuelve rojo cuando el deadline ya pasó', () => {
    expect(calcularSemaforo(d(-DAY), 50)).toBe('rojo')
  })

  it('devuelve ambar cuando faltan ≤7 días y progreso < 60%', () => {
    expect(calcularSemaforo(d(3 * DAY), 40)).toBe('ambar')
  })

  it('devuelve verde cuando faltan ≤7 días pero progreso ≥ 60%', () => {
    expect(calcularSemaforo(d(5 * DAY), 65)).toBe('verde')
  })

  it('devuelve verde cuando hay más de 7 días sin importar el progreso', () => {
    expect(calcularSemaforo(d(30 * DAY), 5)).toBe('verde')
  })

  it('devuelve ambar en el límite exacto: 7 días y 59%', () => {
    expect(calcularSemaforo(d(7 * DAY), 59)).toBe('ambar')
  })

  it('devuelve verde en el límite exacto: 7 días y 60%', () => {
    expect(calcularSemaforo(d(7 * DAY), 60)).toBe('verde')
  })

  it('devuelve ambar cuando el deadline venció horas atrás hoy (mismo día calendario) y progreso < 60%', () => {
    // "rojo" se activa cuando la FECHA del deadline es estrictamente anterior a hoy
    // Un deadline de hoy (aunque sea hace 2h) sigue siendo fecha de hoy → no es rojo
    const haceDoHoras = new Date()
    haceDoHoras.setHours(haceDoHoras.getHours() - 2)
    expect(calcularSemaforo(haceDoHoras, 30)).toBe('ambar')
  })
})
