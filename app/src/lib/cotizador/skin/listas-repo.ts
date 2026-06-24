import { createSupabaseAdminClient } from '@/lib/supabase-admin'

export async function listarMaterialesSkin(): Promise<string[]> {
  const supabase = createSupabaseAdminClient() as any
  const { data, error } = await supabase
    .from('MaterialVariante')
    .select('material')
    .order('material', { ascending: true })
  if (error) throw new Error(`listarMaterialesSkin: ${error.message}`)
  return (data ?? []).map((r: { material: string }) => r.material)
}

export async function listarMaterialesACM(): Promise<string[]> {
  const supabase = createSupabaseAdminClient() as any
  const { data, error } = await supabase
    .from('MaterialVariante')
    .select('material, MaterialFamilia!inner(precioM2)')
    .gt('MaterialFamilia.precioM2', 0)
    .order('material')
  if (error) throw new Error(`listarMaterialesACM: ${error.message}`)
  return (data ?? []).map((r: { material: string }) => r.material)
}

export async function listarDisenos(): Promise<string[]> {
  const supabase = createSupabaseAdminClient() as any
  const { data, error } = await supabase
    .from('DisenoKp')
    .select('diseno')
    .order('diseno', { ascending: true })
  if (error) throw new Error(`listarDisenos: ${error.message}`)
  return (data ?? []).map((r: { diseno: string }) => r.diseno)
}
