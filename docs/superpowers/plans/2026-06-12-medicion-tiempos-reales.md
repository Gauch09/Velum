# Medición de Tiempos Reales Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fichaje de tramos de trabajo por operario (PREPARACION/PRODUCCION, máquina específica) comparado contra capacidad teórica, para que el factor de utilización emerja de la producción real.

**Architecture:** Dos tablas nuevas (`CapacidadTeorica`, `TramoTrabajo`) vía SQL Editor (NUNCA prisma migrate — red IPv4-only). Libs puras testeadas (`tramos.ts`, `factores.ts`), lógica de progreso existente extraída a lib compartida, dos endpoints de tramos, cronómetro en la `OrdenCard` del operario, sección de factores en `/rendimiento` con export CSV.

**Tech Stack:** Next.js App Router + Supabase (supabase-js, service role en server), vitest, Tailwind. Spec: `docs/superpowers/specs/2026-06-12-medicion-tiempos-reales-design.md`.

**Desviación registrada del spec:** no se crea `GET /api/rendimiento/factores`; la página `/rendimiento` es server component y usa la lib directamente (YAGNI). El CSV sale por `/api/exportar?tipo=factores`, patrón existente.

**Convenciones del repo que aplican:** working dir `C:\Users\Nissei\Velum\app`. Tests solo de libs puras (patrón existente en `tests/lib/`). Commits formato `<type>: <desc>`. Branch actual: `feat/ordenes-produccion`.

---

### Task 1: SQL — tablas y seed de teóricos (manual, SQL Editor)

**Files:**
- Create: `supabase/tiempos_reales.sql`
- Create: `scripts/verificar-tiempos-sql.mjs`

- [ ] **Step 1: Crear el archivo SQL**

`supabase/tiempos_reales.sql`:

```sql
-- ============================================================================
-- Medición de tiempos reales (spec 2026-06-12-medicion-tiempos-reales)
-- Pegar en el SQL Editor de Supabase. Idempotente.
-- ============================================================================

-- 1) Capacidad teórica por producto × tipo de máquina.
--    Seed desde "Velum_tiempos" (espejo de la hoja `datos` del Excel de control).
--    OJO: los valores de "Velum_tiempos" son piezas por DÍA (jornada de 8 h);
--    se divide por horas_dia para obtener piezas/hora.
create table if not exists public."CapacidadTeorica" (
  id                     text primary key default gen_random_uuid()::text,
  producto               text not null,
  "tipoMaquina"          text not null check ("tipoMaquina" in
    ('LASER','PUNZONADORA_CNC','FRESADORA','EXPANSORA','PLEGADORA',
     'PLEGADO_MANUAL','LAVADO','PINTADO','HORNO','EMBALAJE','DESPACHO')),
  "piezasPorHora"        double precision not null,
  "minutosSetupEstimado" double precision,
  "vigenteDesde"         timestamptz not null default now(),
  unique (producto, "tipoMaquina", "vigenteDesde")
);
alter table public."CapacidadTeorica" enable row level security;

-- 2) Tramo de trabajo (fichaje del operario).
create table if not exists public."TramoTrabajo" (
  id                  text primary key,
  "ejecucionEtapaId"  text not null references public."EjecucionEtapa"(id),
  "operarioId"        text not null references public."Usuario"(id),
  "maquinaId"         text not null references public."Maquina"(id),
  tipo                text not null check (tipo in ('PREPARACION','PRODUCCION')),
  inicio              timestamptz not null default now(),
  fin                 timestamptz,
  "cantidadProducida" double precision,
  "motivoPausa"       text check ("motivoPausa" in ('MATERIAL','OTRA_ORDEN','AVERIA','OTRO')),
  dudoso              boolean not null default false,
  notas               text,
  "createdAt"         timestamptz not null default now()
);
alter table public."TramoTrabajo" enable row level security;

-- Regla de oro a nivel DB: un solo tramo abierto por operario.
create unique index if not exists uniq_tramo_abierto_por_operario
  on public."TramoTrabajo"("operarioId") where fin is null;

create index if not exists idx_tramo_ejecucion on public."TramoTrabajo"("ejecucionEtapaId");
create index if not exists idx_tramo_maquina_inicio on public."TramoTrabajo"("maquinaId", inicio);

-- 3) Seed de CapacidadTeorica desde "Velum_tiempos" (solo filas que no existan ya).
insert into public."CapacidadTeorica" (producto, "tipoMaquina", "piezasPorHora")
select t.producto, v.tipo, v.val / coalesce(t.horas_dia, 8)
from public."Velum_tiempos" t
cross join lateral (values
  ('LASER',           t.laser_uh),
  ('PLEGADORA',       t.plegadora_uh),
  ('PUNZONADORA_CNC', t.punzonadora_uh),
  ('FRESADORA',       t.fresadora_uh),
  ('PINTADO',         t.pintura_uh),
  ('EMBALAJE',        t.embalado_uh)
) as v(tipo, val)
where v.val is not null and v.val > 0
  and not exists (
    select 1 from public."CapacidadTeorica" c
    where c.producto = t.producto and c."tipoMaquina" = v.tipo
  );
```

- [ ] **Step 2: PAUSA MANUAL — el usuario pega el SQL en el SQL Editor de Supabase y lo ejecuta**

Esto NO se puede automatizar (constraint del proyecto: red local IPv4-only, nunca `prisma migrate`). Pedirle al usuario que lo corra y confirme. Si `"Velum_tiempos"` no existiera o estuviera vacía en la base, correr antes `supabase/velum_tiempos.sql` (existe en el repo con los 55 productos; renombra `hull_tiempos` si la encuentra y si no la crea).

- [ ] **Step 3: Crear script de verificación**

`scripts/verificar-tiempos-sql.mjs`:

```js
import dotenv from 'dotenv'
dotenv.config({ path: '.env' })
dotenv.config({ path: '.env.local', override: true })
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const { count: capCount, error: e1 } = await sb
  .from('CapacidadTeorica').select('*', { count: 'exact', head: true })
const { count: tramoCount, error: e2 } = await sb
  .from('TramoTrabajo').select('*', { count: 'exact', head: true })

if (e1 || e2) {
  console.error('ERROR:', e1?.message ?? e2?.message)
  process.exit(1)
}

// Sanity check del seed: PIC/PEC - 150 en LASER debe dar ~95 piezas/hora (759.86/8)
const { data: pic } = await sb
  .from('CapacidadTeorica')
  .select('piezasPorHora')
  .eq('producto', 'PIC/PEC - 150')
  .eq('tipoMaquina', 'LASER')
  .single()

console.log('CapacidadTeorica filas:', capCount)
console.log('TramoTrabajo filas:', tramoCount, '(esperado 0)')
console.log('PIC/PEC-150 LASER piezas/hora:', pic?.piezasPorHora, '(esperado ~94.98)')
if (!pic || Math.abs(pic.piezasPorHora - 94.98) > 1) {
  console.error('FALLO sanity check del seed')
  process.exit(1)
}
console.log('OK')
```

- [ ] **Step 4: Correr la verificación**

Run: `node scripts/verificar-tiempos-sql.mjs`
Expected: `CapacidadTeorica filas: >100`, `TramoTrabajo filas: 0`, `PIC/PEC-150 LASER piezas/hora: ~94.98`, `OK`

- [ ] **Step 5: Commit**

```bash
git add supabase/tiempos_reales.sql scripts/verificar-tiempos-sql.mjs
git commit -m "feat: tablas CapacidadTeorica y TramoTrabajo + seed desde Velum_tiempos"
```

---

### Task 2: Documentar modelos en schema.prisma

**Files:**
- Modify: `prisma/schema.prisma` (agregar al final)

El schema es documental aquí (el runtime usa supabase-js), pero debe compilar con `prisma generate` porque el build lo corre.

- [ ] **Step 1: Agregar enums y modelos al final de `prisma/schema.prisma`**

```prisma
enum TipoTramo {
  PREPARACION
  PRODUCCION
}

enum MotivoPausa {
  MATERIAL
  OTRA_ORDEN
  AVERIA
  OTRO
}

model CapacidadTeorica {
  id                   String      @id @default(cuid())
  producto             String
  tipoMaquina          TipoMaquina
  piezasPorHora        Float
  minutosSetupEstimado Float?
  vigenteDesde         DateTime    @default(now())

  @@unique([producto, tipoMaquina, vigenteDesde])
}

model TramoTrabajo {
  id                String       @id @default(cuid())
  ejecucionEtapaId  String
  operarioId        String
  maquinaId         String
  tipo              TipoTramo
  inicio            DateTime     @default(now())
  fin               DateTime?
  cantidadProducida Float?
  motivoPausa       MotivoPausa?
  dudoso            Boolean      @default(false)
  notas             String?
  createdAt         DateTime     @default(now())

  ejecucionEtapa EjecucionEtapa @relation(fields: [ejecucionEtapaId], references: [id])
  operario       Usuario        @relation(fields: [operarioId], references: [id])
  maquina        Maquina        @relation(fields: [maquinaId], references: [id])
}
```

