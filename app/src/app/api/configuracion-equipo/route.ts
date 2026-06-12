import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'

export async function GET() {
  const supabase = createSupabaseAdminClient() as any
  const { data, error } = await supabase.from('ConfiguracionEquipo').select('*')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest) {
  const supabase = createSupabaseAdminClient() as any
  const body = (await req.json()) as { tipo: string; capacidadM2: number }
  if (!body.tipo || typeof body.capacidadM2 !== 'number' || body.capacidadM2 <= 0)
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })

  const { data, error } = await supabase
    .from('ConfiguracionEquipo')
    .update({ capacidadM2: body.capacidadM2, actualizadoEn: new Date().toISOString() })
    .eq('tipo', body.tipo)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
