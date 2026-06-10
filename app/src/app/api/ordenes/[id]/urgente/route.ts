import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'

export async function PATCH(_req: Request, { params }: { params: { id: string } }) {
  const supabaseAuth = createSupabaseServerClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const supabase = createSupabaseAdminClient() as any

  const { data: caller } = await supabase
    .from('Usuario')
    .select('rol')
    .eq('email', user.email!)
    .single()

  if (!caller || caller.rol !== 'SUPERVISOR') {
    return NextResponse.json({ error: 'Solo supervisores pueden marcar urgencia' }, { status: 403 })
  }

  const { data: orden, error: fetchError } = await supabase
    .from('OrdenProduccion')
    .select('id, prioridad')
    .eq('id', params.id)
    .single()

  if (fetchError || !orden) {
    return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 })
  }

  const nuevaPrioridad = orden.prioridad > 0 ? 0 : 1

  const { data, error } = await supabase
    .from('OrdenProduccion')
    .update({ prioridad: nuevaPrioridad })
    .eq('id', params.id)
    .select('id, prioridad')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
