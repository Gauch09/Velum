import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import type { SkinParams, FamiliaParams } from './tipos'

// ---------------------------------------------------------------------------
// Helpers internos
// ---------------------------------------------------------------------------

function p(row: Record<string, unknown>, clave: string): number {
  const v = row[clave]
  if (v === undefined || v === null) throw new Error(`cargarSkinParams: falta parametro '${clave}'`)
  return Number(v)
}

/**
 * Dado un mapa pieza -> lista de centros con su capacidad (pz/dia),
 * calcula el costo de fabricacion en u$d/pieza.
 *   fab = 8h * sum(1/cap_dia over centros with cap>0) * tasa_planta / tipo_cambio
 * La logica es: cada centro aporta 8/(cap_dia) horas-planta por pieza.
 */
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
// cargarSkinParams
// ---------------------------------------------------------------------------

export async function cargarSkinParams(): Promise<SkinParams> {
  const supabase = createSupabaseAdminClient() as any

  // 1. Leer todos los ParametroCosteo de una vez
  const { data: rows, error: errParams } = await supabase
    .from('ParametroCosteo')
    .select('clave, valor')
  if (errParams) throw new Error(`cargarSkinParams/ParametroCosteo: ${errParams.message}`)

  const pm: Record<string, number> = {}
  for (const r of rows ?? []) pm[r.clave] = Number(r.valor)

  // 2. Leer CapacidadCentro para las 4 piezas Skin
  const PIEZAS = ['Skin Standard', 'Costilla 3000', 'PIC 150 (mensula)', 'Empalme Costilla']
  const { data: caps, error: errCaps } = await supabase
    .from('CapacidadCentro')
    .select('pieza, centro, unidadesPorDia')
    .in('pieza', PIEZAS)
  if (errCaps) throw new Error(`cargarSkinParams/CapacidadCentro: ${errCaps.message}`)

  const capsByPieza: Record<string, Array<{ unidadesPorDia: number }>> = {}
  for (const pieza of PIEZAS) capsByPieza[pieza] = []
  for (const c of caps ?? []) {
    const upd = Number(c.unidadesPorDia)
    if (upd > 0) capsByPieza[c.pieza].push({ unidadesPorDia: upd })
  }

  // Escalares requeridos
  const tasaPlanta = p(pm, 'tasa_planta')
  const tipoCambio = p(pm, 'tipo_cambio')

  // fab piezas (u$d/pieza)
  const fabPanelSkin    = calcFab(capsByPieza['Skin Standard'],       tasaPlanta, tipoCambio)
  const fabCostilla3000 = calcFab(capsByPieza['Costilla 3000'],       tasaPlanta, tipoCambio)
  const fabMensula      = calcFab(capsByPieza['PIC 150 (mensula)'],   tasaPlanta, tipoCambio)
  const fabEmpalme      = calcFab(capsByPieza['Empalme Costilla'],    tasaPlanta, tipoCambio)

  return {
    galvDensidad:      p(pm, 'galv_densidad'),
    galvPrecioTon:     p(pm, 'galv_precio_ton'),
    costillaAreaM2:    p(pm, 'skin_costilla_area'),
    costillaEspesorMm: p(pm, 'skin_costilla_espesor'),
    mensulaAreaM2:     p(pm, 'skin_mensula_area'),
    mensulaEspesorMm:  p(pm, 'skin_mensula_espesor'),
    empalmeAreaM2:     p(pm, 'skin_empalme_area'),
    empalmeEspesorMm:  p(pm, 'skin_empalme_espesor'),
    acmAccPorPanel:    p(pm, 'acm_acc_panel'),
    acmAccCosto:       p(pm, 'acm_acc_costo'),
    areaPlaca:         p(pm, 'acm_area_placa'),
    fabPlaca:          p(pm, 'acm_fab_placa'),
    fabPanelSkin,
    fabCostilla3000,
    fabMensula,
    fabEmpalme,
    paranteBase:       pm['parante_base'] ?? 0,
    polvo:             p(pm, 'pintura_polvo'),
    cobertura:         p(pm, 'pintura_cobertura'),
    sobreaplic:        p(pm, 'pintura_sobreaplic'),
    costoHorneada:     p(pm, 'pintura_horneada_costo'),
    piezasHorneada:    p(pm, 'pintura_horneada_piezas'),
    brocaCosto:        p(pm, 'fijacion_broca'),
    autoperfCosto:     p(pm, 'fijacion_autoperf'),
    fresadoCostoM2:    pm['fresado_costo_m2'] ?? 6,
    anodizadoCostoM2:  pm['anodizado_costo_m2'] ?? 18,
  }
}

// ---------------------------------------------------------------------------
// cargarFamilia
// ---------------------------------------------------------------------------

export interface FamiliaConEspesor extends FamiliaParams {
  espesorMm: number
}

export async function cargarFamilia(material: string): Promise<FamiliaConEspesor> {
  const supabase = createSupabaseAdminClient() as any

  // Obtener variante
  const { data: variante, error: errV } = await supabase
    .from('MaterialVariante')
    .select('familia, espesorMm')
    .eq('material', material)
    .single()
  if (errV || !variante) {
    throw new Error(`cargarFamilia: variante '${material}' no encontrada${errV ? ` — ${errV.message}` : ''}`)
  }

  // Obtener familia
  const { data: familia, error: errF } = await supabase
    .from('MaterialFamilia')
    .select('nombre, densidad, precioTon, precioM2')
    .eq('nombre', variante.familia)
    .single()
  if (errF || !familia) {
    throw new Error(`cargarFamilia: familia '${variante.familia}' no encontrada${errF ? ` — ${errF.message}` : ''}`)
  }

  return {
    nombre:    familia.nombre    as string,
    densidad:  Number(familia.densidad),
    precioTon: Number(familia.precioTon),
    precioM2:  Number(familia.precioM2),
    espesorMm: Number(variante.espesorMm),
  }
}

// ---------------------------------------------------------------------------
// cargarKp
// ---------------------------------------------------------------------------

export async function cargarKp(diseno: string): Promise<number> {
  const supabase = createSupabaseAdminClient() as any

  const { data, error } = await supabase
    .from('DisenoKp')
    .select('kp')
    .eq('diseno', diseno)
    .single()
  if (error || !data) {
    throw new Error(`cargarKp: diseno '${diseno}' no encontrado${error ? ` — ${error.message}` : ''}`)
  }
  return Number(data.kp)
}
