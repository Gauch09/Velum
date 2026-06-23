import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import type { RailParams } from './tipos'

// ---------------------------------------------------------------------------
// Reexportar helpers de skin para uso externo
// ---------------------------------------------------------------------------
export { cargarFamilia, cargarKp } from '@/lib/cotizador/skin/params-repo'

// ---------------------------------------------------------------------------
// Helpers internos
// ---------------------------------------------------------------------------

function p(pm: Record<string, number>, clave: string): number {
  const v = pm[clave]
  if (v === undefined || v === null) throw new Error(`cargarRailParams: falta parametro '${clave}'`)
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
// cargarRailParams
// ---------------------------------------------------------------------------

export async function cargarRailParams(): Promise<RailParams> {
  const supabase = createSupabaseAdminClient() as any

  // 1. Leer todos los ParametroCosteo de una vez
  const { data: rows, error: errParams } = await supabase
    .from('ParametroCosteo')
    .select('clave, valor')
  if (errParams) throw new Error(`cargarRailParams/ParametroCosteo: ${errParams.message}`)

  const pm: Record<string, number> = {}
  for (const r of rows ?? []) pm[r.clave] = Number(r.valor)

  // 2. Leer CapacidadCentro para las 4 piezas Rail
  const PIEZAS = ['MultiSlim Standard', 'Costilla 3000', 'PIC 150 (mensula)', 'Empalme Costilla']
  const { data: caps, error: errCaps } = await supabase
    .from('CapacidadCentro')
    .select('pieza, centro, unidadesPorDia')
    .in('pieza', PIEZAS)
  if (errCaps) throw new Error(`cargarRailParams/CapacidadCentro: ${errCaps.message}`)

  const capsByPieza: Record<string, Array<{ unidadesPorDia: number }>> = {}
  for (const pieza of PIEZAS) capsByPieza[pieza] = []
  for (const c of caps ?? []) {
    const upd = Number(c.unidadesPorDia)
    if (upd > 0) capsByPieza[c.pieza].push({ unidadesPorDia: upd })
  }

  const tasaPlanta = p(pm, 'tasa_planta')
  const tipoCambio = p(pm, 'tipo_cambio')

  const fabLama    = calcFab(capsByPieza['MultiSlim Standard'],  tasaPlanta, tipoCambio)
  const fabOmegaM  = calcFab(capsByPieza['Costilla 3000'],       tasaPlanta, tipoCambio) / 3
  const fabPIC     = calcFab(capsByPieza['PIC 150 (mensula)'],   tasaPlanta, tipoCambio)
  const fabEmpalleC = calcFab(capsByPieza['Empalme Costilla'],   tasaPlanta, tipoCambio)

  return {
    galvDensidad:   p(pm, 'galv_densidad'),
    galvPrecioTon:  p(pm, 'galv_precio_ton'),
    lamaAnchoM:     0.3,
    lamaAltoMaxM:   3.0,
    omegaArea3m:    p(pm, 'omega_area_3m'),
    omegaEspMm:     p(pm, 'omega_espesor_mm'),
    omegaTramoMaxM: p(pm, 'omega_tramo_max_m'),
    sepOmegaVertM:  p(pm, 'sep_omega_vert_m'),
    picAreaM2:      p(pm, 'skin_mensula_area'),
    picEspMm:       p(pm, 'skin_mensula_espesor'),
    empalmeCAreaM2: p(pm, 'empalme_c_area_m2'),
    costoT1:        p(pm, 'costo_t1'),
    costoBroca:     p(pm, 'fijacion_broca'),
    costoAutoperf:  p(pm, 'fijacion_autoperf'),
    polvo:          p(pm, 'pintura_polvo'),
    cobertura:      p(pm, 'pintura_cobertura'),
    sobreaplic:     p(pm, 'pintura_sobreaplic'),
    costoHorneada:  p(pm, 'pintura_horneada_costo'),
    piezasHorneada: p(pm, 'pintura_horneada_piezas'),
    fabLama,
    fabOmegaM,
    fabPIC,
    fabEmpalleC,
  }
}
