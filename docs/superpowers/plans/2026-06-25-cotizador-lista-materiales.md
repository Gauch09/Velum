# Cotizador VELUM — Lista de Materiales (BOM) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persistir el despiece (geometría + compras) de cada cotización, mostrarlo como despiece preliminar, y al aceptar la cotización generar una Lista de Materiales (BOM) consolidada, revisable, editable y exportable por área (Compras / Producción).

**Architecture:** El núcleo es una función pura `generarBOM()` (testeable con vitest) que consolida los vanos persistidos en líneas de BOM. Un repositorio `repo-materiales.ts` la conecta a Supabase (generar snapshot, leer, editar, liberar). La generación se dispara desde `cambiarEstado()` al pasar a ACEPTADA. UI nueva en `/cotizaciones/[id]/materiales` + sección de despiece preliminar en la pantalla de cotización + PDFs por área.

**Tech Stack:** Next.js 15 (App Router, server actions), Supabase (cliente admin), Prisma (solo tipos, sin migrate), Vitest, @react-pdf/renderer, Tailwind.

**Spec:** `docs/superpowers/specs/2026-06-25-cotizador-lista-materiales-design.md`

## Global Constraints

- **DB schema SOLO por SQL Editor de Supabase. NUNCA `prisma migrate`** (red local IPv4; pooler :6543 ok). `schema.prisma` se edita a mano solo para tipos.
- **Redondeo de compra SIEMPRE hacia arriba (`Math.ceil`).** Galvanizado: redondeo al total de obra (una vez). ACM: suma de chapas por paño (cada paño ya redondea).
- **Sin `console.log`** en código de producción (sí `console.error` en catch de servidor).
- Inmutabilidad: nunca mutar objetos, devolver copias nuevas.
- Archivos enfocados (<400 líneas típico). `camelCase` vars/funcs, `PascalCase` tipos/componentes, tablas DB `PascalCase`, columnas `camelCase`.
- TC/precios en u$d como en el resto del cotizador.

---

## File Structure

- `app/prisma/sql/2026-06-25-lista-materiales.sql` — **crear** — DDL: extiende `CotizacionVano` + tablas `ListaMateriales`, `LineaMateriales`.
- `app/prisma/schema.prisma` — **modificar** — modelos nuevos + campos (solo tipos).
- `app/src/lib/cotizador/generar-bom.ts` — **crear** — lógica pura de consolidación (núcleo testeable).
- `app/src/lib/cotizador/generar-bom.test.ts` — **crear** — tests vitest.
- `app/src/lib/cotizador/repo-cotizaciones.ts` — **modificar** — `crearCotizacion` persiste `cara`/`geometria`/`compras`.
- `app/src/lib/cotizador/repo-materiales.ts` — **crear** — generar snapshot, leer, editar línea, agregar/borrar línea, liberar.
- `app/src/app/(supervisor)/cotizaciones/[id]/actions.ts` — **modificar** — al pasar a ACEPTADA, generar snapshot.
- `app/src/app/(supervisor)/cotizaciones/[id]/page.tsx` — **modificar** — sección despiece preliminar + link a materiales.
- `app/src/app/(supervisor)/cotizaciones/[id]/materiales/page.tsx` — **crear** — pantalla BOM.
- `app/src/app/(supervisor)/cotizaciones/[id]/materiales/actions.ts` — **crear** — server actions de edición.
- `app/src/components/supervisor/ListaMaterialesEditor.tsx` — **crear** — UI editable.
- `app/src/lib/cotizador/pdf/MaterialesPDF.tsx` — **crear** — PDF por área.
- `app/src/app/api/cotizaciones/[id]/materiales/[area]/pdf/route.ts` — **crear** — ruta export PDF.

**Desviación del spec (documentada):** el wizard ya expande por cantidad (N filas idénticas), así que `CotizacionVano` **no** lleva columna `cantidad`; cada fila es 1 unidad y el BOM suma filas.

---

## Task 1: Esquema de base de datos

**Files:**
- Create: `app/prisma/sql/2026-06-25-lista-materiales.sql`
- Modify: `app/prisma/schema.prisma`

**Interfaces:**
- Produces: tablas `ListaMateriales`, `LineaMateriales`; columnas `CotizacionVano.cara` (text), `CotizacionVano.geometria` (jsonb), `CotizacionVano.compras` (jsonb).

- [ ] **Step 1: Escribir el DDL**

Crear `app/prisma/sql/2026-06-25-lista-materiales.sql`:

```sql
-- Extender CotizacionVano: persistir cara y despiece
alter table "CotizacionVano"
  add column if not exists "cara"      text,
  add column if not exists "geometria" jsonb,
  add column if not exists "compras"   jsonb;

-- Lista de Materiales (BOM): un snapshot por cotización
create table if not exists "ListaMateriales" (
  "id"           uuid primary key,
  "cotizacionId" uuid not null unique references "Cotizacion"("id") on delete cascade,
  "estado"       text not null default 'EN_REVISION',  -- EN_REVISION | LIBERADA
  "createdAt"    timestamptz not null default now(),
  "liberadaAt"   timestamptz
);

-- Líneas del BOM (editables)
create table if not exists "LineaMateriales" (
  "id"           uuid primary key,
  "listaId"      uuid not null references "ListaMateriales"("id") on delete cascade,
  "area"         text   not null,           -- COMPRAS | PRODUCCION
  "cara"         text,                       -- nombre de cara, NULL = consolidado de obra
  "insumo"       text   not null,
  "unidad"       text   not null,           -- un | kg | m2 | chapa
  "cantidad"     numeric not null,
  "cantidadCalc" numeric,                    -- valor original del motor; NULL en MANUAL
  "origen"       text   not null,           -- CALCULADA | MANUAL
  "nota"         text,
  "orden"        int    not null default 0
);
create index if not exists "LineaMateriales_listaId_idx" on "LineaMateriales"("listaId");
```

- [ ] **Step 2: Aplicar el SQL en Supabase**

Copiar el contenido del archivo en el **SQL Editor de Supabase** y ejecutar. NO usar `prisma migrate`.

Verificación (en el mismo SQL Editor):
```sql
select column_name from information_schema.columns
where table_name = 'CotizacionVano' and column_name in ('cara','geometria','compras');
-- Esperado: 3 filas
select to_regclass('"ListaMateriales"'), to_regclass('"LineaMateriales"');
-- Esperado: ambos NO nulos
```

- [ ] **Step 3: Reflejar en schema.prisma (solo tipos, sin migrate)**

En `app/prisma/schema.prisma`, agregar al modelo `CotizacionVano` los campos `cara String?`, `geometria Json?`, `compras Json?`, y agregar los modelos:

