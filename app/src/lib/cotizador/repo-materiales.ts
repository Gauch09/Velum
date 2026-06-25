import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { generarBOM, BOM_CONFIG_DEFAULT, type VanoBOM } from './generar-bom'

export interface LineaRow {
  id: string; area: string; cara: string | null; insumo: string; unidad: string
  cantidad: number; cantidadCalc: number | null; origen: string; nota: string | null; orden: number
}
export interface ListaMaterialesRow {
  id: string; estado: string; liberadaAt: string | null; lineas: LineaRow[]
}

export async function generarSnapshot(cotizacionId: string): Promise<{ id: string }> {
  const sb = createSupabaseAdminClient() as any

  // Vanos persistidos de la cotización
  const { data: vanos, error: eV } = await sb
    .from('CotizacionVano')
    .select('cara, sistema, geometria, compras')
    .eq('cotizacionId', cotizacionId)
  if (eV) throw new Error(`generarSnapshot/vanos: ${eV.message}`)

  const entrada: VanoBOM[] = (vanos ?? []).map((v: any) => ({
    cara: v.cara ?? null, sistema: v.sistema, geometria: v.geometria ?? null, compras: v.compras ?? null,
  }))
  const lineasBOM = generarBOM(entrada, BOM_CONFIG_DEFAULT)

  // Una sola lista por cotización: si existe, borrarla (cascade borra líneas) y regenerar
  const { error: eDel } = await sb.from('ListaMateriales').delete().eq('cotizacionId', cotizacionId)
  if (eDel) throw new Error(`generarSnapshot/delete: ${eDel.message}`)

  const listaId = crypto.randomUUID()
  const { error: eL } = await sb.from('ListaMateriales').insert([{
    id: listaId, cotizacionId, estado: 'EN_REVISION',
  }])
  if (eL) throw new Error(`generarSnapshot/lista: ${eL.message}`)

  if (lineasBOM.length > 0) {
    const rows = lineasBOM.map((l, i) => ({
      id: crypto.randomUUID(), listaId,
      area: l.area, cara: l.cara, insumo: l.insumo, unidad: l.unidad,
      cantidad: l.cantidad, cantidadCalc: l.cantidadCalc, origen: l.origen, nota: null, orden: i,
    }))
    const { error: eLn } = await sb.from('LineaMateriales').insert(rows)
    if (eLn) throw new Error(`generarSnapshot/lineas: ${eLn.message}`)
  }
  return { id: listaId }
}

export async function leerLista(cotizacionId: string): Promise<ListaMaterialesRow | null> {
  const sb = createSupabaseAdminClient() as any
  const { data, error } = await sb
    .from('ListaMateriales')
    .select('id, estado, liberadaAt, lineas:LineaMateriales(*)')
    .eq('cotizacionId', cotizacionId)
    .maybeSingle()
  if (error) throw new Error(`leerLista: ${error.message}`)
  if (!data) return null
  const lineas = (data.lineas ?? []).sort((a: LineaRow, b: LineaRow) => a.orden - b.orden)
  return { id: data.id, estado: data.estado, liberadaAt: data.liberadaAt, lineas }
}
