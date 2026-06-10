import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createSupabaseAdminClient() as any

  const { data, error } = await supabase
    .from('Proyecto')
    .select(`
      *,
      ordenes:OrdenProduccion (
        *,
        ejecuciones:EjecucionEtapa (
          *,
          maquina:Maquina (*),
          etapaRuta:EtapaRuta (*)
        )
      )
    `)
    .eq('id', params.id)
    .single()

  if (error || !data) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  return NextResponse.json(data)
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createSupabaseAdminClient() as any

  const { data, error } = await supabase
    .from('Proyecto')
    .update(body)
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
