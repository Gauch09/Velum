import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'

export async function GET() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createSupabaseAdminClient() as any

  const { data, error } = await supabase
    .from('Proyecto')
    .select('*, ordenes:OrdenProduccion(count)')
    .order('createdAt', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const body = await req.json()
  const { nombre, cliente, fechaEntrega } = body

  if (!nombre || !cliente || !fechaEntrega) {
    return NextResponse.json(
      { error: 'nombre, cliente y fechaEntrega son requeridos' },
      { status: 400 }
    )
  }

  const supabase = createSupabaseAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('Proyecto')
    .insert({ nombre, cliente, fechaEntrega })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
