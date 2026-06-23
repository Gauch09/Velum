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
