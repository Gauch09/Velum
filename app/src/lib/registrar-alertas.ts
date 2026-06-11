import { createId } from '@paralleldrive/cuid2'
import type { AlertaCuello } from './alertas'
import { enviarAlertaRoja } from './email'

export async function registrarAlertas(
  alertas: AlertaCuello[],
  todosEjecucionIds: string[],
  supabase: any
): Promise<void> {
  if (todosEjecucionIds.length === 0) return

  const alertaIds = new Set(alertas.map(a => a.ejecucionId))

  const { data: openLogs } = await supabase
    .from('AlertaLog')
    .select('id, ejecucionId')
    .is('resueltaEn', null)
    .in('ejecucionId', todosEjecucionIds)

  const openLogMap = new Map<string, string>(
    ((openLogs ?? []) as { id: string; ejecucionId: string }[]).map(l => [l.ejecucionId, l.id])
  )

  // Open new logs for alerts that don't have one yet
  const nuevos = alertas
    .filter(a => !openLogMap.has(a.ejecucionId))
    .map(a => ({
      id: createId(),
      ejecucionId: a.ejecucionId,
      ordenId: a.ordenId,
      ordenNombre: a.ordenNombre,
      etapaNombre: a.etapaNombre,
      tipo: a.tipo,
      severidad: a.severidad,
    }))

  if (nuevos.length > 0) {
    await supabase.from('AlertaLog').insert(nuevos)

    const nuevosRojos = nuevos.filter(n => n.severidad === 'rojo')
    if (nuevosRojos.length > 0) {
      const { data: supervisores } = await supabase
        .from('Usuario')
        .select('email')
        .eq('rol', 'SUPERVISOR')

      const emails: string[] = ((supervisores ?? []) as { email: string }[]).map(s => s.email)

      await Promise.all(
        nuevosRojos.map(a => enviarAlertaRoja(emails, a))
      )
    }
  }

  // Close logs for alerts that are no longer firing
  const ahora = new Date().toISOString()
  const resueltos = Array.from(openLogMap.entries())
    .filter(([ejecucionId]) => !alertaIds.has(ejecucionId))
    .map(([, logId]) => logId)

  if (resueltos.length > 0) {
    await supabase
      .from('AlertaLog')
      .update({ resueltaEn: ahora })
      .in('id', resueltos)
  }
}