También agregar los campos inversos en los modelos existentes (Prisma exige ambos lados de la relación):
- En `model EjecucionEtapa`, junto a `registros  RegistroProgreso[]`, agregar: `tramos  TramoTrabajo[]`
- En `model Usuario` (donde están las otras relaciones), agregar: `tramos  TramoTrabajo[]`
- En `model Maquina`, junto a `ejecuciones EjecucionEtapa[]`, agregar: `tramos  TramoTrabajo[]`

- [ ] **Step 2: Verificar que el schema compila**

Run: `npx prisma generate`
Expected: `Generated Prisma Client` sin errores. (NUNCA correr `prisma migrate`.)

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma
git commit -m "docs: modelos TramoTrabajo y CapacidadTeorica en schema prisma"
```

---

### Task 3: Lib pura de tramos (TDD)

**Files:**
- Create: `src/lib/tramos.ts`
- Test: `tests/lib/tramos.test.ts`

- [ ] **Step 1: Escribir los tests que fallan**

`tests/lib/tramos.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { esHuerfano, duracionMinutos, HORAS_LIMITE_HUERFANO } from '../../src/lib/tramos'

const AHORA = new Date('2026-06-12T18:00:00.000Z')

function horasAntes(h: number): string {
  return new Date(AHORA.getTime() - h * 3_600_000).toISOString()
}

describe('esHuerfano', () => {
  it('false para tramo abierto hace menos de 12 h', () => {
    expect(esHuerfano(horasAntes(11.9), AHORA)).toBe(false)
  })

  it('true para tramo abierto hace más de 12 h', () => {
    expect(esHuerfano(horasAntes(12.1), AHORA)).toBe(true)
  })

  it('usa el límite configurado', () => {
    expect(HORAS_LIMITE_HUERFANO).toBe(12)
    expect(esHuerfano(horasAntes(3), AHORA, 2)).toBe(true)
  })
})

describe('duracionMinutos', () => {
  it('calcula minutos entre inicio y fin', () => {
    expect(duracionMinutos(horasAntes(1), AHORA.toISOString())).toBeCloseTo(60)
  })

  it('redondea a un decimal', () => {
    const inicio = new Date(AHORA.getTime() - 90_500).toISOString() // 90.5 s
    expect(duracionMinutos(inicio, AHORA.toISOString())).toBeCloseTo(1.5, 1)
  })
})
```

- [ ] **Step 2: Correr los tests — deben fallar**

Run: `npx vitest run tests/lib/tramos.test.ts`
Expected: FAIL — `Cannot find module '../../src/lib/tramos'`

- [ ] **Step 3: Implementar `src/lib/tramos.ts`**

```typescript
export const HORAS_LIMITE_HUERFANO = 12

export type TipoTramo = 'PREPARACION' | 'PRODUCCION'
export type MotivoPausa = 'MATERIAL' | 'OTRA_ORDEN' | 'AVERIA' | 'OTRO'

export const MOTIVOS_PAUSA: MotivoPausa[] = ['MATERIAL', 'OTRA_ORDEN', 'AVERIA', 'OTRO']

/** Un tramo abierto hace más de `horasLimite` se considera olvidado (dudoso). */
export function esHuerfano(
  inicioIso: string,
  ahora: Date,
  horasLimite: number = HORAS_LIMITE_HUERFANO
): boolean {
  const horas = (ahora.getTime() - new Date(inicioIso).getTime()) / 3_600_000
  return horas > horasLimite
}

/** Duración de un tramo en minutos, redondeada a 1 decimal. */
export function duracionMinutos(inicioIso: string, finIso: string): number {
  const mins = (new Date(finIso).getTime() - new Date(inicioIso).getTime()) / 60_000
  return Math.round(mins * 10) / 10
}
```

- [ ] **Step 4: Correr los tests — deben pasar**

Run: `npx vitest run tests/lib/tramos.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/tramos.ts tests/lib/tramos.test.ts
git commit -m "feat: lib de tramos (huerfanos y duracion)"
```

---

### Task 4: Lib de agregación de factores (TDD)

**Files:**
- Create: `src/lib/factores.ts`
- Test: `tests/lib/factores.test.ts`

El factor nunca se almacena: estas funciones puras lo calculan desde tramos + teóricos.

- [ ] **Step 1: Escribir los tests que fallan**

`tests/lib/factores.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import {
  resumenPorMaquina,
  velocidadRealPorProductoMaquina,
  setupPromedioPorProducto,
} from '../../src/lib/factores'
import type { TramoParaFactor, CapacidadRow } from '../../src/lib/factores'

const DIA = '2026-06-12'

function mkTramo(overrides: Partial<TramoParaFactor> = {}): TramoParaFactor {
  return {
    tipo: 'PRODUCCION',
    inicio: `${DIA}T08:00:00.000Z`,
    fin: `${DIA}T12:00:00.000Z`, // 4 h
    cantidadProducida: 200,
    dudoso: false,
    maquinaId: 'maq1',
    maquinaNombre: 'Plegadora Uno Huaxia',
    tipoMaquina: 'PLEGADORA',
    producto: 'PIC/PEC - 150',
    operarioId: 'op1',
    ...overrides,
  }
}

describe('resumenPorMaquina', () => {
  it('suma horas fichadas y separa preparación de producción', () => {
    const tramos = [
      mkTramo(), // 4 h producción
      mkTramo({ tipo: 'PREPARACION', inicio: `${DIA}T07:00:00.000Z`, fin: `${DIA}T08:00:00.000Z` }), // 1 h setup
    ]
    const [r] = resumenPorMaquina(tramos, 8)
    expect(r.maquinaNombre).toBe('Plegadora Uno Huaxia')
    expect(r.horasProduccion).toBeCloseTo(4)
    expect(r.horasPreparacion).toBeCloseTo(1)
    expect(r.horasFichadas).toBeCloseTo(5)
    // 1 día con actividad × 8 h = 8 h disponibles → 5/8
    expect(r.disponibilidadPct).toBeCloseTo(62.5)
    expect(r.n).toBe(2)
  })

  it('excluye dudosos y tramos sin cerrar', () => {
    const tramos = [
      mkTramo(),
      mkTramo({ dudoso: true }),
      mkTramo({ fin: null }),
    ]
    const [r] = resumenPorMaquina(tramos, 8)
    expect(r.horasFichadas).toBeCloseTo(4)
    expect(r.n).toBe(1)
  })

  it('cuenta días con actividad por máquina, no días de calendario', () => {
    const tramos = [
      mkTramo(),
      mkTramo({ inicio: '2026-06-13T08:00:00.000Z', fin: '2026-06-13T12:00:00.000Z' }),
    ]
    const [r] = resumenPorMaquina(tramos, 8)
    // 8 h fichadas / (2 días × 8 h) = 50%
    expect(r.disponibilidadPct).toBeCloseTo(50)
  })
})

