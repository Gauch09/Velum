import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { createId } from '@paralleldrive/cuid2'

export async function GET(req: NextRequest) {
  const supabase = createSupabaseAdminClient() as any
  const full = req.nextUrl.searchParams.get('full') === 'true'

  if (full) {
    const { data, error } = await supabase
      .from('Ruta')
      .select(`
        id, sistema, producto, descripcion,
        etapas:EtapaRuta(id, nombreEtapa, ordenSecuencia, umbralActivacion, maquinaId, maquina:Maquina(nombre)),
        ordenes:OrdenProduccion(estado)
      `)
      .order('sistema')
      .order('producto')

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const rutas = (data ?? []).map((r: any) => ({
      id: r.id,
      sistema: r.sistema,
      producto: r.producto,
      descripcion: r.descripcion ?? null,
      tieneOrdenesActivas: (r.ordenes ?? []).some((o: any) =>
        ['EN_PRODUCCION', 'EN_ESPERA'].includes(o.estado)
      ),
      etapas: [...(r.etapas ?? [])]
        .sort((a: any, b: any) => a.ordenSecuencia - b.ordenSecuencia)
        .map((e: any) => ({
          id: e.id,
          nombreEtapa: e.nombreEtapa,
          ordenSecuencia: e.ordenSecuencia,
          umbralActivacion: e.umbralActivacion,
          maquinaId: e.maquinaId,
          maquinaNombre: e.maquina?.nombre ?? '',
        })),
    }))

    return NextResponse.json(rutas)
  }

  // default: simplified format used by NuevaOrdenModal
  const { data, error } = await supabase
    .from('Ruta')
    .select('sistema, producto, etapas:EtapaRuta(ordenSecuencia, maquina:Maquina(tipo))')
    .order('sistema')
    .order('producto')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rutas = (data ?? []).map((r: any) => {
    const sorted = [...r.etapas].sort((a: any, b: any) => a.ordenSecuencia - b.ordenSecuencia)
    return {
      sistema: r.sistema,
      producto: r.producto,
      primeraEtapaTipo: sorted[0]?.maquina?.tipo ?? null,
    }
  })

  return NextResponse.json(rutas)
}

export async function POST(req: NextRequest) {
  const supabaseAuth = createSupabaseServerClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const supabase = createSupabaseAdminClient() as any
  const { data: caller } = await supabase
    .from('Usuario').select('rol').eq('email', user.email!).single()
  if (!caller || caller.rol !== 'SUPERVISOR') {
    return NextResponse.json({ error: 'Solo supervisores pueden gestionar rutas' }, { status: 403 })
  }

  const body = await req.json()
  const { sistema, producto, descripcion, etapas } = body

  if (!sistema || !producto || !Array.isArray(etapas) || etapas.length === 0) {
    return NextResponse.json({ error: 'sistema, producto y al menos una etapa son requeridos' }, { status: 400 })
  }

  const rutaId = createId()
  const { error: rutaError } = await supabase
    .from('Ruta')
    .insert({ id: rutaId, sistema, producto, descripcion: descripcion || null })

  if (rutaError) {
    const msg = rutaError.code === '23505'
      ? `Ya existe una ruta ${sistema} / ${producto}`
      : rutaError.message
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  const etapasRows = etapas.map((e: any, i: number) => ({
    id: createId(),
    rutaId,
    nombreEtapa: e.nombreEtapa,
    maquinaId: e.maquinaId,
    ordenSecuencia: i + 1,
    umbralActivacion: Number(e.umbralActivacion) || 100,
  }))

  const { error: etapasError } = await supabase.from('EtapaRuta').insert(etapasRows)
  if (etapasError) {
    await supabase.from('Ruta').delete().eq('id', rutaId)
    return NextResponse.json({ error: etapasError.message }, { status: 500 })
  }

  return NextResponse.json({ id: rutaId }, { status: 201 })
}
