import { describe, it, expect } from 'vitest'
import { calcularMontaje, DIAS_LABORABLES_MES, type ParamsMontaje } from './calcularMontaje'

const params: ParamsMontaje = {
  jornalUsdH: 39, viandaUsdDia: 10, hsUsdH: 50, rendimientoM2Op: 20, horasDia: 8,
}

describe('calcularMontaje — elevación cotizada por mes', () => {
  it('obra corta (<26 días): costo/día = costoMes/26 con recargo del 20%', () => {
    // 100 m², 3 op, rend 20 → ceil(100/60) = 2 días (obra corta)
    const r = calcularMontaje({ medioElevacionCostoMes: 800, nOperarios: 3, totalM2: 100, hsPresencial: false, margenPct: 0, params })
    expect(r.diasObra).toBe(2)
    expect(r.costoElevacion).toBeCloseTo((800 / 26) * 1.2 * 2, 6)
  })

  it('obra de un mes o más (>=26 días): sin recargo', () => {
    // 1560 m², 1 op, rend 20 → ceil(1560/20) = 78 días
    const r = calcularMontaje({ medioElevacionCostoMes: 800, nOperarios: 1, totalM2: 1560, hsPresencial: false, margenPct: 0, params })
    expect(r.diasObra).toBe(78)
    expect(r.costoElevacion).toBeCloseTo((800 / 26) * 78, 6) // = 800 × 3 meses = 2400
  })

  it('umbral exacto: 26 días NO lleva recargo', () => {
    // 520 m², 1 op, rend 20 → ceil(520/20) = 26 días = un mes
    const r = calcularMontaje({ medioElevacionCostoMes: 1300, nOperarios: 1, totalM2: 520, hsPresencial: false, margenPct: 0, params })
    expect(r.diasObra).toBe(DIAS_LABORABLES_MES)
    expect(r.costoElevacion).toBeCloseTo((1300 / 26) * 26, 6) // sin recargo = 1300
  })

  it('25 días (un día menos que el mes) SÍ lleva recargo', () => {
    // 500 m², 1 op, rend 20 → ceil(500/20) = 25 días
    const r = calcularMontaje({ medioElevacionCostoMes: 1300, nOperarios: 1, totalM2: 500, hsPresencial: false, margenPct: 0, params })
    expect(r.diasObra).toBe(25)
    expect(r.costoElevacion).toBeCloseTo((1300 / 26) * 1.2 * 25, 6)
  })
})
