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
  // Familias con precioM2 > 0 (panel prefabricado: ACM, Luxsteel, etc.)
  const { data: fams, error: errF } = await supabase
    .from('MaterialFamilia')
    .select('nombre')
    .gt('precioM2', 0)
  if (errF) throw new Error(`listarMaterialesACM: ${errF.message}`)
  const nombres = (fams ?? []).map((f: { nombre: string }) => f.nombre)
  if (nombres.length === 0) return []
  const { data, error } = await supabase
    .from('MaterialVariante')
    .select('material')
    .in('familia', nombres)
    .order('material')
  if (error) throw new Error(`listarMaterialesACM: ${error.message}`)
  return (data ?? []).map((r: { material: string }) => r.material)
}

export async function listarMaterialesLuxsteel(): Promise<string[]> {
  const supabase = createSupabaseAdminClient() as any
  const { data, error } = await supabase
    .from('MaterialVariante')
    .select('material')
    .eq('familia', 'Luxsteel')
    .order('material')
  if (error) throw new Error(`listarMaterialesLuxsteel: ${error.message}`)
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
