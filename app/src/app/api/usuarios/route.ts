import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { createId } from '@paralleldrive/cuid2'

const ROLES_VALIDOS = ['OPERARIO', 'SUPERVISOR', 'GERENCIA'] as const
type Rol = typeof ROLES_VALIDOS[number]

async function getSupervisor() {
  const supabaseAuth = createSupabaseServerClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) return null
  const supabase = createSupabaseAdminClient() as any
  const { data } = await supabase.from('Usuario').select('rol').eq('email', user.email!).single()
  return data?.rol === 'SUPERVISOR' ? user : null
}

export async function GET() {
  if (!await getSupervisor()) {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
  }

  const supabase = createSupabaseAdminClient() as any
  const { data, error } = await supabase
    .from('Usuario')
    .select('id, nombre, email, rol, maquinaId, maquina:Maquina(id, nombre)')
    .order('rol', { ascending: true })
    .order('nombre', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: Request) {
  if (!await getSupervisor()) {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
  }

  const body = await req.json()
  const { nombre, email, password, rol, maquinaId } = body

  if (!nombre?.trim() || !email?.trim() || !password || !rol) {
    return NextResponse.json({ error: 'nombre, email, password y rol son requeridos' }, { status: 400 })
  }

  if (!(ROLES_VALIDOS as readonly string[]).includes(rol)) {
    return NextResponse.json({ error: 'Rol inválido' }, { status: 400 })
  }

  if (password.length < 8) {
    return NextResponse.json({ error: 'La contraseña debe tener al menos 8 caracteres' }, { status: 400 })
  }

  const adminClient = createSupabaseAdminClient()

  // Create Supabase Auth user
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email: email.trim().toLowerCase(),
    password,
    email_confirm: true,
  })

  if (authError) {
    const msg = authError.message.includes('already been registered')
      ? 'Ya existe un usuario con ese email'
      : authError.message
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  // Create Usuario record
  const supabase = adminClient as any
  const { error: dbError } = await supabase.from('Usuario').insert({
    id: createId(),
    nombre: nombre.trim(),
    email: email.trim().toLowerCase(),
    rol: rol as Rol,
    maquinaId: (rol === 'OPERARIO' && maquinaId) ? maquinaId : null,
  })

  if (dbError) {
    // Roll back the auth user to keep auth and DB in sync
    await adminClient.auth.admin.deleteUser(authData.user.id)
    const msg = dbError.code === '23505'
      ? 'Ya existe un usuario con ese email'
      : dbError.message
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  return NextResponse.json({ ok: true }, { status: 201 })
}
