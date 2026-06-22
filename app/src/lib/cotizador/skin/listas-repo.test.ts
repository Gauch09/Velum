import { describe, it, expect, vi, beforeEach } from 'vitest'

const order = vi.fn()
const select = vi.fn(() => ({ order }))
const from = vi.fn(() => ({ select }))

vi.mock('@/lib/supabase-admin', () => ({
  createSupabaseAdminClient: () => ({ from }),
}))

import { listarMaterialesSkin, listarDisenos } from './listas-repo'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('listarMaterialesSkin', () => {
  it('mapea las filas a string[]', async () => {
    order.mockResolvedValueOnce({
      data: [{ material: 'Alum 1.5mm' }, { material: 'Bond 4mm' }],
      error: null,
    })
    const r = await listarMaterialesSkin()
    expect(r).toEqual(['Alum 1.5mm', 'Bond 4mm'])
    expect(from).toHaveBeenCalledWith('MaterialVariante')
  })
  it('lanza un error legible si la query falla', async () => {
    order.mockResolvedValueOnce({ data: null, error: { message: 'boom' } })
    await expect(listarMaterialesSkin()).rejects.toThrow('listarMaterialesSkin: boom')
  })
})

describe('listarDisenos', () => {
  it('mapea las filas a string[]', async () => {
    order.mockResolvedValueOnce({
      data: [{ diseno: 'Composite' }, { diseno: 'Standard' }],
      error: null,
    })
    const r = await listarDisenos()
    expect(r).toEqual(['Composite', 'Standard'])
    expect(from).toHaveBeenCalledWith('DisenoKp')
  })
})
