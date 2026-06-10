import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'

async function getSupervisor(supabaseAuth: any, supabase: any) {
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) return null
  const { data: caller } = await supabase
    .from('Usuario').select('rol').eq('email', user.email!).single()
  return caller?.rol === 'SUPERVISOR' ? caller : null
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const supabaseAuth = createSupabaseServerClient()
  const supabase = createSupabaseAdminClient() as any

  if (!await getSupervisor(supabaseAuth, supabase)) {
    return NextResponse.json({ error: 'Solo supervisores pueden editar proyectos' }, { status: 403 })
  }

  const body = await req.json()
  const { nombre, cliente, fechaEntrega, estado } = body

  if (!nombre || !cliente || !fechaEntrega) {
    return NextResponse.json({ error: 'nombre, cliente y fechaEntrega son requeridos' }, { status: 400 })
  }

  const update: Record<string, unknown> = { nombre, cliente, fechaEntrega }
  if (estado) update.estado = estado

  const { data, error } = await supabase
    .from('Proyecto')
    .update(update)
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const supabaseAuth = createSupabaseServerClient()
  const supabase = createSupabaseAdminClient() as any

  if (!await getSupervisor(supabaseAuth, supabase)) {
    return NextResponse.json({ error: 'Solo supervisores pueden eliminar proyectos' }, { status: 403 })
  }

  const { count: ordenesActivas } = await supabase
    .from('OrdenProduccion')
    .select('id', { count: 'exact', head: true })
    .eq('proyectoId', params.id)
    .in('estado', ['PENDIENTE', 'EN_PRODUCCION', 'EN_ESPERA'])

  if ((ordenesActivas ?? 0) > 0) {
    return NextResponse.json(
      { error: 'No se puede eliminar un proyecto con órdenes activas' },
      { status: 409 }
    )
  }

  const { error } = await supabase.from('Proyecto').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
