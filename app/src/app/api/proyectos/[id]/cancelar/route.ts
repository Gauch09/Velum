import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const supabaseAuth = createSupabaseServerClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const supabase = createSupabaseAdminClient() as any

  const { data: caller } = await supabase
    .from('Usuario').select('rol').eq('email', user.email!).single()
  if (caller?.rol !== 'SUPERVISOR') {
    return NextResponse.json({ error: 'Solo supervisores pueden cancelar proyectos' }, { status: 403 })
  }

  const { data: proyecto } = await supabase
    .from('Proyecto').select('id, estado').eq('id', params.id).single()

  if (!proyecto) return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })

  if (proyecto.estado === 'CANCELADO') {
    return NextResponse.json({ error: 'El proyecto ya está cancelado' }, { status: 409 })
  }
  if (proyecto.estado === 'COMPLETADO') {
    return NextResponse.json({ error: 'No se puede cancelar un proyecto completado' }, { status: 409 })
  }

  // Get active orders
  const { data: ordenes } = await supabase
    .from('OrdenProduccion')
    .select('id')
    .eq('proyectoId', params.id)
    .in('estado', ['PENDIENTE', 'EN_PRODUCCION', 'EN_ESPERA'])

  const ordenIds: string[] = (ordenes ?? []).map((o: any) => o.id)

  if (ordenIds.length > 0) {
    // Put active etapas on hold
    await supabase
      .from('EjecucionEtapa')
      .update({ estado: 'EN_ESPERA' })
      .in('ordenId', ordenIds)
      .eq('estado', 'ACTIVA')

    // Cancel all active orders
    await supabase
      .from('OrdenProduccion')
      .update({ estado: 'CANCELADA' })
      .in('id', ordenIds)
  }

  // Cancel the project
  const { error } = await supabase
    .from('Proyecto')
    .update({ estado: 'CANCELADO' })
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, ordenesCanceladas: ordenIds.length })
}
