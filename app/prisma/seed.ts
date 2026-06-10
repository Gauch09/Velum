import * as dotenv from 'dotenv'
import * as path from 'path'
dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

import { createClient } from '@supabase/supabase-js'
import { createId } from '@paralleldrive/cuid2'

// Use supabase-js (REST) for seeding — the pg pooler connection is blocked in this environment
const supabase = createClient(
  process.env['NEXT_PUBLIC_SUPABASE_URL']!,
  process.env['SUPABASE_SERVICE_ROLE_KEY']!,
)

const MAQUINAS = [
  { nombre: 'Láser',           tipo: 'LASER' },
  { nombre: 'Punzonadora CNC', tipo: 'PUNZONADORA_CNC' },
  { nombre: 'Fresadora',       tipo: 'FRESADORA' },
  { nombre: 'Expansora',       tipo: 'EXPANSORA' },
  { nombre: 'Plegadora',       tipo: 'PLEGADORA' },
  { nombre: 'Lavado',          tipo: 'LAVADO' },
  { nombre: 'Pintado',         tipo: 'PINTADO' },
  { nombre: 'Horno',           tipo: 'HORNO' },
  { nombre: 'Embalaje',        tipo: 'EMBALAJE' },
  { nombre: 'Despacho',        tipo: 'DESPACHO' },
] as const

const RUTAS: {
  sistema: string
  producto: string
  etapas: { maquinaTipo: string; ordenSecuencia: number; nombreEtapa: string; umbralActivacion: number }[]
}[] = [
  // ── SHEET ──────────────────────────────────────────────────────────────
  {
    sistema: 'Sheet', producto: 'MultiSlim.A',
    etapas: [
      { maquinaTipo: 'PUNZONADORA_CNC', ordenSecuencia: 1, nombreEtapa: 'Punzonado',  umbralActivacion: 50 },
      { maquinaTipo: 'PLEGADORA',       ordenSecuencia: 2, nombreEtapa: 'Plegado',    umbralActivacion: 40 },
      { maquinaTipo: 'LAVADO',          ordenSecuencia: 3, nombreEtapa: 'Lavado',     umbralActivacion: 30 },
      { maquinaTipo: 'PINTADO',         ordenSecuencia: 4, nombreEtapa: 'Pintado',    umbralActivacion: 20 },
      { maquinaTipo: 'HORNO',           ordenSecuencia: 5, nombreEtapa: 'Curado',     umbralActivacion: 100 },
      { maquinaTipo: 'EMBALAJE',        ordenSecuencia: 6, nombreEtapa: 'Embalaje',   umbralActivacion: 100 },
      { maquinaTipo: 'DESPACHO',        ordenSecuencia: 7, nombreEtapa: 'Despacho',   umbralActivacion: 100 },
    ],
  },
  {
    sistema: 'Sheet', producto: 'MultiSlim.C',
    etapas: [
      { maquinaTipo: 'PUNZONADORA_CNC', ordenSecuencia: 1, nombreEtapa: 'Punzonado',  umbralActivacion: 50 },
      { maquinaTipo: 'PLEGADORA',       ordenSecuencia: 2, nombreEtapa: 'Plegado',    umbralActivacion: 40 },
      { maquinaTipo: 'LAVADO',          ordenSecuencia: 3, nombreEtapa: 'Lavado',     umbralActivacion: 30 },
      { maquinaTipo: 'PINTADO',         ordenSecuencia: 4, nombreEtapa: 'Pintado',    umbralActivacion: 20 },
      { maquinaTipo: 'HORNO',           ordenSecuencia: 5, nombreEtapa: 'Curado',     umbralActivacion: 100 },
      { maquinaTipo: 'EMBALAJE',        ordenSecuencia: 6, nombreEtapa: 'Embalaje',   umbralActivacion: 100 },
      { maquinaTipo: 'DESPACHO',        ordenSecuencia: 7, nombreEtapa: 'Despacho',   umbralActivacion: 100 },
    ],
  },
  {
    sistema: 'Sheet', producto: 'StandardFlat',
    etapas: [
      { maquinaTipo: 'LASER',    ordenSecuencia: 1, nombreEtapa: 'Corte láser', umbralActivacion: 50 },
      { maquinaTipo: 'PLEGADORA',ordenSecuencia: 2, nombreEtapa: 'Plegado',     umbralActivacion: 40 },
      { maquinaTipo: 'PINTADO',  ordenSecuencia: 3, nombreEtapa: 'Pintado',     umbralActivacion: 20 },
      { maquinaTipo: 'HORNO',    ordenSecuencia: 4, nombreEtapa: 'Curado',      umbralActivacion: 100 },
      { maquinaTipo: 'EMBALAJE', ordenSecuencia: 5, nombreEtapa: 'Embalaje',    umbralActivacion: 100 },
      { maquinaTipo: 'DESPACHO', ordenSecuencia: 6, nombreEtapa: 'Despacho',    umbralActivacion: 100 },
    ],
  },
  // ── SKIN ───────────────────────────────────────────────────────────────
  {
    sistema: 'Skin', producto: 'Standard',
    etapas: [
      { maquinaTipo: 'PUNZONADORA_CNC', ordenSecuencia: 1, nombreEtapa: 'Punzonado',  umbralActivacion: 50 },
      { maquinaTipo: 'EXPANSORA',       ordenSecuencia: 2, nombreEtapa: 'Expansión',  umbralActivacion: 40 },
      { maquinaTipo: 'LAVADO',          ordenSecuencia: 3, nombreEtapa: 'Lavado',     umbralActivacion: 30 },
      { maquinaTipo: 'PINTADO',         ordenSecuencia: 4, nombreEtapa: 'Pintado',    umbralActivacion: 20 },
      { maquinaTipo: 'HORNO',           ordenSecuencia: 5, nombreEtapa: 'Curado',     umbralActivacion: 100 },
      { maquinaTipo: 'EMBALAJE',        ordenSecuencia: 6, nombreEtapa: 'Embalaje',   umbralActivacion: 100 },
      { maquinaTipo: 'DESPACHO',        ordenSecuencia: 7, nombreEtapa: 'Despacho',   umbralActivacion: 100 },
    ],
  },
  // ── RAIL ───────────────────────────────────────────────────────────────
  {
    sistema: 'Rail', producto: 'MultiSlim.A',
    etapas: [
      { maquinaTipo: 'LASER',    ordenSecuencia: 1, nombreEtapa: 'Corte láser', umbralActivacion: 50 },
      { maquinaTipo: 'PLEGADORA',ordenSecuencia: 2, nombreEtapa: 'Plegado',     umbralActivacion: 40 },
      { maquinaTipo: 'LAVADO',   ordenSecuencia: 3, nombreEtapa: 'Lavado',      umbralActivacion: 30 },
      { maquinaTipo: 'PINTADO',  ordenSecuencia: 4, nombreEtapa: 'Pintado',     umbralActivacion: 20 },
      { maquinaTipo: 'HORNO',    ordenSecuencia: 5, nombreEtapa: 'Curado',      umbralActivacion: 100 },
      { maquinaTipo: 'EMBALAJE', ordenSecuencia: 6, nombreEtapa: 'Embalaje',    umbralActivacion: 100 },
      { maquinaTipo: 'DESPACHO', ordenSecuencia: 7, nombreEtapa: 'Despacho',    umbralActivacion: 100 },
    ],
  },
  // ── CLAD ───────────────────────────────────────────────────────────────
  {
    sistema: 'Clad', producto: 'Triangle',
    etapas: [
      { maquinaTipo: 'LASER',    ordenSecuencia: 1, nombreEtapa: 'Corte láser', umbralActivacion: 50 },
      { maquinaTipo: 'PLEGADORA',ordenSecuencia: 2, nombreEtapa: 'Plegado',     umbralActivacion: 40 },
      { maquinaTipo: 'LAVADO',   ordenSecuencia: 3, nombreEtapa: 'Lavado',      umbralActivacion: 30 },
      { maquinaTipo: 'PINTADO',  ordenSecuencia: 4, nombreEtapa: 'Pintado',     umbralActivacion: 20 },
      { maquinaTipo: 'HORNO',    ordenSecuencia: 5, nombreEtapa: 'Curado',      umbralActivacion: 100 },
      { maquinaTipo: 'EMBALAJE', ordenSecuencia: 6, nombreEtapa: 'Embalaje',    umbralActivacion: 100 },
      { maquinaTipo: 'DESPACHO', ordenSecuencia: 7, nombreEtapa: 'Despacho',    umbralActivacion: 100 },
    ],
  },
]

