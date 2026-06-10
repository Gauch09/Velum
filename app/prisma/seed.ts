import * as dotenv from 'dotenv'
import * as path from 'path'
dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

import { createClient } from '@supabase/supabase-js'
import { createId } from '@paralleldrive/cuid2'

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

type MaquinaTipo = typeof MAQUINAS[number]['tipo']

interface Etapa {
  maquinaTipo: MaquinaTipo
  ordenSecuencia: number
  nombreEtapa: string
  umbralActivacion: number
}

interface RutaDef {
  sistema: string
  producto: string
  etapas: Etapa[]
}

// ── Builders por tipo de flujo ─────────────────────────────────────────────
//
// Nota: umbralActivacion en etapa[i] = % que etapa[i-1] debe alcanzar para activar etapa[i].
// (la cascada evalúa: etapaActual.porcentaje >= etapaSiguiente.umbralActivacion)
// El valor de seq 1 no se usa (se activa al crear la orden), se pone 50 por convención.
//
// TIPO A: Punzonadora CNC como default para M1 ó M2.
// La elección Láser vs Punzonadora se aplica por pedido — feature pendiente en UI.

function tipoA(sistema: string, producto: string): RutaDef {
  return {
    sistema, producto,
    etapas: [
      { maquinaTipo: 'PUNZONADORA_CNC', ordenSecuencia: 1, nombreEtapa: 'Punzonado',  umbralActivacion: 50  },
      { maquinaTipo: 'PLEGADORA',       ordenSecuencia: 2, nombreEtapa: 'Plegado',    umbralActivacion: 40  },
      { maquinaTipo: 'LAVADO',          ordenSecuencia: 3, nombreEtapa: 'Lavado',     umbralActivacion: 30  },
      { maquinaTipo: 'PINTADO',         ordenSecuencia: 4, nombreEtapa: 'Pintado',    umbralActivacion: 20  },
      { maquinaTipo: 'HORNO',           ordenSecuencia: 5, nombreEtapa: 'Curado',     umbralActivacion: 100 },
      { maquinaTipo: 'EMBALAJE',        ordenSecuencia: 6, nombreEtapa: 'Embalaje',   umbralActivacion: 100 },
      { maquinaTipo: 'DESPACHO',        ordenSecuencia: 7, nombreEtapa: 'Despacho',   umbralActivacion: 100 },
    ],
  }
}

function tipoB(sistema: string, producto: string): RutaDef {
  return {
    sistema, producto,
    etapas: [
      { maquinaTipo: 'LASER',    ordenSecuencia: 1, nombreEtapa: 'Corte láser', umbralActivacion: 50  },
      { maquinaTipo: 'PLEGADORA',ordenSecuencia: 2, nombreEtapa: 'Plegado',     umbralActivacion: 40  },
      { maquinaTipo: 'LAVADO',   ordenSecuencia: 3, nombreEtapa: 'Lavado',      umbralActivacion: 30  },
      { maquinaTipo: 'PINTADO',  ordenSecuencia: 4, nombreEtapa: 'Pintado',     umbralActivacion: 20  },
      { maquinaTipo: 'HORNO',    ordenSecuencia: 5, nombreEtapa: 'Curado',      umbralActivacion: 100 },
      { maquinaTipo: 'EMBALAJE', ordenSecuencia: 6, nombreEtapa: 'Embalaje',    umbralActivacion: 100 },
      { maquinaTipo: 'DESPACHO', ordenSecuencia: 7, nombreEtapa: 'Despacho',    umbralActivacion: 100 },
    ],
  }
}

function tipoC(sistema: string, producto: string): RutaDef {
  // ACM / Aluminio Compuesto — sin pintura ni horno
  return {
    sistema, producto,
    etapas: [
      { maquinaTipo: 'FRESADORA',       ordenSecuencia: 1, nombreEtapa: 'Fresado',   umbralActivacion: 50  },
      { maquinaTipo: 'PUNZONADORA_CNC', ordenSecuencia: 2, nombreEtapa: 'Punzonado', umbralActivacion: 100 },
      { maquinaTipo: 'EMBALAJE',        ordenSecuencia: 3, nombreEtapa: 'Embalaje',  umbralActivacion: 100 },
      { maquinaTipo: 'DESPACHO',        ordenSecuencia: 4, nombreEtapa: 'Despacho',  umbralActivacion: 100 },
    ],
  }
}

