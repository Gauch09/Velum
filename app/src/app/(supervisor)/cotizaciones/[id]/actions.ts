'use server'

import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { revalidatePath } from 'next/cache'

export type EstadoCotizacion = 'BORRADOR' | 'ENVIADA' | 'VISTA' | 'ACEPTADA' | 'RECHAZADA'

const TRANSICIONES: Record<EstadoCotizacion, EstadoCotizacion[]> = {
  BORRADOR:  ['ENVIADA'],
  ENVIADA:   ['VISTA', 'ACEPTADA', 'RECHAZADA'],
  VISTA:     ['ACEPTADA', 'RECHAZADA'],
  ACEPTADA:  [],
  RECHAZADA: [],
}

export async function cambiarEstado(id: string, nuevoEstado: EstadoCotizacion) {
  const supabase = createSupabaseAdminClient() as any

  const { data: cot, error: errLeer } = await supabase
    .from('Cotizacion')
    .select('estado')
    .eq('id', id)
    .single()
  if (errLeer || !cot) return { error: 'Cotización no encontrada' }

  const permitidos = TRANSICIONES[cot.estado as EstadoCotizacion] ?? []
  if (!permitidos.includes(nuevoEstado)) {
    return { error: `Transición ${cot.estado} → ${nuevoEstado} no permitida` }
  }

  const { error: errUpd } = await supabase
    .from('Cotizacion')
    .update({ estado: nuevoEstado })
    .eq('id', id)
  if (errUpd) return { error: errUpd.message }

  if (nuevoEstado === 'ACEPTADA') {
    try {
      const { generarSnapshot } = await import('@/lib/cotizador/repo-materiales')
      await generarSnapshot(id)
    } catch (err) {
      console.error('[cambiarEstado] generarSnapshot falló:', err)
      // No bloquea la aceptación: la lista puede regenerarse luego.
    }
  }

  revalidatePath(`/cotizaciones/${id}/materiales`)
  revalidatePath(`/cotizaciones/${id}`)
  revalidatePath('/cotizaciones')
  return { ok: true }
}
