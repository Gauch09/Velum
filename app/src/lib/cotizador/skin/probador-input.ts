import { z } from 'zod'
import type { SkinInput } from './tipos'
import type { FamiliaConEspesor } from './params-repo'

export const ALCANCES = [
  'Crudo (sin pintura)',
  'Completo (solo panel)',
  'Completo + Estructura',
] as const

export const ProbadorInputSchema = z.object({
  ancho: z.coerce.number().positive(),
  alto: z.coerce.number().positive(),
  modAncho: z.coerce.number().positive(),
  modAlto: z.coerce.number().positive(),
  sepParedMm: z.coerce.number().min(0),
  margenPct: z.coerce.number().min(0), // en %, ej 150
  material: z.string().min(1),
  diseno: z.string().min(1),
  alcance: z.enum(ALCANCES),
})

export type ProbadorInput = z.infer<typeof ProbadorInputSchema>

export function construirSkinInput(
  datos: ProbadorInput,
  familia: FamiliaConEspesor,
  kp: number,
): SkinInput {
  return {
    ancho: datos.ancho,
    alto: datos.alto,
    modAncho: datos.modAncho,
    modAlto: datos.modAlto,
    sepParedMm: datos.sepParedMm,
    margenPct: datos.margenPct / 100,
    kp,
    espesorMm: familia.espesorMm,
    familia: {
      nombre: familia.nombre,
      densidad: familia.densidad,
      precioTon: familia.precioTon,
      precioM2: familia.precioM2,
    },
    alcance: datos.alcance,
  }
}
