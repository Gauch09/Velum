import { describe, it, expect } from 'vitest'
import {
  normalizar,
  tasaParaProceso,
  diasPieza,
  estimarProyecto,
  sumarDiasHabiles,
  diasHabilesHasta,
  type TiempoProducto,
} from './estimacion'

const tiempoCostilla: TiempoProducto = {
  producto: 'Costilla 1500',
  laserUh: 106.57,
  plegadoraUh: 827.59,
  punzonadoraUh: null,
  fresadoraUh: null,
  pinturaUh: 320,
  embaladoUh: 800,
  horasDia: 8,
}

describe('normalizar', () => {
  it('saca acentos, baja a minúscula y colapsa espacios', () => {
    expect(normalizar('  Corte  Láser ')).toBe('corte laser')
  })
})

describe('tasaParaProceso', () => {
  it('mapea cada proceso a su tasa de máquina', () => {
    expect(tasaParaProceso(tiempoCostilla, 'Corte Láser')).toBe(106.57)
    expect(tasaParaProceso(tiempoCostilla, 'Plegado')).toBe(827.59)
    expect(tasaParaProceso(tiempoCostilla, 'Pintura')).toBe(320)
    expect(tasaParaProceso(tiempoCostilla, 'Embalado')).toBe(800)
  })
})

describe('diasPieza', () => {
  it('calcula cantidad pendiente / tasa / horas_dia', () => {
    const dias = diasPieza({ producto: 'Costilla 1500', proceso: 'Corte Láser', cantidad: 80, completado: 50 }, tiempoCostilla)
    expect(dias).toBeCloseTo(30 / 106.57 / 8, 5)
  })

  it('devuelve 0 si no queda nada pendiente', () => {
    const dias = diasPieza({ producto: 'Costilla 1500', proceso: 'Corte Láser', cantidad: 54, completado: 54 }, tiempoCostilla)
    expect(dias).toBe(0)
  })

  it('devuelve null si no hay tiempo cargado (producto desconocido)', () => {
    expect(diasPieza({ producto: 'X', proceso: 'Corte Láser', cantidad: 10, completado: 0 }, undefined)).toBeNull()
  })

  it('devuelve null si el proceso no tiene tasa para ese producto', () => {
    const soloLaser: TiempoProducto = { ...tiempoCostilla, plegadoraUh: null }
    expect(diasPieza({ producto: 'Costilla 1500', proceso: 'Plegado', cantidad: 10, completado: 0 }, soloLaser)).toBeNull()
  })
})

describe('estimarProyecto', () => {
  it('suma días con tasa y cuenta las líneas sin tiempo', () => {
    const tiempos = new Map<string, TiempoProducto>([[normalizar('Costilla 1500'), tiempoCostilla]])
    const piezas = [
      { producto: 'Costilla 1500', proceso: 'Corte Láser', cantidad: 80, completado: 50 }, // 30 pend, con tasa
      { producto: 'Cassette especial', proceso: 'Plegado', cantidad: 40, completado: 0 }, // sin tiempo
      { producto: 'Costilla 1500', proceso: 'Plegado', cantidad: 10, completado: 10 }, // 0 pend, se ignora
    ]
    const est = estimarProyecto(piezas, tiempos)
    expect(est.diasEstimados).toBeCloseTo(30 / 106.57 / 8, 5)
    expect(est.piezasSinTiempo).toBe(1)
    expect(est.pendienteTotal).toBe(70)
  })
})

describe('sumarDiasHabiles', () => {
  it('saltea fin de semana', () => {
    // viernes 2026-06-12 + 1 día hábil = lunes 2026-06-15
    const lunes = sumarDiasHabiles(new Date('2026-06-12T00:00:00'), 1)
    expect(lunes.getDay()).toBe(1) // lunes
  })
})

describe('diasHabilesHasta', () => {
  it('cuenta hábiles y es negativo si la fecha ya pasó', () => {
    const desde = new Date('2026-06-12T00:00:00') // viernes
    expect(diasHabilesHasta(new Date('2026-06-17T00:00:00'), desde)).toBe(3) // lun, mar, mié
    expect(diasHabilesHasta(new Date('2026-06-10T00:00:00'), desde)).toBeLessThan(0)
  })
})
