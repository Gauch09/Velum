import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'

export async function PATCH(req: Request) {
  const supabaseAuth = createSupabaseServerClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const supabase = createSupabaseAdminClient() as any

  const { data: usuario } = await supabase
    .from('Usuario')
    .select('rol')
    .eq('email', user.email!)
    .single()

  if (!usuario || usuario.rol !== 'SUPERVISOR') {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
  }

  const body = await req.json()
  const { horasSinActividadAlerta } = body

  if (
    typeof horasSinActividadAlerta !== 'number' ||
    !Number.isInteger(horasSinActividadAlerta) ||
    horasSinActividadAlerta < 1 ||
    horasSinActividadAlerta > 72
  ) {
    return NextResponse.json(
      { error: 'horasSinActividadAlerta debe ser un entero entre 1 y 72' },
      { status: 400 }
    )
  }

  const { error } = await supabase
    .from('Configuracion')
    .update({
      horasSinActividadAlerta,
      actualizadoEn: new Date().toISOString(),
    })
    .eq('id', 'singleton')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, configuracion: { horasSinActividadAlerta } })
}
