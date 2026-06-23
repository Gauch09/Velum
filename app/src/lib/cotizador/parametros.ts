import type { TipoRetencion } from '@prisma/client'

export interface ParametroRow {
  clave: string
  valor: number
  unidad: string | null
  descripcion: string | null
}

export const RETENCIONES_DEFAULT: Record<TipoRetencion, number> = {
  IVA: 10.5,
  GANANCIAS: 2,
  IIBB: 3,
  SUSS: 1.2,
}

export function retencionDefault(tipo: TipoRetencion, params: ParametroRow[]): number {
  const fila = params.find(p => p.clave === `retencion_default_${tipo.toLowerCase()}`)
  return fila ? fila.valor : RETENCIONES_DEFAULT[tipo]
}
