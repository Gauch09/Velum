# Órdenes de Producción — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Módulo completo de creación y tracking de Órdenes de Producción (OPP/OPS/OPB) con generación de PDF y progreso digital por QR.

**Architecture:** Backend-first en 4 fases. Fase 1 crea el schema y lógica pura. Fase 2 expone las API routes. Fase 3 genera los PDFs. Fase 4 construye la UI wizard y vistas de tracking.

**Tech Stack:** Next.js 14 App Router · TypeScript strict · Tailwind · Supabase REST (`@supabase/supabase-js`) · Vitest · `@react-pdf/renderer` · `bwip-js` · `qrcode`

---

## Fase 1 — Schema y lógica pura

### Task 1: SQL Schema en Supabase

**Files:**
- No files — ejecutar en Supabase SQL Editor

- [ ] **Abrir Supabase SQL Editor y ejecutar:**

```sql
-- Secuencia global para ItemProduccion.codigo (empieza en 1000)
CREATE SEQUENCE IF NOT EXISTS item_produccion_codigo_seq START WITH 1000 INCREMENT BY 1;

-- Secuencia para OrdenPrimaria.numero (empieza en 1)
CREATE SEQUENCE IF NOT EXISTS orden_primaria_numero_seq START WITH 1 INCREMENT BY 1;

CREATE TABLE "OrdenPrimaria" (
  "id"          TEXT PRIMARY KEY,
  "numero"      INT UNIQUE,  -- NULL hasta emitir; se asigna con nextval
  "proyectoId"  TEXT REFERENCES "Proyecto"("id"),
  "tipo"        TEXT NOT NULL CHECK (tipo IN ('OPP','OPS','OPB')),
  "equipo"      TEXT NOT NULL,
  "colorHoja"   TEXT NOT NULL,
  "responsable" TEXT NOT NULL,
  "fecha"       DATE NOT NULL,
  "estado"      TEXT NOT NULL DEFAULT 'BORRADOR'
                CHECK (estado IN ('BORRADOR','EMITIDA','EN_PRODUCCION','COMPLETADA')),
  "creadoEn"    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE "ItemProduccion" (
  "id"                  TEXT PRIMARY KEY,
  "ordenPrimariaId"     TEXT NOT NULL REFERENCES "OrdenPrimaria"("id") ON DELETE CASCADE,
  "codigo"              INT NOT NULL DEFAULT nextval('item_produccion_codigo_seq') UNIQUE,
  "nombre"              TEXT NOT NULL,
  "material"            TEXT NOT NULL,
  "espesor"             FLOAT NOT NULL,
  "largo"               FLOAT NOT NULL,
  "ancho"               FLOAT NOT NULL,
  "cantidadTotal"       INT NOT NULL,
  "cantidadCompletada"  INT NOT NULL DEFAULT 0,
  "cantidadRehacer"     INT NOT NULL DEFAULT 0,
  "proximoProceso"      TEXT NOT NULL,
  "archivoDxfUrl"       TEXT,
  "imagenUrl"           TEXT,
  "notas"               TEXT,
  "bachLavado"          INT,
  "bachHorno"           INT,
  "creadoEn"            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE "LoteChapa" (
  "id"               TEXT PRIMARY KEY,
  "ordenPrimariaId"  TEXT NOT NULL REFERENCES "OrdenPrimaria"("id") ON DELETE CASCADE,
  "codigo"           TEXT NOT NULL,
  "material"         TEXT NOT NULL,
  "colorChapa"       TEXT NOT NULL,
  "medidaLargo"      FLOAT NOT NULL,
  "medidaAncho"      FLOAT NOT NULL,
  "espesor"          FLOAT NOT NULL,
  "cantidadChapas"   INT NOT NULL,
  "creadoEn"         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE "BatchProceso" (
  "id"                  TEXT PRIMARY KEY,
  "itemProduccionId"    TEXT NOT NULL REFERENCES "ItemProduccion"("id") ON DELETE CASCADE,
  "proceso"             TEXT NOT NULL CHECK (proceso IN ('LAVADO','HORNO')),
  "numero"              INT NOT NULL,
  "cantidadPiezas"      INT NOT NULL,
  "cantidadCompletada"  INT NOT NULL DEFAULT 0,
  "cantidadRehacer"     INT NOT NULL DEFAULT 0,
  "estado"              TEXT NOT NULL DEFAULT 'PENDIENTE'
                        CHECK (estado IN ('PENDIENTE','EN_PROCESO','COMPLETADO')),
  "completadoEn"        TIMESTAMPTZ,
  UNIQUE ("itemProduccionId", "proceso", "numero")
);

CREATE TABLE "ConfiguracionEquipo" (
  "tipo"          TEXT PRIMARY KEY CHECK (tipo IN ('LAVADO','HORNO')),
  "capacidadM2"   FLOAT NOT NULL,
  "actualizadoEn" TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO "ConfiguracionEquipo" ("tipo", "capacidadM2") VALUES
  ('LAVADO', 2.0), ('HORNO', 6.0)
ON CONFLICT DO NOTHING;
```

- [ ] **Verificar en Table Editor de Supabase que las 5 tablas existen y `ConfiguracionEquipo` tiene 2 filas.**

- [ ] **Commit**
```bash
git commit --allow-empty -m "chore: schema ordenes-produccion aplicado en Supabase"
```

---

### Task 2: calcularBach — test primero

**Files:**
- Create: `app/src/lib/calcularBach.ts`
- Create: `app/tests/lib/calcularBach.test.ts`

- [ ] **Crear el test (debe fallar)**

```typescript
// app/tests/lib/calcularBach.test.ts
import { describe, it, expect } from 'vitest'
import { calcularBach } from '../../src/lib/calcularBach'

describe('calcularBach', () => {
  it('pieza pequeña da bach grande', () => {
    // 100×100mm = 0.01m², capacidad 2m² → 200
    expect(calcularBach(100, 100, 2.0)).toBe(200)
  })
  it('pieza más grande que la máquina da 0', () => {
    // 3000×1000mm = 3m², capacidad 2m² → 0
    expect(calcularBach(3000, 1000, 2.0)).toBe(0)
  })
  it('área exacta da 1', () => {
    // 2000×1000mm = 2m², capacidad 2m² → 1
    expect(calcularBach(2000, 1000, 2.0)).toBe(1)
  })
  it('trunca decimales', () => {
    // 300×200mm = 0.06m², capacidad 2m² → 33.33 → 33
    expect(calcularBach(300, 200, 2.0)).toBe(33)
  })
  it('horno mayor capacidad que lavado', () => {
    expect(calcularBach(400, 200, 6.0)).toBeGreaterThan(calcularBach(400, 200, 2.0))
  })
})
```

- [ ] **Correr (debe fallar con "Cannot find module")**
```bash
cd app && npx vitest run tests/lib/calcularBach.test.ts
```

- [ ] **Implementar**

```typescript
// app/src/lib/calcularBach.ts
export function calcularBach(
  largo_mm: number,
  ancho_mm: number,
  capacidadM2: number
): number {
  if (largo_mm <= 0 || ancho_mm <= 0 || capacidadM2 <= 0) return 0
  const areaM2 = (largo_mm / 1000) * (ancho_mm / 1000)
  if (areaM2 === 0) return 0
  return Math.floor(capacidadM2 / areaM2)
}
```

- [ ] **Correr (debe pasar)**
```bash
npx vitest run tests/lib/calcularBach.test.ts
```
Esperado: 5 tests passed

- [ ] **Commit**
```bash
git add app/src/lib/calcularBach.ts app/tests/lib/calcularBach.test.ts
git commit -m "feat: calcularBach pura con tests"
```

---

### Task 3: calcularSugerenciaConteo — test primero

**Files:**
- Create: `app/src/lib/calcularSugerenciaConteo.ts`
- Create: `app/tests/lib/calcularSugerenciaConteo.test.ts`

- [ ] **Crear el test**

```typescript
// app/tests/lib/calcularSugerenciaConteo.test.ts
import { describe, it, expect } from 'vitest'
import { calcularSugerenciaConteo } from '../../src/lib/calcularSugerenciaConteo'

describe('calcularSugerenciaConteo', () => {
  it('cantidad divisible da lotes iguales', () => {
    expect(calcularSugerenciaConteo(60, 30)).toEqual([30, 30])
  })
  it('cantidad no divisible distribuye uniformemente', () => {
    // 72 ÷ 3 lotes = [24, 24, 24]
    const lotes = calcularSugerenciaConteo(72, 30)
    expect(lotes).toEqual([24, 24, 24])
  })
  it('suma de lotes es cantidadTotal', () => {
    const lotes = calcularSugerenciaConteo(48, 30)
    expect(lotes.reduce((a, b) => a + b, 0)).toBe(48)
  })
  it('cantidad menor al máximo da un solo lote', () => {
    expect(calcularSugerenciaConteo(12, 30)).toEqual([12])
  })
  it('cantidad cero devuelve vacío', () => {
    expect(calcularSugerenciaConteo(0)).toEqual([])
  })
})
```

