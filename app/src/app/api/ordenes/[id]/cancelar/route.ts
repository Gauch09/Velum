import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { createClient } from '@supabase/supabase-js'

const broadcastClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const supabaseAuth = createSupabaseServerClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const supabase = createSupabaseAdminClient() as any

  const { data: usuario } = await supabase
    .from('Usuario').select('rol').eq('email', user.email!).single()

  if (!usuario || usuario.rol !== 'SUPERVISOR') {
    return NextResponse.json({ error: 'Solo supervisores pueden cancelar órdenes' }, { status: 403 })
  }

  const { data: orden } = await supabase
    .from('OrdenProduccion').select('id, estado').eq('id', params.id).single()

  if (!orden) return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 })

  if (orden.estado === 'COMPLETADA' || orden.estado === 'CANCELADA') {
    return NextResponse.json(
      { error: `La orden ya está ${orden.estado.toLowerCase()}` },
      { status: 409 }
    )
  }

  // Pause active stages
  await supabase
    .from('EjecucionEtapa')
    .update({ estado: 'EN_ESPERA' })
    .eq('ordenId', params.id)
    .eq('estado', 'ACTIVA')

  const { error } = await supabase
    .from('OrdenProduccion')
    .update({ estado: 'CANCELADA' })
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  try {
    await broadcastClient.channel('ordenes').send({
      type: 'broadcast',
      event: 'progreso',
      payload: { ordenId: params.id, cancelada: true },
    })
  } catch { /* best-effort */ }

  return NextResponse.json({ ok: true })
}
