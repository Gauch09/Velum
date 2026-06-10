import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { createId } from '@paralleldrive/cuid2'

export async function GET() {
  const supabase = createSupabaseAdminClient() as any

  const { data, error } = await supabase
    .from('OrdenProduccion')
    .select(`
      *,
      proyecto:Proyecto ( nombre, cliente ),
      ejecuciones:EjecucionEtapa (
        *,
        maquina:Maquina ( id, nombre, tipo ),
        etapaRuta:EtapaRuta ( nombreEtapa, ordenSecuencia, umbralActivacion )
      )
    `)
    .neq('estado', 'CANCELADA')
    .order('prioridad', { ascending: false })
    .order('createdAt', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const body = await req.json()
  const { sistema, producto, cantidad, unidad, proyectoId } = body

  if (!sistema || !producto || !cantidad || !unidad) {
    return NextResponse.json(
      { error: 'sistema, producto, cantidad y unidad son requeridos' },
      { status: 400 }
    )
  }

  const supabase = createSupabaseAdminClient() as any

  // Find the route for this system/product
  const { data: ruta, error: rutaError } = await supabase
    .from('Ruta')
    .select('id, sistema, producto, etapas:EtapaRuta ( id, maquinaId, ordenSecuencia, nombreEtapa, umbralActivacion )')
    .eq('sistema', sistema)
    .eq('producto', producto)
    .single()

  if (rutaError || !ruta) {
    return NextResponse.json(
      { error: `Ruta no encontrada para ${sistema}/${producto}` },
      { status: 404 }
    )
  }

  // Sort stages by sequence
  const etapasOrdenadas = [...ruta.etapas].sort(
    (a: any, b: any) => a.ordenSecuencia - b.ordenSecuencia
  )

  // Create order
  const ordenId = createId()
  const { data: nuevaOrden, error: ordenError } = await supabase
    .from('OrdenProduccion')
    .insert({
      id: ordenId,
      sistema,
      producto,
      cantidad,
      unidad,
      rutaId: ruta.id,
      proyectoId: proyectoId ?? null,
      estado: 'EN_PRODUCCION',
    })
    .select()
    .single()

  if (ordenError) return NextResponse.json({ error: ordenError.message }, { status: 500 })

  // Create executions — first stage ACTIVA, rest PENDIENTE
  const ejecuciones = etapasOrdenadas.map((etapa: any, idx: number) => ({
    id: createId(),
    ordenId,
    etapaRutaId: etapa.id,
    maquinaId: etapa.maquinaId,
    estado: idx === 0 ? 'ACTIVA' : 'PENDIENTE',
    fechaInicio: idx === 0 ? new Date().toISOString() : null,
  }))

  const { error: ejError } = await supabase.from('EjecucionEtapa').insert(ejecuciones)
  if (ejError) return NextResponse.json({ error: ejError.message }, { status: 500 })

  return NextResponse.json(nuevaOrden, { status: 201 })
}
