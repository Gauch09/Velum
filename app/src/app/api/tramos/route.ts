import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { esHuerfano } from '@/lib/tramos'
import { createId } from '@paralleldrive/cuid2'

/**
 * Abre un tramo de trabajo. Si el operario tiene otro tramo abierto,
 * lo cierra primero (dudoso=true si quedó huérfano > 12 h).
 * Body: { ejecucionEtapaId, maquinaId, tipo: 'PREPARACION' | 'PRODUCCION' }
 */
export async function POST(req: Request) {
  const body = await req.json()
  const { ejecucionEtapaId, maquinaId, tipo } = body

  if (!ejecucionEtapaId || !maquinaId || !['PREPARACION', 'PRODUCCION'].includes(tipo)) {
    return NextResponse.json(
      { error: 'ejecucionEtapaId, maquinaId y tipo (PREPARACION|PRODUCCION) son requeridos' },
      { status: 400 }
    )
  }

  const supabaseAuth = createSupabaseServerClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const supabase = createSupabaseAdminClient() as any

  const { data: usuario } = await supabase
    .from('Usuario')
    .select('id')
    .eq('email', user.email!)
    .single()
  if (!usuario) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })

  // Validar ejecución: existe, ACTIVA, y asignación (mismo criterio que progreso)
  const { data: ejecucion } = await supabase
    .from('EjecucionEtapa')
    .select('id, estado, operarioId, maquina:Maquina ( tipo )')
    .eq('id', ejecucionEtapaId)
    .single()

  if (!ejecucion) return NextResponse.json({ error: 'Ejecución no encontrada' }, { status: 404 })
  if (ejecucion.estado !== 'ACTIVA') {
    return NextResponse.json({ error: 'La etapa no está activa' }, { status: 409 })
  }
  if (ejecucion.operarioId && ejecucion.operarioId !== usuario.id) {
    return NextResponse.json({ error: 'No estás asignado a esta etapa' }, { status: 403 })
  }

  // Validar máquina: existe y coincide en tipo con la máquina de la etapa
  const { data: maquina } = await supabase
    .from('Maquina')
    .select('id, nombre, tipo')
    .eq('id', maquinaId)
    .single()

  if (!maquina) return NextResponse.json({ error: 'Máquina no encontrada' }, { status: 404 })
  if (maquina.tipo !== ejecucion.maquina.tipo) {
    return NextResponse.json(
      { error: `La máquina elegida (${maquina.tipo}) no coincide con el tipo de la etapa (${ejecucion.maquina.tipo})` },
      { status: 422 }
    )
  }

  // Cerrar tramo abierto previo del operario (regla: uno solo abierto)
  const ahora = new Date()
  const { data: abierto } = await supabase
    .from('TramoTrabajo')
    .select('id, inicio, ejecucionEtapaId')
    .eq('operarioId', usuario.id)
    .is('fin', null)
    .maybeSingle()

  let tramoCerrado = null
  if (abierto) {
    const dudoso = esHuerfano(abierto.inicio, ahora)
    const { error: cierreError } = await supabase
      .from('TramoTrabajo')
      .update({ fin: ahora.toISOString(), dudoso })
      .eq('id', abierto.id)
    if (cierreError) return NextResponse.json({ error: cierreError.message }, { status: 500 })
    tramoCerrado = { id: abierto.id, dudoso }
  }

  const nuevo = {
    id: createId(),
    ejecucionEtapaId,
    operarioId: usuario.id,
    maquinaId,
    tipo,
    inicio: ahora.toISOString(),
  }
  const { data: tramo, error: insertError } = await supabase
    .from('TramoTrabajo')
    .insert(nuevo)
    .select('id, tipo, inicio, maquinaId')
    .single()

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

  return NextResponse.json({ tramo, tramoCerrado })
}
