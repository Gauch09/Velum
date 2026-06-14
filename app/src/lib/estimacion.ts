/**
 * Motor de estimación de tiempos de producción.
 * Cruza el despiece (producto · proceso · cantidad pendiente) con las tasas
 * de la hoja "datos" del Excel (piezas/hora por máquina) para estimar días.
 *   días = cantidad_pendiente / (piezas_por_hora) / horas_dia
 * Cobertura parcial: si un producto/proceso no tiene tasa, se marca "sin tiempo".
 */

export interface TiempoProducto {
  producto: string
  laserUh: number | null
  plegadoraUh: number | null
  punzonadoraUh: number | null
  fresadoraUh: number | null
  pinturaUh: number | null
  embaladoUh: number | null
  horasDia: number
}

export interface Pieza {
  producto: string
  proceso: string
  cantidad: number
  completado: number
}

export interface EstimacionProyecto {
  diasEstimados: number // suma de días de máquina sobre las piezas con tasa
  piezasSinTiempo: number // cantidad de líneas con pendiente pero sin tasa cargada
  pendienteTotal: number
}

export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // saca acentos
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

/** Devuelve la tasa (piezas/hora) del proceso, o null si no aplica/está cargada. */
export function tasaParaProceso(tiempo: TiempoProducto, proceso: string): number | null {
  const p = normalizar(proceso)
  if (p.includes('laser') || p.includes('corte')) return tiempo.laserUh
  if (p.includes('plegad')) return tiempo.plegadoraUh
  if (p.includes('pintur') || p.includes('polvo') || p.includes('pintad')) return tiempo.pinturaUh
  if (p.includes('embal')) return tiempo.embaladoUh
  if (p.includes('punzon')) return tiempo.punzonadoraUh
  if (p.includes('fresad')) return tiempo.fresadoraUh
  return null
}

/** Días de máquina para una pieza en un proceso. null = sin tiempo cargado. */
export function diasPieza(pieza: Pieza, tiempo: TiempoProducto | undefined): number | null {
  const pendiente = Math.max(0, pieza.cantidad - pieza.completado)
  if (pendiente === 0) return 0
  if (!tiempo) return null
  const tasa = tasaParaProceso(tiempo, pieza.proceso)
  if (!tasa || tasa <= 0) return null
  return pendiente / tasa / tiempo.horasDia
}

export function estimarProyecto(
  piezas: Pieza[],
  tiempos: Map<string, TiempoProducto>
): EstimacionProyecto {
  let diasEstimados = 0
  let piezasSinTiempo = 0
  let pendienteTotal = 0
  for (const pieza of piezas) {
    const pendiente = Math.max(0, pieza.cantidad - pieza.completado)
    pendienteTotal += pendiente
    if (pendiente === 0) continue
    const dias = diasPieza(pieza, tiempos.get(normalizar(pieza.producto)))
    if (dias === null) piezasSinTiempo += 1
    else diasEstimados += dias
  }
  return { diasEstimados, piezasSinTiempo, pendienteTotal }
}

/** Suma días hábiles (lun-vie) a una fecha. */
export function sumarDiasHabiles(desde: Date, dias: number): Date {
  const fecha = new Date(desde)
  let restantes = Math.ceil(dias)
  while (restantes > 0) {
    fecha.setDate(fecha.getDate() + 1)
    const d = fecha.getDay()
    if (d !== 0 && d !== 6) restantes -= 1
  }
  return fecha
}

/** Días hábiles entre hoy y la fecha de entrega (negativo si ya pasó). */
export function diasHabilesHasta(entrega: Date, desde: Date = new Date()): number {
  const a = new Date(desde)
  a.setHours(0, 0, 0, 0)
  const b = new Date(entrega)
  b.setHours(0, 0, 0, 0)
  const signo = b >= a ? 1 : -1
  let cuenta = 0
  const cur = new Date(a < b ? a : b)
  const fin = new Date(a < b ? b : a)
  while (cur < fin) {
    cur.setDate(cur.getDate() + 1)
    const d = cur.getDay()
    if (d !== 0 && d !== 6) cuenta += 1
  }
  return signo * cuenta
}
