import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { registrarProgreso } from '@/lib/registrar-progreso'
import { createClient } from '@supabase/supabase-js'

const broadcastClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json()
  const { ejecucionEtapaId, cantidadRegistrada, notas, fueOverride, motivoOverride } = body

  if (!ejecucionEtapaId || cantidadRegistrada == null) {
    return NextResponse.json(
      { error: 'ejecucionEtapaId y cantidadRegistrada son requeridos' },
      { status: 400 }
    )
  }

  const supabaseAuth = createSupabaseServerClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const supabase = createSupabaseAdminClient() as any

  const { data: usuario } = await supabase
    .from('Usuario')
    .select('id')
    .eq('email', user.email!)
    .single()

  if (!usuario) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })

  const result = await registrarProgreso(supabase, broadcastClient, {
    ordenId: params.id,
    ejecucionEtapaId,
    usuarioId: usuario.id,
    cantidadRegistrada,
    notas,
    fueOverride,
    motivoOverride,
  })

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })

  return NextResponse.json({
    porcentajeGlobal: result.porcentajeGlobal,
    etapasActivadas: result.etapasActivadas,
    completada: result.ordenCompleta,
  })
}
