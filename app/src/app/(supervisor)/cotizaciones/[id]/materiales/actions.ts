'use server'

import { z } from 'zod'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'

async function assertEnRevision(sb: any, listaId: string): Promise<string | null> {
  const { data } = await sb.from('ListaMateriales').select('estado').eq('id', listaId).single()
  if (!data) return 'Lista no encontrada'
  if (data.estado !== 'EN_REVISION') return 'La lista ya fue liberada'
  return null
}

async function listaIdDeLinea(sb: any, lineaId: string): Promise<string | null> {
  const { data } = await sb.from('LineaMateriales').select('listaId').eq('id', lineaId).single()
  return data?.listaId ?? null
}

export async function actionEditarCantidad(raw: unknown) {
  const { lineaId, cantidad } = z.object({ lineaId: z.string().min(1), cantidad: z.number().min(0) }).parse(raw)
  const sb = createSupabaseAdminClient() as any
  const listaId = await listaIdDeLinea(sb, lineaId)
  if (!listaId) return { error: 'Línea no encontrada' }
  const bloqueo = await assertEnRevision(sb, listaId)
  if (bloqueo) return { error: bloqueo }
  const { error } = await sb.from('LineaMateriales').update({ cantidad }).eq('id', lineaId)
  if (error) return { error: error.message }
  return { ok: true as const }
}

export async function actionAgregarLinea(raw: unknown) {
  const input = z.object({
    listaId: z.string().min(1),
    area:    z.enum(['COMPRAS', 'PRODUCCION']),
    insumo:  z.string().min(1),
    unidad:  z.enum(['un', 'kg', 'm2', 'chapa']),
    cantidad: z.number().min(0),
    nota:    z.string().optional(),
  }).parse(raw)
  const sb = createSupabaseAdminClient() as any
  const bloqueo = await assertEnRevision(sb, input.listaId)
  if (bloqueo) return { error: bloqueo }
  const { data: maxRow } = await sb.from('LineaMateriales')
    .select('orden').eq('listaId', input.listaId).order('orden', { ascending: false }).limit(1).maybeSingle()
  const orden = (maxRow?.orden ?? 0) + 1
  const { error } = await sb.from('LineaMateriales').insert([{
    id: crypto.randomUUID(), listaId: input.listaId, area: input.area, cara: null,
    insumo: input.insumo, unidad: input.unidad, cantidad: input.cantidad,
    cantidadCalc: null, origen: 'MANUAL', nota: input.nota ?? null, orden,
  }])
  if (error) return { error: error.message }
  return { ok: true as const }
}

export async function actionBorrarLinea(raw: unknown) {
  const { lineaId } = z.object({ lineaId: z.string().min(1) }).parse(raw)
  const sb = createSupabaseAdminClient() as any
  const listaId = await listaIdDeLinea(sb, lineaId)
  if (!listaId) return { error: 'Línea no encontrada' }
  const bloqueo = await assertEnRevision(sb, listaId)
  if (bloqueo) return { error: bloqueo }
  const { error } = await sb.from('LineaMateriales').delete().eq('id', lineaId)
  if (error) return { error: error.message }
  return { ok: true as const }
}

export async function actionLiberar(raw: unknown) {
  const { listaId } = z.object({ listaId: z.string().min(1) }).parse(raw)
  const sb = createSupabaseAdminClient() as any
  const bloqueo = await assertEnRevision(sb, listaId)
  if (bloqueo) return { error: bloqueo }
  const { error } = await sb.from('ListaMateriales')
    .update({ estado: 'LIBERADA', liberadaAt: new Date().toISOString() }).eq('id', listaId)
  if (error) return { error: error.message }
  return { ok: true as const }
}
