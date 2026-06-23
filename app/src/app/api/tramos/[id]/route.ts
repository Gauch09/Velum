import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { registrarProgreso } from '@/lib/registrar-progreso'
import { MOTIVOS_PAUSA } from '@/lib/tramos'
import { createClient } from '@supabase/supabase-js'

const broadcastClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Body: { accion: 'pausar', motivoPausa?, notas? }
 *     | { accion: 'terminar', cantidadProducida, notas? }
 * Pausar y terminar cierran el tramo (fin = ahora); no hay estado suspendido.
 * Terminar con cantidad > 0 registra progreso; si falla, el cierre se revierte.
 */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json()
  const { accion, motivoPausa, cantidadProducida, notas } = body

  if (!['pausar', 'terminar'].includes(accion)) {
    return NextResponse.json({ error: 'accion debe ser pausar o terminar' }, { status: 400 })
  }
  if (accion === 'terminar' && (cantidadProducida == null || cantidadProducida < 0)) {
    return NextResponse.json({ error: 'cantidadProducida es requerida para terminar' }, { status: 400 })
  }
  if (motivoPausa && !MOTIVOS_PAUSA.includes(motivoPausa)) {
    return NextResponse.json({ error: 'motivoPausa inválido' }, { status: 400 })
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

  const { data: tramo } = await supabase
    .from('TramoTrabajo')
    .select('id, operarioId, fin, tipo, ejecucionEtapaId, ejecucionEtapa:EjecucionEtapa ( ordenId )')
    .eq('id', params.id)
    .single()

  if (!tramo) return NextResponse.json({ error: 'Tramo no encontrado' }, { status: 404 })
  if (tramo.operarioId !== usuario.id) {
    return NextResponse.json({ error: 'Solo el dueño del tramo puede cerrarlo' }, { status: 403 })
  }
  if (tramo.fin) return NextResponse.json({ error: 'El tramo ya está cerrado' }, { status: 409 })

  const fin = new Date().toISOString()

  if (accion === 'pausar') {
    const { error } = await supabase
      .from('TramoTrabajo')
      .update({ fin, motivoPausa: motivoPausa ?? null, notas: notas ?? null })
      .eq('id', params.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  // accion === 'terminar': cerrar tramo, luego registrar progreso; revertir si falla
  const { error: cierreError } = await supabase
    .from('TramoTrabajo')
    .update({ fin, cantidadProducida, notas: notas ?? null })
    .eq('id', params.id)
  if (cierreError) return NextResponse.json({ error: cierreError.message }, { status: 500 })

  // cantidadProducida = 0 → cierra el tramo sin registrar avance (caso: terminó su parte sin piezas completas)
  if (cantidadProducida === 0) return NextResponse.json({ ok: true, progreso: null })

  const result = await registrarProgreso(supabase, broadcastClient, {
    ordenId: tramo.ejecucionEtapa.ordenId,
    ejecucionEtapaId: tramo.ejecucionEtapaId,
    usuarioId: usuario.id,
    cantidadRegistrada: cantidadProducida,
    notas: notas ?? null,
  })

  if (!result.ok) {
    // Revertir el cierre: el tramo queda abierto para reintentar (spec)
    await supabase
      .from('TramoTrabajo')
      .update({ fin: null, cantidadProducida: null })
      .eq('id', params.id)
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  return NextResponse.json({
    ok: true,
    progreso: {
      porcentajeGlobal: result.porcentajeGlobal,
      etapasActivadas: result.etapasActivadas,
      completada: result.ordenCompleta,
    },
  })
}
