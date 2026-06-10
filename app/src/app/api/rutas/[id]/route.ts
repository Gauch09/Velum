import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { createId } from '@paralleldrive/cuid2'

async function getSupervisor(supabaseAuth: any, supabase: any) {
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) return null
  const { data: caller } = await supabase
    .from('Usuario').select('rol').eq('email', user.email!).single()
  return caller?.rol === 'SUPERVISOR' ? caller : null
}

async function tieneEjecucionesActivas(rutaId: string, supabase: any): Promise<boolean> {
  const { data: etapas } = await supabase
    .from('EtapaRuta').select('id').eq('rutaId', rutaId)
  const ids = (etapas ?? []).map((e: any) => e.id)
  if (ids.length === 0) return false

  const { count } = await supabase
    .from('EjecucionEtapa')
    .select('id', { count: 'exact', head: true })
    .in('etapaRutaId', ids)
    .in('estado', ['ACTIVA', 'PENDIENTE'])

  return (count ?? 0) > 0
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const supabaseAuth = createSupabaseServerClient()
  const supabase = createSupabaseAdminClient() as any

  if (!await getSupervisor(supabaseAuth, supabase)) {
    return NextResponse.json({ error: 'Solo supervisores pueden editar rutas' }, { status: 403 })
  }

  if (await tieneEjecucionesActivas(params.id, supabase)) {
    return NextResponse.json({ error: 'No se puede editar una ruta con etapas en producción activa' }, { status: 409 })
  }

  const body = await req.json()
  const { sistema, producto, descripcion, etapas } = body

  if (!sistema || !producto || !Array.isArray(etapas) || etapas.length === 0) {
    return NextResponse.json({ error: 'sistema, producto y al menos una etapa son requeridos' }, { status: 400 })
  }

  const { error: rutaError } = await supabase
    .from('Ruta')
    .update({ sistema, producto, descripcion: descripcion || null })
    .eq('id', params.id)

  if (rutaError) {
    const msg = rutaError.code === '23505'
      ? `Ya existe una ruta ${sistema} / ${producto}`
      : rutaError.message
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  await supabase.from('EtapaRuta').delete().eq('rutaId', params.id)

  const etapasRows = etapas.map((e: any, i: number) => ({
    id: createId(),
    rutaId: params.id,
    nombreEtapa: e.nombreEtapa,
    maquinaId: e.maquinaId,
    ordenSecuencia: i + 1,
    umbralActivacion: Number(e.umbralActivacion) || 100,
  }))

  const { error: etapasError } = await supabase.from('EtapaRuta').insert(etapasRows)
  if (etapasError) return NextResponse.json({ error: etapasError.message }, { status: 500 })

  return NextResponse.json({ id: params.id })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabaseAuth = createSupabaseServerClient()
  const supabase = createSupabaseAdminClient() as any

  if (!await getSupervisor(supabaseAuth, supabase)) {
    return NextResponse.json({ error: 'Solo supervisores pueden eliminar rutas' }, { status: 403 })
  }

  const { count: ordenesActivas } = await supabase
    .from('OrdenProduccion')
    .select('id', { count: 'exact', head: true })
    .eq('rutaId', params.id)
    .in('estado', ['EN_PRODUCCION', 'EN_ESPERA'])

  if ((ordenesActivas ?? 0) > 0) {
    return NextResponse.json({ error: 'No se puede eliminar una ruta con órdenes activas' }, { status: 409 })
  }

  await supabase.from('EtapaRuta').delete().eq('rutaId', params.id)
  const { error } = await supabase.from('Ruta').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
