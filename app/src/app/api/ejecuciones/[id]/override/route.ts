import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { createClient } from '@supabase/supabase-js'
import { createId } from '@paralleldrive/cuid2'
import { validarMotivoOverride } from '@/lib/override'

const broadcastClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const supabaseAuth = createSupabaseServerClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const { motivoOverride } = body

  if (!validarMotivoOverride(motivoOverride)) {
    return NextResponse.json(
      { error: 'El motivo debe tener al menos 10 caracteres' },
      { status: 400 }
    )
  }

  const supabase = createSupabaseAdminClient() as any

  const { data: usuario } = await supabase
    .from('Usuario')
    .select('id, rol')
    .eq('email', user.email!)
    .single()

  if (!usuario || !['SUPERVISOR', 'GERENCIA'].includes(usuario.rol)) {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
  }

  const { data: ejecucion, error: ejError } = await supabase
    .from('EjecucionEtapa')
    .select('id, ordenId, estado, porcentajeActual')
    .eq('id', params.id)
    .single()

  if (ejError || !ejecucion) {
    return NextResponse.json({ error: 'Ejecución no encontrada' }, { status: 404 })
  }

  if (ejecucion.estado !== 'PENDIENTE') {
    return NextResponse.json(
      { error: 'La etapa debe estar en estado PENDIENTE para hacer override' },
      { status: 400 }
    )
  }

  const { error: updateError } = await supabase
    .from('EjecucionEtapa')
    .update({
      estado: 'ACTIVA',
      fechaInicio: new Date().toISOString(),
      fueOverride: true,
      ultimoProgresoEn: new Date().toISOString(),
    })
    .eq('id', params.id)

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  const { error: logError } = await supabase.from('RegistroProgreso').insert({
    id: createId(),
    ejecucionEtapaId: params.id,
    usuarioId: usuario.id,
    cantidadRegistrada: 0,
    porcentajeRegistrado: ejecucion.porcentajeActual,
    fueOverride: true,
    motivoOverride,
    notas: null,
  })

  if (logError) return NextResponse.json({ error: logError.message }, { status: 500 })

  try {
    await broadcastClient.channel('ordenes').send({
      type: 'broadcast',
      event: 'progreso',
      payload: { ordenId: ejecucion.ordenId, etapaActivada: params.id },
    })
  } catch {
    // best-effort — DB ya está actualizado
  }

  return NextResponse.json({ ok: true })
}