- [ ] **Correr (debe fallar)**
```bash
npx vitest run tests/lib/calcularSugerenciaConteo.test.ts
```

- [ ] **Implementar**

```typescript
// app/src/lib/calcularSugerenciaConteo.ts
export function calcularSugerenciaConteo(
  cantidadTotal: number,
  maxPorLote = 30
): number[] {
  if (cantidadTotal <= 0) return []
  if (cantidadTotal <= maxPorLote) return [cantidadTotal]
  const nLotes = Math.ceil(cantidadTotal / maxPorLote)
  const base = Math.floor(cantidadTotal / nLotes)
  const resto = cantidadTotal % nLotes
  return Array.from({ length: nLotes }, (_, i) => (i < resto ? base + 1 : base))
}
```

- [ ] **Correr (debe pasar)**
```bash
npx vitest run tests/lib/calcularSugerenciaConteo.test.ts
```

- [ ] **Commit**
```bash
git add app/src/lib/calcularSugerenciaConteo.ts app/tests/lib/calcularSugerenciaConteo.test.ts
git commit -m "feat: calcularSugerenciaConteo pura con tests"
```

---

### Task 4: generarBatches — test primero

**Files:**
- Create: `app/src/lib/generarBatches.ts`
- Create: `app/tests/lib/generarBatches.test.ts`

- [ ] **Crear el test**

```typescript
// app/tests/lib/generarBatches.test.ts
import { describe, it, expect } from 'vitest'
import { generarBatches } from '../../src/lib/generarBatches'

describe('generarBatches', () => {
  it('genera cantidad correcta de batches', () => {
    expect(generarBatches(72, 30)).toHaveLength(3)
  })
  it('último batch tiene el resto', () => {
    const b = generarBatches(72, 30)
    expect(b[b.length - 1].cantidadPiezas).toBe(12)
  })
  it('suma de piezas es cantidadTotal', () => {
    const suma = generarBatches(72, 30).reduce((acc, b) => acc + b.cantidadPiezas, 0)
    expect(suma).toBe(72)
  })
  it('numerados desde 1', () => {
    const b = generarBatches(60, 30)
    expect(b[0].numero).toBe(1)
    expect(b[1].numero).toBe(2)
  })
  it('cantidad exacta no genera batch vacío', () => {
    expect(generarBatches(30, 30)).toHaveLength(1)
  })
  it('piezasPorBach 0 devuelve vacío', () => {
    expect(generarBatches(72, 0)).toEqual([])
  })
})
```

- [ ] **Correr (debe fallar)**
```bash
npx vitest run tests/lib/generarBatches.test.ts
```

- [ ] **Implementar**

```typescript
// app/src/lib/generarBatches.ts
export function generarBatches(
  cantidadTotal: number,
  piezasPorBach: number
): Array<{ numero: number; cantidadPiezas: number }> {
  if (piezasPorBach <= 0 || cantidadTotal <= 0) return []
  const result: Array<{ numero: number; cantidadPiezas: number }> = []
  let restante = cantidadTotal
  let numero = 1
  while (restante > 0) {
    result.push({ numero, cantidadPiezas: Math.min(piezasPorBach, restante) })
    restante -= piezasPorBach
    numero++
  }
  return result
}
```

- [ ] **Correr todos los tests de lib**
```bash
npx vitest run tests/lib/
```
Esperado: 16+ tests passed (8 semaforo + 12 override + 10 alertas + nuevos)

- [ ] **Commit**
```bash
git add app/src/lib/generarBatches.ts app/tests/lib/generarBatches.test.ts
git commit -m "feat: generarBatches pura con tests"
```

---

## Fase 2 — API Routes

> **Patrón de auth** (igual en todas las routes):
> ```typescript
> const supabaseAuth = createSupabaseServerClient()
> const supabase = createSupabaseAdminClient() as any
> const { data: { user } } = await supabaseAuth.auth.getUser()
> if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
> const { data: usuario } = await supabase
>   .from('Usuario').select('rol').eq('email', user.email!).single()
> ```

---

### Task 5: ConfiguracionEquipo API

**Files:**
- Create: `app/src/app/api/configuracion-equipo/route.ts`

- [ ] **Crear route**

```typescript
// app/src/app/api/configuracion-equipo/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'

export async function GET() {
  const supabaseAuth = createSupabaseServerClient()
  const supabase = createSupabaseAdminClient() as any
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data, error } = await supabase
    .from('ConfiguracionEquipo')
    .select('*')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest) {
  const supabaseAuth = createSupabaseServerClient()
  const supabase = createSupabaseAdminClient() as any
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { data: usuario } = await supabase
    .from('Usuario').select('rol').eq('email', user.email!).single()
  if (usuario?.rol !== 'SUPERVISOR')
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const body = await req.json() as { tipo: string; capacidadM2: number }
  if (!body.tipo || typeof body.capacidadM2 !== 'number' || body.capacidadM2 <= 0)
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })

  const { data, error } = await supabase
    .from('ConfiguracionEquipo')
    .update({ capacidadM2: body.capacidadM2, actualizadoEn: new Date().toISOString() })
    .eq('tipo', body.tipo)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
```

- [ ] **Probar con curl (app corriendo en localhost:3000)**
```bash
curl http://localhost:3000/api/configuracion-equipo
```
Esperado: `[{"tipo":"LAVADO","capacidadM2":2},{"tipo":"HORNO","capacidadM2":6}]`

- [ ] **Commit**
```bash
git add app/src/app/api/configuracion-equipo/route.ts
git commit -m "feat: api configuracion-equipo GET PATCH"
```

---

### Task 6: OrdenPrimaria API — GET list + POST create

**Files:**
- Create: `app/src/app/api/ordenes-primarias/route.ts`

- [ ] **Crear route**

```typescript
// app/src/app/api/ordenes-primarias/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createId } from '@paralleldrive/cuid2'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { calcularBach } from '@/lib/calcularBach'

export async function GET(req: NextRequest) {
  const supabaseAuth = createSupabaseServerClient()
  const supabase = createSupabaseAdminClient() as any
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const proyectoId = searchParams.get('proyectoId')
  const estado = searchParams.get('estado')

  let query = supabase
    .from('OrdenPrimaria')
    .select('*, proyecto:Proyecto(id, nombre, cliente), items:ItemProduccion(*), lotes:LoteChapa(*)')
    .order('creadoEn', { ascending: false })

  if (proyectoId) query = query.eq('proyectoId', proyectoId)
  if (estado) query = query.eq('estado', estado)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const supabaseAuth = createSupabaseServerClient()
  const supabase = createSupabaseAdminClient() as any
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { data: usuario } = await supabase
    .from('Usuario').select('rol').eq('email', user.email!).single()
  if (usuario?.rol !== 'SUPERVISOR')
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const body = await req.json()
  const { tipo, equipo, colorHoja, responsable, fecha, proyectoId } = body

  if (!tipo || !equipo || !colorHoja || !responsable || !fecha)
    return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 })

  // Obtener capacidades para calcular bachs
  const { data: configs } = await supabase
    .from('ConfiguracionEquipo').select('*')
  const capLavado = configs?.find((c: any) => c.tipo === 'LAVADO')?.capacidadM2 ?? 2.0
  const capHorno = configs?.find((c: any) => c.tipo === 'HORNO')?.capacidadM2 ?? 6.0

  const id = createId()
  const { data: orden, error } = await supabase
    .from('OrdenPrimaria')
    .insert({ id, tipo, equipo, colorHoja, responsable, fecha, proyectoId: proyectoId || null })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Insertar items si vienen en el body
  if (Array.isArray(body.items) && body.items.length > 0) {
    const itemsToInsert = body.items.map((item: any) => ({
      id: createId(),
      ordenPrimariaId: id,
      nombre: item.nombre,
      material: item.material,
      espesor: item.espesor,
      largo: item.largo,
      ancho: item.ancho,
      cantidadTotal: item.cantidadTotal,
      proximoProceso: item.proximoProceso,
      notas: item.notas ?? null,
      bachLavado: calcularBach(item.largo, item.ancho, capLavado),
      bachHorno: calcularBach(item.largo, item.ancho, capHorno),
    }))
    const { error: itemsError } = await supabase.from('ItemProduccion').insert(itemsToInsert)
    if (itemsError) return NextResponse.json({ error: itemsError.message }, { status: 500 })
  }

  if (Array.isArray(body.lotes) && body.lotes.length > 0) {
    const lotesToInsert = body.lotes.map((l: any) => ({
      id: createId(),
      ordenPrimariaId: id,
      codigo: l.codigo,
      material: l.material,
      colorChapa: l.colorChapa,
      medidaLargo: l.medidaLargo,
      medidaAncho: l.medidaAncho,
      espesor: l.espesor,
      cantidadChapas: l.cantidadChapas,
    }))
    await supabase.from('LoteChapa').insert(lotesToInsert)
  }

  const { data: completa } = await supabase
    .from('OrdenPrimaria')
    .select('*, proyecto:Proyecto(id, nombre, cliente), items:ItemProduccion(*), lotes:LoteChapa(*)')
    .eq('id', id)
    .single()

  return NextResponse.json(completa, { status: 201 })
}
```

