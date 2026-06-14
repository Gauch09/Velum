import { NextRequest, NextResponse } from 'next/server'
import { createId } from '@paralleldrive/cuid2'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { calcularBach } from '@/lib/calcularBach'

export async function GET(req: NextRequest) {
  const supabase = createSupabaseAdminClient() as any
  const { searchParams } = new URL(req.url)
  const proyectoId = searchParams.get('proyectoId')
  const estado = searchParams.get('estado')
  const numero = searchParams.get('numero')

  let query = supabase
    .from('OrdenPrimaria')
    .select('*, proyecto:Proyecto(id, nombre, cliente), items:ItemProduccion(*), lotes:LoteChapa(*)')
    .order('creadoEn', { ascending: false })

  if (proyectoId) query = query.eq('proyectoId', proyectoId)
  if (estado) query = query.eq('estado', estado)
  if (numero) query = query.eq('numero', Number(numero))

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const supabase = createSupabaseAdminClient() as any
  const body = await req.json()
  const { tipo, equipo, colorHoja, responsable, fecha, proyectoId } = body

  if (!tipo || !equipo || !colorHoja || !responsable || !fecha)
    return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 })

  const { data: configs } = await supabase.from('ConfiguracionEquipo').select('*')
  const capLavado = configs?.find((c: any) => c.tipo === 'LAVADO')?.capacidadM2 ?? 2.0
  const capHorno = configs?.find((c: any) => c.tipo === 'HORNO')?.capacidadM2 ?? 6.0

  const id = createId()
  const { error } = await supabase
    .from('OrdenPrimaria')
    .insert({ id, tipo, equipo, colorHoja, responsable, fecha, proyectoId: proyectoId || null })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (Array.isArray(body.items) && body.items.length > 0) {
    const itemsToInsert = body.items.map((item: any) => ({
      id: createId(),
      ordenPrimariaId: id,
      nombre: item.nombre,
      material: item.material,
      espesor: Number(item.espesor),
      largo: Number(item.largo),
      ancho: Number(item.ancho),
      cantidadTotal: Number(item.cantidadTotal),
      proximoProceso: item.proximoProceso,
      notas: item.notas ?? null,
      bachLavado: calcularBach(Number(item.largo), Number(item.ancho), capLavado),
      bachHorno: calcularBach(Number(item.largo), Number(item.ancho), capHorno),
    }))
    const { error: itemsError } = await supabase.from('ItemProduccion').insert(itemsToInsert)
    if (itemsError) return NextResponse.json({ error: itemsError.message }, { status: 500 })
  }

  if (Array.isArray(body.lotes) && body.lotes.length > 0) {
    const lotesToInsert = body.lotes.map((l: any) => ({
      id: createId(),
      ordenPrimariaId: id,
      codigo: l.codigo,
      material: l.material,
      colorChapa: l.colorChapa,
      medidaLargo: Number(l.medidaLargo),
      medidaAncho: Number(l.medidaAncho),
      espesor: Number(l.espesor),
      cantidadChapas: Number(l.cantidadChapas),
    }))
    const { error: lotesError } = await supabase.from('LoteChapa').insert(lotesToInsert)
    if (lotesError) return NextResponse.json({ error: lotesError.message }, { status: 500 })
  }

  const { data: completa } = await supabase
    .from('OrdenPrimaria')
    .select('*, proyecto:Proyecto(id, nombre, cliente), items:ItemProduccion(*), lotes:LoteChapa(*)')
    .eq('id', id)
    .single()

  return NextResponse.json(completa, { status: 201 })
}
