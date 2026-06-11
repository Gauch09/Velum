export type { Rol, EstadoOrden, EstadoEjecucion, EstadoMaquina, Unidad, EstadoProyecto } from '@prisma/client'

export interface OrdenConEjecuciones {
  id: string
  sistema: string
  producto: string
  cantidad: number
  unidad: string
  porcentajeGlobal: number
  estado: string
  prioridad: number
  notas: string | null
  proyecto: { nombre: string; cliente: string } | null
  ejecuciones: EjecucionConDetalle[]
}

export interface EjecucionConDetalle {
  id: string
  porcentajeActual: number
  estado: string
  fechaInicio: string | null
  fueOverride: boolean
  maquina: { id: string; nombre: string; tipo: string }
  etapaRuta: { nombreEtapa: string; ordenSecuencia: number; umbralActivacion: number }
}

export interface RegistrarProgresoInput {
  ejecucionEtapaId: string
  cantidadRegistrada: number
  notas?: string
  fueOverride?: boolean
  motivoOverride?: string
}
