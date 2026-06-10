import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'

export async function GET() {
  const supabaseAuth = createSupabaseServerClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const supabase = createSupabaseAdminClient() as any

  const { data: caller } = await supabase
    .from('Usuario')
    .select('rol')
    .eq('email', user.email!)
    .single()

  if (!caller || caller.rol === 'OPERARIO') {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
  }

  const { data, error } = await supabase
    .from('Usuario')
    .select('id, nombre')
    .eq('rol', 'OPERARIO')
    .order('nombre', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
