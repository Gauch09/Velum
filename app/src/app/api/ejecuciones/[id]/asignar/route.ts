import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const supabaseAuth = createSupabaseServerClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const supabase = createSupabaseAdminClient() as any

  const { data: supervisor } = await supabase
    .from('Usuario')
    .select('rol')
    .eq('email', user.email!)
    .single()

  if (!supervisor || supervisor.rol === 'OPERARIO') {
    return NextResponse.json({ error: 'Solo supervisores pueden reasignar etapas' }, { status: 403 })
  }

  const body = await req.json()
  const { operarioId } = body
  if (!operarioId) return NextResponse.json({ error: 'operarioId requerido' }, { status: 400 })

  // Verify the target operario exists and has OPERARIO role
  const { data: operario } = await supabase
    .from('Usuario')
    .select('id, nombre, rol')
    .eq('id', operarioId)
    .single()

  if (!operario || operario.rol !== 'OPERARIO') {
    return NextResponse.json({ error: 'Operario no encontrado' }, { status: 404 })
  }

  const { data, error } = await supabase
    .from('EjecucionEtapa')
    .update({ operarioId })
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