```prisma
model ListaMateriales {
  id           String            @id
  cotizacionId String            @unique
  cotizacion   Cotizacion        @relation(fields: [cotizacionId], references: [id], onDelete: Cascade)
  estado       String            @default("EN_REVISION")
  createdAt    DateTime          @default(now())
  liberadaAt   DateTime?
  lineas       LineaMateriales[]
}

model LineaMateriales {
  id           String          @id
  listaId      String
  lista        ListaMateriales @relation(fields: [listaId], references: [id], onDelete: Cascade)
  area         String
  cara         String?
  insumo       String
  unidad       String
  cantidad     Float
  cantidadCalc Float?
  origen       String
  nota         String?
  orden        Int             @default(0)

  @@index([listaId])
}
```

Agregar la relación inversa en `Cotizacion`: `listaMateriales ListaMateriales?`.

- [ ] **Step 4: Regenerar el cliente Prisma y verificar tipos**

Run: `cd app && npx prisma generate && npx tsc --noEmit -p tsconfig.json`
Expected: sin errores.

- [ ] **Step 5: Commit**

```bash
git add app/prisma/sql/2026-06-25-lista-materiales.sql app/prisma/schema.prisma
git commit -m "feat(bom): esquema Lista de Materiales + despiece en CotizacionVano"
```

---

## Task 2: Persistir el despiece al emitir

**Files:**
- Modify: `app/src/lib/cotizador/repo-cotizaciones.ts` (función `crearCotizacion`, mapeo `vanoRows`)

**Interfaces:**
- Consumes: `VanoResultado` (de `cotizar-multi.ts`) que ya incluye `cara` (lo agrega el wizard al payload), `geometria?: VanoGeometria`, `compras?: SkinCompras`.
- Produces: filas de `CotizacionVano` con `cara`, `geometria`, `compras` poblados.

- [ ] **Step 1: Ampliar el mapeo de vanoRows**

En `repo-cotizaciones.ts`, dentro de `crearCotizacion`, el bloque que arma `vanoRows`. Hoy es:

```ts
    const vanoRows = input.vanos.map(v => ({
      id: crypto.randomUUID(),
      cotizacionId: cot.id,
      sistema: v.sistema,
      material: v.material,
      colorACM: v.colorACM ?? null,
      terminacion: v.terminacion,
      ancho: v.ancho,
      alto: v.alto,
      costoFab: v.costoFab,
      costoMaterial: v.costoMaterial,
      precio: v.precioVenta,
    }))
```

Reemplazar por (agrega `cara`, `geometria`, `compras`):

```ts
    const vanoRows = input.vanos.map((v: any) => ({
      id: crypto.randomUUID(),
      cotizacionId: cot.id,
      sistema: v.sistema,
      material: v.material,
      colorACM: v.colorACM ?? null,
      terminacion: v.terminacion,
      ancho: v.ancho,
      alto: v.alto,
      costoFab: v.costoFab,
      costoMaterial: v.costoMaterial,
      precio: v.precioVenta,
      cara: v.cara ?? null,
      geometria: v.geometria ?? null,
      compras: v.compras ?? null,
    }))
```

(`VanoResultado` no declara `cara`; el wizard lo inyecta en el payload. El `: any` evita fricción de tipos en el map; el `leerCotizacion` ya devuelve `data` sin tipar estricto.)

- [ ] **Step 2: Verificar tipos**

Run: `cd app && npx tsc --noEmit -p tsconfig.json`
Expected: sin errores.

- [ ] **Step 3: Verificación manual (integración)**

Con `npm run dev`, emitir una cotización nueva con al menos un vano Skin (que tiene geometría/compras) y una cara nombrada. Luego, en el SQL Editor de Supabase:
```sql
select cara, geometria is not null as g, compras is not null as c
from "CotizacionVano" order by id desc limit 3;
```
Expected: `cara` con el nombre, `g` y `c` en `true` para vanos Skin/SkinRail.

- [ ] **Step 4: Commit**

```bash
git add app/src/lib/cotizador/repo-cotizaciones.ts
git commit -m "feat(bom): guardar cara y despiece (geometria/compras) por vano al emitir"
```

---

## Task 3: Núcleo — `generarBOM()` (TDD)

**Files:**
- Create: `app/src/lib/cotizador/generar-bom.ts`
- Test: `app/src/lib/cotizador/generar-bom.test.ts`

**Interfaces:**
- Produces:
  - `interface VanoBOM { cara: string | null; sistema: string; geometria: VanoGeometria | null; compras: SkinCompras | null }`
  - `interface LineaBOM { area: 'COMPRAS' | 'PRODUCCION'; cara: string | null; insumo: string; unidad: 'un' | 'kg' | 'm2' | 'chapa'; cantidad: number; cantidadCalc: number; origen: 'CALCULADA' }`
  - `interface BOMConfig { kgPorChapaGalv16: number; kgPorChapaGalv25: number }`
  - `const BOM_CONFIG_DEFAULT: BOMConfig` (45.97 / 71.83)
  - `function generarBOM(vanos: VanoBOM[], config?: BOMConfig): LineaBOM[]`
- Orden del array devuelto: COMPRAS (por cara, luego consolidado) y luego PRODUCCION (por cara, luego consolidado). El campo `orden` lo asigna el repo al insertar (índice del array).

- [ ] **Step 1: Escribir los tests que fallan**

