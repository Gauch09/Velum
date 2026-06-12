import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'

type Params = { params: { id: string } }

export async function GET(_req: NextRequest, { params }: Params) {
  const supabase = createSupabaseAdminClient() as any
  const { data, error } = await supabase
    .from('OrdenPrimaria')
    .select('*, proyecto:Proyecto(id, nombre, cliente), items:ItemProduccion(*, batches:BatchProceso(*)), lotes:LoteChapa(*)')
    .eq('id', params.id)
    .single()
  if (error || !data) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const supabase = createSupabaseAdminClient() as any
  const body = await req.json()
  const allowed = ['tipo', 'equipo', 'colorHoja', 'responsable', 'fecha', 'proyectoId', 'estado']
  const update: Record<string, unknown> = {}
  for (const k of allowed) if (k in body) update[k] = body[k]

  const { data, error } = await supabase
    .from('OrdenPrimaria').update(update).eq('id', params.id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const supabase = createSupabaseAdminClient() as any
  const { data: op } = await supabase
    .from('OrdenPrimaria').select('estado').eq('id', params.id).single()
  if (op?.estado !== 'BORRADOR')
    return NextResponse.json({ error: 'Solo se pueden eliminar borradores' }, { status: 400 })

  const { error } = await supabase.from('OrdenPrimaria').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
