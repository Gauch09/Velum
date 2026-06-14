import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'

type Params = { params: { id: string } }

export async function PATCH(req: NextRequest, { params }: Params) {
  const supabase = createSupabaseAdminClient() as any
  const body = (await req.json()) as {
    estado?: 'PENDIENTE' | 'EN_PROCESO' | 'COMPLETADO'
    cantidadCompletada?: number
    cantidadRehacer?: number
  }

  const update: Record<string, unknown> = {}
  if (body.estado) update.estado = body.estado
  if (typeof body.cantidadCompletada === 'number') update.cantidadCompletada = body.cantidadCompletada
  if (typeof body.cantidadRehacer === 'number') update.cantidadRehacer = body.cantidadRehacer
  if (body.estado === 'COMPLETADO') update.completadoEn = new Date().toISOString()

  const { data, error } = await supabase
    .from('BatchProceso').update(update).eq('id', params.id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