Crear `app/src/lib/cotizador/generar-bom.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { generarBOM, BOM_CONFIG_DEFAULT, type VanoBOM } from './generar-bom'

const geom = (over: Partial<VanoBOM['geometria']> = {}) => ({
  paneles: 0, piezas3000: 0, mensulasTotal: 0, brocas: 0, autoperf: 0, empalmesJ: 0, parantes: 0, ...over,
})
const compras = (over: Partial<VanoBOM['compras']> = {}) => ({
  chapasACM: 0, chapasGalv16: 0, kgGalv16: 0, chapasGalv25: 0, kgGalv25: 0, ...over,
})

describe('generarBOM — Producción', () => {
  it('suma piezas por cara y arma el consolidado', () => {
    const vanos: VanoBOM[] = [
      { cara: 'Norte', sistema: 'Skin', geometria: geom({ paneles: 10, mensulasTotal: 20 }), compras: compras() },
      { cara: 'Norte', sistema: 'Skin', geometria: geom({ paneles: 4 }), compras: compras() },
      { cara: 'Sur',   sistema: 'Skin', geometria: geom({ paneles: 7, mensulasTotal: 5 }), compras: compras() },
    ]
    const bom = generarBOM(vanos, BOM_CONFIG_DEFAULT)
    const prod = bom.filter(l => l.area === 'PRODUCCION')

    const norteP = prod.find(l => l.cara === 'Norte' && l.insumo === 'Paneles')
    expect(norteP?.cantidad).toBe(14)
    const consolPaneles = prod.find(l => l.cara === null && l.insumo === 'Paneles')
    expect(consolPaneles?.cantidad).toBe(21)
    const consolPic = prod.find(l => l.cara === null && l.insumo === 'PIC150')
    expect(consolPic?.cantidad).toBe(25)
  })

  it('no emite líneas para insumos en cero', () => {
    const vanos: VanoBOM[] = [
      { cara: 'Norte', sistema: 'Skin', geometria: geom({ paneles: 3 }), compras: compras() },
    ]
    const bom = generarBOM(vanos, BOM_CONFIG_DEFAULT)
    expect(bom.find(l => l.insumo === 'Broca')).toBeUndefined()
  })
})

describe('generarBOM — Compras', () => {
  it('galvanizado: kg por cara (consumo) y chapas redondeadas al total (ceil)', () => {
    const vanos: VanoBOM[] = [
      { cara: 'Norte', sistema: 'Skin', geometria: geom(), compras: compras({ kgGalv16: 30 }) },
      { cara: 'Sur',   sistema: 'Skin', geometria: geom(), compras: compras({ kgGalv16: 30 }) },
    ]
    const bom = generarBOM(vanos, { kgPorChapaGalv16: 46, kgPorChapaGalv25: 72 })
    const norteKg = bom.find(l => l.area === 'COMPRAS' && l.cara === 'Norte' && l.unidad === 'kg' && l.insumo.includes('1.6'))
    expect(norteKg?.cantidad).toBe(30)
    // total 60 kg / 46 kg/chapa = 1.30 → ceil = 2 chapas
    const consol = bom.find(l => l.area === 'COMPRAS' && l.cara === null && l.unidad === 'chapa' && l.insumo.includes('1.6'))
    expect(consol?.cantidad).toBe(2)
  })

  it('ACM: consolidado = suma de chapas por paño (nunca queda corto)', () => {
    const vanos: VanoBOM[] = [
      { cara: 'Norte', sistema: 'Skin', geometria: geom(), compras: compras({ chapasACM: 2 }) },
      { cara: 'Sur',   sistema: 'Skin', geometria: geom(), compras: compras({ chapasACM: 3 }) },
    ]
    const bom = generarBOM(vanos, BOM_CONFIG_DEFAULT)
    const consol = bom.find(l => l.area === 'COMPRAS' && l.cara === null && l.insumo.includes('ACM'))
    expect(consol?.cantidad).toBe(5)
    expect(consol?.unidad).toBe('chapa')
  })
})

describe('generarBOM — bordes', () => {
  it('ignora vanos sin geometría/compras (Rail/Clad)', () => {
    const vanos: VanoBOM[] = [
      { cara: 'Norte', sistema: 'Rail', geometria: null, compras: null },
    ]
    expect(generarBOM(vanos, BOM_CONFIG_DEFAULT)).toEqual([])
  })

  it('cantidadCalc arranca igual a cantidad y origen es CALCULADA', () => {
    const vanos: VanoBOM[] = [
      { cara: 'Norte', sistema: 'Skin', geometria: geom({ paneles: 5 }), compras: compras() },
    ]
    const linea = generarBOM(vanos, BOM_CONFIG_DEFAULT).find(l => l.insumo === 'Paneles' && l.cara === 'Norte')!
    expect(linea.cantidad).toBe(linea.cantidadCalc)
    expect(linea.origen).toBe('CALCULADA')
  })
})
```

- [ ] **Step 2: Correr los tests y verificar que fallan**

Run: `cd app && npx vitest run src/lib/cotizador/generar-bom.test.ts`
Expected: FAIL — "Failed to resolve import './generar-bom'".

- [ ] **Step 3: Implementar `generar-bom.ts`**

Crear `app/src/lib/cotizador/generar-bom.ts`:

```ts
import type { VanoGeometria } from './cotizar-multi'
import type { SkinCompras } from './skin/tipos'

export interface VanoBOM {
  cara: string | null
  sistema: string
  geometria: VanoGeometria | null
  compras: SkinCompras | null
}

export interface LineaBOM {
  area: 'COMPRAS' | 'PRODUCCION'
  cara: string | null            // null = consolidado de obra
  insumo: string
  unidad: 'un' | 'kg' | 'm2' | 'chapa'
  cantidad: number
  cantidadCalc: number
  origen: 'CALCULADA'
}

export interface BOMConfig {
  kgPorChapaGalv16: number
  kgPorChapaGalv25: number
}

// Peso físico de cada chapa galvanizada 3000×1220 (acero 7850 kg/m³):
//   1.6mm → 3.0·1.22·0.0016·7850 ≈ 45.97 kg ; 2.5mm ≈ 71.83 kg
export const BOM_CONFIG_DEFAULT: BOMConfig = { kgPorChapaGalv16: 45.97, kgPorChapaGalv25: 71.83 }

const PIEZAS: Array<{ key: keyof VanoGeometria; insumo: string }> = [
  { key: 'paneles',       insumo: 'Paneles' },
  { key: 'mensulasTotal', insumo: 'PIC150' },
  { key: 'piezas3000',    insumo: 'Costilla 3000mm' },
  { key: 'empalmesJ',     insumo: 'Empalme J' },
  { key: 'brocas',        insumo: 'Broca' },
  { key: 'autoperf',      insumo: 'Autoperforante' },
  { key: 'parantes',      insumo: 'Parante' },
]

function linea(area: LineaBOM['area'], cara: string | null, insumo: string, unidad: LineaBOM['unidad'], cantidad: number): LineaBOM {
  return { area, cara, insumo, unidad, cantidad, cantidadCalc: cantidad, origen: 'CALCULADA' }
}

// Devuelve las caras en orden de primera aparición.
function carasEnOrden(vanos: VanoBOM[]): Array<string | null> {
  const vistas = new Map<string | null, true>()
  for (const v of vanos) vistas.set(v.cara, true)
  return Array.from(vistas.keys())
}

export function generarBOM(vanos: VanoBOM[], config: BOMConfig = BOM_CONFIG_DEFAULT): LineaBOM[] {
  const conDespiece = vanos.filter(v => v.geometria || v.compras)
  if (conDespiece.length === 0) return []

  const caras = carasEnOrden(conDespiece)
  const compras: LineaBOM[] = []
  const produccion: LineaBOM[] = []

  // ── COMPRAS: por cara (consumo) ──
  for (const cara of caras) {
    const vc = conDespiece.filter(v => v.cara === cara)
    const kg16 = vc.reduce((a, v) => a + (v.compras?.kgGalv16 ?? 0), 0)
    const kg25 = vc.reduce((a, v) => a + (v.compras?.kgGalv25 ?? 0), 0)
    const acm  = vc.reduce((a, v) => a + (v.compras?.chapasACM ?? 0), 0)
    if (acm  > 0) compras.push(linea('COMPRAS', cara, 'Chapa ACM 5000×1500', 'chapa', acm))
    if (kg16 > 0) compras.push(linea('COMPRAS', cara, 'Galvanizado 1.6mm', 'kg', round2(kg16)))
    if (kg25 > 0) compras.push(linea('COMPRAS', cara, 'Galvanizado 2.5mm', 'kg', round2(kg25)))
  }

  // ── COMPRAS: consolidado de obra ──
  const acmTotal  = conDespiece.reduce((a, v) => a + (v.compras?.chapasACM ?? 0), 0)   // suma de chapas por paño
  const kg16Total = conDespiece.reduce((a, v) => a + (v.compras?.kgGalv16 ?? 0), 0)
  const kg25Total = conDespiece.reduce((a, v) => a + (v.compras?.kgGalv25 ?? 0), 0)
  if (acmTotal > 0) compras.push(linea('COMPRAS', null, 'Chapa ACM 5000×1500', 'chapa', acmTotal))
  if (kg16Total > 0) compras.push(linea('COMPRAS', null, 'Chapa Galv 1.6 3000×1220', 'chapa', Math.ceil(kg16Total / config.kgPorChapaGalv16)))
  if (kg25Total > 0) compras.push(linea('COMPRAS', null, 'Chapa Galv 2.5 3000×1220', 'chapa', Math.ceil(kg25Total / config.kgPorChapaGalv25)))

  // ── PRODUCCIÓN: por cara + consolidado ──
  for (const cara of caras) {
    const vc = conDespiece.filter(v => v.cara === cara)
    for (const p of PIEZAS) {
      const n = vc.reduce((a, v) => a + (v.geometria?.[p.key] ?? 0), 0)
      if (n > 0) produccion.push(linea('PRODUCCION', cara, p.insumo, 'un', n))
    }
  }
  for (const p of PIEZAS) {
    const n = conDespiece.reduce((a, v) => a + (v.geometria?.[p.key] ?? 0), 0)
    if (n > 0) produccion.push(linea('PRODUCCION', null, p.insumo, 'un', n))
  }

  return [...compras, ...produccion]
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
```