function tipoD(sistema: string, producto: string): RutaDef {
  // Metal expandido
  return {
    sistema, producto,
    etapas: [
      { maquinaTipo: 'EXPANSORA', ordenSecuencia: 1, nombreEtapa: 'Expansión', umbralActivacion: 50  },
      { maquinaTipo: 'PLEGADORA', ordenSecuencia: 2, nombreEtapa: 'Plegado',   umbralActivacion: 40  },
      { maquinaTipo: 'LAVADO',    ordenSecuencia: 3, nombreEtapa: 'Lavado',    umbralActivacion: 30  },
      { maquinaTipo: 'PINTADO',   ordenSecuencia: 4, nombreEtapa: 'Pintado',   umbralActivacion: 20  },
      { maquinaTipo: 'HORNO',     ordenSecuencia: 5, nombreEtapa: 'Curado',    umbralActivacion: 100 },
      { maquinaTipo: 'EMBALAJE',  ordenSecuencia: 6, nombreEtapa: 'Embalaje',  umbralActivacion: 100 },
      { maquinaTipo: 'DESPACHO',  ordenSecuencia: 7, nombreEtapa: 'Despacho',  umbralActivacion: 100 },
    ],
  }
}

function tipoE(sistema: string, producto: string): RutaDef {
  // Madera / PlyWood / Melamina — sin pintura ni horno
  return {
    sistema, producto,
    etapas: [
      { maquinaTipo: 'FRESADORA', ordenSecuencia: 1, nombreEtapa: 'Fresado',  umbralActivacion: 50  },
      { maquinaTipo: 'EMBALAJE',  ordenSecuencia: 2, nombreEtapa: 'Embalaje', umbralActivacion: 100 },
      { maquinaTipo: 'DESPACHO',  ordenSecuencia: 3, nombreEtapa: 'Despacho', umbralActivacion: 100 },
    ],
  }
}

// TIPO F = misma secuencia que TIPO A (base variable, Punzonadora como default)
const tipoF = tipoA

// ── Catálogo completo de rutas ─────────────────────────────────────────────

