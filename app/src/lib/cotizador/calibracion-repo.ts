import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import type { ParametroRow } from './parametros'

export async function listarParametros(): Promise<ParametroRow[]> {
  const supabase = createSupabaseAdminClient() as any
  const { data, error } = await supabase
    .from('ParametroCosteo')
    .select('clave, valor, unidad, descripcion')
    .order('clave', { ascending: true })
  if (error) throw new Error(`listarParametros: ${error.message}`)
  return (data ?? []) as ParametroRow[]
}

export async function actualizarParametro(clave: string, valor: number): Promise<void> {
  const supabase = createSupabaseAdminClient() as any
  const { error } = await supabase
    .from('ParametroCosteo')
    .update({ valor, actualizadoEn: new Date().toISOString() })
    .eq('clave', clave)
  if (error) throw new Error(`actualizarParametro: ${error.message}`)
}

export interface MedioElevacionRow {
  id: string
  nombre: string
  alturaMaxM: number
  costoMes: number
}

export async function listarMediosElevacion(): Promise<MedioElevacionRow[]> {
  const supabase = createSupabaseAdminClient() as any
  const { data, error } = await supabase
    .from('MedioElevacion')
    .select('id, nombre, "alturaMaxM", "costoMes"')
    .order('nombre')
  if (error) throw new Error(`listarMediosElevacion: ${error.message}`)
  return data ?? []
}

export async function actualizarMedioElevacion(id: string, costoMes: number, alturaMaxM: number): Promise<void> {
  const supabase = createSupabaseAdminClient() as any
  const { error } = await supabase
    .from('MedioElevacion')
    .update({ costoMes, alturaMaxM })
    .eq('id', id)
  if (error) throw new Error(`actualizarMedioElevacion: ${error.message}`)
}

export interface MaterialFamiliaRow {
  id: string
  nombre: string
  densidad: number
  precioTon: number
  precioM2: number
}

export async function listarFamilias(): Promise<MaterialFamiliaRow[]> {
  const supabase = createSupabaseAdminClient() as any
  const { data, error } = await supabase
    .from('MaterialFamilia')
    .select('id, nombre, densidad, "precioTon", "precioM2"')
    .order('nombre')
  if (error) throw new Error(`listarFamilias: ${error.message}`)
  return data ?? []
}

export interface CapacidadRow {
  id: string
  pieza: string
  centro: string
  unidadesPorDia: number
}

export async function listarCapacidades(): Promise<CapacidadRow[]> {
  const supabase = createSupabaseAdminClient() as any
  const { data, error } = await supabase
    .from('CapacidadCentro')
    .select('id, pieza, centro, "unidadesPorDia"')
    .order('pieza')
    .order('centro')
  if (error) throw new Error(`listarCapacidades: ${error.message}`)
  return data ?? []
}

export async function actualizarCapacidad(id: string, unidadesPorDia: number): Promise<void> {
  const supabase = createSupabaseAdminClient() as any
  const { error } = await supabase
    .from('CapacidadCentro')
    .update({ unidadesPorDia, actualizadoEn: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(`actualizarCapacidad: ${error.message}`)
}

export interface DisenoKpRow {
  id: string
  diseno: string
  kp: number
}

export async function listarDisenoKp(): Promise<DisenoKpRow[]> {
  const supabase = createSupabaseAdminClient() as any
  const { data, error } = await supabase
    .from('DisenoKp')
    .select('id, diseno, kp')
    .order('diseno')
  if (error) throw new Error(`listarDisenoKp: ${error.message}`)
  return data ?? []
}

export async function actualizarDisenoKp(id: string, kp: number): Promise<void> {
  const supabase = createSupabaseAdminClient() as any
  const { error } = await supabase
    .from('DisenoKp')
    .update({ kp, actualizadoEn: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(`actualizarDisenoKp: ${error.message}`)
}

export async function actualizarFamilia(id: string, precioTon: number, precioM2: number, densidad: number): Promise<void> {
  const supabase = createSupabaseAdminClient() as any
  const { error } = await supabase
    .from('MaterialFamilia')
    .update({ precioTon, precioM2, densidad, actualizadoEn: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(`actualizarFamilia: ${error.message}`)
}