- [ ] **Step 4: Correr los tests y verificar que pasan**

Run: `cd app && npx vitest run src/lib/cotizador/generar-bom.test.ts`
Expected: PASS (todos).

- [ ] **Step 5: Commit**

```bash
git add app/src/lib/cotizador/generar-bom.ts app/src/lib/cotizador/generar-bom.test.ts
git commit -m "feat(bom): generarBOM — consolidación por cara + redondeo de compra (TDD)"
```

---

## Task 4: Repositorio del BOM + disparo al aceptar

**Files:**
- Create: `app/src/lib/cotizador/repo-materiales.ts`
- Modify: `app/src/app/(supervisor)/cotizaciones/[id]/actions.ts` (función `cambiarEstado`)

**Interfaces:**
- Consumes: `generarBOM`, `BOM_CONFIG_DEFAULT`, `VanoBOM`, `LineaBOM` (Task 3).
- Produces:
  - `async function generarSnapshot(cotizacionId: string): Promise<{ id: string }>` — crea (o regenera) la `ListaMateriales` EN_REVISION + sus `LineaMateriales`.
  - `async function leerLista(cotizacionId: string): Promise<ListaMaterialesRow | null>` — lista con sus líneas ordenadas por `orden`.
  - `interface ListaMaterialesRow { id: string; estado: string; liberadaAt: string | null; lineas: LineaRow[] }`
  - `interface LineaRow { id: string; area: string; cara: string | null; insumo: string; unidad: string; cantidad: number; cantidadCalc: number | null; origen: string; nota: string | null; orden: number }`

- [ ] **Step 1: Implementar `repo-materiales.ts`**

Crear `app/src/lib/cotizador/repo-materiales.ts`:

```ts
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { generarBOM, BOM_CONFIG_DEFAULT, type VanoBOM } from './generar-bom'

export interface LineaRow {
  id: string; area: string; cara: string | null; insumo: string; unidad: string
  cantidad: number; cantidadCalc: number | null; origen: string; nota: string | null; orden: number
}
export interface ListaMaterialesRow {
  id: string; estado: string; liberadaAt: string | null; lineas: LineaRow[]
}

export async function generarSnapshot(cotizacionId: string): Promise<{ id: string }> {
  const sb = createSupabaseAdminClient() as any

  // Vanos persistidos de la cotización
  const { data: vanos, error: eV } = await sb
    .from('CotizacionVano')
    .select('cara, sistema, geometria, compras')
    .eq('cotizacionId', cotizacionId)
  if (eV) throw new Error(`generarSnapshot/vanos: ${eV.message}`)

  const entrada: VanoBOM[] = (vanos ?? []).map((v: any) => ({
    cara: v.cara ?? null, sistema: v.sistema, geometria: v.geometria ?? null, compras: v.compras ?? null,
  }))
  const lineasBOM = generarBOM(entrada, BOM_CONFIG_DEFAULT)

  // Una sola lista por cotización: si existe, borrarla (cascade borra líneas) y regenerar
  await sb.from('ListaMateriales').delete().eq('cotizacionId', cotizacionId)

  const listaId = crypto.randomUUID()
  const { error: eL } = await sb.from('ListaMateriales').insert([{
    id: listaId, cotizacionId, estado: 'EN_REVISION',
  }])
  if (eL) throw new Error(`generarSnapshot/lista: ${eL.message}`)

  if (lineasBOM.length > 0) {
    const rows = lineasBOM.map((l, i) => ({
      id: crypto.randomUUID(), listaId,
      area: l.area, cara: l.cara, insumo: l.insumo, unidad: l.unidad,
      cantidad: l.cantidad, cantidadCalc: l.cantidadCalc, origen: l.origen, nota: null, orden: i,
    }))
    const { error: eLn } = await sb.from('LineaMateriales').insert(rows)
    if (eLn) throw new Error(`generarSnapshot/lineas: ${eLn.message}`)
  }
  return { id: listaId }
}

export async function leerLista(cotizacionId: string): Promise<ListaMaterialesRow | null> {
  const sb = createSupabaseAdminClient() as any
  const { data, error } = await sb
    .from('ListaMateriales')
    .select('id, estado, liberadaAt, lineas:LineaMateriales(*)')
    .eq('cotizacionId', cotizacionId)
    .maybeSingle()
  if (error) throw new Error(`leerLista: ${error.message}`)
  if (!data) return null
  const lineas = (data.lineas ?? []).sort((a: LineaRow, b: LineaRow) => a.orden - b.orden)
  return { id: data.id, estado: data.estado, liberadaAt: data.liberadaAt, lineas }
}
```

- [ ] **Step 2: Enganchar la generación en `cambiarEstado`**

En `app/src/app/(supervisor)/cotizaciones/[id]/actions.ts`, después del bloque que actualiza el estado y antes de los `revalidatePath`, agregar la generación cuando se acepta:

```ts
  if (nuevoEstado === 'ACEPTADA') {
    try {
      const { generarSnapshot } = await import('@/lib/cotizador/repo-materiales')
      await generarSnapshot(id)
    } catch (err) {
      console.error('[cambiarEstado] generarSnapshot falló:', err)
      // No bloquea la aceptación: la lista puede regenerarse luego.
    }
  }

  revalidatePath(`/cotizaciones/${id}/materiales`)
```