describe('velocidadRealPorProductoMaquina', () => {
  const capacidades: CapacidadRow[] = [
    { producto: 'PIC/PEC - 150', tipoMaquina: 'PLEGADORA', piezasPorHora: 84.5 },
  ]

  it('calcula piezas/hora real y el factor contra teórico', () => {
    const [v] = velocidadRealPorProductoMaquina([mkTramo()], capacidades)
    expect(v.producto).toBe('PIC/PEC - 150')
    expect(v.maquinaNombre).toBe('Plegadora Uno Huaxia')
    expect(v.piezasHoraReal).toBeCloseTo(50) // 200 piezas / 4 h
    expect(v.piezasHoraTeorica).toBeCloseTo(84.5)
    expect(v.factorVelocidad).toBeCloseTo(50 / 84.5, 3)
    expect(v.n).toBe(1)
  })

  it('teórico null cuando no hay capacidad cargada para ese producto×tipo', () => {
    const [v] = velocidadRealPorProductoMaquina([mkTramo({ producto: 'Inventado' })], capacidades)
    expect(v.piezasHoraTeorica).toBeNull()
    expect(v.factorVelocidad).toBeNull()
  })

  it('solo usa PRODUCCION cerrados con cantidad > 0 y no dudosos', () => {
    const tramos = [
      mkTramo({ tipo: 'PREPARACION' }),
      mkTramo({ cantidadProducida: null }),
      mkTramo({ cantidadProducida: 0 }),
      mkTramo({ dudoso: true }),
      mkTramo({ fin: null }),
    ]
    expect(velocidadRealPorProductoMaquina(tramos, capacidades)).toHaveLength(0)
  })

  it('agrega varios tramos del mismo producto×máquina', () => {
    const tramos = [
      mkTramo(), // 200 en 4 h
      mkTramo({ inicio: `${DIA}T13:00:00.000Z`, fin: `${DIA}T15:00:00.000Z`, cantidadProducida: 100 }), // 100 en 2 h
    ]
    const [v] = velocidadRealPorProductoMaquina(tramos, capacidades)
    expect(v.piezasHoraReal).toBeCloseTo(300 / 6)
    expect(v.n).toBe(2)
  })
})

describe('setupPromedioPorProducto', () => {
  it('promedia los tramos PREPARACION cerrados no dudosos', () => {
    const tramos = [
      mkTramo({ tipo: 'PREPARACION', inicio: `${DIA}T07:00:00.000Z`, fin: `${DIA}T07:30:00.000Z` }), // 30 min
      mkTramo({ tipo: 'PREPARACION', inicio: `${DIA}T13:00:00.000Z`, fin: `${DIA}T13:50:00.000Z` }), // 50 min
      mkTramo({ tipo: 'PREPARACION', dudoso: true }),
      mkTramo(), // producción — fuera
    ]
    const [s] = setupPromedioPorProducto(tramos)
    expect(s.producto).toBe('PIC/PEC - 150')
    expect(s.minutosPromedio).toBeCloseTo(40)
    expect(s.n).toBe(2)
  })
})
```

- [ ] **Step 2: Correr los tests — deben fallar**

Run: `npx vitest run tests/lib/factores.test.ts`
Expected: FAIL — `Cannot find module '../../src/lib/factores'`

- [ ] **Step 3: Implementar `src/lib/factores.ts`**

```typescript
import { duracionMinutos } from './tramos'
import type { TipoTramo } from './tramos'

export interface TramoParaFactor {
  tipo: TipoTramo
  inicio: string
  fin: string | null
  cantidadProducida: number | null
  dudoso: boolean
  maquinaId: string
  maquinaNombre: string
  tipoMaquina: string
  producto: string
  operarioId: string
}

export interface CapacidadRow {
  producto: string
  tipoMaquina: string
  piezasPorHora: number
}

export interface ResumenMaquina {
  maquinaId: string
  maquinaNombre: string
  horasFichadas: number
  horasPreparacion: number
  horasProduccion: number
  disponibilidadPct: number
  n: number
}

export interface VelocidadProducto {
  producto: string
  maquinaId: string
  maquinaNombre: string
  piezasHoraReal: number
  piezasHoraTeorica: number | null
  factorVelocidad: number | null
  n: number
}

export interface SetupProducto {
  producto: string
  minutosPromedio: number
  n: number
}

/** Tramos válidos para cálculo: cerrados y no dudosos. */
function validos(tramos: TramoParaFactor[]): (TramoParaFactor & { fin: string })[] {
  return tramos.filter((t): t is TramoParaFactor & { fin: string } => t.fin !== null && !t.dudoso)
}

function horasDe(t: { inicio: string; fin: string }): number {
  return duracionMinutos(t.inicio, t.fin) / 60
}

/**
 * Disponibilidad por máquina: horas fichadas / (días con actividad × horasJornada).
 * Se cuentan días con actividad (no calendario) para no castigar la adopción gradual.
 */
export function resumenPorMaquina(
  tramos: TramoParaFactor[],
  horasJornada: number
): ResumenMaquina[] {
  const porMaquina = new Map<string, (TramoParaFactor & { fin: string })[]>()
  for (const t of validos(tramos)) {
    const lista = porMaquina.get(t.maquinaId) ?? []
    porMaquina.set(t.maquinaId, [...lista, t])
  }

  return [...porMaquina.values()].map(lista => {
    const horasPreparacion = lista
      .filter(t => t.tipo === 'PREPARACION')
      .reduce((acc, t) => acc + horasDe(t), 0)
    const horasProduccion = lista
      .filter(t => t.tipo === 'PRODUCCION')
      .reduce((acc, t) => acc + horasDe(t), 0)
    const horasFichadas = horasPreparacion + horasProduccion
    const diasConActividad = new Set(lista.map(t => t.inicio.slice(0, 10))).size
    const horasDisponibles = diasConActividad * horasJornada

    return {
      maquinaId: lista[0].maquinaId,
      maquinaNombre: lista[0].maquinaNombre,
      horasFichadas,
      horasPreparacion,
      horasProduccion,
      disponibilidadPct: horasDisponibles > 0 ? (horasFichadas / horasDisponibles) * 100 : 0,
      n: lista.length,
    }
  }).sort((a, b) => a.maquinaNombre.localeCompare(b.maquinaNombre))
}

/** Velocidad real (piezas/hora) por producto × máquina vs. teórico. */
export function velocidadRealPorProductoMaquina(
  tramos: TramoParaFactor[],
  capacidades: CapacidadRow[]
): VelocidadProducto[] {
  const produccion = validos(tramos).filter(
    t => t.tipo === 'PRODUCCION' && t.cantidadProducida != null && t.cantidadProducida > 0
  )

  const grupos = new Map<string, typeof produccion>()
  for (const t of produccion) {
    const key = `${t.producto}|${t.maquinaId}`
    const lista = grupos.get(key) ?? []
    grupos.set(key, [...lista, t])
  }

  return [...grupos.values()].map(lista => {
    const piezas = lista.reduce((acc, t) => acc + (t.cantidadProducida ?? 0), 0)
    const horas = lista.reduce((acc, t) => acc + horasDe(t), 0)
    const piezasHoraReal = horas > 0 ? piezas / horas : 0
    const teorica = capacidades.find(
      c => c.producto === lista[0].producto && c.tipoMaquina === lista[0].tipoMaquina
    )?.piezasPorHora ?? null

    return {
      producto: lista[0].producto,
      maquinaId: lista[0].maquinaId,
      maquinaNombre: lista[0].maquinaNombre,
      piezasHoraReal,
      piezasHoraTeorica: teorica,
      factorVelocidad: teorica ? piezasHoraReal / teorica : null,
      n: lista.length,
    }
  }).sort((a, b) => a.producto.localeCompare(b.producto) || a.maquinaNombre.localeCompare(b.maquinaNombre))
}

/** Duración promedio de los tramos PREPARACION por producto. */
export function setupPromedioPorProducto(tramos: TramoParaFactor[]): SetupProducto[] {
  const setups = validos(tramos).filter(t => t.tipo === 'PREPARACION')

  const grupos = new Map<string, typeof setups>()
  for (const t of setups) {
    const lista = grupos.get(t.producto) ?? []
    grupos.set(t.producto, [...lista, t])
  }

  return [...grupos.values()].map(lista => ({
    producto: lista[0].producto,
    minutosPromedio:
      lista.reduce((acc, t) => acc + duracionMinutos(t.inicio, t.fin), 0) / lista.length,
    n: lista.length,
  })).sort((a, b) => a.producto.localeCompare(b.producto))
}
```

- [ ] **Step 4: Correr los tests — deben pasar**

Run: `npx vitest run tests/lib/factores.test.ts`
Expected: PASS (8 tests)

- [ ] **Step 5: Correr toda la suite**

Run: `npm run test:run`
Expected: todos los tests pasan (los 7 archivos previos + 2 nuevos)

- [ ] **Step 6: Commit**

```bash
git add src/lib/factores.ts tests/lib/factores.test.ts
git commit -m "feat: lib de agregacion de factores de utilizacion"
```

---

### Task 5: Extraer la lógica de progreso a lib compartida

**Files:**
- Create: `src/lib/registrar-progreso.ts`
- Modify: `src/app/api/ordenes/[id]/progreso/route.ts`

El PATCH de tramos (Task 7) necesita registrar progreso con la misma cascada que el botón "Registrar". Se extrae la lógica a una función; el route existente delega. **Mover código tal cual, sin cambiar comportamiento.**

- [ ] **Step 1: Crear `src/lib/registrar-progreso.ts`**

```typescript
import { evaluarCascada } from '@/lib/cascada'
import type { EtapaProgreso } from '@/lib/cascada'
import { createId } from '@paralleldrive/cuid2'

