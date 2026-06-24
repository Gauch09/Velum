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
  costoDia: number
}

export async function listarMediosElevacion(): Promise<MedioElevacionRow[]> {
  const supabase = createSupabaseAdminClient() as any
  const { data, error } = await supabase
    .from('MedioElevacion')
    .select('id, nombre, "alturaMaxM", "costoDia"')
    .order('nombre')
  if (error) throw new Error(`listarMediosElevacion: ${error.message}`)
  return data ?? []
}

export async function actualizarMedioElevacion(id: string, costoDia: number, alturaMaxM: number): Promise<void> {
  const supabase = createSupabaseAdminClient() as any
  const { error } = await supabase
    .from('MedioElevacion')
    .update({ costoDia, alturaMaxM })
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

export async function actualizarFamilia(id: string, precioTon: number, precioM2: number, densidad: number): Promise<void> {
  const supabase = createSupabaseAdminClient() as any
  const { error } = await supabase
    .from('MaterialFamilia')
    .update({ precioTon, precioM2, densidad, actualizadoEn: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(`actualizarFamilia: ${error.message}`)
}
