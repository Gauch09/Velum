import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import type { VanoResultado } from './cotizar-multi'
import type { MontajeResultado } from './montaje/calcularMontaje'

export interface MontajeInput {
  medioElevacionId: string
  nOperarios: number
  hsPresencial: boolean
  margenPct: number  // fracción
  resultado: MontajeResultado
}

export interface NuevaCotizacionInput {
  clienteId: string
  ubicacionObra: string | null
  tcUsado: number
  margenPct: number
  vanos: VanoResultado[]
  montaje: MontajeInput | null
  condiciones: {
    formaPagoProducto: string
    retenciones: Array<{ tipo: string; porcentaje: number }>
  }
}

async function siguienteNumero(sb: any): Promise<string> {
  const year = new Date().getFullYear()
  const { count } = await sb
    .from('Cotizacion')
    .select('*', { count: 'exact', head: true })
    .like('numero', `COT-${year}-%`)
  return `COT-${year}-${String((count ?? 0) + 1).padStart(4, '0')}`
}

export async function crearCotizacion(input: NuevaCotizacionInput) {
  const sb = createSupabaseAdminClient() as any
  const numero = await siguienteNumero(sb)
  const totalProducto = input.vanos.reduce((acc, v) => acc + v.precioVenta, 0)

  const totalMontaje = input.montaje?.resultado.precioVenta ?? 0
  const alcance = input.montaje ? 'PROVISION_MONTAJE' : 'PROVISION'

  const cotId = crypto.randomUUID()
  const { data: cot, error: e1 } = await sb.from('Cotizacion').insert([{
    id: cotId,
    numero,
    clienteId: input.clienteId,
    version: 1,
    estado: 'BORRADOR',
    alcance,
    margenPct: input.margenPct,
    totalProducto,
    totalMontaje,
    tcUsado: input.tcUsado,
    ubicacionObra: input.ubicacionObra,
  }]).select().single()
  if (e1) throw new Error(`crearCotizacion: ${e1.message}`)

  if (input.vanos.length > 0) {
    const vanoRows = input.vanos.map((v: any) => ({
      id: crypto.randomUUID(),
      cotizacionId: cot.id,
      sistema: v.sistema,
      material: v.material,
      colorACM: v.colorACM ?? null,
      terminacion: v.terminacion,
      ancho: v.ancho,
      alto: v.alto,
      costoFab: v.costoFab,
      costoMaterial: v.costoMaterial,
      precio: v.precioVenta,
      cara: v.cara ?? null,
      geometria: v.geometria ?? null,
      compras: v.compras ?? null,
    }))
    const { error: e2 } = await sb.from('CotizacionVano').insert(vanoRows)
    if (e2) throw new Error(`crearVanos: ${e2.message}`)
  }

  const condId = crypto.randomUUID()
  const { data: cond, error: e3 } = await sb.from('CondicionesComerciales').insert([{
    id: condId,
    cotizacionId: cot.id,
    formaPagoProducto: input.condiciones.formaPagoProducto,
    modoPagoMontaje: 'INCLUIDO_PAQUETE',
    variosPct: 10,
  }]).select().single()
  if (e3) throw new Error(`crearCondiciones: ${e3.message}`)

  if (input.montaje) {
    const m = input.montaje
    const { error: em } = await sb.from('MontajeObra').insert([{
      id: crypto.randomUUID(),
      cotizacionId: cot.id,
      medioElevacionId: m.medioElevacionId,
      nOperarios: m.nOperarios,
      diasObra: m.resultado.diasObra,
      hsPresencial: m.hsPresencial,
      costoElevacion: m.resultado.costoElevacion,
      costoOperarios: m.resultado.costoOperarios,
      costoHS: m.resultado.costoHS,
      costoTotal: m.resultado.costoTotal,
      margenPct: m.margenPct,
      precioVenta: m.resultado.precioVenta,
    }])
    if (em) throw new Error(`crearMontaje: ${em.message}`)
  }

  if (input.condiciones.retenciones.length > 0) {
    const retRows = input.condiciones.retenciones.map(r => ({
      id: crypto.randomUUID(),
      condicionId: cond.id,
      tipo: r.tipo,
      porcentaje: r.porcentaje,
    }))
    const { error: e4 } = await sb.from('Retencion').insert(retRows)
    if (e4) throw new Error(`crearRetenciones: ${e4.message}`)
  }

  return { id: cot.id as string, numero: cot.numero as string }
}

export async function listarCotizaciones() {
  const sb = createSupabaseAdminClient() as any
  const { data, error } = await sb
    .from('Cotizacion')
    .select('id, numero, estado, totalProducto, tcUsado, createdAt, cliente:Cliente(razonSocial)')
    .order('createdAt', { ascending: false })
  if (error) throw new Error(`listarCotizaciones: ${error.message}`)
  return (data ?? []) as Array<{
    id: string
    numero: string
    estado: string
    totalProducto: number
    tcUsado: number
    createdAt: string
    cliente: { razonSocial: string }
  }>
}

export async function leerCotizacion(id: string) {
  const sb = createSupabaseAdminClient() as any
  const { data, error } = await sb
    .from('Cotizacion')
    .select(`
      *,
      cliente:Cliente(*, contactos:Contacto(*)),
      vanos:CotizacionVano(*),
      montaje:MontajeObra(*, medio:MedioElevacion(nombre, alturaMaxM)),
      condiciones:CondicionesComerciales(*, retenciones:Retencion(*))
    `)
    .eq('id', id)
    .single()
  if (error) throw new Error(`leerCotizacion: ${error.message}`)
  return data
}

export async function listarRetencionesPct() {
  const sb = createSupabaseAdminClient() as any
  const CLAVES = ['ret_iva_pct', 'ret_ganancias_pct', 'ret_iibb_pct', 'ret_suss_pct']
  const { data, error } = await sb
    .from('ParametroCosteo')
    .select('clave, valor')
    .in('clave', CLAVES)
  if (error) throw new Error(`listarRetencionesPct: ${error.message}`)
  const m: Record<string, number> = {}
  for (const r of data ?? []) m[r.clave] = Number(r.valor)
  return {
    iva:       m['ret_iva_pct']       ?? 10.5,
    ganancias: m['ret_ganancias_pct'] ?? 2.0,
    iibb:      m['ret_iibb_pct']      ?? 3.0,
    suss:      m['ret_suss_pct']      ?? 1.2,
  }
}

export async function leerTipoCambio(): Promise<number> {
  const sb = createSupabaseAdminClient() as any
  const { data, error } = await sb
    .from('ParametroCosteo')
    .select('valor')
    .eq('clave', 'tipo_cambio')
    .single()
  if (error) throw new Error(`leerTipoCambio: ${error.message}`)
  return Number(data.valor)
}
