import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'

type Params = { params: { id: string } }

export async function PATCH(req: NextRequest, { params }: Params) {
  const supabase = createSupabaseAdminClient() as any
  const body = (await req.json()) as { cantidadCompletada?: number; cantidadRehacer?: number }

  const update: Record<string, unknown> = {}
  if (typeof body.cantidadCompletada === 'number') update.cantidadCompletada = body.cantidadCompletada
  if (typeof body.cantidadRehacer === 'number') update.cantidadRehacer = body.cantidadRehacer
  if (Object.keys(update).length === 0)
    return NextResponse.json({ error: 'Sin campos a actualizar' }, { status: 400 })

  const { data, error } = await supabase
    .from('ItemProduccion').update(update).eq('id', params.id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
