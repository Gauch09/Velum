import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'

const ESTADOS_VALIDOS = ['OPERATIVA', 'MANTENIMIENTO', 'FUERA_DE_SERVICIO']

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { estadoActual } = await req.json()

  if (!ESTADOS_VALIDOS.includes(estadoActual)) {
    return NextResponse.json({ error: 'Estado inválido' }, { status: 400 })
  }

  const supabase = createSupabaseAdminClient() as any

  const { data: maquina, error: maquinaError } = await supabase
    .from('Maquina')
    .update({ estadoActual })
    .eq('id', params.id)
    .select()
    .single()

  if (maquinaError) return NextResponse.json({ error: maquinaError.message }, { status: 500 })

  if (estadoActual !== 'OPERATIVA') {
    // Machine going down — put active executions on hold
    await supabase
      .from('EjecucionEtapa')
      .update({ estado: 'EN_ESPERA' })
      .eq('maquinaId', params.id)
      .eq('estado', 'ACTIVA')
  } else {
    // Machine restored — reactivate waiting executions
    await supabase
      .from('EjecucionEtapa')
      .update({ estado: 'ACTIVA' })
      .eq('maquinaId', params.id)
      .eq('estado', 'EN_ESPERA')
  }

  return NextResponse.json(maquina)
}
