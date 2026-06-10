import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createSupabaseAdminClient() as any

  const { data, error } = await supabase
    .from('OrdenProduccion')
    .select(`
      *,
      proyecto:Proyecto (*),
      ejecuciones:EjecucionEtapa (
        *,
        maquina:Maquina (*),
        etapaRuta:EtapaRuta (*)
      )
    `)
    .eq('id', params.id)
    .single()

  if (error || !data) return NextResponse.json({ error: 'No encontrada' }, { status: 404 })
  return NextResponse.json(data)
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json()
  const supabase = createSupabaseAdminClient() as any

  const { data, error } = await supabase
    .from('OrdenProduccion')
    .update(body)
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
