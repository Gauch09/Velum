import { describe, it, expect, beforeEach, vi } from 'vitest'

// Filas que devolvera el mock de Supabase en cada test.
let paramRows: Array<{ clave: string; valor: number }>
let capRows: Array<{ pieza: string; centro: string; unidadesPorDia: number }>

vi.mock('@/lib/supabase-admin', () => ({
  createSupabaseAdminClient: () => ({
    from: (table: string) => ({
      select: () =>
        table === 'ParametroCosteo'
          ? Promise.resolve({ data: paramRows, error: null })
          : { in: () => Promise.resolve({ data: capRows, error: null }) },
    }),
  }),
}))

import { cargarSkinParams } from './params-repo'

// Todos los escalares que cargarSkinParams exige presentes.
const BASE_PARAMS: Record<string, number> = {
  tasa_planta: 17046.553144129102,
  tipo_cambio: 1460.0,
  galv_densidad: 7850,
  galv_precio_ton: 1400,
  skin_costilla_area: 0.522,
  skin_costilla_espesor: 1.6,
  skin_mensula_area: 0.02584,
  skin_mensula_espesor: 2.5,
  skin_empalme_area: 0.0387,
  skin_empalme_espesor: 1.6,
  acm_acc_panel: 4,
  acm_acc_costo: 1.5,
  acm_area_placa: 7.5,
  acm_fab_placa: 8.367600287643281,
  pintura_polvo: 14,
  pintura_cobertura: 9,
  pintura_sobreaplic: 1.3,
  pintura_horneada_costo: 27.5,
  pintura_horneada_piezas: 100,
  fijacion_broca: 0.62,
  fijacion_autoperf: 0.0285,
}

const toRows = (o: Record<string, number>) =>
  Object.entries(o).map(([clave, valor]) => ({ clave, valor }))

beforeEach(() => {
  paramRows = toRows(BASE_PARAMS)
  capRows = []
})

describe('cargarSkinParams · fabPlaca ACM', () => {
  it('calcula fabPlaca desde las capacidades de la pieza "Placa ACM" (8h·Σ1/cap·tasa/TC)', async () => {
    capRows = [
      { pieza: 'Placa ACM', centro: 'FRESADORA', unidadesPorDia: 14 },
      { pieza: 'Placa ACM', centro: 'PUNZONADORA', unidadesPorDia: 30 },
      { pieza: 'Placa ACM', centro: 'PLEGADO Y ARMADO', unidadesPorDia: 14 },
    ]
    const params = await cargarSkinParams()
    // 8/14 + 8/30 + 8/14 = 1.40952 h/placa × 17046.553/1460 ≈ 16.4572 u$d
    expect(params.fabPlaca).toBeCloseTo(16.4572, 3)
  })

  it('cae al escalar acm_fab_placa cuando no hay capacidades de "Placa ACM"', async () => {
    capRows = [{ pieza: 'Skin Standard', centro: 'LASER', unidadesPorDia: 16 }]
    const params = await cargarSkinParams()
    expect(params.fabPlaca).toBeCloseTo(8.3676, 4)
  })
})
