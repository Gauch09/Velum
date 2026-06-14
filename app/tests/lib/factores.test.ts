import { describe, it, expect } from 'vitest'
import {
  resumenPorMaquina,
  velocidadRealPorProductoMaquina,
  setupPromedioPorProducto,
} from '../../src/lib/factores'
import type { TramoParaFactor, CapacidadRow } from '../../src/lib/factores'

const DIA = '2026-06-12'

function mkTramo(overrides: Partial<TramoParaFactor> = {}): TramoParaFactor {
  return {
    tipo: 'PRODUCCION',
    inicio: `${DIA}T08:00:00.000Z`,
    fin: `${DIA}T12:00:00.000Z`, // 4 h
    cantidadProducida: 200,
    dudoso: false,
    maquinaId: 'maq1',
    maquinaNombre: 'Plegadora Uno Huaxia',
    tipoMaquina: 'PLEGADORA',
    producto: 'PIC/PEC - 150',
    operarioId: 'op1',
    ...overrides,
  }
}

describe('resumenPorMaquina', () => {
  it('suma horas fichadas y separa preparación de producción', () => {
    const tramos = [
      mkTramo(), // 4 h producción
      mkTramo({ tipo: 'PREPARACION', inicio: `${DIA}T07:00:00.000Z`, fin: `${DIA}T08:00:00.000Z` }), // 1 h setup
    ]
    const [r] = resumenPorMaquina(tramos, 8)
    expect(r.maquinaNombre).toBe('Plegadora Uno Huaxia')
    expect(r.horasProduccion).toBeCloseTo(4)
    expect(r.horasPreparacion).toBeCloseTo(1)
    expect(r.horasFichadas).toBeCloseTo(5)
    // 1 día con actividad × 8 h = 8 h disponibles → 5/8
    expect(r.disponibilidadPct).toBeCloseTo(62.5)
    expect(r.n).toBe(2)
  })

  it('excluye dudosos y tramos sin cerrar', () => {
    const tramos = [
      mkTramo(),
      mkTramo({ dudoso: true }),
      mkTramo({ fin: null }),
    ]
    const [r] = resumenPorMaquina(tramos, 8)
    expect(r.horasFichadas).toBeCloseTo(4)
    expect(r.n).toBe(1)
  })

  it('cuenta días con actividad por máquina, no días de calendario', () => {
    const tramos = [
      mkTramo(),
      mkTramo({ inicio: '2026-06-13T08:00:00.000Z', fin: '2026-06-13T12:00:00.000Z' }),
    ]
    const [r] = resumenPorMaquina(tramos, 8)
    // 8 h fichadas / (2 días × 8 h) = 50%
    expect(r.disponibilidadPct).toBeCloseTo(50)
  })
})

describe('velocidadRealPorProductoMaquina', () => {
  const capacidades: CapacidadRow[] = [
    { producto: 'PIC/PEC - 150', tipoMaquina: 'PLEGADORA', piezasPorHora: 84.5 },
  ]

  it('calcula piezas/hora real y el factor contra teórico', () => {
    const [v] = velocidadRealPorProductoMaquina([mkTramo()], capacidades)
    expect(v.producto).toBe('PIC/PEC - 150')
    expect(v.maquinaNombre).toBe('Plegadora Uno Huaxia')
    expect(v.piezasHoraReal).toBeCloseTo(50) // 200 piezas / 4 h
    expect(v.piezasHoraTeorica).toBeCloseTo(84.5)
    expect(v.factorVelocidad).toBeCloseTo(50 / 84.5, 3)
    expect(v.n).toBe(1)
  })

  it('teórico null cuando no hay capacidad cargada para ese producto×tipo', () => {
    const [v] = velocidadRealPorProductoMaquina([mkTramo({ producto: 'Inventado' })], capacidades)
    expect(v.piezasHoraTeorica).toBeNull()
    expect(v.factorVelocidad).toBeNull()
  })

  it('solo usa PRODUCCION cerrados con cantidad > 0 y no dudosos', () => {
    const tramos = [
      mkTramo({ tipo: 'PREPARACION' }),
      mkTramo({ cantidadProducida: null }),
      mkTramo({ cantidadProducida: 0 }),
      mkTramo({ dudoso: true }),
      mkTramo({ fin: null }),
    ]
    expect(velocidadRealPorProductoMaquina(tramos, capacidades)).toHaveLength(0)
  })

  it('agrega varios tramos del mismo producto×máquina', () => {
    const tramos = [
      mkTramo(), // 200 en 4 h
      mkTramo({ inicio: `${DIA}T13:00:00.000Z`, fin: `${DIA}T15:00:00.000Z`, cantidadProducida: 100 }), // 100 en 2 h
    ]
    const [v] = velocidadRealPorProductoMaquina(tramos, capacidades)
    expect(v.piezasHoraReal).toBeCloseTo(300 / 6)
    expect(v.n).toBe(2)
  })
})

describe('setupPromedioPorProducto', () => {
  it('promedia los tramos PREPARACION cerrados no dudosos', () => {
    const tramos = [
      mkTramo({ tipo: 'PREPARACION', inicio: `${DIA}T07:00:00.000Z`, fin: `${DIA}T07:30:00.000Z` }), // 30 min
      mkTramo({ tipo: 'PREPARACION', inicio: `${DIA}T13:00:00.000Z`, fin: `${DIA}T13:50:00.000Z` }), // 50 min
      mkTramo({ tipo: 'PREPARACION', dudoso: true }),
      mkTramo(), // producción — fuera
    ]
    const [s] = setupPromedioPorProducto(tramos)
    expect(s.producto).toBe('PIC/PEC - 150')
    expect(s.minutosPromedio).toBeCloseTo(40)
    expect(s.n).toBe(2)
  })
})