const RUTAS: RutaDef[] = [
  // SHEET ─────────────────────────────────────────────────────────────────
  tipoA('Sheet', 'StandardFlat'),
  tipoA('Sheet', 'CustomFlat'),
  tipoA('Sheet', 'CustomPanel'),
  tipoA('Sheet', 'MultiSlim.A'),
  tipoA('Sheet', 'MultiSlim.C'),
  tipoA('Sheet', 'MultiSlim.D'),
  tipoA('Sheet', 'MultiSlim.E'),
  tipoA('Sheet', 'MultiSlim.I'),
  tipoA('Sheet', 'MultiSlim.L'),
  tipoA('Sheet', 'MultiSlim.O'),
  tipoA('Sheet', 'MultiSlim.V'),
  tipoA('Sheet', 'MultiSlim.W'),
  tipoA('Sheet', 'MultiSlim.U'),
  tipoA('Sheet', 'Triangle'),
  tipoA('Sheet', 'Square'),
  tipoA('Sheet', 'Diamond'),

  // SKIN ──────────────────────────────────────────────────────────────────
  tipoA('Skin', 'Standard'),
  tipoA('Skin', 'Prism'),
  tipoB('Skin', 'Lattice'),
  tipoA('Skin', 'Crossbar'),
  tipoD('Skin', 'Expanded'),
  tipoC('Skin', 'Composite'),
  tipoA('Skin', 'Cinetik'),

  // SKIN.RAIL ─────────────────────────────────────────────────────────────
  tipoA('Skin.Rail', 'MultiSlim.A'),
  tipoA('Skin.Rail', 'MultiSlim.C'),
  tipoA('Skin.Rail', 'MultiSlim.D'),
  tipoA('Skin.Rail', 'MultiSlim.E'),
  tipoA('Skin.Rail', 'MultiSlim.I'),
  tipoA('Skin.Rail', 'MultiSlim.L'),
  tipoA('Skin.Rail', 'MultiSlim.O'),
  tipoA('Skin.Rail', 'MultiSlim.V'),
  tipoA('Skin.Rail', 'MultiSlim.W'),
  tipoA('Skin.Rail', 'MultiSlim.U'),
  tipoA('Skin.Rail', 'Panels'),
  tipoB('Skin.Rail', 'Lattice'),
  tipoA('Skin.Rail', 'Crossbar'),
  tipoA('Skin.Rail', 'Standard'),
  tipoA('Skin.Rail', 'Triangle'),
  tipoA('Skin.Rail', 'Square'),

  // RAIL ──────────────────────────────────────────────────────────────────
  tipoA('Rail', 'MultiSlim.A'),
  tipoA('Rail', 'MultiSlim.C'),
  tipoA('Rail', 'MultiSlim.D'),
  tipoA('Rail', 'MultiSlim.E'),
  tipoA('Rail', 'MultiSlim.I'),
  tipoA('Rail', 'MultiSlim.L'),
  tipoA('Rail', 'MultiSlim.O'),
  tipoA('Rail', 'MultiSlim.V'),
  tipoA('Rail', 'MultiSlim.W'),
  tipoA('Rail', 'MultiSlim.U'),
  tipoA('Rail', 'Panels'),
  tipoB('Rail', 'Lattice'),
  tipoA('Rail', 'Standard'),
  tipoA('Rail', 'CustomPanel'),
  tipoA('Rail', 'Triangle'),
  tipoA('Rail', 'Square'),

  // CLAD ──────────────────────────────────────────────────────────────────
  tipoA('Clad', 'Triangle'),
  tipoA('Clad', 'Square'),
  tipoA('Clad', 'MiniWaves'),
  tipoA('Clad', 'Panels'),
  tipoE('Clad', 'PlyWood'),
  tipoA('Clad', 'MultiSlim.A'),
  tipoA('Clad', 'MultiSlim.C'),
  tipoA('Clad', 'MultiSlim.D'),
  tipoA('Clad', 'MultiSlim.E'),
  tipoA('Clad', 'MultiSlim.I'),
  tipoA('Clad', 'MultiSlim.L'),
  tipoA('Clad', 'MultiSlim.O'),
  tipoA('Clad', 'MultiSlim.V'),
  tipoA('Clad', 'MultiSlim.W'),
  tipoA('Clad', 'MultiSlim.U'),
  tipoA('Clad', 'CustomPanel'),

  // SKYCAP ────────────────────────────────────────────────────────────────
  tipoA('SkyCap', 'SkyPanel'),
  tipoA('SkyCap', 'SkyBars'),
  tipoE('SkyCap', 'SkyPlyWood'),
  tipoA('SkyCap', 'CustomPanel'),

  // SUNSHIELD ─────────────────────────────────────────────────────────────
  tipoA('SunShield', 'Prisma'),
  tipoA('SunShield', 'Diamond'),
  tipoA('SunShield', 'Drop'),
  tipoA('SunShield', 'Alloy'),

  // FULLCUSTOM ────────────────────────────────────────────────────────────
  tipoF('FullCustom', 'A_Tipe'),
  tipoF('FullCustom', 'B_Tipe'),
  tipoF('FullCustom', 'C_Tipe'),
  tipoF('FullCustom', 'D_Tipe'),

  // FRAME ─────────────────────────────────────────────────────────────────
  tipoD('Frame', 'Expanded'),
  tipoB('Frame', 'Lattice'),
  tipoA('Frame', 'Crossbar'),
  tipoA('Frame', 'Prisma'),

  // ORGANIC (tentativo TIPO E — pendiente confirmar) ──────────────────────
  tipoE('Organic', 'StandardWood'),
  tipoE('Organic', 'CustomWood'),
  tipoE('Organic', 'ChipBoard'),
  tipoE('Organic', 'PlyWood'),
]

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Seeding machines...')
  const maquinasPorTipo: Record<string, string> = {}

  for (const m of MAQUINAS) {
    const { data: existing } = await supabase
      .from('Maquina')
      .select('id')
      .eq('tipo', m.tipo)
      .maybeSingle()

    if (existing) {
      await supabase.from('Maquina').update({ nombre: m.nombre }).eq('tipo', m.tipo)
      maquinasPorTipo[m.tipo] = existing.id
    } else {
      const id = createId()
      const { error } = await supabase.from('Maquina').insert({ id, nombre: m.nombre, tipo: m.tipo })
      if (error) throw new Error(`Maquina insert ${m.tipo}: ${error.message}`)
      maquinasPorTipo[m.tipo] = id
    }
    console.log(`  ✓ ${m.nombre}`)
  }

  console.log('\nSeeding routes...')
  let created = 0
  let updated = 0

  for (const r of RUTAS) {
    const { data: existing } = await supabase
      .from('Ruta')
      .select('id')
      .eq('sistema', r.sistema)
      .eq('producto', r.producto)
      .maybeSingle()

    if (existing) {
      // Force-update: remove old stages (cascade through RegistroProgreso → EjecucionEtapa)
      const { data: oldEtapas } = await supabase
        .from('EtapaRuta')
        .select('id')
        .eq('rutaId', existing.id)

      if (oldEtapas && oldEtapas.length > 0) {
        const oldIds = oldEtapas.map((e: { id: string }) => e.id)

        // Delete RegistroProgreso referencing these etapas (via EjecucionEtapa)
        const { data: oldEjs } = await supabase
          .from('EjecucionEtapa')
          .select('id')
          .in('etapaRutaId', oldIds)

        if (oldEjs && oldEjs.length > 0) {
          const ejIds = oldEjs.map((e: { id: string }) => e.id)
          await supabase.from('RegistroProgreso').delete().in('ejecucionEtapaId', ejIds)
          await supabase.from('EjecucionEtapa').delete().in('id', ejIds)
        }

        await supabase.from('EtapaRuta').delete().in('id', oldIds)
      }

      // Recreate stages with new definitions
      const etapas = r.etapas.map(e => ({
        id:               createId(),
        rutaId:           existing.id,
        maquinaId:        maquinasPorTipo[e.maquinaTipo],
        ordenSecuencia:   e.ordenSecuencia,
        nombreEtapa:      e.nombreEtapa,
        umbralActivacion: e.umbralActivacion,
      }))
      const { error } = await supabase.from('EtapaRuta').insert(etapas)
      if (error) throw new Error(`EtapaRuta update ${r.sistema}/${r.producto}: ${error.message}`)

      console.log(`  ~ ${r.sistema}/${r.producto} (actualizada)`)
      updated++
    } else {
      const rutaId = createId()
      const { error: rutaErr } = await supabase
        .from('Ruta')
        .insert({ id: rutaId, sistema: r.sistema, producto: r.producto })
      if (rutaErr) throw new Error(`Ruta insert ${r.sistema}/${r.producto}: ${rutaErr.message}`)

      const etapas = r.etapas.map(e => ({
        id:               createId(),
        rutaId:           rutaId,
        maquinaId:        maquinasPorTipo[e.maquinaTipo],
        ordenSecuencia:   e.ordenSecuencia,
        nombreEtapa:      e.nombreEtapa,
        umbralActivacion: e.umbralActivacion,
      }))
      const { error: etapasErr } = await supabase.from('EtapaRuta').insert(etapas)
      if (etapasErr) throw new Error(`EtapaRuta insert ${r.sistema}/${r.producto}: ${etapasErr.message}`)

      console.log(`  ✓ ${r.sistema}/${r.producto}`)
      created++
    }
  }

  console.log(`\nSeed complete. ${created} creadas, ${updated} actualizadas. Total: ${RUTAS.length} rutas.`)
}

main().catch(e => { console.error(e); process.exit(1) })