export interface RegistrarProgresoInput {
  ordenId: string
  ejecucionEtapaId: string
  usuarioId: string
  cantidadRegistrada: number
  notas?: string | null
  fueOverride?: boolean
  motivoOverride?: string | null
}

export type RegistrarProgresoResult =
  | { ok: true; porcentajeGlobal: number; etapasActivadas: string[]; ordenCompleta: boolean }
  | { ok: false; error: string; status: number }

/**
 * Registra avance de cantidad sobre una ejecución: crea RegistroProgreso,
 * actualiza porcentajes, evalúa la cascada de etapas, cierra orden/proyecto
 * si corresponde y emite el broadcast. Lógica movida tal cual desde
 * /api/ordenes/[id]/progreso — única fuente de verdad del progreso.
 *
 * `supabase` = admin client; `broadcastClient` = client con service role para Realtime.
 */
export async function registrarProgreso(
  supabase: any,
  broadcastClient: any,
  input: RegistrarProgresoInput
): Promise<RegistrarProgresoResult> {
  const { ordenId, ejecucionEtapaId, usuarioId, cantidadRegistrada, notas, fueOverride, motivoOverride } = input

  const { data: orden, error: ordenError } = await supabase
    .from('OrdenProduccion')
    .select('id, cantidad')
    .eq('id', ordenId)
    .single()

  if (ordenError || !orden) return { ok: false, error: 'Orden no encontrada', status: 404 }

  const { data: ejecuciones, error: ejError } = await supabase
    .from('EjecucionEtapa')
    .select('id, ordenId, etapaRutaId, maquinaId, operarioId, porcentajeActual, estado, etapaRuta:EtapaRuta ( ordenSecuencia, umbralActivacion )')
    .eq('ordenId', ordenId)
    .order('etapaRuta(ordenSecuencia)', { ascending: true })

  if (ejError || !ejecuciones) return { ok: false, error: 'Error cargando ejecuciones', status: 500 }

  const ejecucionActual = ejecuciones.find((e: any) => e.id === ejecucionEtapaId)
  if (!ejecucionActual) return { ok: false, error: 'Ejecución no encontrada', status: 404 }

  if (ejecucionActual.operarioId && ejecucionActual.operarioId !== usuarioId) {
    return { ok: false, error: 'No estás asignado a esta etapa', status: 403 }
  }

  const cantidadAnterior = (ejecucionActual.porcentajeActual / 100) * orden.cantidad
  const nuevaCantidadTotal = cantidadAnterior + cantidadRegistrada
  const nuevoPorcentaje = Math.min((nuevaCantidadTotal / orden.cantidad) * 100, 100)

  const etapasProgreso: EtapaProgreso[] = ejecuciones.map((e: any) => ({
    id:               e.id,
    ordenSecuencia:   e.etapaRuta.ordenSecuencia,
    umbralActivacion: e.etapaRuta.umbralActivacion,
    porcentajeActual: e.porcentajeActual,
    estado:           e.estado as EtapaProgreso['estado'],
    etapaRutaId:      e.etapaRutaId,
    maquinaId:        e.maquinaId,
  }))

  const { etapasAActivar, porcentajeGlobal } = evaluarCascada(etapasProgreso, ejecucionEtapaId, nuevoPorcentaje)

  const { error: logError } = await supabase.from('RegistroProgreso').insert({
    id: createId(),
    ejecucionEtapaId,
    usuarioId,
    cantidadRegistrada,
    porcentajeRegistrado: nuevoPorcentaje,
    notas: notas ?? null,
    fueOverride: fueOverride ?? false,
    motivoOverride: motivoOverride ?? null,
  })

  if (logError) return { ok: false, error: logError.message, status: 500 }

  const { error: updateEjError } = await supabase
    .from('EjecucionEtapa')
    .update({
      porcentajeActual: nuevoPorcentaje,
      estado: nuevoPorcentaje >= 100 ? 'COMPLETADA' : 'ACTIVA',
      fechaFin: nuevoPorcentaje >= 100 ? new Date().toISOString() : null,
      ultimoProgresoEn: new Date().toISOString(),
    })
    .eq('id', ejecucionEtapaId)

  if (updateEjError) return { ok: false, error: updateEjError.message, status: 500 }

  if (etapasAActivar.length > 0) {
    const { error: cascadeError } = await supabase
      .from('EjecucionEtapa')
      .update({ estado: 'ACTIVA', fechaInicio: new Date().toISOString() })
      .eq('ordenId', ordenId)
      .in('etapaRutaId', etapasAActivar)

    if (cascadeError) return { ok: false, error: cascadeError.message, status: 500 }
  }

  const ordenCompleta = porcentajeGlobal >= 100
  const { error: ordenUpdateError } = await supabase
    .from('OrdenProduccion')
    .update({
      porcentajeGlobal,
      ...(ordenCompleta ? { estado: 'COMPLETADA' } : {}),
    })
    .eq('id', ordenId)

  if (ordenUpdateError) return { ok: false, error: ordenUpdateError.message, status: 500 }

  if (ordenCompleta) {
    const { data: ordenCerrada } = await supabase
      .from('OrdenProduccion')
      .select('proyectoId')
      .eq('id', ordenId)
      .single()

    if (ordenCerrada?.proyectoId) {
      const { count: pendientes } = await supabase
        .from('OrdenProduccion')
        .select('id', { count: 'exact', head: true })
        .eq('proyectoId', ordenCerrada.proyectoId)
        .neq('estado', 'COMPLETADA')
        .neq('estado', 'CANCELADA')

      if ((pendientes ?? 0) === 0) {
        await supabase
          .from('Proyecto')
          .update({ estado: 'COMPLETADO' })
          .eq('id', ordenCerrada.proyectoId)
      }
    }
  }

  await broadcastClient.channel('ordenes').send({
    type: 'broadcast',
    event: 'progreso',
    payload: { ordenId, porcentajeGlobal, etapasActivadas: etapasAActivar, completada: ordenCompleta },
  })

  return { ok: true, porcentajeGlobal, etapasActivadas: etapasAActivar, ordenCompleta }
}
```

> Nota al implementar: comparar contra el route actual línea por línea — si el route difiere de lo copiado arriba (p.ej. el shape del response final), la fuente de verdad es el route actual. La función debe replicarlo exactamente.

- [ ] **Step 2: Reescribir el route para delegar**

`src/app/api/ordenes/[id]/progreso/route.ts` queda:

```typescript
import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { registrarProgreso } from '@/lib/registrar-progreso'
import { createClient } from '@supabase/supabase-js'

const broadcastClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json()
  const { ejecucionEtapaId, cantidadRegistrada, notas, fueOverride, motivoOverride } = body

  if (!ejecucionEtapaId || cantidadRegistrada == null) {
    return NextResponse.json(
      { error: 'ejecucionEtapaId y cantidadRegistrada son requeridos' },
      { status: 400 }
    )
  }

  const supabaseAuth = createSupabaseServerClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const supabase = createSupabaseAdminClient() as any

  const { data: usuario } = await supabase
    .from('Usuario')
    .select('id')
    .eq('email', user.email!)
    .single()

  if (!usuario) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })

  const result = await registrarProgreso(supabase, broadcastClient, {
    ordenId: params.id,
    ejecucionEtapaId,
    usuarioId: usuario.id,
    cantidadRegistrada,
    notas,
    fueOverride,
    motivoOverride,
  })

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })

  return NextResponse.json({
    porcentajeGlobal: result.porcentajeGlobal,
    etapasActivadas: result.etapasActivadas,
    completada: result.ordenCompleta,
  })
}
```

> Nota: verificar primero qué devuelve hoy el route en su última línea (el JSON final actual) y mantener ese shape exacto — el cliente `OrdenCard` solo chequea `res.ok`, pero otros consumidores podrían leer el body.

- [ ] **Step 3: Verificar que compila y los tests pasan**

Run: `npm run test:run && npx next build 2>&1 | tail -5`
Expected: tests PASS; build sin errores de tipos.

- [ ] **Step 4: Commit**

```bash
git add src/lib/registrar-progreso.ts "src/app/api/ordenes/[id]/progreso/route.ts"
git commit -m "refactor: extraer logica de progreso a lib compartida"
```

---

### Task 6: API — abrir tramo (POST /api/tramos)

**Files:**
- Create: `src/app/api/tramos/route.ts`

- [ ] **Step 1: Crear el route**

```typescript
import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { esHuerfano } from '@/lib/tramos'
import { createId } from '@paralleldrive/cuid2'

