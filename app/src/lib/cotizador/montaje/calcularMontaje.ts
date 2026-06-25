export interface ParamsMontaje {
  jornalUsdH: number       // 39 u$d/h
  viandaUsdDia: number     // 10 u$d/día/operario
  hsUsdH: number           // 50 u$d/h
  rendimientoM2Op: number  // 20 m²/operario/día
  horasDia: number         // 8 h/día
}

export interface MontajeInput {
  medioElevacionCostoMes: number
  nOperarios: number
  totalM2: number
  hsPresencial: boolean
  margenPct: number  // fracción, ej. 1.5 para 150%
  params: ParamsMontaje
}

export interface MontajeResultado {
  diasObra: number
  costoElevacion: number
  costoOperarios: number
  costoHS: number
  costoTotal: number
  precioVenta: number
}

// El alquiler de los equipos de elevación se cotiza por mes. Días laborables
// de lunes a sábado ≈ 26 por mes. Las obras de menos de un mes pagan un recargo
// del 20% sobre el costo diario (el equipo igual queda inmovilizado el período corto).
export const DIAS_LABORABLES_MES = 26
export const RECARGO_OBRA_CORTA = 0.20

export function calcularMontaje(input: MontajeInput): MontajeResultado {
  const { params, nOperarios, totalM2, hsPresencial, margenPct, medioElevacionCostoMes } = input

  const diasObra = Math.ceil(totalM2 / (nOperarios * params.rendimientoM2Op))
  const costoDiaBase = medioElevacionCostoMes / DIAS_LABORABLES_MES
  const obraCorta = diasObra < DIAS_LABORABLES_MES
  const costoDiaEfectivo = obraCorta ? costoDiaBase * (1 + RECARGO_OBRA_CORTA) : costoDiaBase
  const costoElevacion = costoDiaEfectivo * diasObra
  const costoOperarios = nOperarios * (params.jornalUsdH * params.horasDia + params.viandaUsdDia) * diasObra
  const costoHS = hsPresencial ? diasObra * params.horasDia * params.hsUsdH : 0
  const costoTotal = costoElevacion + costoOperarios + costoHS
  const precioVenta = costoTotal * (1 + margenPct)

  return { diasObra, costoElevacion, costoOperarios, costoHS, costoTotal, precioVenta }
}
