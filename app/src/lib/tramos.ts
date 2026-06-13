export const HORAS_LIMITE_HUERFANO = 12

export type TipoTramo = 'PREPARACION' | 'PRODUCCION'
export type MotivoPausa = 'MATERIAL' | 'OTRA_ORDEN' | 'AVERIA' | 'OTRO'

export const MOTIVOS_PAUSA: MotivoPausa[] = ['MATERIAL', 'OTRA_ORDEN', 'AVERIA', 'OTRO']

/** Un tramo abierto hace más de `horasLimite` se considera olvidado (dudoso). */
export function esHuerfano(
  inicioIso: string,
  ahora: Date,
  horasLimite: number = HORAS_LIMITE_HUERFANO
): boolean {
  const horas = (ahora.getTime() - new Date(inicioIso).getTime()) / 3_600_000
  return horas > horasLimite
}

/** Duración de un tramo en minutos, redondeada a 1 decimal. */
export function duracionMinutos(inicioIso: string, finIso: string): number {
  const mins = (new Date(finIso).getTime() - new Date(inicioIso).getTime()) / 60_000
  return Math.round(mins * 10) / 10
}