/**
 * Abre un tramo de trabajo. Si el operario tiene otro tramo abierto,
 * lo cierra primero (dudoso=true si quedó huérfano > 12 h).
 * Body: { ejecucionEtapaId, maquinaId, tipo: 'PREPARACION' | 'PRODUCCION' }
 */
export async function POST(req: Request) {
  const body = await req.json()
  const { ejecucionEtapaId, maquinaId, tipo } = body

  if (!ejecucionEtapaId || !maquinaId || !['PREPARACION', 'PRODUCCION'].includes(tipo)) {
    return NextResponse.json(
      { error: 'ejecucionEtapaId, maquinaId y tipo (PREPARACION|PRODUCCION) son requeridos' },
      { status: 400 }
    )
  }

  const supabaseAuth = createSupabaseServerClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const supabase = createSupabaseAdminClient() as any

  const { data: usuario } = await supabase
    .from('Usuario')
    .select('id')
    .eq('email', user.email!)
    .single()
  if (!usuario) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })

  // Validar ejecución: existe, ACTIVA, y asignación (mismo criterio que progreso)
  const { data: ejecucion } = await supabase
    .from('EjecucionEtapa')
    .select('id, estado, operarioId, maquina:Maquina ( tipo )')
    .eq('id', ejecucionEtapaId)
    .single()

  if (!ejecucion) return NextResponse.json({ error: 'Ejecución no encontrada' }, { status: 404 })
  if (ejecucion.estado !== 'ACTIVA') {
    return NextResponse.json({ error: 'La etapa no está activa' }, { status: 409 })
  }
  if (ejecucion.operarioId && ejecucion.operarioId !== usuario.id) {
    return NextResponse.json({ error: 'No estás asignado a esta etapa' }, { status: 403 })
  }

  // Validar máquina: existe y coincide en tipo con la máquina de la etapa
  const { data: maquina } = await supabase
    .from('Maquina')
    .select('id, nombre, tipo')
    .eq('id', maquinaId)
    .single()

  if (!maquina) return NextResponse.json({ error: 'Máquina no encontrada' }, { status: 404 })
  if (maquina.tipo !== ejecucion.maquina.tipo) {
    return NextResponse.json(
      { error: `La máquina elegida (${maquina.tipo}) no coincide con el tipo de la etapa (${ejecucion.maquina.tipo})` },
      { status: 422 }
    )
  }

  // Cerrar tramo abierto previo del operario (regla: uno solo abierto)
  const ahora = new Date()
  const { data: abierto } = await supabase
    .from('TramoTrabajo')
    .select('id, inicio, ejecucionEtapaId')
    .eq('operarioId', usuario.id)
    .is('fin', null)
    .maybeSingle()

  let tramoCerrado = null
  if (abierto) {
    const dudoso = esHuerfano(abierto.inicio, ahora)
    const { error: cierreError } = await supabase
      .from('TramoTrabajo')
      .update({ fin: ahora.toISOString(), dudoso })
      .eq('id', abierto.id)
    if (cierreError) return NextResponse.json({ error: cierreError.message }, { status: 500 })
    tramoCerrado = { id: abierto.id, dudoso }
  }

  const nuevo = {
    id: createId(),
    ejecucionEtapaId,
    operarioId: usuario.id,
    maquinaId,
    tipo,
    inicio: ahora.toISOString(),
  }
  const { data: tramo, error: insertError } = await supabase
    .from('TramoTrabajo')
    .insert(nuevo)
    .select('id, tipo, inicio, maquinaId')
    .single()

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

  return NextResponse.json({ tramo, tramoCerrado })
}
```

- [ ] **Step 2: Verificar que compila**

Run: `npx next build 2>&1 | tail -5`
Expected: build sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/tramos/route.ts
git commit -m "feat: endpoint abrir tramo de trabajo"
```

---

### Task 7: API — pausar/terminar tramo (PATCH /api/tramos/[id])

**Files:**
- Create: `src/app/api/tramos/[id]/route.ts`

Pausar y terminar setean `fin` (no hay estado suspendido). Terminar además registra cantidad vía `registrarProgreso`; si el progreso falla, el cierre se revierte (el tramo queda abierto, spec: "el tramo NO se cierra").

- [ ] **Step 1: Crear el route**

```typescript
import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { registrarProgreso } from '@/lib/registrar-progreso'
import { MOTIVOS_PAUSA } from '@/lib/tramos'
import { createClient } from '@supabase/supabase-js'

const broadcastClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Body: { accion: 'pausar', motivoPausa?, notas? }
 *     | { accion: 'terminar', cantidadProducida, notas? }
 */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json()
  const { accion, motivoPausa, cantidadProducida, notas } = body

  if (!['pausar', 'terminar'].includes(accion)) {
    return NextResponse.json({ error: 'accion debe ser pausar o terminar' }, { status: 400 })
  }
  if (accion === 'terminar' && (cantidadProducida == null || cantidadProducida < 0)) {
    return NextResponse.json({ error: 'cantidadProducida es requerida para terminar' }, { status: 400 })
  }
  if (motivoPausa && !MOTIVOS_PAUSA.includes(motivoPausa)) {
    return NextResponse.json({ error: 'motivoPausa inválido' }, { status: 400 })
  }

  const supabaseAuth = createSupabaseServerClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const supabase = createSupabaseAdminClient() as any

  const { data: usuario } = await supabase
    .from('Usuario')
    .select('id')
    .eq('email', user.email!)
    .single()
  if (!usuario) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })

  const { data: tramo } = await supabase
    .from('TramoTrabajo')
    .select('id, operarioId, fin, tipo, ejecucionEtapaId, ejecucionEtapa:EjecucionEtapa ( ordenId )')
    .eq('id', params.id)
    .single()

  if (!tramo) return NextResponse.json({ error: 'Tramo no encontrado' }, { status: 404 })
  if (tramo.operarioId !== usuario.id) {
    return NextResponse.json({ error: 'Solo el dueño del tramo puede cerrarlo' }, { status: 403 })
  }
  if (tramo.fin) return NextResponse.json({ error: 'El tramo ya está cerrado' }, { status: 409 })

  const fin = new Date().toISOString()

  if (accion === 'pausar') {
    const { error } = await supabase
      .from('TramoTrabajo')
      .update({ fin, motivoPausa: motivoPausa ?? null, notas: notas ?? null })
      .eq('id', params.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  // accion === 'terminar': cerrar tramo, luego registrar progreso; revertir si falla
  const { error: cierreError } = await supabase
    .from('TramoTrabajo')
    .update({ fin, cantidadProducida, notas: notas ?? null })
    .eq('id', params.id)
  if (cierreError) return NextResponse.json({ error: cierreError.message }, { status: 500 })

  // cantidadProducida = 0 → cierra el tramo sin registrar avance (caso: terminó su parte sin piezas completas)
  if (cantidadProducida === 0) return NextResponse.json({ ok: true, progreso: null })

  const result = await registrarProgreso(supabase, broadcastClient, {
    ordenId: tramo.ejecucionEtapa.ordenId,
    ejecucionEtapaId: tramo.ejecucionEtapaId,
    usuarioId: usuario.id,
    cantidadRegistrada: cantidadProducida,
    notas: notas ?? null,
  })

  if (!result.ok) {
    // Revertir el cierre: el tramo queda abierto para reintentar (spec)
    await supabase
      .from('TramoTrabajo')
      .update({ fin: null, cantidadProducida: null })
      .eq('id', params.id)
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  return NextResponse.json({
    ok: true,
    progreso: {
      porcentajeGlobal: result.porcentajeGlobal,
      etapasActivadas: result.etapasActivadas,
      completada: result.ordenCompleta,
    },
  })
}
```

- [ ] **Step 2: Verificar que compila**

Run: `npx next build 2>&1 | tail -5`
Expected: build sin errores.

- [ ] **Step 3: Commit**

```bash
git add "src/app/api/tramos/[id]/route.ts"
git commit -m "feat: endpoint pausar/terminar tramo con registro de progreso"
```

---

### Task 8: UI del operario — cronómetro en OrdenCard

**Files:**
- Create: `src/components/operario/TramoControl.tsx`
- Modify: `src/components/operario/OrdenCard.tsx` (agregar props y montar TramoControl)
- Modify: `src/app/(operario)/operario/page.tsx` (traer tramo abierto + máquinas)

