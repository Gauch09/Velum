export interface EtapaProgreso {
  id: string
  ordenSecuencia: number
  umbralActivacion: number
  porcentajeActual: number
  estado: 'PENDIENTE' | 'ACTIVA' | 'EN_ESPERA' | 'COMPLETADA'
  etapaRutaId: string
  maquinaId: string
}

export interface CascadaResult {
  etapasAActivar: string[]   // etapaRutaId[] of newly activated stages
  porcentajeGlobal: number
}

export function evaluarCascada(
  etapas: EtapaProgreso[],
  ejecucionIdActualizada: string,
  nuevoPorcentaje: number
): CascadaResult {
  const ordenadas = [...etapas].sort((a, b) => a.ordenSecuencia - b.ordenSecuencia)

  const actualizadas = ordenadas.map(e =>
    e.id === ejecucionIdActualizada ? { ...e, porcentajeActual: nuevoPorcentaje } : e
  )

  const etapasAActivar: string[] = []

  for (let i = 0; i < actualizadas.length - 1; i++) {
    const actual    = actualizadas[i]
    const siguiente = actualizadas[i + 1]

    if (
      actual.estado === 'ACTIVA' &&
      actual.porcentajeActual >= siguiente.umbralActivacion &&
      siguiente.estado === 'PENDIENTE'
    ) {
      etapasAActivar.push(siguiente.etapaRutaId)
      actualizadas[i + 1] = { ...siguiente, estado: 'ACTIVA' }
    }
  }

  const porcentajeGlobal =
    actualizadas.reduce((acc, e) => acc + e.porcentajeActual, 0) / actualizadas.length

  return { etapasAActivar, porcentajeGlobal }
}
