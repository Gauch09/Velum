import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
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

// Only SUPERVISOR can update prioridad via this endpoint
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const supabaseAuth = createSupabaseServerClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const supabase = createSupabaseAdminClient() as any
  const { data: caller } = await supabase
    .from('Usuario').select('rol').eq('email', user.email!).single()

  if (!caller || caller.rol !== 'SUPERVISOR') {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
  }

  const body = await req.json()
  const { prioridad } = body

  if (typeof prioridad !== 'number') {
    return NextResponse.json({ error: 'Solo se puede actualizar prioridad' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('OrdenProduccion')
    .update({ prioridad })
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
