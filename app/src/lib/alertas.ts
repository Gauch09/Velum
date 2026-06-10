export type SeveridadAlerta = 'rojo' | 'ambar'
export type TipoAlerta = 'sin_actividad' | 'riesgo_entrega' | 'ambas'

export interface AlertaCuello {
  ejecucionId: string
  ordenId: string
  ordenNombre: string
  proyectoNombre?: string
  etapaNombre: string
  tipo: TipoAlerta
  severidad: SeveridadAlerta
  minutosInactivo: number
  diasParaEntrega?: number
  porcentajeGlobal: number
}

export interface EjecucionParaAlerta {
  id: string
  estado: string
  ultimoProgresoEn: string | null
  fechaInicio: string | null
  porcentajeActual: number
  orden: {
    id: string
    sistema: string
    producto: string
    porcentajeGlobal: number
    fechaEntrega: string | null
    proyecto?: { nombre: string } | null
  }
  etapaRuta: { nombreEtapa: string }
}

function startOfDayMs(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

function evaluarRiesgoEntrega(
  fechaEntrega: string | null,
  porcentajeGlobal: number,
  ahora: Date
): { enRiesgo: boolean; severidad: SeveridadAlerta } {
  if (!fechaEntrega) return { enRiesgo: false, severidad: 'ambar' }
  const diasRestantes = Math.round(
    (startOfDayMs(new Date(fechaEntrega)) - startOfDayMs(ahora)) / 86_400_000
  )
  if (diasRestantes < 0) return { enRiesgo: true, severidad: 'rojo' }
  // riesgo_entrega is only triggered if delivery is NOT imminent (>3 days)
  if (diasRestantes > 3 && diasRestantes <= 7 && porcentajeGlobal < 60) return { enRiesgo: true, severidad: 'ambar' }
  return { enRiesgo: false, severidad: 'ambar' }
}

export function calcularAlertas(
  ejecuciones: EjecucionParaAlerta[],
  umbralHoras: number,
  ahora: Date = new Date()
): AlertaCuello[] {
  const alertas: AlertaCuello[] = []

  for (const ej of ejecuciones) {
    if (ej.estado !== 'ACTIVA') continue

    const referencia = ej.ultimoProgresoEn ?? ej.fechaInicio
    const minutosInactivo = referencia
      ? (ahora.getTime() - new Date(referencia).getTime()) / 60_000
      : 0

    const sinActividad = minutosInactivo >= umbralHoras * 60

    const diasParaEntrega = ej.orden.fechaEntrega
      ? Math.ceil((new Date(ej.orden.fechaEntrega).getTime() - ahora.getTime()) / 86_400_000)
      : undefined

    const { enRiesgo: riesgoEntrega, severidad: severidadEntrega } = evaluarRiesgoEntrega(
      ej.orden.fechaEntrega,
      ej.orden.porcentajeGlobal,
      ahora
    )

    if (!sinActividad && !riesgoEntrega) continue

    let tipo: TipoAlerta
    let severidad: SeveridadAlerta

    if (sinActividad && riesgoEntrega) {
      tipo = 'ambas'
      severidad = 'rojo'
    } else if (sinActividad) {
      tipo = 'sin_actividad'
      severidad = diasParaEntrega !== undefined && diasParaEntrega <= 3 ? 'rojo' : 'ambar'
    } else {
      tipo = 'riesgo_entrega'
      severidad = severidadEntrega
    }

    alertas.push({
      ejecucionId: ej.id,
      ordenId: ej.orden.id,
      ordenNombre: `${ej.orden.sistema} / ${ej.orden.producto}`,
      proyectoNombre: ej.orden.proyecto?.nombre,
      etapaNombre: ej.etapaRuta.nombreEtapa,
      tipo,
      severidad,
      minutosInactivo: Math.round(minutosInactivo),
      diasParaEntrega,
      porcentajeGlobal: ej.orden.porcentajeGlobal,
    })
  }

  return alertas.sort((a, b) => {
    if (a.severidad !== b.severidad) return a.severidad === 'rojo' ? -1 : 1
    return b.minutosInactivo - a.minutosInactivo
  })
}