- [ ] **Commit**
```bash
git add app/src/app/api/ordenes-primarias/route.ts
git commit -m "feat: api ordenes-primarias GET POST"
```

---

### Task 7: OrdenPrimaria GET by id + PATCH + POST emitir

**Files:**
- Create: `app/src/app/api/ordenes-primarias/[id]/route.ts`
- Create: `app/src/app/api/ordenes-primarias/[id]/emitir/route.ts`

- [ ] **Crear [id]/route.ts**

```typescript
// app/src/app/api/ordenes-primarias/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'

type Params = { params: { id: string } }

export async function GET(_req: NextRequest, { params }: Params) {
  const supabaseAuth = createSupabaseServerClient()
  const supabase = createSupabaseAdminClient() as any
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data, error } = await supabase
    .from('OrdenPrimaria')
    .select('*, proyecto:Proyecto(id, nombre, cliente), items:ItemProduccion(*, batches:BatchProceso(*)), lotes:LoteChapa(*)')
    .eq('id', params.id)
    .single()
  if (error || !data) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const supabaseAuth = createSupabaseServerClient()
  const supabase = createSupabaseAdminClient() as any
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { data: usuario } = await supabase
    .from('Usuario').select('rol').eq('email', user.email!).single()
  if (usuario?.rol !== 'SUPERVISOR')
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const body = await req.json()
  const allowed = ['tipo','equipo','colorHoja','responsable','fecha','proyectoId','estado']
  const update: Record<string, unknown> = {}
  for (const k of allowed) if (k in body) update[k] = body[k]

  const { data, error } = await supabase
    .from('OrdenPrimaria').update(update).eq('id', params.id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const supabaseAuth = createSupabaseServerClient()
  const supabase = createSupabaseAdminClient() as any
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { data: usuario } = await supabase
    .from('Usuario').select('rol').eq('email', user.email!).single()
  if (usuario?.rol !== 'SUPERVISOR')
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  // Solo borrar borradores
  const { data: op } = await supabase
    .from('OrdenPrimaria').select('estado').eq('id', params.id).single()
  if (op?.estado !== 'BORRADOR')
    return NextResponse.json({ error: 'Solo se pueden eliminar borradores' }, { status: 400 })

  const { error } = await supabase.from('OrdenPrimaria').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
```

- [ ] **Crear [id]/emitir/route.ts**

```typescript
// app/src/app/api/ordenes-primarias/[id]/emitir/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { generarBatches } from '@/lib/generarBatches'
import { createId } from '@paralleldrive/cuid2'

type Params = { params: { id: string } }

export async function POST(_req: NextRequest, { params }: Params) {
  const supabaseAuth = createSupabaseServerClient()
  const supabase = createSupabaseAdminClient() as any
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { data: usuario } = await supabase
    .from('Usuario').select('rol').eq('email', user.email!).single()
  if (usuario?.rol !== 'SUPERVISOR')
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const { data: op } = await supabase
    .from('OrdenPrimaria')
    .select('*, items:ItemProduccion(*)')
    .eq('id', params.id).single()

  if (!op) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  if (op.estado !== 'BORRADOR')
    return NextResponse.json({ error: 'Solo se pueden emitir borradores' }, { status: 400 })
  if (!op.items || op.items.length === 0)
    return NextResponse.json({ error: 'La orden no tiene piezas' }, { status: 400 })

  // Asignar número correlativo usando la secuencia de Postgres
  const { data: seqData } = await supabase.rpc('nextval_orden_primaria')
  const numero = seqData ?? Date.now() // fallback

  // Generar BatchProceso para cada item
  const batchesToInsert: any[] = []
  for (const item of op.items) {
    for (const proceso of ['LAVADO', 'HORNO'] as const) {
      const capacidad = proceso === 'LAVADO' ? item.bachLavado : item.bachHorno
      if (!capacidad || capacidad <= 0) continue
      const batches = generarBatches(item.cantidadTotal, capacidad)
      for (const b of batches) {
        batchesToInsert.push({
          id: createId(),
          itemProduccionId: item.id,
          proceso,
          numero: b.numero,
          cantidadPiezas: b.cantidadPiezas,
        })
      }
    }
  }

  if (batchesToInsert.length > 0) {
    const { error: bErr } = await supabase.from('BatchProceso').insert(batchesToInsert)
    if (bErr) return NextResponse.json({ error: bErr.message }, { status: 500 })
  }

  const { data: updated, error } = await supabase
    .from('OrdenPrimaria')
    .update({ estado: 'EMITIDA', numero })
    .eq('id', params.id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(updated)
}
```

> **Nota:** El `supabase.rpc('nextval_orden_primaria')` requiere crear una función SQL en Supabase:
> ```sql
> CREATE OR REPLACE FUNCTION nextval_orden_primaria()
> RETURNS INT LANGUAGE SQL AS $$
>   SELECT nextval('orden_primaria_numero_seq')::INT;
> $$;
> ```
> Ejecutar esto en Supabase SQL Editor antes de probar la emisión.

- [ ] **Commit**
```bash
git add app/src/app/api/ordenes-primarias/
git commit -m "feat: api ordenes-primarias GET PATCH DELETE emitir"
```

---

### Task 8: ItemProduccion API — progreso

**Files:**
- Create: `app/src/app/api/items-produccion/[id]/progreso/route.ts`

- [ ] **Crear route**

```typescript
// app/src/app/api/items-produccion/[id]/progreso/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'

type Params = { params: { id: string } }

export async function PATCH(req: NextRequest, { params }: Params) {
  const supabaseAuth = createSupabaseServerClient()
  const supabase = createSupabaseAdminClient() as any
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json() as {
    cantidadCompletada?: number
    cantidadRehacer?: number
  }

  const update: Record<string, unknown> = {}
  if (typeof body.cantidadCompletada === 'number') update.cantidadCompletada = body.cantidadCompletada
  if (typeof body.cantidadRehacer === 'number') update.cantidadRehacer = body.cantidadRehacer
  if (Object.keys(update).length === 0)
    return NextResponse.json({ error: 'Sin campos a actualizar' }, { status: 400 })

  const { data, error } = await supabase
    .from('ItemProduccion').update(update).eq('id', params.id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
```

- [ ] **Commit**
```bash
git add app/src/app/api/items-produccion/
git commit -m "feat: api items-produccion PATCH progreso"
```

---

### Task 9: BatchProceso API

**Files:**
- Create: `app/src/app/api/batch-proceso/[id]/route.ts`

- [ ] **Crear route**

```typescript
// app/src/app/api/batch-proceso/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'

type Params = { params: { id: string } }

export async function PATCH(req: NextRequest, { params }: Params) {
  const supabaseAuth = createSupabaseServerClient()
  const supabase = createSupabaseAdminClient() as any
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json() as {
    estado?: 'PENDIENTE' | 'EN_PROCESO' | 'COMPLETADO'
    cantidadCompletada?: number
    cantidadRehacer?: number
  }

  const update: Record<string, unknown> = {}
  if (body.estado) update.estado = body.estado
  if (typeof body.cantidadCompletada === 'number') update.cantidadCompletada = body.cantidadCompletada
  if (typeof body.cantidadRehacer === 'number') update.cantidadRehacer = body.cantidadRehacer
  if (body.estado === 'COMPLETADO') update.completadoEn = new Date().toISOString()

  const { data, error } = await supabase
    .from('BatchProceso').update(update).eq('id', params.id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
```

- [ ] **Commit**
```bash
git add app/src/app/api/batch-proceso/
git commit -m "feat: api batch-proceso PATCH"
```

---

## Fase 3 — PDF Generation

### Task 10: Instalar librerías PDF

**Files:**
- Modify: `app/package.json`

- [ ] **Instalar dependencias**
```bash
cd app && npm install @react-pdf/renderer bwip-js qrcode
npm install --save-dev @types/bwip-js @types/qrcode
```

- [ ] **Verificar que el build no se rompe**
```bash
npm run build 2>&1 | tail -20
```
Si hay errores con `@react-pdf/renderer` en App Router, agregar al `next.config.js`:
```js
// next.config.js — agregar dentro de nextConfig
serverExternalPackages: ['@react-pdf/renderer', 'bwip-js'],
```

- [ ] **Crear helper de barcode**

```typescript
// app/src/lib/pdfHelpers.ts
import bwipjs from 'bwip-js'
import QRCode from 'qrcode'

export async function barcodeBase64(text: string): Promise<string> {
  const buffer = await bwipjs.toBuffer({
    bcid: 'code128',
    text,
    scale: 2,
    height: 8,
    includetext: false,
  })
  return `data:image/png;base64,${buffer.toString('base64')}`
}

export async function qrBase64(url: string): Promise<string> {
  return QRCode.toDataURL(url, { width: 80, margin: 1 })
}
```