(El `revalidatePath` de materiales va junto a los existentes.)

- [ ] **Step 3: Verificar tipos**

Run: `cd app && npx tsc --noEmit -p tsconfig.json`
Expected: sin errores.

- [ ] **Step 4: Verificación manual (integración)**

Con `npm run dev`: tomar una cotización en estado ENVIADA/VISTA y pasarla a ACEPTADA. Luego en SQL Editor:
```sql
select lm.estado, count(l.*) as lineas
from "ListaMateriales" lm left join "LineaMateriales" l on l."listaId" = lm.id
group by lm.estado order by 1;
```
Expected: una `ListaMateriales` EN_REVISION con N líneas (>0 si la obra tiene vanos Skin/SkinRail).

- [ ] **Step 5: Commit**

```bash
git add app/src/lib/cotizador/repo-materiales.ts "app/src/app/(supervisor)/cotizaciones/[id]/actions.ts"
git commit -m "feat(bom): generar snapshot al aceptar + repositorio de Lista de Materiales"
```

---

## Task 5: Server actions de edición

**Files:**
- Create: `app/src/app/(supervisor)/cotizaciones/[id]/materiales/actions.ts`

**Interfaces:**
- Consumes: `leerLista` (Task 4), cliente admin Supabase.
- Produces (server actions):
  - `actionEditarCantidad(raw): Promise<{ ok: true } | { error: string }>` — `{ lineaId: string, cantidad: number }`
  - `actionAgregarLinea(raw): Promise<{ ok: true } | { error: string }>` — `{ listaId, area, insumo, unidad, cantidad, nota? }` (origen MANUAL, cara null)
  - `actionBorrarLinea(raw): Promise<{ ok: true } | { error: string }>` — `{ lineaId: string }`
  - `actionLiberar(raw): Promise<{ ok: true } | { error: string }>` — `{ listaId: string }`
- Regla: editar/agregar/borrar solo si la lista está EN_REVISION.

- [ ] **Step 1: Implementar las actions**

Crear `app/src/app/(supervisor)/cotizaciones/[id]/materiales/actions.ts`:

```ts
'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'

async function assertEnRevision(sb: any, listaId: string): Promise<string | null> {
  const { data } = await sb.from('ListaMateriales').select('estado').eq('id', listaId).single()
  if (!data) return 'Lista no encontrada'
  if (data.estado !== 'EN_REVISION') return 'La lista ya fue liberada'
  return null
}

async function listaIdDeLinea(sb: any, lineaId: string): Promise<string | null> {
  const { data } = await sb.from('LineaMateriales').select('listaId').eq('id', lineaId).single()
  return data?.listaId ?? null
}

export async function actionEditarCantidad(raw: unknown) {
  const { lineaId, cantidad } = z.object({ lineaId: z.string().min(1), cantidad: z.number().min(0) }).parse(raw)
  const sb = createSupabaseAdminClient() as any
  const listaId = await listaIdDeLinea(sb, lineaId)
  if (!listaId) return { error: 'Línea no encontrada' }
  const bloqueo = await assertEnRevision(sb, listaId)
  if (bloqueo) return { error: bloqueo }
  const { error } = await sb.from('LineaMateriales').update({ cantidad }).eq('id', lineaId)
  if (error) return { error: error.message }
  return { ok: true as const }
}

export async function actionAgregarLinea(raw: unknown) {
  const input = z.object({
    listaId: z.string().min(1),
    area:    z.enum(['COMPRAS', 'PRODUCCION']),
    insumo:  z.string().min(1),
    unidad:  z.enum(['un', 'kg', 'm2', 'chapa']),
    cantidad: z.number().min(0),
    nota:    z.string().optional(),
  }).parse(raw)
  const sb = createSupabaseAdminClient() as any
  const bloqueo = await assertEnRevision(sb, input.listaId)
  if (bloqueo) return { error: bloqueo }
  const { data: maxRow } = await sb.from('LineaMateriales')
    .select('orden').eq('listaId', input.listaId).order('orden', { ascending: false }).limit(1).maybeSingle()
  const orden = (maxRow?.orden ?? 0) + 1
  const { error } = await sb.from('LineaMateriales').insert([{
    id: crypto.randomUUID(), listaId: input.listaId, area: input.area, cara: null,
    insumo: input.insumo, unidad: input.unidad, cantidad: input.cantidad,
    cantidadCalc: null, origen: 'MANUAL', nota: input.nota ?? null, orden,
  }])
  if (error) return { error: error.message }
  return { ok: true as const }
}

export async function actionBorrarLinea(raw: unknown) {
  const { lineaId } = z.object({ lineaId: z.string().min(1) }).parse(raw)
  const sb = createSupabaseAdminClient() as any
  const listaId = await listaIdDeLinea(sb, lineaId)
  if (!listaId) return { error: 'Línea no encontrada' }
  const bloqueo = await assertEnRevision(sb, listaId)
  if (bloqueo) return { error: bloqueo }
  const { error } = await sb.from('LineaMateriales').delete().eq('id', lineaId)
  if (error) return { error: error.message }
  return { ok: true as const }
}

export async function actionLiberar(raw: unknown) {
  const { listaId } = z.object({ listaId: z.string().min(1) }).parse(raw)
  const sb = createSupabaseAdminClient() as any
  const bloqueo = await assertEnRevision(sb, listaId)
  if (bloqueo) return { error: bloqueo }
  const { error } = await sb.from('ListaMateriales')
    .update({ estado: 'LIBERADA', liberadaAt: new Date().toISOString() }).eq('id', listaId)
  if (error) return { error: error.message }
  return { ok: true as const }
}
```

- [ ] **Step 2: Verificar tipos**

Run: `cd app && npx tsc --noEmit -p tsconfig.json`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add "app/src/app/(supervisor)/cotizaciones/[id]/materiales/actions.ts"
git commit -m "feat(bom): server actions de edición (cantidad, agregar, borrar, liberar)"
```

---

## Task 6: Pantalla del BOM revisable

**Files:**
- Create: `app/src/app/(supervisor)/cotizaciones/[id]/materiales/page.tsx`
- Create: `app/src/components/supervisor/ListaMaterialesEditor.tsx`

**Interfaces:**
- Consumes: `leerLista` (Task 4); actions de Task 5; `leerCotizacion` para el encabezado.
- Produces: ruta `/cotizaciones/[id]/materiales`.

- [ ] **Step 1: Server component de la página**

Crear `app/src/app/(supervisor)/cotizaciones/[id]/materiales/page.tsx`:

```tsx
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { leerCotizacion } from '@/lib/cotizador/repo-cotizaciones'
import { leerLista } from '@/lib/cotizador/repo-materiales'
import ListaMaterialesEditor from '@/components/supervisor/ListaMaterialesEditor'

interface Props { params: { id: string } }

