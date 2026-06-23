import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import type { SkinRailParams } from './tipos'
import {
  cargarSkinParams,
  cargarFamilia,
  cargarKp,
} from '@/lib/cotizador/skin/params-repo'

export { cargarFamilia, cargarKp }

// ---------------------------------------------------------------------------
// Helpers internos
// ---------------------------------------------------------------------------

function p(row: Record<string, unknown>, clave: string): number {
  const v = row[clave]
  if (v === undefined || v === null) throw new Error(`cargarSkinRailParams: falta parametro '${clave}'`)
  return Number(v)
}

function calcFab(
  centros: Array<{ unidadesPorDia: number }>,
  tasaPlanta: number,
  tipoCambio: number
): number {
  const horasPorPieza = centros
    .filter((c) => c.unidadesPorDia > 0)
    .reduce((acc, c) => acc + 8 / c.unidadesPorDia, 0)
  return horasPorPieza * tasaPlanta / tipoCambio
}

// ---------------------------------------------------------------------------
// cargarSkinRailParams
// ---------------------------------------------------------------------------

export async function cargarSkinRailParams(): Promise<SkinRailParams> {
  const supabase = createSupabaseAdminClient() as any

  // 1. Cargar parametros base de Skin
  const skinBase = await cargarSkinParams()

  // 2. Leer todos los ParametroCosteo
  const { data: rows, error: errParams } = await supabase
    .from('ParametroCosteo')
    .select('clave, valor')
  if (errParams) throw new Error(`cargarSkinRailParams/ParametroCosteo: ${errParams.message}`)

  const pm: Record<string, number> = {}
  for (const r of rows ?? []) pm[r.clave] = Number(r.valor)

  const tasaPlanta = p(pm, 'tasa_planta')
  const tipoCambio = p(pm, 'tipo_cambio')

  // 3. Leer capacidades para piezas omega
  const PIEZAS_OMEGA = ['Costilla 3000', 'Empalme Costilla']
  const { data: caps, error: errCaps } = await supabase
    .from('CapacidadCentro')
    .select('pieza, centro, unidadesPorDia')
    .in('pieza', PIEZAS_OMEGA)
  if (errCaps) throw new Error(`cargarSkinRailParams/CapacidadCentro: ${errCaps.message}`)

  const capsByPieza: Record<string, Array<{ unidadesPorDia: number }>> = {}
  for (const pieza of PIEZAS_OMEGA) capsByPieza[pieza] = []
  for (const c of caps ?? []) {
    const upd = Number(c.unidadesPorDia)
    if (upd > 0) capsByPieza[c.pieza].push({ unidadesPorDia: upd })
  }

  // fabOmegaM = fabCostilla3000 / 3
  const fabOmegaM = calcFab(capsByPieza['Costilla 3000'], tasaPlanta, tipoCambio) / 3
  // fabEmpalleC = same as fabEmpalme (Empalme Costilla)
  const fabEmpalleC = calcFab(capsByPieza['Empalme Costilla'], tasaPlanta, tipoCambio)

  return {
    ...skinBase,
    omegaArea3m:    p(pm, 'omega_area_3m'),
    omegaEspMm:     p(pm, 'omega_espesor_mm'),
    omegaTramoMaxM: p(pm, 'omega_tramo_max_m'),
    empalmeCAreaM2: p(pm, 'empalme_c_area_m2'),
    fabOmegaM,
    fabEmpalleC,
  }
}
