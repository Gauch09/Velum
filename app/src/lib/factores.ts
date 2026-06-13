import { duracionMinutos } from './tramos'
import type { TipoTramo } from './tramos'

export interface TramoParaFactor {
  tipo: TipoTramo
  inicio: string
  fin: string | null
  cantidadProducida: number | null
  dudoso: boolean
  maquinaId: string
  maquinaNombre: string
  tipoMaquina: string
  producto: string
  operarioId: string
}

export interface CapacidadRow {
  producto: string
  tipoMaquina: string
  piezasPorHora: number
}

export interface ResumenMaquina {
  maquinaId: string
  maquinaNombre: string
  horasFichadas: number
  horasPreparacion: number
  horasProduccion: number
  disponibilidadPct: number
  n: number
}

export interface VelocidadProducto {
  producto: string
  maquinaId: string
  maquinaNombre: string
  piezasHoraReal: number
  piezasHoraTeorica: number | null
  factorVelocidad: number | null
  n: number
}

export interface SetupProducto {
  producto: string
  minutosPromedio: number
  n: number
}

/** Tramos válidos para cálculo: cerrados y no dudosos. */
function validos(tramos: TramoParaFactor[]): (TramoParaFactor & { fin: string })[] {
  return tramos.filter((t): t is TramoParaFactor & { fin: string } => t.fin !== null && !t.dudoso)
}

function horasDe(t: { inicio: string; fin: string }): number {
  return duracionMinutos(t.inicio, t.fin) / 60
}

/**
 * Disponibilidad por máquina: horas fichadas / (días con actividad × horasJornada).
 * Se cuentan días con actividad (no calendario) para no castigar la adopción gradual.
 */
export function resumenPorMaquina(
  tramos: TramoParaFactor[],
  horasJornada: number
): ResumenMaquina[] {
  const porMaquina = new Map<string, (TramoParaFactor & { fin: string })[]>()
  for (const t of validos(tramos)) {
    const lista = porMaquina.get(t.maquinaId) ?? []
    porMaquina.set(t.maquinaId, [...lista, t])
  }

  return Array.from(porMaquina.values()).map(lista => {
    const horasPreparacion = lista
      .filter(t => t.tipo === 'PREPARACION')
      .reduce((acc, t) => acc + horasDe(t), 0)
    const horasProduccion = lista
      .filter(t => t.tipo === 'PRODUCCION')
      .reduce((acc, t) => acc + horasDe(t), 0)
    const horasFichadas = horasPreparacion + horasProduccion
    const diasConActividad = new Set(lista.map(t => t.inicio.slice(0, 10))).size
    const horasDisponibles = diasConActividad * horasJornada

    return {
      maquinaId: lista[0].maquinaId,
      maquinaNombre: lista[0].maquinaNombre,
      horasFichadas,
      horasPreparacion,
      horasProduccion,
      disponibilidadPct: horasDisponibles > 0 ? (horasFichadas / horasDisponibles) * 100 : 0,
      n: lista.length,
    }
  }).sort((a, b) => a.maquinaNombre.localeCompare(b.maquinaNombre))
}

/** Velocidad real (piezas/hora) por producto × máquina vs. teórico. */
export function velocidadRealPorProductoMaquina(
  tramos: TramoParaFactor[],
  capacidades: CapacidadRow[]
): VelocidadProducto[] {
  const produccion = validos(tramos).filter(
    t => t.tipo === 'PRODUCCION' && t.cantidadProducida != null && t.cantidadProducida > 0
  )

  const grupos = new Map<string, typeof produccion>()
  for (const t of produccion) {
    const key = `${t.producto}|${t.maquinaId}`
    const lista = grupos.get(key) ?? []
    grupos.set(key, [...lista, t])
  }

  return Array.from(grupos.values()).map(lista => {
    const piezas = lista.reduce((acc, t) => acc + (t.cantidadProducida ?? 0), 0)
    const horas = lista.reduce((acc, t) => acc + horasDe(t), 0)
    const piezasHoraReal = horas > 0 ? piezas / horas : 0
    const teorica = capacidades.find(
      c => c.producto === lista[0].producto && c.tipoMaquina === lista[0].tipoMaquina
    )?.piezasPorHora ?? null

    return {
      producto: lista[0].producto,
      maquinaId: lista[0].maquinaId,
      maquinaNombre: lista[0].maquinaNombre,
      piezasHoraReal,
      piezasHoraTeorica: teorica,
      factorVelocidad: teorica ? piezasHoraReal / teorica : null,
      n: lista.length,
    }
  }).sort((a, b) => a.producto.localeCompare(b.producto) || a.maquinaNombre.localeCompare(b.maquinaNombre))
}

/** Duración promedio de los tramos PREPARACION por producto. */
export function setupPromedioPorProducto(tramos: TramoParaFactor[]): SetupProducto[] {
  const setups = validos(tramos).filter(t => t.tipo === 'PREPARACION')

  const grupos = new Map<string, typeof setups>()
  for (const t of setups) {
    const lista = grupos.get(t.producto) ?? []
    grupos.set(t.producto, [...lista, t])
  }

  return Array.from(grupos.values()).map(lista => ({
    producto: lista[0].producto,
    minutosPromedio:
      lista.reduce((acc, t) => acc + duracionMinutos(t.inicio, t.fin), 0) / lista.length,
    n: lista.length,
  })).sort((a, b) => a.producto.localeCompare(b.producto))
}