export default async function MaterialesPage({ params }: Props) {
  let cot: any
  try { cot = await leerCotizacion(params.id) } catch { notFound() }
  const lista = await leerLista(params.id)

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-gray-500 font-mono text-sm">{cot.numero}</span>
            <h1 className="text-2xl font-semibold mt-1">Lista de materiales</h1>
            <p className="text-gray-500 text-sm">{cot.cliente?.razonSocial}{cot.ubicacionObra ? ` — ${cot.ubicacionObra}` : ''}</p>
          </div>
          <Link href={`/cotizaciones/${params.id}`} className="text-gray-500 text-sm hover:text-white">← Cotización</Link>
        </div>

        {!lista ? (
          <div className="bg-gray-900 rounded-lg p-6 text-gray-400 text-sm">
            Todavía no hay lista de materiales. Se genera automáticamente cuando la cotización se acepta.
          </div>
        ) : (
          <ListaMaterialesEditor
            cotizacionId={params.id}
            listaId={lista.id}
            estado={lista.estado}
            lineas={lista.lineas}
          />
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Componente cliente editable**

Crear `app/src/components/supervisor/ListaMaterialesEditor.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  actionEditarCantidad, actionAgregarLinea, actionBorrarLinea, actionLiberar,
} from '@/app/(supervisor)/cotizaciones/[id]/materiales/actions'

interface Linea {
  id: string; area: string; cara: string | null; insumo: string; unidad: string
  cantidad: number; cantidadCalc: number | null; origen: string; nota: string | null; orden: number
}
interface Props { cotizacionId: string; listaId: string; estado: string; lineas: Linea[] }

const fmt = (n: number) => n.toLocaleString('es-AR', { maximumFractionDigits: 2 })
const AREAS = ['COMPRAS', 'PRODUCCION'] as const

export default function ListaMaterialesEditor({ listaId, estado, lineas }: Props) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const editable = estado === 'EN_REVISION'

  async function correr(fn: () => Promise<{ ok: true } | { error: string }>) {
    setGuardando(true); setError(null)
    const r = await fn()
    setGuardando(false)
    if ('error' in r) { setError(r.error); return }
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className={`text-xs px-2 py-0.5 rounded ${editable ? 'text-amber-300 bg-amber-950' : 'text-green-300 bg-green-950'}`}>
          {editable ? 'EN REVISIÓN' : 'LIBERADA'}
        </span>
        {editable && (
          <button
            type="button"
            disabled={guardando}
            onClick={() => correr(() => actionLiberar({ listaId }))}
            className="text-sm bg-white text-gray-900 font-semibold px-3 py-1.5 rounded hover:bg-gray-100 disabled:opacity-40"
          >
            Liberar ▸
          </button>
        )}
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {AREAS.map(area => {
        const delArea = lineas.filter(l => l.area === area)
        if (delArea.length === 0) return null
        const caras = Array.from(new Map(delArea.map(l => [l.cara, true])).keys())
        return (
          <div key={area} className="bg-gray-900 rounded-lg p-4">
            <p className="text-gray-400 text-xs uppercase tracking-wider mb-3">{area === 'COMPRAS' ? 'Compras' : 'Producción'}</p>
            {caras.map(cara => (
              <div key={String(cara)} className="mb-3">
                <p className="text-gray-500 text-xs mb-1">{cara ?? 'Consolidado de obra'}</p>
                <div className="divide-y divide-gray-800/60">
                  {delArea.filter(l => l.cara === cara).map(l => (
                    <LineaRow
                      key={l.id} linea={l} editable={editable} guardando={guardando}
                      onEditar={(cantidad) => correr(() => actionEditarCantidad({ lineaId: l.id, cantidad }))}
                      onBorrar={() => correr(() => actionBorrarLinea({ lineaId: l.id }))}
                    />
                  ))}
                </div>
              </div>
            ))}
            {editable && (
              <AgregarLinea area={area} guardando={guardando}
                onAgregar={(p) => correr(() => actionAgregarLinea({ listaId, area, ...p }))} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function LineaRow({ linea, editable, guardando, onEditar, onBorrar }: {
  linea: Linea; editable: boolean; guardando: boolean
  onEditar: (n: number) => void; onBorrar: () => void
}) {
  const [val, setVal] = useState(String(linea.cantidad))
  const ajustada = linea.cantidadCalc != null && linea.cantidad !== linea.cantidadCalc
  return (
    <div className="flex items-center gap-3 py-1.5 text-sm">
      <span className="flex-1 text-gray-300">{linea.insumo}</span>
      {linea.origen === 'MANUAL' && <span className="text-[10px] text-blue-300 bg-blue-950 rounded px-1">manual</span>}
      {ajustada && <span className="text-[10px] text-amber-300">ajustada</span>}
      {editable ? (
        <input
          value={val} onChange={e => setVal(e.target.value)}
          onBlur={() => { const n = Number(val); if (!Number.isNaN(n) && n !== linea.cantidad) onEditar(n) }}
          type="number" step="0.01" min="0"
          className="w-24 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-right text-white"
        />
      ) : (
        <span className="w-24 text-right text-white">{fmt(linea.cantidad)}</span>
      )}
      <span className="w-10 text-gray-500 text-xs">{linea.unidad}</span>
      {editable && linea.origen === 'MANUAL'
        ? <button type="button" disabled={guardando} onClick={onBorrar} className="text-gray-600 hover:text-red-400 text-xs">✕</button>
        : <span className="w-3" />}
    </div>
  )
}

function AgregarLinea({ area, guardando, onAgregar }: {
  area: string; guardando: boolean
  onAgregar: (p: { insumo: string; unidad: 'un'|'kg'|'m2'|'chapa'; cantidad: number; nota?: string }) => void
}) {
  const [insumo, setInsumo] = useState('')
  const [unidad, setUnidad] = useState<'un'|'kg'|'m2'|'chapa'>(area === 'COMPRAS' ? 'un' : 'un')
  const [cantidad, setCantidad] = useState('1')
  const inp = 'bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white text-sm'
  return (
    <div className="flex gap-2 mt-2 pt-2 border-t border-gray-800">
      <input value={insumo} onChange={e => setInsumo(e.target.value)} placeholder="Insumo (ej: Sellador)" className={`${inp} flex-1`} />
      <input value={cantidad} onChange={e => setCantidad(e.target.value)} type="number" min="0" step="0.01" className={`${inp} w-20`} />
      <select value={unidad} onChange={e => setUnidad(e.target.value as any)} className={inp}>
        <option value="un">un</option><option value="kg">kg</option><option value="m2">m²</option><option value="chapa">chapa</option>
      </select>
      <button
        type="button" disabled={guardando || !insumo.trim()}
        onClick={() => { onAgregar({ insumo: insumo.trim(), unidad, cantidad: Number(cantidad) || 0 }); setInsumo(''); setCantidad('1') }}
        className="text-sm border border-gray-600 text-gray-300 px-3 rounded hover:border-gray-400 disabled:opacity-40"
      >+ agregar</button>
    </div>
  )
}
```

> Nota: en esta tarea la barra superior tiene solo el badge de estado y el botón **Liberar**. Los botones de **PDF Compras / PDF Producción** se agregan en Task 8 (necesitan la ruta de export, que aún no existe). `cotizacionId` ya está en `Props` esperando ese uso.

- [ ] **Step 3: Verificar tipos y arranque**

Run: `cd app && npx tsc --noEmit -p tsconfig.json`
Expected: sin errores.

- [ ] **Step 4: Verificación manual**

Con `npm run dev`, abrir `/cotizaciones/<id-de-una-aceptada>/materiales`. Verificar: secciones Compras/Producción, desglose por cara + Consolidado de obra, editar una cantidad (se persiste al salir del input), agregar una línea manual, borrarla, y "Liberar" (después la edición desaparece).

- [ ] **Step 5: Commit**

```bash
git add "app/src/app/(supervisor)/cotizaciones/[id]/materiales/page.tsx" app/src/components/supervisor/ListaMaterialesEditor.tsx
git commit -m "feat(bom): pantalla de Lista de Materiales revisable y editable"
```

---

## Task 7: Despiece preliminar en la cotización

**Files:**
- Modify: `app/src/app/(supervisor)/cotizaciones/[id]/page.tsx`

**Interfaces:**
- Consumes: `generarBOM`, `BOM_CONFIG_DEFAULT` (Task 3); los vanos ya vienen en `cot.vanos` (con `cara`, `geometria`, `compras` desde Task 2).
- Produces: sección visual "Despiece preliminar" + link a `/cotizaciones/[id]/materiales` cuando está ACEPTADA.

- [ ] **Step 1: Calcular el preliminar y renderizar**

En `page.tsx`, importar arriba:
```tsx
import Link from 'next/link'
import { generarBOM, BOM_CONFIG_DEFAULT, type VanoBOM } from '@/lib/cotizador/generar-bom'
```

Dentro del componente, después de obtener `cot`:
```tsx
  const vanosBOM: VanoBOM[] = (cot.vanos ?? []).map((v: any) => ({
    cara: v.cara ?? null, sistema: v.sistema, geometria: v.geometria ?? null, compras: v.compras ?? null,
  }))
  const preliminar = generarBOM(vanosBOM, BOM_CONFIG_DEFAULT)
  const prelimCompras = preliminar.filter(l => l.area === 'COMPRAS' && l.cara === null)
  const prelimProd = preliminar.filter(l => l.area === 'PRODUCCION' && l.cara === null)
  const fmtN = (n: number) => n.toLocaleString('es-AR', { maximumFractionDigits: 2 })
```

Agregar una sección nueva en el JSX (debajo de la sección "Provisión de materiales", antes de "Montaje"):
```tsx
        {/* Despiece preliminar */}
        {preliminar.length > 0 && (
          <div className="bg-gray-900 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-gray-500 text-xs uppercase tracking-wider">Despiece preliminar</p>
              {cot.estado === 'ACEPTADA' && (
                <Link href={`/cotizaciones/${cot.id}/materiales`} className="text-sm text-blue-400 hover:text-blue-300">
                  Lista de materiales ▸
                </Link>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500 text-xs mb-1">A comprar (estimado)</p>
                {prelimCompras.map((l, i) => (
                  <div key={i} className="flex justify-between text-gray-300">
                    <span>{l.insumo}</span><span>{fmtN(l.cantidad)} {l.unidad}</span>
                  </div>
                ))}
              </div>
              <div>
                <p className="text-gray-500 text-xs mb-1">A producir</p>
                {prelimProd.map((l, i) => (
                  <div key={i} className="flex justify-between text-gray-300">
                    <span>{l.insumo}</span><span>{fmtN(l.cantidad)} {l.unidad}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
```

- [ ] **Step 2: Verificar tipos**

Run: `cd app && npx tsc --noEmit -p tsconfig.json`
Expected: sin errores.

- [ ] **Step 3: Verificación manual**

Abrir una cotización con vanos Skin: aparece "Despiece preliminar" con los consolidados de compra y producción. En una cotización ACEPTADA, aparece el link "Lista de materiales ▸".

- [ ] **Step 4: Commit**

```bash
git add "app/src/app/(supervisor)/cotizaciones/[id]/page.tsx"
git commit -m "feat(bom): despiece preliminar en la pantalla de cotización"
```

---

## Task 8: PDF por área (Compras / Producción)

**Files:**
- Create: `app/src/lib/cotizador/pdf/MaterialesPDF.tsx`
- Create: `app/src/app/api/cotizaciones/[id]/materiales/[area]/pdf/route.ts`
- Modify: `app/src/components/supervisor/ListaMaterialesEditor.tsx` (botones de PDF reales; quitar el placeholder de Task 6)

**Interfaces:**
- Consumes: `leerLista` (Task 4), `leerCotizacion`. `area` en la URL: `compras` | `produccion`.
- Produces: ruta `/api/cotizaciones/[id]/materiales/[area]/pdf`.

- [ ] **Step 1: Componente PDF**

Crear `app/src/lib/cotizador/pdf/MaterialesPDF.tsx`:

```tsx
import React from 'react'
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'

const DARK = '#111111', GOLD = '#C5A860', GRAY = '#555555', LIGHT = '#F4F4F4', BORDER = '#E0E0E0'
const s = StyleSheet.create({
  page: { padding: 0, fontSize: 9, fontFamily: 'Helvetica', color: DARK },
  headerBand: { backgroundColor: DARK, padding: '24 32', flexDirection: 'row', justifyContent: 'space-between' },
  brand: { fontSize: 24, fontFamily: 'Helvetica-Bold', color: '#FFF', letterSpacing: 6 },
  sub: { fontSize: 8, color: '#AAA', marginTop: 2, letterSpacing: 2 },
  areaLabel: { fontSize: 10, color: GOLD, textAlign: 'right', fontFamily: 'Helvetica-Bold', letterSpacing: 1 },
  meta: { fontSize: 8, color: '#AAA', textAlign: 'right', marginTop: 2 },
  goldLine: { height: 3, backgroundColor: GOLD },
  body: { padding: '20 32' },
  provisional: { fontSize: 8, color: '#B00', fontFamily: 'Helvetica-Bold', marginBottom: 8 },
  caraTitle: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: GOLD, letterSpacing: 1, marginTop: 12, marginBottom: 4 },
  row: { flexDirection: 'row', padding: '4 8', borderBottomWidth: 1, borderBottomColor: BORDER },
  rowAlt: { flexDirection: 'row', padding: '4 8', backgroundColor: LIGHT, borderBottomWidth: 1, borderBottomColor: BORDER },
  insumo: { flex: 1, fontSize: 8 },
  cant: { width: 80, fontSize: 8, textAlign: 'right', fontFamily: 'Helvetica-Bold' },
  unidad: { width: 40, fontSize: 8, color: GRAY, textAlign: 'right' },
  footer: { borderTopWidth: 1, borderTopColor: BORDER, marginTop: 16, paddingTop: 8 },
  footerText: { fontSize: 7, color: GRAY },
})
const fmt = (n: number) => n.toLocaleString('es-AR', { maximumFractionDigits: 2 })

export interface MaterialesPDFData {
  numero: string
  cliente: string
  obra: string | null
  area: 'COMPRAS' | 'PRODUCCION'
  liberada: boolean
  lineas: Array<{ cara: string | null; insumo: string; unidad: string; cantidad: number }>
}

export function MaterialesPDF({ data }: { data: MaterialesPDFData }) {
  const caras = Array.from(new Map(data.lineas.map(l => [l.cara, true])).keys())
  const titulo = data.area === 'COMPRAS' ? 'COMPRAS — MATERIAS PRIMAS' : 'PRODUCCIÓN — PIEZAS'
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.headerBand}>
          <View><Text style={s.brand}>VELUM</Text><Text style={s.sub}>LISTA DE MATERIALES</Text></View>
          <View>
            <Text style={s.areaLabel}>{titulo}</Text>
            <Text style={s.meta}>{data.numero} · {data.cliente}</Text>
            {data.obra && <Text style={s.meta}>{data.obra}</Text>}
          </View>
        </View>
        <View style={s.goldLine} />
        <View style={s.body}>
          {!data.liberada && <Text style={s.provisional}>PROVISORIO — lista en revisión, no comprar/producir sobre esta versión</Text>}
          {caras.map((cara, ci) => {
            const ls = data.lineas.filter(l => l.cara === cara)
            return (
              <View key={ci} wrap={false}>
                <Text style={s.caraTitle}>{cara ?? 'CONSOLIDADO DE OBRA'}</Text>
                {ls.map((l, i) => (
                  <View key={i} style={i % 2 === 0 ? s.row : s.rowAlt}>
                    <Text style={s.insumo}>{l.insumo}</Text>
                    <Text style={s.cant}>{fmt(l.cantidad)}</Text>
                    <Text style={s.unidad}>{l.unidad}</Text>
                  </View>
                ))}
              </View>
            )
          })}
          <View style={s.footer}>
            <Text style={s.footerText}>VELUM S.R.L. — Planta Industrial Los Polígonos del Norte, Santa Fe.</Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}
```

- [ ] **Step 2: Ruta de export**

Crear `app/src/app/api/cotizaciones/[id]/materiales/[area]/pdf/route.ts`:

```ts
import React from 'react'
import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { leerCotizacion } from '@/lib/cotizador/repo-cotizaciones'
import { leerLista } from '@/lib/cotizador/repo-materiales'
import { MaterialesPDF, type MaterialesPDFData } from '@/lib/cotizador/pdf/MaterialesPDF'

type Params = { params: { id: string; area: string } }
export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: Params) {
  const areaUpper = params.area.toUpperCase()
  if (areaUpper !== 'COMPRAS' && areaUpper !== 'PRODUCCION') {
    return new NextResponse('Área inválida', { status: 400 })
  }
  let cot: any, lista: any
  try {
    cot = await leerCotizacion(params.id)
    lista = await leerLista(params.id)
  } catch (err: any) {
    return new NextResponse(`Error: ${err?.message ?? err}`, { status: 500 })
  }
  if (!lista) return new NextResponse('No hay lista de materiales', { status: 404 })

  const data: MaterialesPDFData = {
    numero: cot.numero,
    cliente: cot.cliente?.razonSocial ?? '—',
    obra: cot.ubicacionObra ?? null,
    area: areaUpper,
    liberada: lista.estado === 'LIBERADA',
    lineas: lista.lineas
      .filter((l: any) => l.area === areaUpper)
      .map((l: any) => ({ cara: l.cara, insumo: l.insumo, unidad: l.unidad, cantidad: l.cantidad })),
  }

  try {
    const buffer = await renderToBuffer(React.createElement(MaterialesPDF, { data }) as any)
    return new NextResponse(buffer as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${cot.numero}-${params.area}.pdf"`,
      },
    })
  } catch (err: any) {
    console.error('[PDF materiales]', err)
    return new NextResponse(`Error generando PDF: ${err?.message ?? err}`, { status: 500 })
  }
}
```

- [ ] **Step 3: Botones de PDF reales en el editor**

En `ListaMaterialesEditor.tsx`: agregar `cotizacionId` ya está en Props. Quitar la función `listaIdToCot` y el bloque `<a hidden>` de Task 6, y agregar botones reales en la barra superior (junto al estado / Liberar):

```tsx
        <div className="flex items-center gap-2">
          <a href={`/api/cotizaciones/${cotizacionId}/materiales/compras/pdf`}
             className="text-sm border border-gray-600 text-gray-300 px-3 py-1.5 rounded hover:border-gray-400 hover:text-white">
            PDF Compras
          </a>
          <a href={`/api/cotizaciones/${cotizacionId}/materiales/produccion/pdf`}
             className="text-sm border border-gray-600 text-gray-300 px-3 py-1.5 rounded hover:border-gray-400 hover:text-white">
            PDF Producción
          </a>
          {editable && (
            <button type="button" disabled={guardando}
              onClick={() => correr(() => actionLiberar({ listaId }))}
              className="text-sm bg-white text-gray-900 font-semibold px-3 py-1.5 rounded hover:bg-gray-100 disabled:opacity-40">
              Liberar ▸
            </button>
          )}
        </div>
