// Prueba de cotizacion Skin leyendo parametros en vivo de Supabase.
// Uso: ts-node scripts/cotizar-prueba.ts [ancho] [alto] [material] [diseno] [alcance] [margen]
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { createClient } from '@supabase/supabase-js'
import { cotizarSkin } from '../src/lib/cotizador/skin/cotizarSkin'
import type { SkinInput, SkinParams } from '../src/lib/cotizador/skin/tipos'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const sb = createClient(URL, KEY)

const [,, anchoA, altoA, materialA, disenoA, alcanceA, margenA] = process.argv
const ancho = Number(anchoA ?? 30)
const alto = Number(altoA ?? 25)
const material = materialA ?? 'Bond 4mm'
const diseno = disenoA ?? 'Composite'
const alcance = (alcanceA ?? 'Completo + Estructura') as SkinInput['alcance']
const margenPct = Number(margenA ?? 1.5)

async function main() {
  // Escalares
  const { data: pcRows, error: e1 } = await sb.from('ParametroCosteo').select('clave, valor')
  if (e1) throw new Error('ParametroCosteo: ' + e1.message)
  const P: Record<string, number> = {}
  for (const r of pcRows!) P[r.clave] = r.valor
  const tasa = P['tasa_planta'], tc = P['tipo_cambio']

  // Fab por pieza = (8 * sum(1/cap)) * tasa / TC
  const { data: capRows, error: e2 } = await sb.from('CapacidadCentro').select('pieza, unidadesPorDia')
  if (e2) throw new Error('CapacidadCentro: ' + e2.message)
  const fab = (pieza: string) => {
    const rows = capRows!.filter(r => r.pieza === pieza && r.unidadesPorDia && r.unidadesPorDia > 0)
    const horas = rows.reduce((a, r) => a + 8 / r.unidadesPorDia!, 0)
    return horas * tasa / tc
  }

  // Familia + espesor del material
  const { data: varRows, error: e3 } = await sb.from('MaterialVariante').select('familia, espesorMm').eq('material', material).limit(1)
  if (e3) throw new Error('MaterialVariante: ' + e3.message)
  if (!varRows || varRows.length === 0) throw new Error(`Material '${material}' no esta en MaterialVariante`)
  const { familia: famNombre, espesorMm } = varRows[0]
  const { data: famRows, error: e4 } = await sb.from('MaterialFamilia').select('densidad, precioTon, precioM2').eq('nombre', famNombre).limit(1)
  if (e4) throw new Error('MaterialFamilia: ' + e4.message)
  if (!famRows || famRows.length === 0) throw new Error(`Familia '${famNombre}' no esta en MaterialFamilia`)
  const fam = famRows[0]

  // Kp del diseno
  const { data: kpRows, error: e5 } = await sb.from('DisenoKp').select('kp').eq('diseno', diseno).limit(1)
  if (e5) throw new Error('DisenoKp: ' + e5.message)
  if (!kpRows || kpRows.length === 0) throw new Error(`Diseno '${diseno}' no esta en DisenoKp`)
  const kp = kpRows[0].kp

  const params: SkinParams = {
    galvDensidad: P['galv_densidad'], galvPrecioTon: P['galv_precio_ton'],
    costillaAreaM2: P['skin_costilla_area'], costillaEspesorMm: P['skin_costilla_espesor'],
    mensulaAreaM2: P['skin_mensula_area'], mensulaEspesorMm: P['skin_mensula_espesor'],
    empalmeAreaM2: P['skin_empalme_area'], empalmeEspesorMm: P['skin_empalme_espesor'],
    acmAccPorPanel: P['acm_acc_panel'], acmAccCosto: P['acm_acc_costo'],
    areaPlaca: P['acm_area_placa'], fabPlaca: P['acm_fab_placa'],
    fabPanelSkin: fab('Skin Standard'), fabCostilla3000: fab('Costilla 3000'),
    fabMensula: fab('PIC 150 (mensula)'), fabEmpalme: fab('Empalme Costilla'),
    paranteBase: P['parante_base'] ?? 0,
    polvo: P['pintura_polvo'], cobertura: P['pintura_cobertura'], sobreaplic: P['pintura_sobreaplic'],
    costoHorneada: P['pintura_horneada_costo'], piezasHorneada: P['pintura_horneada_piezas'],
    brocaCosto: P['fijacion_broca'], autoperfCosto: P['fijacion_autoperf'],
    fresadoCostoM2:   P['fresado_costo_m2'] ?? 6,
    anodizadoCostoM2: P['anodizado_costo_m2'] ?? 18,
  }

  const input: SkinInput = {
    ancho, alto, modAncho: 1, modAlto: 1, sepParedMm: 0, margenPct,
    kp, espesorMm, familia: { nombre: famNombre, densidad: fam.densidad, precioTon: fam.precioTon, precioM2: fam.precioM2 },
    alcance,
  }

  const r = cotizarSkin(input, params)
  const f = (n: number) => n.toLocaleString('es-AR', { maximumFractionDigits: 2 })

  console.log('\n========== COTIZACION SKIN (datos en vivo de Supabase) ==========')
  console.log(`Vano: ${ancho} x ${alto} m  |  Material: ${material} (${famNombre}, ${espesorMm}mm)  |  Diseno: ${diseno} (Kp ${kp})`)
  console.log(`Terminacion: ${alcance}  |  Margen: ${margenPct * 100}%`)
  console.log('-----------------------------------------------------------------')
  console.log(`Area fachada:        ${f(r.geometria.area)} m2   (${r.geometria.paneles} paneles, ${r.geometria.costillas} costillas, ${r.geometria.mensulasTotal} mensulas)`)
  console.log('-----------------------------------------------------------------')
  console.log(`Material:            u$d ${f(r.material)}`)
  console.log(`Fabricacion:         u$d ${f(r.fab)}`)
  console.log(`Pintura:             u$d ${f(r.pintura)}`)
  console.log(`Tornilleria:         u$d ${f(r.tornilleria)}`)
  console.log(`Parantes:            u$d ${f(r.parantes)}`)
  console.log('-----------------------------------------------------------------')
  console.log(`COSTO TOTAL:         u$d ${f(r.costoTotal)}   (${f(r.costoM2)} u$d/m2)`)
  console.log(`PRECIO DE VENTA:     u$d ${f(r.precioVenta)}   (${f(r.precioM2)} u$d/m2)`)
  console.log('=================================================================\n')
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1) })
