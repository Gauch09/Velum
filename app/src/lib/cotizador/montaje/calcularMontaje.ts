export interface ParamsMontaje {
  jornalUsdH: number       // 39 u$d/h
  viandaUsdDia: number     // 10 u$d/día/operario
  hsUsdH: number           // 50 u$d/h
  rendimientoM2Op: number  // 20 m²/operario/día
  horasDia: number         // 8 h/día
}

export interface MontajeInput {
  medioElevacionCostoDia: number
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

export function calcularMontaje(input: MontajeInput): MontajeResultado {
  const { params, nOperarios, totalM2, hsPresencial, margenPct, medioElevacionCostoDia } = input

  const diasObra = Math.ceil(totalM2 / (nOperarios * params.rendimientoM2Op))
  const costoElevacion = medioElevacionCostoDia * diasObra
  const costoOperarios = nOperarios * (params.jornalUsdH * params.horasDia + params.viandaUsdDia) * diasObra
  const costoHS = hsPresencial ? diasObra * params.horasDia * params.hsUsdH : 0
  const costoTotal = costoElevacion + costoOperarios + costoHS
  const precioVenta = costoTotal * (1 + margenPct)

  return { diasObra, costoElevacion, costoOperarios, costoHS, costoTotal, precioVenta }
}