```

(Reemplaza el bloque que antes tenía solo el botón Liberar y el placeholder de links.)

- [ ] **Step 4: Verificar tipos**

Run: `cd app && npx tsc --noEmit -p tsconfig.json`
Expected: sin errores.

- [ ] **Step 5: Verificación manual**

En una cotización ACEPTADA, abrir `/materiales`, click "PDF Compras" y "PDF Producción": descargan PDFs con las líneas por cara + consolidado. En estado EN_REVISION el PDF muestra "PROVISORIO"; tras Liberar, sale sin esa marca.

- [ ] **Step 6: Commit**

```bash
git add app/src/lib/cotizador/pdf/MaterialesPDF.tsx "app/src/app/api/cotizaciones/[id]/materiales/[area]/pdf/route.ts" app/src/components/supervisor/ListaMaterialesEditor.tsx
git commit -m "feat(bom): export PDF por área (Compras / Producción) con marca provisorio"
```

---

## Cierre

- [ ] **Correr toda la suite de tests**

Run: `cd app && npx vitest run`
Expected: PASS (incluye `generar-bom.test.ts` + los existentes).

- [ ] **Verificación end-to-end**

Emitir cotización con 2 caras (vanos Skin) → ver despiece preliminar → aceptar → abrir `/materiales` → ajustar una cantidad, agregar línea manual → liberar → bajar ambos PDFs.

- [ ] **Actualizar memoria** `project_velum_lista_materiales`: marcar B implementado, anotar que el SQL fue aplicado en Supabase.
