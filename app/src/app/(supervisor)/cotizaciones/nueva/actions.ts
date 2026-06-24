'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { validarCuit } from '@/lib/cotizador/validar-cuit'
import { crearCliente, listarClientes } from '@/lib/cotizador/repo-clientes'
import {
  crearCotizacion,
  listarRetencionesPct,
  leerTipoCambio,
} from '@/lib/cotizador/repo-cotizaciones'
import { cotizarVano } from '@/lib/cotizador/cotizar-multi'
import type { VanoInput } from '@/lib/cotizador/cotizar-multi'

const ContactoSchema = z.object({
  nombre:   z.string().min(2),
  cargo:    z.string().optional(),
  email:    z.string().email(),
  telefono: z.string().optional(),
})

const ClienteSchema = z.object({
  razonSocial:       z.string().min(2),
  cuit:              z.string().refine(validarCuit, 'CUIT inválido'),
  condicionIva:      z.enum(['RESPONSABLE_INSCRIPTO', 'MONOTRIBUTO', 'EXENTO']),
  domicilioFiscal:   z.string().optional(),
  jurisdiccionIibb:  z.string().optional(),
  esAgenteRetencion: z.boolean().default(false),
})

export async function actionCrearCliente(raw: unknown) {
  const { cliente, contacto } = z.object({ cliente: ClienteSchema, contacto: ContactoSchema }).parse(raw)
  const result = await crearCliente(
    { ...cliente, domicilioFiscal: cliente.domicilioFiscal ?? null, jurisdiccionIibb: cliente.jurisdiccionIibb ?? null },
    { ...contacto, cargo: contacto.cargo, telefono: contacto.telefono },
  )
  revalidatePath('/cotizaciones/nueva')
  revalidatePath('/clientes')
  return result
}

export async function actionListarClientes() {
  return listarClientes()
}

export async function actionCotizarVano(raw: unknown) {
  const schema = z.object({
    sistema:    z.enum(['Skin', 'Rail', 'Clad', 'SkinRail']),
    material:   z.string().min(1),
    diseno:     z.string().optional(),
    terminacion:z.string().min(1),
    ancho:      z.number().positive(),
    alto:       z.number().positive(),
    modAncho:   z.number().optional(),
    modAlto:    z.number().optional(),
    margenPct:  z.number().min(0),
  })
  return cotizarVano(schema.parse(raw) as VanoInput)
}

export async function actionCrearCotizacion(raw: unknown) {
  const schema = z.object({
    clienteId:     z.string().min(1),
    ubicacionObra: z.string().nullable(),
    tcUsado:       z.number().positive(),
    margenPct:     z.number().min(0),
    vanos:         z.array(z.any()).min(1),
    condiciones: z.object({
      formaPagoProducto: z.string().min(2),
      retenciones: z.array(z.object({
        tipo:       z.string().min(1),
        porcentaje: z.number().min(0).max(100),
      })),
    }),
  })
  return crearCotizacion(schema.parse(raw) as never)
}

export async function actionListarRetencionesPct() {
  return listarRetencionesPct()
}

export async function actionLeerTipoCambio() {
  return leerTipoCambio()
}

export async function actionCalcularMontaje(raw: unknown) {
  const schema = z.object({
    medioElevacionCostoDia: z.number().positive(),
    nOperarios:  z.number().int().min(1),
    totalM2:     z.number().positive(),
    hsPresencial: z.boolean(),
    margenPct:   z.number().min(0),
  })
  const input = schema.parse(raw)
  const { calcularMontaje } = await import('@/lib/cotizador/montaje/calcularMontaje')
  const { cargarParamsMontaje } = await import('@/lib/cotizador/montaje/params-repo')
  const params = await cargarParamsMontaje()
  return calcularMontaje({ ...input, margenPct: input.margenPct / 100, params })
}

export async function actionListarListas() {
  const { listarMaterialesSkin, listarDisenos } = await import('@/lib/cotizador/skin/listas-repo')
  const { createSupabaseAdminClient } = await import('@/lib/supabase-admin')
  const sb = createSupabaseAdminClient() as any

  const [todosMateriales, disenos] = await Promise.all([
    listarMaterialesSkin(),
    listarDisenos(),
  ])

  // Separar lamas (MultiSlim*) del resto
  const materialesSkin = todosMateriales.filter((m: string) => !m.startsWith('MultiSlim'))
  const materialesLama = todosMateriales.filter((m: string) => m.startsWith('MultiSlim'))

  const { listarMediosElevacion } = await import('@/lib/cotizador/montaje/params-repo')
  const [tcRow, mediosElevacion] = await Promise.all([
    sb.from('ParametroCosteo').select('valor').eq('clave', 'tipo_cambio').single().then((r: any) => r.data),
    listarMediosElevacion(),
  ])

  return {
    materialesSkin,
    materialesLama,
    disenos,
    tcDefault: Number(tcRow?.valor ?? 1460),
    mediosElevacion,
  }
}