- [ ] **Commit**
```bash
git add app/package.json app/package-lock.json app/src/lib/pdfHelpers.ts
git commit -m "feat: instalar react-pdf bwip-js qrcode + helpers"
```

---

### Task 11: OPP PDF template

**Files:**
- Create: `app/src/lib/pdf/OppTemplate.tsx`

- [ ] **Crear template**

```typescript
// app/src/lib/pdf/OppTemplate.tsx
import React from 'react'
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'
import { calcularSugerenciaConteo } from '@/lib/calcularSugerenciaConteo'

const s = StyleSheet.create({
  page: { padding: 24, fontSize: 9, fontFamily: 'Helvetica' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  title: { fontSize: 28, fontFamily: 'Helvetica-Bold' },
  subtitle: { fontSize: 10, color: '#e53e3e' },
  badge: { fontSize: 8, borderWidth: 1, borderColor: '#ccc', padding: '2 6', borderRadius: 3 },
  section: { marginTop: 10, borderTopWidth: 1, borderTopColor: '#ddd', paddingTop: 6 },
  row: { flexDirection: 'row', gap: 8 },
  label: { color: '#666' },
  pieceBlock: { marginTop: 8, borderWidth: 1, borderColor: '#e2e8f0', padding: 8, borderRadius: 4 },
  idRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  idText: { fontSize: 14, fontFamily: 'Helvetica-Bold' },
  bubble: { width: 14, height: 14, borderWidth: 1, borderColor: '#333', borderRadius: 7 },
  bubblesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
})

type Props = {
  orden: any
  barcodeOp: string
  barcodesFn: (text: string) => string // pre-rendered base64 keyed by text
  baseUrl: string
}

export function OppTemplate({ orden, barcodeOp, barcodesFn, baseUrl }: Props) {
  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.title}>OPP</Text>
            <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold' }}>PRIMARIA</Text>
            <Text style={s.subtitle}>Hoja Color: {orden.colorHoja}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 12, fontFamily: 'Helvetica-Bold' }}>N/ {orden.numero}</Text>
            <Image src={barcodeOp} style={{ height: 24, width: 120 }} />
            <Text style={s.label}>FECHA: {new Date(orden.fecha).toLocaleDateString('es-AR')}</Text>
            <Text style={s.label}>PROYECTO: {orden.proyecto?.nombre ?? '-'}</Text>
            <Text style={s.label}>EQUIPO: {orden.equipo}</Text>
            <Text style={{ fontFamily: 'Helvetica-Bold' }}>RESPONSABLE: {orden.responsable}</Text>
          </View>
        </View>

        <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 11, borderBottomWidth: 1, borderBottomColor: '#333', paddingBottom: 4 }}>
          ORDEN DE PRODUCCIÓN - PRIMARIA
        </Text>

        {/* Lotes de chapa (OT) */}
        {orden.lotes?.map((lote: any) => (
          <View key={lote.id} style={s.section}>
            <View style={s.row}>
              <Text style={{ fontFamily: 'Helvetica-Bold' }}>OT: {lote.codigo}</Text>
              <Image src={barcodesFn(lote.codigo)} style={{ height: 20, width: 100 }} />
            </View>
            <Text style={s.label}>
              MAT: {lote.material} · COLOR: {lote.colorChapa} · MEDIDA: {lote.medidaLargo}×{lote.medidaAncho}m · ESP: {lote.espesor}mm · CANT: {lote.cantidadChapas}
            </Text>
            <View style={s.bubblesRow}>
              {Array.from({ length: lote.cantidadChapas }).map((_, i) => (
                <View key={i} style={s.bubble} />
              ))}
            </View>
          </View>
        ))}

        {/* Resumen de piezas */}
        <Text style={{ fontFamily: 'Helvetica-Bold', marginTop: 12 }}>RESUMEN DE PIEZAS</Text>
        {orden.items?.map((item: any) => {
          const lotes = calcularSugerenciaConteo(item.cantidadTotal)
          return (
            <View key={item.id} style={s.pieceBlock}>
              <View style={s.idRow}>
                <Text style={s.idText}>ID {item.codigo}</Text>
                <Image src={barcodesFn(String(item.codigo))} style={{ height: 20, width: 90 }} />
              </View>
              <Text style={{ fontFamily: 'Helvetica-Bold' }}>PIEZA: {item.nombre}</Text>
              <Text style={s.label}>MAT: {item.material} · ESP: {item.espesor}</Text>
              <Text style={s.label}>NOTAS: {item.notas ?? '-'}</Text>
              <View style={{ ...s.row, marginTop: 4 }}>
                <Text>NECESARIOS: <Text style={{ fontFamily: 'Helvetica-Bold' }}>{item.cantidadTotal}</Text></Text>
                <Text style={s.label}>COMPLETADOS: ________________</Text>
                <Text style={s.label}>REHACER: ________________</Text>
              </View>
              <Text style={s.label}>
                SUGERENCIA DE CONTEO: {lotes.length} lotes — {lotes.join(' + ')} piezas
              </Text>
              <View style={s.bubblesRow}>
                {lotes.map((cant, i) => (
                  <View key={i} style={s.row}>
                    <View style={s.bubble} />
                    <Text style={{ fontSize: 7 }}>{cant}</Text>
                  </View>
                ))}
              </View>
              <Text style={s.label}>PRÓXIMO PROCESO: {item.proximoProceso}</Text>
            </View>
          )
        })}
      </Page>
    </Document>
  )
}
```

- [ ] **Commit**
```bash
git add app/src/lib/pdf/OppTemplate.tsx
git commit -m "feat: OPP PDF template"
```

---

### Task 12: OPS y OPB PDF templates

**Files:**
- Create: `app/src/lib/pdf/OpsTemplate.tsx`
- Create: `app/src/lib/pdf/OpbTemplate.tsx`

- [ ] **Crear OpsTemplate.tsx** (igual que OPP sin lotes de chapa, con imagen placeholder)

```typescript
// app/src/lib/pdf/OpsTemplate.tsx
import React from 'react'
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'
import { calcularSugerenciaConteo } from '@/lib/calcularSugerenciaConteo'

const s = StyleSheet.create({
  page: { padding: 24, fontSize: 9, fontFamily: 'Helvetica' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  title: { fontSize: 28, fontFamily: 'Helvetica-Bold' },
  subtitle: { fontSize: 10, color: '#3182ce' },
  row: { flexDirection: 'row', gap: 8 },
  label: { color: '#666' },
  pieceBlock: { marginTop: 8, borderWidth: 1, borderColor: '#e2e8f0', padding: 8, borderRadius: 4, flexDirection: 'row' },
  pieceLeft: { flex: 1 },
  pieceRight: { width: 80, height: 80, borderWidth: 1, borderColor: '#ccc', alignItems: 'center', justifyContent: 'center' },
  idText: { fontSize: 14, fontFamily: 'Helvetica-Bold' },
  bubble: { width: 14, height: 14, borderWidth: 1, borderColor: '#333', borderRadius: 7 },
  bubblesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
})

type Props = { orden: any; barcodeOp: string; barcodesFn: (text: string) => string }

export function OpsTemplate({ orden, barcodeOp, barcodesFn }: Props) {
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View>
            <Text style={s.title}>OPS</Text>
            <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold' }}>SECUNDARIA</Text>
            <Text style={s.subtitle}>Hoja: {orden.colorHoja}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 12, fontFamily: 'Helvetica-Bold' }}>N/ {orden.numero}</Text>
            <Image src={barcodeOp} style={{ height: 24, width: 120 }} />
            <Text style={s.label}>FECHA: {new Date(orden.fecha).toLocaleDateString('es-AR')}</Text>
            <Text style={s.label}>PROYECTO: {orden.proyecto?.nombre ?? '-'}</Text>
            <Text style={s.label}>PROCESO: {orden.equipo}</Text>
            <Text style={{ fontFamily: 'Helvetica-Bold' }}>RESPONSABLE: {orden.responsable}</Text>
          </View>
        </View>

        <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 11, borderBottomWidth: 1, borderBottomColor: '#333', paddingBottom: 4 }}>
          ORDEN DE PROCESO - SECUNDARIA
        </Text>
        <Text style={s.label}>RESUMEN DE PIEZAS</Text>

        {orden.items?.map((item: any) => {
          const lotes = calcularSugerenciaConteo(item.cantidadTotal)
          return (
            <View key={item.id} style={s.pieceBlock}>
              <View style={s.pieceLeft}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={s.idText}>ID {item.codigo}</Text>
                  <Image src={barcodesFn(String(item.codigo))} style={{ height: 20, width: 90 }} />
                </View>
                <Text style={{ fontFamily: 'Helvetica-Bold' }}>PIEZA: {item.nombre}</Text>
                <Text style={s.label}>MAT: {item.material} · ESP: {item.espesor}</Text>
                <Text style={s.label}>NOTAS: {item.notas ?? '-'}</Text>
                <Text style={{ marginTop: 4 }}>NECESARIOS: <Text style={{ fontFamily: 'Helvetica-Bold' }}>{item.cantidadTotal}</Text></Text>
                <Text style={s.label}>RESUMEN DE LOTES: {lotes.join(' + ')} piezas</Text>
                <Text style={s.label}>PRÓXIMO PROCESO: {item.proximoProceso}</Text>
                <View style={s.bubblesRow}>
                  {lotes.map((cant, i) => (
                    <View key={i} style={{ flexDirection: 'row', gap: 2 }}>
                      <View style={s.bubble} />
                      <Text style={{ fontSize: 7 }}>{cant}</Text>
                    </View>
                  ))}
                </View>
              </View>
              <View style={s.pieceRight}>
                {item.imagenUrl
                  ? <Image src={item.imagenUrl} style={{ width: 76, height: 76 }} />
                  : <Text style={{ fontSize: 7, color: '#aaa' }}>Sin imagen</Text>}
              </View>
            </View>
          )
        })}
      </Page>
    </Document>
  )
}
```