- [ ] **Step 1: Crear `src/components/operario/TramoControl.tsx`**

```tsx
'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { MotivoPausa, TipoTramo } from '@/lib/tramos'

export interface TramoAbierto {
  id: string
  tipo: TipoTramo
  inicio: string
  ejecucionEtapaId: string
  maquinaNombre: string
}

export interface MaquinaOpcion {
  id: string
  nombre: string
}

interface Props {
  ejecucionId: string
  unidad: string
  maquinas: MaquinaOpcion[]          // instancias del tipo de la etapa
  tramoAbierto: TramoAbierto | null  // tramo abierto del operario (cualquier tarea)
}

const MOTIVOS: { value: MotivoPausa; label: string }[] = [
  { value: 'MATERIAL',   label: 'Material' },
  { value: 'OTRA_ORDEN', label: 'Otra orden' },
  { value: 'AVERIA',     label: 'Avería' },
  { value: 'OTRO',       label: 'Otro' },
]

function minutosDesde(inicioIso: string, ahora: number): number {
  return Math.max(0, Math.floor((ahora - new Date(inicioIso).getTime()) / 60_000))
}

export default function TramoControl({ ejecucionId, unidad, maquinas, tramoAbierto }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [ahora, setAhora] = useState(Date.now())
  // Pasos del flujo de apertura/cierre
  const [eligiendoMaquina, setEligiendoMaquina] = useState<TipoTramo | null>(null)
  const [eligiendoMotivo, setEligiendoMotivo] = useState(false)
  const [terminando, setTerminando] = useState(false)
  const [cantidad, setCantidad] = useState(10)

  const esMio = tramoAbierto?.ejecucionEtapaId === ejecucionId
  const enOtraTarea = tramoAbierto != null && !esMio

  // Cronómetro: refresco cada 30 s
  useEffect(() => {
    if (!esMio) return
    const id = setInterval(() => setAhora(Date.now()), 30_000)
    return () => clearInterval(id)
  }, [esMio])

  async function abrir(tipo: TipoTramo, maquinaId: string) {
    setLoading(true)
    try {
      const res = await fetch('/api/tramos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ejecucionEtapaId: ejecucionId, maquinaId, tipo }),
      })
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: 'Error desconocido' }))
        alert(`Error: ${error}`)
        return
      }
      try { localStorage.setItem('velum.ultimaMaquina', maquinaId) } catch {}
      setEligiendoMaquina(null)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  function iniciarApertura(tipo: TipoTramo) {
    if (enOtraTarea) {
      const mins = minutosDesde(tramoAbierto!.inicio, Date.now())
      if (!confirm(`Cerrando tramo abierto en otra tarea (${mins} min). ¿Continuar?`)) return
    }
    if (maquinas.length === 1) {
      void abrir(tipo, maquinas[0].id)
      return
    }
    setEligiendoMaquina(tipo)
  }

  async function cerrar(payload: Record<string, unknown>) {
    if (!tramoAbierto) return
    setLoading(true)
    try {
      const res = await fetch(`/api/tramos/${tramoAbierto.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: 'Error desconocido' }))
        alert(`Error: ${error}`)
        return
      }
      setEligiendoMotivo(false)
      setTerminando(false)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  // ---- Render ----

  if (eligiendoMaquina) {
    const ultima = (() => { try { return localStorage.getItem('velum.ultimaMaquina') } catch { return null } })()
    return (
      <div className="mb-3 bg-gray-800 rounded-xl p-3">
        <p className="text-gray-300 text-sm mb-2">¿En cuál máquina?</p>
        <div className="flex gap-2">
          {maquinas.map(m => (
            <button
              key={m.id}
              disabled={loading}
              onClick={() => abrir(eligiendoMaquina, m.id)}
              className={`flex-1 py-4 rounded-xl font-bold text-sm touch-manipulation disabled:opacity-50 ${
                m.id === ultima ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-200 active:bg-gray-600'
              }`}
            >
              {m.nombre}
            </button>
          ))}
        </div>
        <button onClick={() => setEligiendoMaquina(null)} className="text-gray-500 text-xs mt-2">
          Cancelar
        </button>
      </div>
    )
  }

  if (esMio && tramoAbierto) {
    const mins = minutosDesde(tramoAbierto.inicio, ahora)
    const esSetup = tramoAbierto.tipo === 'PREPARACION'

    if (eligiendoMotivo) {
      return (
        <div className="mb-3 bg-gray-800 rounded-xl p-3">
          <p className="text-gray-300 text-sm mb-2">¿Motivo de la pausa? (opcional)</p>
          <div className="grid grid-cols-2 gap-2">
            {MOTIVOS.map(m => (
              <button
                key={m.value}
                disabled={loading}
                onClick={() => cerrar({ accion: 'pausar', motivoPausa: m.value })}
                className="bg-gray-700 text-gray-200 py-3 rounded-xl text-sm font-semibold touch-manipulation active:bg-gray-600 disabled:opacity-50"
              >
                {m.label}
              </button>
            ))}
          </div>
          <button
            disabled={loading}
            onClick={() => cerrar({ accion: 'pausar' })}
            className="text-gray-500 text-xs mt-2"
          >
            Saltear
          </button>
        </div>
      )
    }

    if (terminando) {
      return (
        <div className="mb-3 bg-gray-800 rounded-xl p-3">
          <p className="text-gray-300 text-sm mb-2">¿Cuántas hiciste en este tramo?</p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCantidad(c => Math.max(0, c - 10))}
              className="bg-gray-700 text-white w-14 h-14 rounded-xl text-2xl font-light touch-manipulation active:bg-gray-600"
            >
              −
            </button>
            <div className="flex-1 text-center">
              <span className="text-white text-3xl font-bold">{cantidad}</span>
              <p className="text-gray-500 text-xs">{unidad.toLowerCase()}</p>
            </div>
            <button
              onClick={() => setCantidad(c => c + 10)}
              className="bg-gray-700 text-white w-14 h-14 rounded-xl text-2xl font-light touch-manipulation active:bg-gray-600"
            >
              +
            </button>
            <button
              disabled={loading}
              onClick={() => cerrar({ accion: 'terminar', cantidadProducida: cantidad })}
              className="flex-1 bg-green-600 active:bg-green-700 text-white py-4 rounded-xl font-bold disabled:opacity-50 touch-manipulation min-h-[56px]"
            >
              {loading ? '...' : 'Confirmar'}
            </button>
          </div>
          <button onClick={() => setTerminando(false)} className="text-gray-500 text-xs mt-2">
            Cancelar
          </button>
        </div>
      )
    }

    return (
      <div className="mb-3 bg-gray-800 rounded-xl p-3">
        <p className={`text-sm font-bold mb-2 ${esSetup ? 'text-amber-400' : 'text-blue-400'}`}>
          ⏱ {esSetup ? 'PREPARANDO' : 'PRODUCIENDO'} en {tramoAbierto.maquinaNombre} · {mins} min
        </p>
        <div className="flex gap-2">
          {esSetup && (
            <button
              disabled={loading}
              onClick={() => iniciarApertura('PRODUCCION')}
              className="flex-1 bg-blue-600 active:bg-blue-700 text-white py-4 rounded-xl font-bold text-sm touch-manipulation disabled:opacity-50"
            >
              ▶ Producir
            </button>
          )}
          <button
            disabled={loading}
            onClick={() => setEligiendoMotivo(true)}
            className="flex-1 bg-gray-700 active:bg-gray-600 text-gray-200 py-4 rounded-xl font-bold text-sm touch-manipulation disabled:opacity-50"
          >
            ⏸ Pausar
          </button>
          <button
            disabled={loading}
            onClick={() => setTerminando(true)}
            className="flex-1 bg-green-600 active:bg-green-700 text-white py-4 rounded-xl font-bold text-sm touch-manipulation disabled:opacity-50"
          >
            ■ Terminar
          </button>
        </div>
      </div>
    )
  }

  // Sin tramo en esta tarea
  return (
    <div className="mb-3 flex gap-2">
      <button
        disabled={loading}
        onClick={() => iniciarApertura('PREPARACION')}
        className="flex-1 bg-amber-600 active:bg-amber-700 text-white py-4 rounded-xl font-bold text-sm touch-manipulation disabled:opacity-50"
      >
        ▶ Preparar
      </button>
      <button
        disabled={loading}
        onClick={() => iniciarApertura('PRODUCCION')}
        className="flex-1 bg-blue-600 active:bg-blue-700 text-white py-4 rounded-xl font-bold text-sm touch-manipulation disabled:opacity-50"
      >
        ▶ Producir
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Modificar `src/components/operario/OrdenCard.tsx`**

Agregar al `interface Props` los campos nuevos y montar `TramoControl` entre la barra de progreso y las notas:

```tsx
import TramoControl from './TramoControl'
import type { TramoAbierto, MaquinaOpcion } from './TramoControl'
```

En `interface Props`, dentro de `ejecucion` no cambia nada; agregar dos props hermanas:

```tsx
interface Props {
  ejecucion: { /* ...igual que está... */ }
  maquinasDelTipo: MaquinaOpcion[]
  tramoAbierto: TramoAbierto | null
}
```

En la firma: `export default function OrdenCard({ ejecucion, maquinasDelTipo, tramoAbierto }: Props)`.

En el JSX, inmediatamente después del `</div>` que cierra la sección de la barra de progreso (la que termina con "Activa siguiente etapa al X%"), insertar:

```tsx
      <TramoControl
        ejecucionId={ejecucion.id}
        unidad={orden.unidad}
        maquinas={maquinasDelTipo}
        tramoAbierto={tramoAbierto}
      />
```

El widget de cantidad y el botón "Registrar" existentes NO se tocan (siguen sirviendo para correcciones sin cronómetro).

- [ ] **Step 3: Modificar `src/app/(operario)/operario/page.tsx`**

Después de la query de `ejecucionesActivas`, agregar:

```tsx
  // Tramo abierto del operario (uno solo posible) + instancias de máquina por tipo
  const [{ data: tramoAbiertoRow }, { data: maquinas }] = await Promise.all([
    admin
      .from('TramoTrabajo')
      .select('id, tipo, inicio, ejecucionEtapaId, maquina:Maquina ( nombre )')
      .eq('operarioId', usuario.id)
      .is('fin', null)
      .maybeSingle(),
    admin
      .from('Maquina')
      .select('id, nombre, tipo')
      .eq('estadoActual', 'OPERATIVA')
      .order('nombre'),
  ])

  const tramoAbierto = tramoAbiertoRow
    ? {
        id: tramoAbiertoRow.id,
        tipo: tramoAbiertoRow.tipo,
        inicio: tramoAbiertoRow.inicio,
        ejecucionEtapaId: tramoAbiertoRow.ejecucionEtapaId,
        maquinaNombre: tramoAbiertoRow.maquina?.nombre ?? '',
      }
    : null
```

Y en el `.map` de las cards, pasar las props nuevas (la ejecución ya trae `maquina.id`; necesita también el tipo — ampliar el select de `ejecucionesActivas` cambiando `maquina:Maquina ( id, nombre )` por `maquina:Maquina ( id, nombre, tipo )`):

```tsx
          {ejecuciones.map((ej: any) => (
            <OrdenCard
              key={ej.id}
              ejecucion={ej}
              maquinasDelTipo={(maquinas ?? []).filter((m: any) => m.tipo === ej.maquina?.tipo)}
              tramoAbierto={tramoAbierto}
            />
          ))}
```

- [ ] **Step 4: Verificar que compila**

Run: `npx next build 2>&1 | tail -5`
Expected: build sin errores.

- [ ] **Step 5: Commit**

```bash
git add src/components/operario/TramoControl.tsx src/components/operario/OrdenCard.tsx "src/app/(operario)/operario/page.tsx"
git commit -m "feat: cronometro de tramos en pantalla del operario"
```

---

### Task 9: Vista de factores en /rendimiento + export CSV

**Files:**
- Create: `src/components/supervisor/FactoresUtilizacion.tsx`
- Modify: `src/app/(supervisor)/rendimiento/page.tsx`
- Modify: `src/app/api/exportar/route.ts`
- Modify: `src/components/shared/ExportarCsvButton.tsx` (agregar tipo)

- [ ] **Step 1: Crear `src/components/supervisor/FactoresUtilizacion.tsx`** (server component)

```tsx
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import {
  resumenPorMaquina,
  velocidadRealPorProductoMaquina,
  setupPromedioPorProducto,
} from '@/lib/factores'
import type { TramoParaFactor, CapacidadRow } from '@/lib/factores'
import ExportarCsvButton from '@/components/shared/ExportarCsvButton'

const HORAS_JORNADA = 8

export async function cargarTramosParaFactor(desde: string | null): Promise<TramoParaFactor[]> {
  const supabase = createSupabaseAdminClient() as any
  let q = supabase
    .from('TramoTrabajo')
    .select(`
      tipo, inicio, fin, cantidadProducida, dudoso, operarioId,
      maquina:Maquina ( id, nombre, tipo ),
      ejecucionEtapa:EjecucionEtapa ( orden:OrdenProduccion ( producto ) )
    `)
    .not('fin', 'is', null)
    .limit(5000)
  if (desde) q = q.gte('inicio', desde)
  const { data } = await q

  return ((data ?? []) as any[]).map(t => ({
    tipo: t.tipo,
    inicio: t.inicio,
    fin: t.fin,
    cantidadProducida: t.cantidadProducida,
    dudoso: t.dudoso,
    maquinaId: t.maquina?.id ?? '',
    maquinaNombre: t.maquina?.nombre ?? '',
    tipoMaquina: t.maquina?.tipo ?? '',
    producto: t.ejecucionEtapa?.orden?.producto ?? '',
    operarioId: t.operarioId,
  }))
}

export default async function FactoresUtilizacion({ desde }: { desde: string | null }) {
  const supabase = createSupabaseAdminClient() as any
  const [tramos, { data: capacidades }] = await Promise.all([
    cargarTramosParaFactor(desde),
    supabase.from('CapacidadTeorica').select('producto, tipoMaquina, piezasPorHora'),
  ])

  const resumen = resumenPorMaquina(tramos, HORAS_JORNADA)
  const velocidades = velocidadRealPorProductoMaquina(tramos, (capacidades ?? []) as CapacidadRow[])
  const setups = setupPromedioPorProducto(tramos)
  const dudosos = tramos.length === 0 ? 0 : undefined // los dudosos ya vienen filtrados en libs; contar aparte:
  const nDudosos = tramos.filter(t => t.dudoso).length

  if (tramos.length === 0) {
    return (
      <section className="mt-8">
        <h2 className="text-white text-lg font-bold mb-2">Factor de utilización</h2>
        <p className="text-gray-500 text-sm">
          Sin tramos fichados todavía. Los datos aparecen cuando los operarios usan
          Preparar / Producir en sus tareas.
        </p>
      </section>
    )
  }

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-white text-lg font-bold">Factor de utilización</h2>
        <ExportarCsvButton tipo="factores" />
      </div>
      {nDudosos > 0 && (
        <p className="text-amber-500 text-xs mb-3">
          {nDudosos} tramo(s) dudosos (cierre automático &gt;12 h) excluidos del cálculo.
        </p>
      )}

      <h3 className="text-gray-300 text-sm font-semibold mb-2">Disponibilidad por máquina</h3>
      <table className="w-full text-sm mb-6">
        <thead>
          <tr className="text-gray-500 text-xs text-left">
            <th className="py-1">Máquina</th>
            <th className="text-right">Fichadas</th>
            <th className="text-right">Setup</th>
            <th className="text-right">Producción</th>
            <th className="text-right">Disponibilidad</th>
            <th className="text-right">n</th>
          </tr>
        </thead>
        <tbody>
          {resumen.map(r => (
            <tr key={r.maquinaId} className="border-t border-gray-800 text-gray-300">
              <td className="py-1.5">{r.maquinaNombre}</td>
              <td className="text-right">{r.horasFichadas.toFixed(1)} h</td>
              <td className="text-right">{r.horasPreparacion.toFixed(1)} h</td>
              <td className="text-right">{r.horasProduccion.toFixed(1)} h</td>
              <td className="text-right font-bold text-white">{r.disponibilidadPct.toFixed(0)}%</td>
              <td className="text-right text-gray-500">{r.n}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3 className="text-gray-300 text-sm font-semibold mb-2">Velocidad real vs. teórica</h3>
      <table className="w-full text-sm mb-6">
        <thead>
          <tr className="text-gray-500 text-xs text-left">
            <th className="py-1">Producto</th>
            <th>Máquina</th>
            <th className="text-right">Real (pzs/h)</th>
            <th className="text-right">Teórico</th>
            <th className="text-right">Factor</th>
            <th className="text-right">n</th>
          </tr>
        </thead>
        <tbody>
          {velocidades.map(v => (
            <tr key={`${v.producto}-${v.maquinaId}`} className="border-t border-gray-800 text-gray-300">
              <td className="py-1.5">{v.producto}</td>
              <td>{v.maquinaNombre}</td>
              <td className="text-right">{v.piezasHoraReal.toFixed(1)}</td>
              <td className="text-right">{v.piezasHoraTeorica?.toFixed(1) ?? '—'}</td>
              <td className="text-right font-bold text-white">
                {v.factorVelocidad != null ? `${(v.factorVelocidad * 100).toFixed(0)}%` : '—'}
              </td>
              <td className="text-right text-gray-500">{v.n}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3 className="text-gray-300 text-sm font-semibold mb-2">Setup promedio por producto</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-gray-500 text-xs text-left">
            <th className="py-1">Producto</th>
            <th className="text-right">Setup promedio</th>
            <th className="text-right">n</th>
          </tr>
        </thead>
        <tbody>
          {setups.map(s => (
            <tr key={s.producto} className="border-t border-gray-800 text-gray-300">
              <td className="py-1.5">{s.producto}</td>
              <td className="text-right font-bold text-white">{s.minutosPromedio.toFixed(0)} min</td>
              <td className="text-right text-gray-500">{s.n}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
```

> Nota: eliminar la línea `const dudosos = ...` sobrante si quedó al copiar — solo se usa `nDudosos`.

- [ ] **Step 2: Montar en `src/app/(supervisor)/rendimiento/page.tsx`**

Importar y renderizar al final del JSX de la página (antes del cierre del `main`), reutilizando el `desde` del filtro de período ya existente:

```tsx
import FactoresUtilizacion from '@/components/supervisor/FactoresUtilizacion'
```

```tsx
      <FactoresUtilizacion desde={desde} />
```

- [ ] **Step 3: Agregar tipo `factores` al export CSV**

En `src/app/api/exportar/route.ts`, agregar una función siguiendo el patrón de `exportarTrazabilidad` y registrarla donde el route despacha por `tipo` (buscar el `switch`/`if` sobre `searchParams.get('tipo')` al final del archivo):

```typescript
async function exportarFactores(supabase: any): Promise<string> {
  const { data } = await supabase
    .from('TramoTrabajo')
    .select(`
      tipo, inicio, fin, cantidadProducida, motivoPausa, dudoso, notas,
      operario:Usuario ( nombre ),
      maquina:Maquina ( nombre, tipo ),
      ejecucionEtapa:EjecucionEtapa (
        etapaRuta:EtapaRuta ( nombreEtapa ),
        orden:OrdenProduccion ( sistema, producto, proyecto:Proyecto ( nombre ) )
      )
    `)
    .not('fin', 'is', null)
    .order('inicio', { ascending: false })
    .limit(5000)

  const headers = row(['Inicio', 'Fin', 'Tipo', 'Producto', 'Etapa', 'Máquina', 'Operario', 'Cantidad', 'Motivo pausa', 'Dudoso', 'Proyecto', 'Notas'])
  const filas = ((data ?? []) as any[]).map(t => {
    const orden = t.ejecucionEtapa?.orden
    return row([
      formatFecha(t.inicio),
      formatFecha(t.fin),
      t.tipo,
      orden?.producto ?? '',
      t.ejecucionEtapa?.etapaRuta?.nombreEtapa ?? '',
      t.maquina?.nombre ?? '',
      t.operario?.nombre ?? '',
      t.cantidadProducida ?? '',
      t.motivoPausa ?? '',
      t.dudoso ? 'Sí' : 'No',
      orden?.proyecto?.nombre ?? '',
      t.notas ?? '',
    ])
  })

  return [headers, ...filas].join('\n')
}
```

En el despacho por tipo, agregar el caso `'factores'` → `exportarFactores(supabase)` con filename `tramos-trabajo.csv`, replicando exactamente cómo se manejan los otros tipos.

En `src/components/shared/ExportarCsvButton.tsx`, ampliar el union: `type Tipo = 'trazabilidad' | 'overrides' | 'alertas' | 'factores'`.

- [ ] **Step 4: Verificar que compila y los tests pasan**

Run: `npm run test:run && npx next build 2>&1 | tail -5`
Expected: tests PASS; build sin errores.

- [ ] **Step 5: Commit**

```bash
git add src/components/supervisor/FactoresUtilizacion.tsx "src/app/(supervisor)/rendimiento/page.tsx" src/app/api/exportar/route.ts src/components/shared/ExportarCsvButton.tsx
git commit -m "feat: vista de factores de utilizacion en rendimiento + export CSV"
```

---

### Task 10: Verificación manual end-to-end

**Files:** ninguno (checklist con dev server)

Constraint del proyecto: siempre `npm run dev`, nunca `vercel dev`.

- [ ] **Step 1: Levantar el dev server**

Run: `npm run dev` (en background)

- [ ] **Step 2: Checklist como operario** (login con un usuario operario; debe tener una etapa ACTIVA asignada — crearla desde supervisor si no hay)

1. La card muestra los botones **▶ Preparar** y **▶ Producir**.
2. Tocar **Producir** en una etapa de Plegado → aparece el selector "Huaxia / Datech" (dos instancias). En una etapa de Embalaje → NO aparece selector (una sola instancia).
3. Con el tramo corriendo: muestra `⏱ PRODUCIENDO en <máquina> · N min`.
4. **Pausar** → ofrece los 4 motivos + Saltear; al elegir, vuelve al estado inicial.
5. **Preparar** → con el setup corriendo, el botón **▶ Producir** sigue visible; tocarlo cierra el setup y abre producción sin pasar por pausa.
6. **Terminar** → pide cantidad con −/+; al confirmar, el % de la etapa avanza igual que con el "Registrar" clásico (verificar que la cascada activa la etapa siguiente al cruzar el umbral).
7. Con un tramo abierto en la tarea X, tocar **Producir** en la tarea Y → confirm "Cerrando tramo de otra tarea (N min)"; al aceptar, el tramo nuevo corre en Y.
8. El botón "Registrar" clásico sigue funcionando igual que antes.

- [ ] **Step 3: Checklist como supervisor**

1. `/rendimiento` muestra la sección "Factor de utilización" con las 3 tablas pobladas por lo fichado en el paso anterior.
2. El filtro de período (7d/30d/90d/Todo) afecta también a los factores.
3. "Exportar CSV" descarga `tramos-trabajo.csv` con los tramos.

- [ ] **Step 4: Verificar regla de oro en DB**

Run: `node scripts/verificar-tiempos-sql.mjs`
Expected: sin errores; y manualmente en Supabase: `select count(*) from "TramoTrabajo" where fin is null` ≤ cantidad de operarios.

- [ ] **Step 5: Commit final si hubo ajustes**

```bash
git add -A && git commit -m "fix: ajustes de verificacion manual de tramos"
```

---

## Self-review (hecho al escribir el plan)

- **Cobertura del spec:** tablas ✓ (Task 1), reglas de integridad ✓ (índice parcial + validaciones API), seed teóricos ✓ (desde `"Velum_tiempos"`, ex hull_tiempos, no Excel — mejora), estados UI 1/2/3 ✓ (Task 8), setup→producción en un toque ✓, motivos de pausa ✓, fusión cantidad+tramo ✓ (PATCH terminar → `registrarProgreso`), huérfanos >12 h ✓ (cierre lazy en POST tramos), `/rendimiento` 3 niveles + n + dudosos ✓, CSV ✓, validaciones server ✓, manejo de errores del spec ✓ (rollback de cierre si falla progreso; constraint DB para doble apertura; tramo vive en server ante pérdida de conexión).
- **Desviaciones anotadas:** sin `GET /api/rendimiento/factores` (server component + lib directa); huérfanos se cierran lazy al abrir el siguiente tramo del mismo operario (no hay cron en el stack) — los huérfanos de operarios que nunca vuelven a fichar quedan abiertos pero se excluyen igual del cálculo (filtro `fin is not null`).
- **Consistencia de tipos:** `TramoParaFactor`/`CapacidadRow` definidos en Task 4 y usados en Task 9; `TipoTramo`/`MotivoPausa`/`MOTIVOS_PAUSA` definidos en Task 3 y usados en Tasks 7-8; `registrarProgreso` definida en Task 5 y usada en Task 7. `esHuerfano` Task 3 → Task 6.
