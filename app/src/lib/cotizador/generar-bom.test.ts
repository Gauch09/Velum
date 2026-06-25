import { describe, it, expect } from 'vitest'
import { generarBOM, BOM_CONFIG_DEFAULT, type VanoBOM } from './generar-bom'

const geom = (over: Partial<VanoBOM['geometria']> = {}) => ({
  paneles: 0, piezas3000: 0, mensulasTotal: 0, brocas: 0, autoperf: 0, empalmesJ: 0, parantes: 0, ...over,
})
const compras = (over: Partial<VanoBOM['compras']> = {}) => ({
  chapasACM: 0, chapasGalv16: 0, kgGalv16: 0, chapasGalv25: 0, kgGalv25: 0, ...over,
})

describe('generarBOM — Producción', () => {
  it('suma piezas por cara y arma el consolidado', () => {
    const vanos: VanoBOM[] = [
      { cara: 'Norte', sistema: 'Skin', geometria: geom({ paneles: 10, mensulasTotal: 20 }), compras: compras() },
      { cara: 'Norte', sistema: 'Skin', geometria: geom({ paneles: 4 }), compras: compras() },
      { cara: 'Sur',   sistema: 'Skin', geometria: geom({ paneles: 7, mensulasTotal: 5 }), compras: compras() },
    ]
    const bom = generarBOM(vanos, BOM_CONFIG_DEFAULT)
    const prod = bom.filter(l => l.area === 'PRODUCCION')

    const norteP = prod.find(l => l.cara === 'Norte' && l.insumo === 'Paneles')
    expect(norteP?.cantidad).toBe(14)
    const consolPaneles = prod.find(l => l.cara === null && l.insumo === 'Paneles')
    expect(consolPaneles?.cantidad).toBe(21)
    const consolPic = prod.find(l => l.cara === null && l.insumo === 'PIC150')
    expect(consolPic?.cantidad).toBe(25)
  })

  it('no emite líneas para insumos en cero', () => {
    const vanos: VanoBOM[] = [
      { cara: 'Norte', sistema: 'Skin', geometria: geom({ paneles: 3 }), compras: compras() },
    ]
    const bom = generarBOM(vanos, BOM_CONFIG_DEFAULT)
    expect(bom.find(l => l.insumo === 'Broca')).toBeUndefined()
  })
})

describe('generarBOM — Compras', () => {
  it('galvanizado: kg por cara (consumo) y chapas redondeadas al total (ceil)', () => {
    const vanos: VanoBOM[] = [
      { cara: 'Norte', sistema: 'Skin', geometria: geom(), compras: compras({ kgGalv16: 30 }) },
      { cara: 'Sur',   sistema: 'Skin', geometria: geom(), compras: compras({ kgGalv16: 30 }) },
    ]
    const bom = generarBOM(vanos, { kgPorChapaGalv16: 46, kgPorChapaGalv25: 72 })
    const norteKg = bom.find(l => l.area === 'COMPRAS' && l.cara === 'Norte' && l.unidad === 'kg' && l.insumo.includes('1.6'))
    expect(norteKg?.cantidad).toBe(30)
    // total 60 kg / 46 kg/chapa = 1.30 → ceil = 2 chapas
    const consol = bom.find(l => l.area === 'COMPRAS' && l.cara === null && l.unidad === 'chapa' && l.insumo.includes('1.6'))
    expect(consol?.cantidad).toBe(2)
  })

  it('ACM: consolidado = suma de chapas por paño (nunca queda corto)', () => {
    const vanos: VanoBOM[] = [
      { cara: 'Norte', sistema: 'Skin', geometria: geom(), compras: compras({ chapasACM: 2 }) },
      { cara: 'Sur',   sistema: 'Skin', geometria: geom(), compras: compras({ chapasACM: 3 }) },
    ]
    const bom = generarBOM(vanos, BOM_CONFIG_DEFAULT)
    const consol = bom.find(l => l.area === 'COMPRAS' && l.cara === null && l.insumo.includes('ACM'))
    expect(consol?.cantidad).toBe(5)
    expect(consol?.unidad).toBe('chapa')
  })

  it('galvanizado: redondea al total, no por paño (23+23 / chapa 46 = 1 chapa, no 2)', () => {
    const vanos: VanoBOM[] = [
      { cara: 'A', sistema: 'Skin', geometria: geom(), compras: compras({ kgGalv16: 23 }) },
      { cara: 'B', sistema: 'Skin', geometria: geom(), compras: compras({ kgGalv16: 23 }) },
    ]
    const bom = generarBOM(vanos, { kgPorChapaGalv16: 46, kgPorChapaGalv25: 72 })
    const consol = bom.find(l => l.area === 'COMPRAS' && l.cara === null && l.unidad === 'chapa' && l.insumo.includes('1.6'))
    expect(consol?.cantidad).toBe(1) // total: ceil(46/46)=1 ; por-paño daría ceil(23/46)*2=2
  })
})

describe('generarBOM — bordes', () => {
  it('ignora vanos sin geometría/compras (Rail/Clad)', () => {
    const vanos: VanoBOM[] = [
      { cara: 'Norte', sistema: 'Rail', geometria: null, compras: null },
    ]
    expect(generarBOM(vanos, BOM_CONFIG_DEFAULT)).toEqual([])
  })

  it('cantidadCalc arranca igual a cantidad y origen es CALCULADA', () => {
    const vanos: VanoBOM[] = [
      { cara: 'Norte', sistema: 'Skin', geometria: geom({ paneles: 5 }), compras: compras() },
    ]
    const linea = generarBOM(vanos, BOM_CONFIG_DEFAULT).find(l => l.insumo === 'Paneles' && l.cara === 'Norte')!
    expect(linea.cantidad).toBe(linea.cantidadCalc)
    expect(linea.origen).toBe('CALCULADA')
  })
})
