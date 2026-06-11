import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'

const ROLES_VALIDOS = ['OPERARIO', 'SUPERVISOR', 'GERENCIA']

async function getSupervisor() {
  const supabaseAuth = createSupabaseServerClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) return null
  const supabase = createSupabaseAdminClient() as any
  const { data } = await supabase.from('Usuario').select('rol').eq('email', user.email!).single()
  return data?.rol === 'SUPERVISOR' ? user : null
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  if (!await getSupervisor()) {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
  }

  const body = await req.json()
  const { nombre, rol, maquinaId } = body

  if (!nombre?.trim() || !rol) {
    return NextResponse.json({ error: 'nombre y rol son requeridos' }, { status: 400 })
  }

  if (!ROLES_VALIDOS.includes(rol)) {
    return NextResponse.json({ error: 'Rol inválido' }, { status: 400 })
  }

  const supabase = createSupabaseAdminClient() as any
  const { data, error } = await supabase
    .from('Usuario')
    .update({
      nombre: nombre.trim(),
      rol,
      maquinaId: (rol === 'OPERARIO' && maquinaId) ? maquinaId : null,
    })
    .eq('id', params.id)
    .select('id, nombre, email, rol, maquinaId')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const supervisor = await getSupervisor()
  if (!supervisor) {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
  }

  const supabase = createSupabaseAdminClient() as any

  // Guard: no active executions assigned to this user
  const { count: activas } = await supabase
    .from('EjecucionEtapa')
    .select('id', { count: 'exact', head: true })
    .eq('operarioId', params.id)
    .eq('estado', 'ACTIVA')

  if ((activas ?? 0) > 0) {
    return NextResponse.json(
      { error: 'No se puede eliminar un operario con etapas activas asignadas' },
      { status: 409 }
    )
  }

  // Get email before deleting to clean up auth
  const { data: usuario } = await supabase
    .from('Usuario')
    .select('email')
    .eq('id', params.id)
    .single()

  if (!usuario) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })

  // Prevent self-deletion
  if (usuario.email === supervisor.email) {
    return NextResponse.json({ error: 'No podés eliminar tu propia cuenta' }, { status: 400 })
  }

  // Delete from Usuario table
  const { error: dbError } = await supabase.from('Usuario').delete().eq('id', params.id)
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  // Delete from Supabase Auth (best-effort — find by email)
  const adminClient = createSupabaseAdminClient()
  try {
    const { data: { users } } = await adminClient.auth.admin.listUsers({ perPage: 1000 })
    const authUser = users.find(u => u.email === usuario.email)
    if (authUser) await adminClient.auth.admin.deleteUser(authUser.id)
  } catch {
    // DB already deleted — auth cleanup is best-effort
  }

  return NextResponse.json({ ok: true })
}
