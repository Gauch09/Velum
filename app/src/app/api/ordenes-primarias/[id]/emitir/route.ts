import { NextRequest, NextResponse } from 'next/server'
import { createId } from '@paralleldrive/cuid2'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { generarBatches } from '@/lib/generarBatches'

type Params = { params: { id: string } }

export async function POST(_req: NextRequest, { params }: Params) {
  const supabase = createSupabaseAdminClient() as any

  const { data: op } = await supabase
    .from('OrdenPrimaria')
    .select('*, items:ItemProduccion(*)')
    .eq('id', params.id)
    .single()

  if (!op) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  if (op.estado !== 'BORRADOR')
    return NextResponse.json({ error: 'Solo se pueden emitir borradores' }, { status: 400 })
  if (!op.items || op.items.length === 0)
    return NextResponse.json({ error: 'La orden no tiene piezas' }, { status: 400 })

  const { data: numero, error: seqError } = await supabase.rpc('nextval_orden_primaria')
  if (seqError) return NextResponse.json({ error: seqError.message }, { status: 500 })

  const batchesToInsert: any[] = []
  for (const item of op.items) {
    for (const proceso of ['LAVADO', 'HORNO'] as const) {
      const capacidad = proceso === 'LAVADO' ? item.bachLavado : item.bachHorno
      if (!capacidad || capacidad <= 0) continue
      const batches = generarBatches(item.cantidadTotal, capacidad)
      for (const b of batches) {
        batchesToInsert.push({
          id: createId(),
          itemProduccionId: item.id,
          proceso,
          numero: b.numero,
          cantidadPiezas: b.cantidadPiezas,
        })
      }
    }
  }

  if (batchesToInsert.length > 0) {
    const { error: bErr } = await supabase.from('BatchProceso').insert(batchesToInsert)
    if (bErr) return NextResponse.json({ error: bErr.message }, { status: 500 })
  }

  const { data: updated, error } = await supabase
    .from('OrdenPrimaria')
    .update({ estado: 'EMITIDA', numero })
    .eq('id', params.id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(updated)
}