async function main() {
  console.log('Seeding machines...')
  const maquinasPorTipo: Record<string, string> = {}

  for (const m of MAQUINAS) {
    // Fetch existing by tipo (unique)
    const { data: existing } = await supabase
      .from('Maquina')
      .select('id')
      .eq('tipo', m.tipo)
      .maybeSingle()

    if (existing) {
      // Update nombre
      const { error } = await supabase
        .from('Maquina')
        .update({ nombre: m.nombre })
        .eq('tipo', m.tipo)
      if (error) throw new Error(`Maquina update ${m.tipo}: ${error.message}`)
      maquinasPorTipo[m.tipo] = existing.id
    } else {
      // Insert with generated cuid
      const id = createId()
      const { data, error } = await supabase
        .from('Maquina')
        .insert({ id, nombre: m.nombre, tipo: m.tipo })
        .select('id')
        .single()
      if (error) throw new Error(`Maquina insert ${m.tipo}: ${error.message}`)
      maquinasPorTipo[m.tipo] = data.id
    }
    console.log(`  ✓ ${m.nombre}`)
  }

  console.log('\nSeeding routes...')
  for (const r of RUTAS) {
    if (r.etapas.length === 0) continue

    const { data: existing } = await supabase
      .from('Ruta')
      .select('id')
      .eq('sistema', r.sistema)
      .eq('producto', r.producto)
      .maybeSingle()

    if (existing) {
      console.log(`  ~ ${r.sistema}/${r.producto} (already exists, skipping)`)
      continue
    }

    // Insert Ruta with generated cuid
    const rutaId = createId()
    const { data: ruta, error: rutaErr } = await supabase
      .from('Ruta')
      .insert({ id: rutaId, sistema: r.sistema, producto: r.producto })
      .select('id')
      .single()
    if (rutaErr) throw new Error(`Ruta insert ${r.sistema}/${r.producto}: ${rutaErr.message}`)

    // Insert EtapaRutas with generated cuids
    const etapas = r.etapas.map(e => ({
      id:               createId(),
      rutaId:           ruta.id,
      maquinaId:        maquinasPorTipo[e.maquinaTipo],
      ordenSecuencia:   e.ordenSecuencia,
      nombreEtapa:      e.nombreEtapa,
      umbralActivacion: e.umbralActivacion,
    }))
    const { error: etapasErr } = await supabase.from('EtapaRuta').insert(etapas)
    if (etapasErr) throw new Error(`EtapaRuta insert for ${r.sistema}/${r.producto}: ${etapasErr.message}`)

    console.log(`  ✓ ${r.sistema}/${r.producto}`)
  }

  console.log('\nSeed complete.')
}

main().catch(e => { console.error(e); process.exit(1) })