- [ ] **Crear OpbTemplate.tsx**

```typescript
// app/src/lib/pdf/OpbTemplate.tsx
import React from 'react'
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'

const s = StyleSheet.create({
  page: { padding: 24, fontSize: 9, fontFamily: 'Helvetica' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  title: { fontSize: 28, fontFamily: 'Helvetica-Bold' },
  label: { color: '#666' },
  pieceBlock: { marginTop: 8, borderWidth: 1, borderColor: '#e2e8f0', padding: 8 },
  batchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  bubble: { width: 14, height: 14, borderWidth: 1, borderColor: '#333', borderRadius: 7 },
})

type Props = { orden: any; proceso: 'LAVADO' | 'HORNO'; barcodeOp: string; barcodesFn: (text: string) => string }

export function OpbTemplate({ orden, proceso, barcodeOp, barcodesFn }: Props) {
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View>
            <Text style={s.title}>OPB</Text>
            <Text style={{ fontFamily: 'Helvetica-Bold' }}>PROCESO: {proceso}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 12, fontFamily: 'Helvetica-Bold' }}>N/ {orden.numero}</Text>
            <Image src={barcodeOp} style={{ height: 24, width: 120 }} />
            <Text style={s.label}>FECHA: {new Date(orden.fecha).toLocaleDateString('es-AR')}</Text>
            <Text style={s.label}>PROYECTO: {orden.proyecto?.nombre ?? '-'}</Text>
            <Text style={{ fontFamily: 'Helvetica-Bold' }}>RESPONSABLE: {orden.responsable}</Text>
          </View>
        </View>

        {orden.items?.map((item: any) => {
          const batches = item.batches?.filter((b: any) => b.proceso === proceso) ?? []
          if (batches.length === 0) return null
          return (
            <View key={item.id} style={s.pieceBlock}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 14, fontFamily: 'Helvetica-Bold' }}>ID {item.codigo}</Text>
                <Image src={barcodesFn(String(item.codigo))} style={{ height: 20, width: 90 }} />
              </View>
              <Text style={{ fontFamily: 'Helvetica-Bold' }}>PIEZA: {item.nombre}</Text>
              <Text style={s.label}>MAT: {item.material} · ESP: {item.espesor}</Text>
              <Text>NECESARIOS: <Text style={{ fontFamily: 'Helvetica-Bold' }}>{item.cantidadTotal}</Text></Text>

              {batches.map((b: any) => {
                const barcodeKey = `${orden.numero}|${item.codigo}|${b.numero}`
                return (
                  <View key={b.id} style={s.batchRow}>
                    <View style={s.bubble} />
                    <Image src={barcodesFn(barcodeKey)} style={{ height: 20, width: 90 }} />
                    <Text style={{ fontFamily: 'Helvetica-Bold' }}>{barcodeKey}</Text>
                    <Text>CANT: {b.cantidadPiezas}</Text>
                    <Text style={s.label}>COMPLETADOS: ___________</Text>
                    <Text style={s.label}>REHACER: ___________</Text>
                  </View>
                )
              })}
            </View>
          )
        })}
      </Page>
    </Document>
  )
}
```

- [ ] **Commit**
```bash
git add app/src/lib/pdf/
git commit -m "feat: OPS y OPB PDF templates"
```

---

### Task 13: PDF API endpoint

**Files:**
- Create: `app/src/app/api/ordenes-primarias/[id]/pdf/route.ts`

- [ ] **Crear route**

```typescript
// app/src/app/api/ordenes-primarias/[id]/pdf/route.ts
import { NextRequest, NextResponse } from 'next/server'
import React from 'react'
import { renderToBuffer } from '@react-pdf/renderer'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { barcodeBase64 } from '@/lib/pdfHelpers'
import { OppTemplate } from '@/lib/pdf/OppTemplate'
import { OpsTemplate } from '@/lib/pdf/OpsTemplate'
import { OpbTemplate } from '@/lib/pdf/OpbTemplate'

type Params = { params: { id: string } }

export async function GET(_req: NextRequest, { params }: Params) {
  const supabaseAuth = createSupabaseServerClient()
  const supabase = createSupabaseAdminClient() as any
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) return new NextResponse('No autorizado', { status: 401 })

  const { data: orden, error } = await supabase
    .from('OrdenPrimaria')
    .select('*, proyecto:Proyecto(id,nombre,cliente), items:ItemProduccion(*, batches:BatchProceso(*)), lotes:LoteChapa(*)')
    .eq('id', params.id)
    .single()
  if (error || !orden) return new NextResponse('No encontrado', { status: 404 })

  // Pre-renderizar barcodes necesarios
  const codesNeeded = new Set<string>()
  codesNeeded.add(String(orden.numero))
  orden.lotes?.forEach((l: any) => codesNeeded.add(l.codigo))
  orden.items?.forEach((item: any) => {
    codesNeeded.add(String(item.codigo))
    item.batches?.forEach((b: any) => {
      codesNeeded.add(`${orden.numero}|${item.codigo}|${b.numero}`)
    })
  })

  const barcodeMap: Record<string, string> = {}
  await Promise.all(
    Array.from(codesNeeded).map(async (code) => {
      barcodeMap[code] = await barcodeBase64(code)
    })
  )

  const barcodesFn = (text: string) => barcodeMap[text] ?? ''
  const barcodeOp = barcodeMap[String(orden.numero)]

  let element: React.ReactElement
  if (orden.tipo === 'OPP') {
    element = React.createElement(OppTemplate, { orden, barcodeOp, barcodesFn, baseUrl: process.env.NEXT_PUBLIC_BASE_URL ?? '' })
  } else if (orden.tipo === 'OPS') {
    element = React.createElement(OpsTemplate, { orden, barcodeOp, barcodesFn })
  } else {
    // OPB — determinar proceso desde el equipo
    const proceso = orden.equipo === 'LAVADO' ? 'LAVADO' : 'HORNO'
    element = React.createElement(OpbTemplate, { orden, proceso, barcodeOp, barcodesFn })
  }

  const buffer = await renderToBuffer(element)
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="OP${orden.numero}-${orden.tipo}.pdf"`,
    },
  })
}
```

- [ ] **Probar:** Con una orden emitida, abrir en browser `http://localhost:3000/api/ordenes-primarias/[id]/pdf` — debe descargarse un PDF.

- [ ] **Commit**
```bash
git add app/src/app/api/ordenes-primarias/[id]/pdf/route.ts
git commit -m "feat: endpoint PDF generacion OPP/OPS/OPB"
```

---

## Fase 4 — UI

### Task 14: Sidebar + página lista OPs

**Files:**
- Modify: `app/src/app/(supervisor)/dashboard/page.tsx` (agregar link sidebar)
- Create: `app/src/app/(supervisor)/ordenes/page.tsx`

- [ ] **Agregar entrada en el sidebar del Supervisor** (buscar el componente de navegación existente y agregar):
```tsx
<Link href="/ordenes" className="...">Órdenes Primarias</Link>
```

- [ ] **Crear página lista**

