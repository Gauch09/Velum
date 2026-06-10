import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { createClient } from '@supabase/supabase-js'

const broadcastClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const ESTADOS_VALIDOS = ['OPERATIVA', 'MANTENIMIENTO', 'FUERA_DE_SERVICIO']
const ROLES_AUTORIZADOS = ['SUPERVISOR', 'GERENCIA']

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const supabaseAuth = createSupabaseServerClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { estadoActual } = await req.json()

  if (!ESTADOS_VALIDOS.includes(estadoActual)) {
    return NextResponse.json({ error: 'Estado inválido' }, { status: 400 })
  }

  const supabase = createSupabaseAdminClient() as any

  const { data: usuario } = await supabase
    .from('Usuario')
    .select('rol')
    .eq('email', user.email!)
    .single()

  if (!usuario || !ROLES_AUTORIZADOS.includes(usuario.rol)) {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
  }

  const { data: maquina, error: maquinaError } = await supabase
    .from('Maquina')
    .update({ estadoActual })
    .eq('id', params.id)
    .select()
    .single()

  if (maquinaError)
    return NextResponse.json({ error: maquinaError.message }, { status: 500 })

  if (estadoActual !== 'OPERATIVA') {
    await supabase
      .from('EjecucionEtapa')
      .update({ estado: 'EN_ESPERA' })
      .eq('maquinaId', params.id)
      .eq('estado', 'ACTIVA')
  } else {
    await supabase
      .from('EjecucionEtapa')
      .update({ estado: 'ACTIVA' })
      .eq('maquinaId', params.id)
      .eq('estado', 'EN_ESPERA')
  }

  // Notify gerencia dashboard (best-effort — DB is source of truth)
  try {
    await broadcastClient.channel('gerencia').send({
      type: 'broadcast',
      event: 'maquinas',
      payload: { maquinaId: params.id, estadoActual },
    })
  } catch {
    // ignore broadcast errors
  }

  return NextResponse.json(maquina)
}
