import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import type { ParamsMontaje } from './calcularMontaje'

export interface MedioElevacion {
  id: string
  nombre: string
  alturaMaxM: number
  costoDia: number
}

export async function listarMediosElevacion(): Promise<MedioElevacion[]> {
  const sb = createSupabaseAdminClient() as any
  const { data, error } = await sb
    .from('MedioElevacion')
    .select('id, nombre, "alturaMaxM", "costoDia"')
    .order('nombre')
  if (error) throw new Error(`listarMediosElevacion: ${error.message}`)
  return data ?? []
}

export async function cargarParamsMontaje(): Promise<ParamsMontaje> {
  const sb = createSupabaseAdminClient() as any
  const CLAVES = [
    'montaje_jornal_usd_h',
    'montaje_vianda_usd_dia',
    'montaje_hs_usd_h',
    'montaje_rendimiento_m2_op',
    'montaje_horas_dia',
  ]
  const { data, error } = await sb
    .from('ParametroCosteo')
    .select('clave, valor')
    .in('clave', CLAVES)
  if (error) throw new Error(`cargarParamsMontaje: ${error.message}`)
  const m: Record<string, number> = {}
  for (const r of data ?? []) m[r.clave] = Number(r.valor)
  return {
    jornalUsdH:       m['montaje_jornal_usd_h']       ?? 39,
    viandaUsdDia:     m['montaje_vianda_usd_dia']     ?? 10,
    hsUsdH:           m['montaje_hs_usd_h']           ?? 50,
    rendimientoM2Op:  m['montaje_rendimiento_m2_op']  ?? 20,
    horasDia:         m['montaje_horas_dia']          ?? 8,
  }
}