```tsx
// app/src/app/(supervisor)/ordenes/page.tsx
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import Link from 'next/link'

export default async function OrdenesPage() {
  const supabase = createSupabaseAdminClient() as any
  const { data: ordenes } = await supabase
    .from('OrdenPrimaria')
    .select('*, proyecto:Proyecto(nombre,cliente), items:ItemProduccion(cantidadTotal,cantidadCompletada)')
    .order('creadoEn', { ascending: false })

  return (
    <main className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-white text-2xl font-bold">Órdenes de Producción</h1>
        <Link
          href="/ordenes/nueva"
          className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg font-semibold text-sm"
        >
          + Nueva OP
        </Link>
      </div>

      <div className="flex flex-col gap-3">
        {(ordenes ?? []).map((op: any) => {
          const totalPiezas = op.items?.reduce((s: number, i: any) => s + i.cantidadTotal, 0) ?? 0
          const completadas = op.items?.reduce((s: number, i: any) => s + i.cantidadCompletada, 0) ?? 0
          const pct = totalPiezas > 0 ? Math.round((completadas / totalPiezas) * 100) : 0
          return (
            <div key={op.id} className="bg-gray-800 rounded-xl p-4 border border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-white font-bold">
                    {op.numero ? `OP ${op.numero}` : 'BORRADOR'}
                  </span>
                  <span className="text-gray-400 text-sm ml-3">
                    {op.tipo} · {op.equipo} · {op.responsable}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                    op.estado === 'EMITIDA' ? 'bg-blue-900 text-blue-300' :
                    op.estado === 'BORRADOR' ? 'bg-gray-700 text-gray-300' :
                    op.estado === 'COMPLETADA' ? 'bg-green-900 text-green-300' :
                    'bg-yellow-900 text-yellow-300'
                  }`}>{op.estado}</span>
                  <Link
                    href={`/ordenes/${op.id}`}
                    className="text-blue-400 text-sm hover:underline"
                  >
                    Ver →
                  </Link>
                </div>
              </div>
              {op.proyecto && (
                <p className="text-gray-400 text-sm mt-1">{op.proyecto.nombre} — {op.proyecto.cliente}</p>
              )}
              {totalPiezas > 0 && (
                <div className="mt-2">
                  <div className="h-1.5 bg-gray-700 rounded-full">
                    <div className="h-1.5 bg-green-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-gray-500 text-xs mt-1">{completadas}/{totalPiezas} piezas · {pct}%</p>
                </div>
              )}
            </div>
          )
        })}
        {(!ordenes || ordenes.length === 0) && (
          <p className="text-gray-500 text-center py-12">No hay órdenes. Creá la primera.</p>
        )}
      </div>
    </main>
  )
}
```

- [ ] **Commit**
```bash
git add app/src/app/(supervisor)/ordenes/
git commit -m "feat: pagina lista ordenes primarias"
```

---

### Task 15: ItemProduccionForm mini-modal

**Files:**
- Create: `app/src/components/supervisor/ItemProduccionForm.tsx`

- [ ] **Crear componente**

```tsx
// app/src/components/supervisor/ItemProduccionForm.tsx
'use client'
import { useState } from 'react'

type ItemDraft = {
  nombre: string
  material: string
  espesor: string
  largo: string
  ancho: string
  cantidadTotal: string
  proximoProceso: string
  notas: string
}

const EMPTY: ItemDraft = {
  nombre: '', material: 'Chapa Galv.', espesor: '0.7',
  largo: '', ancho: '', cantidadTotal: '', proximoProceso: 'Plegado', notas: ''
}

type Props = {
  capLavado: number
  capHorno: number
  onAdd: (item: ItemDraft & { bachLavado: number; bachHorno: number }) => void
}

export default function ItemProduccionForm({ capLavado, capHorno, onAdd }: Props) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<ItemDraft>(EMPTY)

  function calcBach(largo: number, ancho: number, cap: number) {
    if (!largo || !ancho || !cap) return 0
    const area = (largo / 1000) * (ancho / 1000)
    return area > 0 ? Math.floor(cap / area) : 0
  }

  const largo = parseFloat(form.largo) || 0
  const ancho = parseFloat(form.ancho) || 0
  const bachLavado = calcBach(largo, ancho, capLavado)
  const bachHorno = calcBach(largo, ancho, capHorno)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nombre || !form.largo || !form.ancho || !form.cantidadTotal) return
    onAdd({ ...form, bachLavado, bachHorno })
    setForm(EMPTY)
    setOpen(false)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-green-400 border border-green-700 hover:border-green-400 px-3 py-1.5 rounded-lg text-sm"
      >
        + Agregar pieza
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}
        >
          <form
            onSubmit={handleSubmit}
            className="bg-gray-900 rounded-xl w-full max-w-md border border-gray-700 p-5 flex flex-col gap-3"
          >
            <h3 className="text-white font-bold text-base">Nueva pieza</h3>

            {[
              { label: 'Nombre *', key: 'nombre', placeholder: 'MultiSlim.O - 1322 - 1400mm' },
              { label: 'Material *', key: 'material', placeholder: 'Chapa Galv.' },
            ].map(({ label, key, placeholder }) => (
              <div key={key}>
                <label className="text-gray-400 text-xs mb-1 block">{label}</label>
                <input
                  className="w-full bg-gray-800 text-white text-sm px-3 py-2 rounded-lg border border-gray-600 focus:border-green-500 outline-none"
                  value={(form as any)[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder}
                  required
                />
              </div>
            ))}

            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Espesor (mm)', key: 'espesor' },
                { label: 'Largo (mm)', key: 'largo' },
                { label: 'Ancho (mm)', key: 'ancho' },
              ].map(({ label, key }) => (
                <div key={key}>
                  <label className="text-gray-400 text-xs mb-1 block">{label}</label>
                  <input
                    type="number" step="0.1"
                    className="w-full bg-gray-800 text-white text-sm px-3 py-2 rounded-lg border border-gray-600 focus:border-green-500 outline-none"
                    value={(form as any)[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    required={key !== 'espesor'}
                  />
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Cantidad necesaria *</label>
                <input
                  type="number" min="1"
                  className="w-full bg-gray-800 text-white text-sm px-3 py-2 rounded-lg border border-gray-600 focus:border-green-500 outline-none"
                  value={form.cantidadTotal}
                  onChange={e => setForm(f => ({ ...f, cantidadTotal: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Próximo proceso</label>
                <input
                  className="w-full bg-gray-800 text-white text-sm px-3 py-2 rounded-lg border border-gray-600 focus:border-green-500 outline-none"
                  value={form.proximoProceso}
                  onChange={e => setForm(f => ({ ...f, proximoProceso: e.target.value }))}
                />
              </div>
            </div>

            {largo > 0 && ancho > 0 && (
              <p className="text-xs text-gray-500">
                Bach Lavado: <span className="text-blue-400">{bachLavado} pzas</span> ·
                Bach Horno: <span className="text-orange-400">{bachHorno} pzas</span>
              </p>
            )}

            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setOpen(false)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg text-sm">
                Cancelar
              </button>
              <button type="submit"
                className="flex-1 bg-green-600 hover:bg-green-500 text-white py-2 rounded-lg font-bold text-sm">
                Agregar
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}
```

- [ ] **Commit**
```bash
git add app/src/components/supervisor/ItemProduccionForm.tsx
git commit -m "feat: ItemProduccionForm mini-modal"
```

---

### Task 16: LoteChapaForm mini-modal

**Files:**
- Create: `app/src/components/supervisor/LoteChapaForm.tsx`

- [ ] **Crear componente**

```tsx
// app/src/components/supervisor/LoteChapaForm.tsx
'use client'
import { useState } from 'react'

type LoteDraft = {
  codigo: string
  material: string
  colorChapa: string
  medidaLargo: string
  medidaAncho: string
  espesor: string
  cantidadChapas: string
}

const EMPTY: LoteDraft = {
  codigo: '', material: 'Chapa Galv.', colorChapa: 'Crudo',
  medidaLargo: '3', medidaAncho: '1.2', espesor: '0.7', cantidadChapas: ''
}

type Props = { onAdd: (lote: LoteDraft) => void }

export default function LoteChapaForm({ onAdd }: Props) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<LoteDraft>(EMPTY)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.codigo || !form.cantidadChapas) return
    onAdd(form)
    setForm(EMPTY)
    setOpen(false)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-yellow-400 border border-yellow-700 hover:border-yellow-400 px-3 py-1.5 rounded-lg text-sm"
      >
        + Agregar lote de chapa (OT)
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}
        >
          <form
            onSubmit={handleSubmit}
            className="bg-gray-900 rounded-xl w-full max-w-sm border border-gray-700 p-5 flex flex-col gap-3"
          >
            <h3 className="text-white font-bold text-base">Nuevo lote de chapa (OT)</h3>

            <div>
              <label className="text-gray-400 text-xs mb-1 block">Código OT *</label>
              <input
                className="w-full bg-gray-800 text-white text-sm px-3 py-2 rounded-lg border border-gray-600 focus:border-yellow-500 outline-none"
                value={form.codigo}
                onChange={e => setForm(f => ({ ...f, codigo: e.target.value }))}
                placeholder="2026.4\L16"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Material', key: 'material' },
                { label: 'Color', key: 'colorChapa' },
              ].map(({ label, key }) => (
                <div key={key}>
                  <label className="text-gray-400 text-xs mb-1 block">{label}</label>
                  <input
                    className="w-full bg-gray-800 text-white text-sm px-3 py-2 rounded-lg border border-gray-600 outline-none"
                    value={(form as any)[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  />
                </div>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Largo (m)', key: 'medidaLargo' },
                { label: 'Ancho (m)', key: 'medidaAncho' },
                { label: 'ESP (mm)', key: 'espesor' },
              ].map(({ label, key }) => (
                <div key={key}>
                  <label className="text-gray-400 text-xs mb-1 block">{label}</label>
                  <input
                    type="number" step="0.01"
                    className="w-full bg-gray-800 text-white text-sm px-3 py-2 rounded-lg border border-gray-600 outline-none"
                    value={(form as any)[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  />
                </div>
              ))}
            </div>

            <div>
              <label className="text-gray-400 text-xs mb-1 block">Cantidad chapas *</label>
              <input
                type="number" min="1"
                className="w-full bg-gray-800 text-white text-sm px-3 py-2 rounded-lg border border-gray-600 focus:border-yellow-500 outline-none"
                value={form.cantidadChapas}
                onChange={e => setForm(f => ({ ...f, cantidadChapas: e.target.value }))}
                required
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setOpen(false)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg text-sm">Cancelar</button>
              <button type="submit"
                className="flex-1 bg-yellow-600 hover:bg-yellow-500 text-white py-2 rounded-lg font-bold text-sm">Agregar</button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}
```

- [ ] **Commit**
```bash
git add app/src/components/supervisor/LoteChapaForm.tsx
git commit -m "feat: LoteChapaForm mini-modal"
```

---

### Task 17: Wizard — página /ordenes/nueva

**Files:**
- Create: `app/src/app/(supervisor)/ordenes/nueva/page.tsx`
- Create: `app/src/components/supervisor/NuevaOrdenPrimariaWizard.tsx`

- [ ] **Crear la página (Server Component que carga datos iniciales)**

```tsx
// app/src/app/(supervisor)/ordenes/nueva/page.tsx
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import NuevaOrdenPrimariaWizard from '@/components/supervisor/NuevaOrdenPrimariaWizard'

export default async function NuevaOrdenPage() {
  const supabase = createSupabaseAdminClient() as any
  const [{ data: proyectos }, { data: configs }] = await Promise.all([
    supabase.from('Proyecto').select('id,nombre,cliente').eq('estado','ACTIVO').order('nombre'),
    supabase.from('ConfiguracionEquipo').select('*'),
  ])
  const capLavado = configs?.find((c: any) => c.tipo === 'LAVADO')?.capacidadM2 ?? 2.0
  const capHorno = configs?.find((c: any) => c.tipo === 'HORNO')?.capacidadM2 ?? 6.0

  return (
    <NuevaOrdenPrimariaWizard
      proyectos={proyectos ?? []}
      capLavado={capLavado}
      capHorno={capHorno}
    />
  )
}
```

- [ ] **Crear el wizard (Client Component)**

```tsx
// app/src/components/supervisor/NuevaOrdenPrimariaWizard.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ItemProduccionForm from './ItemProduccionForm'
import LoteChapaForm from './LoteChapaForm'

const TIPO_EQUIPO: Record<string, string[]> = {
  OPP: ['LASER', 'PUNZONADORA_CNC', 'FRESADORA'],
  OPS: ['PLEGADORA', 'PLEGADO_MANUAL', 'EXPANSORA'],
  OPB: ['LAVADO', 'HORNO'],
}
const COLOR_SUGERIDO: Record<string, string> = {
  OPP: 'ROJO', OPS: 'CELESTE', OPB_LAVADO: 'NARANJA', OPB_HORNO: 'VERDE'
}

type Props = {
  proyectos: Array<{ id: string; nombre: string; cliente: string }>
  capLavado: number
  capHorno: number
}

export default function NuevaOrdenPrimariaWizard({ proyectos, capLavado, capHorno }: Props) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  // Paso 1 — encabezado
  const [tipo, setTipo] = useState<'OPP'|'OPS'|'OPB'>('OPP')
  const [equipo, setEquipo] = useState('')
  const [colorHoja, setColorHoja] = useState('ROJO')
  const [responsable, setResponsable] = useState('')
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  const [proyectoId, setProyectoId] = useState('')

  // Paso 2 — piezas y lotes
  const [items, setItems] = useState<any[]>([])
  const [lotes, setLotes] = useState<any[]>([])

  function handleTipoChange(t: 'OPP'|'OPS'|'OPB') {
    setTipo(t)
    setEquipo('')
    setColorHoja(t === 'OPP' ? 'ROJO' : t === 'OPS' ? 'CELESTE' : 'NARANJA')
  }

  async function handleEmitir() {
    setIsLoading(true)
    setError('')
    try {
      // 1. Crear la orden
      const res = await fetch('/api/ordenes-primarias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo, equipo, colorHoja, responsable, fecha, proyectoId: proyectoId || undefined, items, lotes }),
      })
      if (!res.ok) { setError((await res.json()).error ?? 'Error al crear'); return }
      const orden = await res.json()

      // 2. Emitir
      const emitRes = await fetch(`/api/ordenes-primarias/${orden.id}/emitir`, { method: 'POST' })
      if (!emitRes.ok) { setError((await emitRes.json()).error ?? 'Error al emitir'); return }

      router.push('/ordenes')
      router.refresh()
    } finally {
      setIsLoading(false)
    }
  }

  async function handleBorrador() {
    setIsLoading(true)
    setError('')
    try {
      const res = await fetch('/api/ordenes-primarias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo, equipo, colorHoja, responsable, fecha, proyectoId: proyectoId || undefined, items, lotes }),
      })
      if (!res.ok) { setError((await res.json()).error ?? 'Error'); return }
      router.push('/ordenes')
      router.refresh()
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="p-6 max-w-3xl mx-auto">
      <h1 className="text-white text-2xl font-bold mb-6">Nueva Orden de Producción</h1>

      {/* Barra de progreso */}
      <div className="flex gap-2 mb-8">
        {['Encabezado', 'Piezas', 'Revisión'].map((label, i) => (
          <div key={i} className={`flex-1 h-1.5 rounded-full ${step > i ? 'bg-green-500' : 'bg-gray-700'}`} />
        ))}
      </div>

      {/* Paso 1 */}
      {step === 1 && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-3">
            {(['OPP','OPS','OPB'] as const).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => handleTipoChange(t)}
                className={`py-3 rounded-xl font-bold text-sm border ${tipo === t ? 'border-green-500 bg-green-950 text-green-400' : 'border-gray-700 text-gray-400'}`}
              >
                {t}
              </button>
            ))}
          </div>

          <div>
            <label className="text-gray-400 text-xs mb-1 block">Equipo *</label>
            <select
              value={equipo}
              onChange={e => setEquipo(e.target.value)}
              className="w-full bg-gray-800 text-white text-sm px-3 py-2 rounded-lg border border-gray-600 outline-none"
              required
            >
              <option value="">Seleccionar...</option>
              {TIPO_EQUIPO[tipo].map(eq => <option key={eq} value={eq}>{eq}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Responsable *</label>
              <input
                className="w-full bg-gray-800 text-white text-sm px-3 py-2 rounded-lg border border-gray-600 outline-none"
                value={responsable}
                onChange={e => setResponsable(e.target.value)}
                placeholder="ERIK"
              />
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Color de hoja</label>
              <input
                className="w-full bg-gray-800 text-white text-sm px-3 py-2 rounded-lg border border-gray-600 outline-none"
                value={colorHoja}
                onChange={e => setColorHoja(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Fecha</label>
              <input
                type="date"
                className="w-full bg-gray-800 text-white text-sm px-3 py-2 rounded-lg border border-gray-600 outline-none"
                value={fecha}
                onChange={e => setFecha(e.target.value)}
              />
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Proyecto (opcional)</label>
              <select
                value={proyectoId}
                onChange={e => setProyectoId(e.target.value)}
                className="w-full bg-gray-800 text-white text-sm px-3 py-2 rounded-lg border border-gray-600 outline-none"
              >
                <option value="">Sin proyecto</option>
                {proyectos.map(p => <option key={p.id} value={p.id}>{p.nombre} — {p.cliente}</option>)}
              </select>
            </div>
          </div>

          <button
            type="button"
            disabled={!tipo || !equipo || !responsable}
            onClick={() => setStep(2)}
            className="mt-2 bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white py-2 rounded-lg font-bold text-sm"
          >
            Siguiente → Piezas
          </button>
        </div>
      )}

      {/* Paso 2 */}
      {step === 2 && (
        <div className="flex flex-col gap-4">
          {tipo === 'OPP' && (
            <div>
              <h2 className="text-yellow-400 font-semibold text-sm mb-2">Lotes de Chapa (OT)</h2>
              {lotes.map((l, i) => (
                <div key={i} className="bg-gray-800 rounded-lg px-3 py-2 text-sm text-gray-300 flex justify-between mb-2">
                  <span>OT: {l.codigo} · {l.material} {l.medidaLargo}×{l.medidaAncho}m · {l.cantidadChapas} chapas</span>
                  <button type="button" onClick={() => setLotes(ls => ls.filter((_, j) => j !== i))}
                    className="text-red-400 ml-3">×</button>
                </div>
              ))}
              <LoteChapaForm onAdd={l => setLotes(ls => [...ls, l])} />
            </div>
          )}

          <div>
            <h2 className="text-green-400 font-semibold text-sm mb-2">Items de Producción</h2>
            {items.map((item, i) => (
              <div key={i} className="bg-gray-800 rounded-lg px-3 py-2 text-sm mb-2">
                <div className="flex justify-between">
                  <span className="text-white font-semibold">{item.nombre}</span>
                  <button type="button" onClick={() => setItems(is => is.filter((_, j) => j !== i))}
                    className="text-red-400">×</button>
                </div>
                <p className="text-gray-400">
                  {item.material} · {item.espesor}mm · {item.largo}×{item.ancho}mm · {item.cantidadTotal} pzas
                </p>
                <p className="text-gray-500 text-xs">
                  Bach Lavado: {item.bachLavado} · Bach Horno: {item.bachHorno}
                </p>
              </div>
            ))}
            <ItemProduccionForm
              capLavado={capLavado}
              capHorno={capHorno}
              onAdd={item => setItems(is => [...is, item])}
            />
          </div>

          <div className="flex gap-2 mt-2">
            <button type="button" onClick={() => setStep(1)}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg text-sm">
              ← Atrás
            </button>
            <button type="button" disabled={items.length === 0} onClick={() => setStep(3)}
              className="flex-1 bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white py-2 rounded-lg font-bold text-sm">
              Siguiente → Revisión
            </button>
          </div>
        </div>
      )}

      {/* Paso 3 — Revisión */}
      {step === 3 && (
        <div className="flex flex-col gap-4">
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <p className="text-white font-bold text-sm">{tipo} · {equipo} · Hoja {colorHoja}</p>
            <p className="text-gray-400 text-sm">Responsable: {responsable} · Fecha: {fecha}</p>
            {proyectoId && <p className="text-gray-400 text-sm">Proyecto: {proyectos.find(p => p.id === proyectoId)?.nombre}</p>}
          </div>

          {tipo === 'OPP' && lotes.length > 0 && (
            <div>
              <p className="text-yellow-400 text-sm font-semibold mb-1">Lotes de chapa: {lotes.length}</p>
              {lotes.map((l, i) => (
                <p key={i} className="text-gray-400 text-xs">OT: {l.codigo} · {l.cantidadChapas} chapas {l.medidaLargo}×{l.medidaAncho}m</p>
              ))}
            </div>
          )}

          <div>
            <p className="text-green-400 text-sm font-semibold mb-1">Piezas: {items.length} tipos</p>
            {items.map((item, i) => (
              <div key={i} className="bg-gray-800 rounded-lg px-3 py-1.5 text-sm mb-1">
                <p className="text-white">{item.nombre}</p>
                <p className="text-gray-400 text-xs">{item.cantidadTotal} pzas · Bach Lavado: {item.bachLavado} · Bach Horno: {item.bachHorno}</p>
              </div>
            ))}
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex gap-2 mt-2">
            <button type="button" onClick={() => setStep(2)}
              className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg text-sm">
              ← Atrás
            </button>
            <button type="button" onClick={handleBorrador} disabled={isLoading}
              className="flex-1 bg-gray-600 hover:bg-gray-500 text-white py-2 rounded-lg text-sm">
              Guardar borrador
            </button>
            <button type="button" onClick={handleEmitir} disabled={isLoading}
              className="flex-1 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white py-2 rounded-lg font-bold text-sm">
              {isLoading ? 'Emitiendo...' : 'Emitir orden →'}
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
```

- [ ] **Commit**
```bash
git add app/src/app/(supervisor)/ordenes/nueva/ app/src/components/supervisor/NuevaOrdenPrimariaWizard.tsx
git commit -m "feat: wizard nueva orden primaria 3 pasos"
```

---

### Task 18: Vista mobile tracking operario

**Files:**
- Create: `app/src/app/op/[numero]/item/[codigo]/page.tsx`

- [ ] **Crear página**

```tsx
// app/src/app/op/[numero]/item/[codigo]/page.tsx
// Esta página NO está dentro de (supervisor) — es pública para operarios con sesión
'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

type Item = {
  id: string
  codigo: number
  nombre: string
  cantidadTotal: number
  cantidadCompletada: number
  cantidadRehacer: number
}

export default function OperarioItemPage() {
  const params = useParams()
  const [item, setItem] = useState<Item | null>(null)
  const [completada, setCompletada] = useState(0)
  const [rehacer, setRehacer] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/ordenes-primarias?numero=${params.numero}`)
      .then(r => r.json())
      .then((ordenes: any[]) => {
        const op = ordenes?.[0]
        const found = op?.items?.find((i: any) => String(i.codigo) === String(params.codigo))
        if (found) {
          setItem(found)
          setCompletada(found.cantidadCompletada)
          setRehacer(found.cantidadRehacer)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [params.numero, params.codigo])

  async function handleSave() {
    if (!item) return
    setSaving(true)
    setError('')
    const res = await fetch(`/api/items-produccion/${item.id}/progreso`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cantidadCompletada: completada, cantidadRehacer: rehacer }),
    })
    setSaving(false)
    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 2000) }
    else setError('Error al guardar')
  }

  if (loading) return (
    <main className="min-h-screen bg-gray-950 flex items-center justify-center">
      <p className="text-gray-400">Cargando...</p>
    </main>
  )

  if (!item) return (
    <main className="min-h-screen bg-gray-950 flex items-center justify-center">
      <p className="text-red-400">Pieza no encontrada</p>
    </main>
  )

  const pct = item.cantidadTotal > 0 ? Math.round((completada / item.cantidadTotal) * 100) : 0

  return (
    <main className="min-h-screen bg-gray-950 p-6 max-w-sm mx-auto">
      <p className="text-gray-500 text-xs mb-1">OP {params.numero} · ID {item.codigo}</p>
      <h1 className="text-white font-bold text-lg mb-1">{item.nombre}</h1>
      <p className="text-gray-400 text-sm mb-4">Necesarios: {item.cantidadTotal}</p>

      {/* Barra de progreso */}
      <div className="h-2 bg-gray-800 rounded-full mb-6">
        <div className="h-2 bg-green-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>

      {/* Completados */}
      <div className="mb-4">
        <label className="text-gray-400 text-sm mb-2 block">Completados</label>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setCompletada(v => Math.max(0, v - 1))}
            className="w-12 h-12 rounded-full bg-gray-800 text-white text-xl font-bold"
          >−</button>
          <span className="text-white text-3xl font-bold w-16 text-center">{completada}</span>
          <button
            type="button"
            onClick={() => setCompletada(v => Math.min(item.cantidadTotal, v + 1))}
            className="w-12 h-12 rounded-full bg-gray-800 text-white text-xl font-bold"
          >+</button>
        </div>
      </div>

      {/* Rehacer */}
      <div className="mb-8">
        <label className="text-gray-400 text-sm mb-2 block">Rehacer</label>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setRehacer(v => Math.max(0, v - 1))}
            className="w-12 h-12 rounded-full bg-gray-800 text-white text-xl font-bold"
          >−</button>
          <span className="text-red-400 text-3xl font-bold w-16 text-center">{rehacer}</span>
          <button
            type="button"
            onClick={() => setRehacer(v => v + 1)}
            className="w-12 h-12 rounded-full bg-gray-800 text-white text-xl font-bold"
          >+</button>
        </div>
      </div>

      {error && <p className="text-red-400 text-sm mb-2">{error}</p>}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className={`w-full py-4 rounded-xl font-bold text-white text-base transition-colors ${
          saved ? 'bg-green-700' : 'bg-green-600 hover:bg-green-500'
        } disabled:opacity-50`}
      >
        {saved ? '✓ Guardado' : saving ? 'Guardando...' : 'Guardar progreso'}
      </button>
    </main>
  )
}
```

- [ ] **Commit**
```bash
git add app/src/app/op/
git commit -m "feat: vista mobile tracking operario /op/[numero]/item/[codigo]"
```

---

### Task 19: Verificación final

- [ ] **Correr todos los tests**
```bash
cd app && npx vitest run
```
Esperado: todos los tests pasan (semaforo + override + alertas + calcularBach + calcularSugerenciaConteo + generarBatches)

- [ ] **Levantar el dev server y verificar el flujo completo**
```bash
npm run dev
```

1. Ir a `http://localhost:3000/ordenes` → debe mostrar lista vacía con botón "+ Nueva OP"
2. Click "+ Nueva OP" → wizard paso 1
3. Seleccionar OPP · Laser · ERIK → siguiente
4. Agregar 2 piezas con ItemProduccionForm → verificar que muestra bach calculado
5. Agregar 1 lote OT con LoteChapaForm
6. Paso 3 → "Emitir orden"
7. Volver a lista → debe aparecer OP con número asignado
8. Navegar a `http://localhost:3000/api/ordenes-primarias/[id]/pdf` → debe descargarse el PDF

- [ ] **Verificar vista operario**

Tomar el número OP y un código de item y navegar a:
`http://localhost:3000/op/[numero]/item/[codigo]`
→ debe mostrar la pieza con controles +/−

- [ ] **Commit final**
```bash
git add -A
git commit -m "feat: modulo ordenes-produccion completo OPP/OPS/OPB"
```
