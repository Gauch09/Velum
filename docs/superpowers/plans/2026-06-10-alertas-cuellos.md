# Alertas de Cuellos de Botella — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Detectar y mostrar alertas en tiempo real cuando una etapa ACTIVA lleva demasiado tiempo sin actividad o una orden tiene riesgo de no llegar a fecha de entrega, con acciones directas para el Supervisor.

**Architecture:** Campo desnormalizado `ultimoProgresoEn` en `EjecucionEtapa` para evitar JOINs; función pura `calcularAlertas()` ejecutada en server component; `AlertasBanner` client component reutilizado en ambos dashboards (readonly=false supervisor, readonly=true gerencia).

**Tech Stack:** Next.js 14 App Router, TypeScript strict, Tailwind CSS, `@supabase/supabase-js` REST API (sin Prisma migrate), Vitest, `@paralleldrive/cuid2`

---

## Archivos

| Acción | Ruta |
|---|---|
| **Crear** | `app/src/lib/alertas.ts` |
| **Crear** | `app/tests/lib/alertas.test.ts` |
| **Crear** | `app/src/app/api/configuracion/route.ts` |
| **Crear** | `app/src/components/supervisor/ConfiguracionModal.tsx` |
| **Crear** | `app/src/components/shared/AlertasBanner.tsx` |
| **Modificar** | `app/prisma/schema.prisma` |
| **Modificar** | `app/src/app/api/ordenes/[id]/progreso/route.ts` |
| **Modificar** | `app/src/app/api/ejecuciones/[id]/override/route.ts` |
| **Modificar** | `app/src/app/(supervisor)/dashboard/page.tsx` |
| **Modificar** | `app/src/app/(gerencia)/gerencia/page.tsx` |
| **Modificar** | `app/src/components/gerencia/ProyectoCard.tsx` |

---

## Task 1: DB — SQL + schema.prisma

**Files:**
- Modify: `app/prisma/schema.prisma`
- Manual: SQL Editor de Supabase (pasos exactos abajo)

> ⚠️ NUNCA ejecutar `prisma migrate dev`, `prisma db push`, ni `prisma migrate reset`.
> Todos los cambios de DB van vía SQL Editor de Supabase. El schema.prisma es solo referencia.

- [ ] **Step 1: Aplicar SQL en Supabase SQL Editor**

Abrir Supabase → SQL Editor y ejecutar:

```sql
-- 1. Agregar columna ultimoProgresoEn a EjecucionEtapa
ALTER TABLE "EjecucionEtapa"
  ADD COLUMN "ultimoProgresoEn" TIMESTAMPTZ;

-- 2. Crear tabla Configuracion (singleton)
CREATE TABLE "Configuracion" (
  "id"                       TEXT PRIMARY KEY DEFAULT 'singleton',
  "horasSinActividadAlerta"  INT  NOT NULL DEFAULT 4,
  "creadoEn"                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  "actualizadoEn"            TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO "Configuracion" ("id") VALUES ('singleton')
  ON CONFLICT DO NOTHING;
```

Verificar en Table Editor que `EjecucionEtapa` tiene la nueva columna y que `Configuracion` tiene una fila con `id = 'singleton'`.

- [ ] **Step 2: Actualizar schema.prisma**

En `app/prisma/schema.prisma`, modificar el model `EjecucionEtapa` agregando el campo después de `fueOverride`:

```prisma
model EjecucionEtapa {
  id               String          @id @default(cuid())
  ordenId          String
  etapaRutaId      String
  maquinaId        String
  operarioId       String?
  porcentajeActual Float           @default(0)
  estado           EstadoEjecucion @default(PENDIENTE)
  fueOverride      Boolean         @default(false)
  ultimoProgresoEn DateTime?
  fechaInicio      DateTime?
  fechaFin         DateTime?
  createdAt        DateTime        @default(now())

  orden      OrdenProduccion    @relation(fields: [ordenId], references: [id])
  etapaRuta  EtapaRuta          @relation(fields: [etapaRutaId], references: [id])
  maquina    Maquina            @relation(fields: [maquinaId], references: [id])
  operario   Usuario?           @relation(fields: [operarioId], references: [id])
  registros  RegistroProgreso[]
}
```

Y agregar al final del schema (antes del último model o después de `RegistroProgreso`):

```prisma
model Configuracion {
  id                      String   @id @default("singleton")
  horasSinActividadAlerta Int      @default(4)
  creadoEn                DateTime @default(now())
  actualizadoEn           DateTime @updatedAt
}
```

- [ ] **Step 3: Commit**

```bash
git add app/prisma/schema.prisma
git commit -m "feat(db): add ultimoProgresoEn to EjecucionEtapa and Configuracion table"
```

---

## Task 2: `calcularAlertas()` — TDD

**Files:**
- Create: `app/tests/lib/alertas.test.ts`
- Create: `app/src/lib/alertas.ts`

- [ ] **Step 1: Escribir los tests (failing)**

Crear `app/tests/lib/alertas.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { calcularAlertas } from '../../src/lib/alertas'
import type { EjecucionParaAlerta } from '../../src/lib/alertas'

// Fixed reference time for deterministic tests
const AHORA = new Date('2026-06-10T12:00:00.000Z')
const UMBRAL = 4

function horasAntes(h: number): string {
  return new Date(AHORA.getTime() - h * 3_600_000).toISOString()
}

function diasDespues(n: number): string {
  return new Date(AHORA.getTime() + n * 86_400_000).toISOString()
}

function mkOrden(overrides: Partial<EjecucionParaAlerta['orden']> = {}): EjecucionParaAlerta['orden'] {
  return {
    id: 'ord1',
    sistema: 'Sheet',
    producto: 'MultiSlim.A',
    porcentajeGlobal: 50,
    fechaEntrega: diasDespues(10), // far delivery — no risk
    proyecto: null,
    ...overrides,
  }
}

function mkEj(overrides: Partial<EjecucionParaAlerta> = {}): EjecucionParaAlerta {
  return {
    id: 'ej1',
    estado: 'ACTIVA',
    ultimoProgresoEn: horasAntes(5), // 5h > threshold 4h → triggers sin_actividad
    fechaInicio: null,
    porcentajeActual: 50,
    orden: mkOrden(),
    etapaRuta: { nombreEtapa: 'Plegado' },
    ...overrides,
  }
}

describe('calcularAlertas', () => {
  it('devuelve vacío cuando no hay ejecuciones ACTIVA', () => {
    const result = calcularAlertas([mkEj({ estado: 'PENDIENTE' })], UMBRAL, AHORA)
    expect(result).toHaveLength(0)
  })

  it('devuelve vacío cuando ACTIVA pero dentro del umbral', () => {
    const result = calcularAlertas(
      [mkEj({ ultimoProgresoEn: horasAntes(2) })],
      UMBRAL,
      AHORA
    )
    expect(result).toHaveLength(0)
  })

  it('devuelve sin_actividad ambar cuando supera umbral y entrega es lejana', () => {
    const result = calcularAlertas([mkEj()], UMBRAL, AHORA)
    expect(result).toHaveLength(1)
    expect(result[0].tipo).toBe('sin_actividad')
    expect(result[0].severidad).toBe('ambar')
    expect(result[0].minutosInactivo).toBe(300) // 5h × 60
    expect(result[0].etapaNombre).toBe('Plegado')
  })

  it('devuelve sin_actividad rojo cuando entrega es en ≤ 3 días', () => {
    const result = calcularAlertas(
      [mkEj({ orden: mkOrden({ fechaEntrega: diasDespues(2) }) })],
      UMBRAL,
      AHORA
    )
    expect(result).toHaveLength(1)
    expect(result[0].tipo).toBe('sin_actividad')
    expect(result[0].severidad).toBe('rojo')
  })

  it('devuelve riesgo_entrega ambar cuando semáforo es ambar y actividad es reciente', () => {
    // semáforo ambar: ≤7 días y porcentajeGlobal < 60
    const result = calcularAlertas(
      [mkEj({
        ultimoProgresoEn: horasAntes(1), // recent — no sin_actividad
        orden: mkOrden({ fechaEntrega: diasDespues(5), porcentajeGlobal: 30 }),
      })],
      UMBRAL,
      AHORA
    )
    expect(result).toHaveLength(1)
    expect(result[0].tipo).toBe('riesgo_entrega')
    expect(result[0].severidad).toBe('ambar')
  })

  it('devuelve ambas con severidad rojo cuando ambas condiciones se cumplen', () => {
    const result = calcularAlertas(
      [mkEj({
        // sin_actividad: 5h > 4h threshold
        // riesgo_entrega: 5 days ≤7 and 30% < 60
        orden: mkOrden({ fechaEntrega: diasDespues(5), porcentajeGlobal: 30 }),
      })],
      UMBRAL,
      AHORA
    )
    expect(result).toHaveLength(1)
    expect(result[0].tipo).toBe('ambas')
    expect(result[0].severidad).toBe('rojo')
  })

  it('dispara alerta en el umbral exacto (minutosInactivo === umbral × 60)', () => {
    // exactly 4h = 240 min ≥ 240 → alert
    const result = calcularAlertas(
      [mkEj({ ultimoProgresoEn: horasAntes(4) })],
      UMBRAL,
      AHORA
    )
    expect(result).toHaveLength(1)
  })

  it('devuelve vacío cuando ultimoProgresoEn y fechaInicio son null', () => {
    const result = calcularAlertas(
      [mkEj({ ultimoProgresoEn: null, fechaInicio: null })],
      UMBRAL,
      AHORA
    )
    expect(result).toHaveLength(0)
  })

  it('usa fechaInicio como fallback cuando ultimoProgresoEn es null', () => {
    const result = calcularAlertas(
      [mkEj({ ultimoProgresoEn: null, fechaInicio: horasAntes(5) })],
      UMBRAL,
      AHORA
    )
    expect(result).toHaveLength(1)
    expect(result[0].tipo).toBe('sin_actividad')
  })

  it('ordena rojo antes que ambar', () => {
    const ejAmbar = mkEj({ id: 'ej1', orden: mkOrden({ fechaEntrega: diasDespues(10) }) }) // ambar
    const ejRojo = mkEj({ id: 'ej2', orden: mkOrden({ id: 'ord2', fechaEntrega: diasDespues(2) }) }) // rojo
    const result = calcularAlertas([ejAmbar, ejRojo], UMBRAL, AHORA)
    expect(result[0].severidad).toBe('rojo')
    expect(result[1].severidad).toBe('ambar')
  })
})
```

- [ ] **Step 2: Verificar que los tests fallan**

```bash
cd app && npx vitest run tests/lib/alertas.test.ts
```

Expected: FAIL con `Cannot find module '../../src/lib/alertas'`

- [ ] **Step 3: Implementar `calcularAlertas`**

Crear `app/src/lib/alertas.ts`:

```typescript
export type SeveridadAlerta = 'rojo' | 'ambar'
export type TipoAlerta = 'sin_actividad' | 'riesgo_entrega' | 'ambas'

export interface AlertaCuello {
  ejecucionId: string
  ordenId: string
  ordenNombre: string
  proyectoNombre?: string
  etapaNombre: string
  tipo: TipoAlerta
  severidad: SeveridadAlerta
  minutosInactivo: number
  diasParaEntrega?: number
  porcentajeGlobal: number
}

export interface EjecucionParaAlerta {
  id: string
  estado: string
  ultimoProgresoEn: string | null
  fechaInicio: string | null
  porcentajeActual: number
  orden: {
    id: string
    sistema: string
    producto: string
    porcentajeGlobal: number
    fechaEntrega: string | null
    proyecto?: { nombre: string } | null
  }
  etapaRuta: { nombreEtapa: string }
}

function startOfDayMs(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

function evaluarRiesgoEntrega(
  fechaEntrega: string | null,
  porcentajeGlobal: number,
  ahora: Date
): { enRiesgo: boolean; severidad: SeveridadAlerta } {
  if (!fechaEntrega) return { enRiesgo: false, severidad: 'ambar' }
  const diasRestantes = Math.round(
    (startOfDayMs(new Date(fechaEntrega)) - startOfDayMs(ahora)) / 86_400_000
  )
  if (diasRestantes < 0) return { enRiesgo: true, severidad: 'rojo' }
  if (diasRestantes <= 7 && porcentajeGlobal < 60) return { enRiesgo: true, severidad: 'ambar' }
  return { enRiesgo: false, severidad: 'ambar' }
}

export function calcularAlertas(
  ejecuciones: EjecucionParaAlerta[],
  umbralHoras: number,
  ahora: Date = new Date()
): AlertaCuello[] {
  const alertas: AlertaCuello[] = []

  for (const ej of ejecuciones) {
    if (ej.estado !== 'ACTIVA') continue

    const referencia = ej.ultimoProgresoEn ?? ej.fechaInicio
    const minutosInactivo = referencia
      ? (ahora.getTime() - new Date(referencia).getTime()) / 60_000
      : 0

    const sinActividad = minutosInactivo >= umbralHoras * 60

    const diasParaEntrega = ej.orden.fechaEntrega
      ? Math.ceil((new Date(ej.orden.fechaEntrega).getTime() - ahora.getTime()) / 86_400_000)
      : undefined

    const { enRiesgo: riesgoEntrega, severidad: severidadEntrega } = evaluarRiesgoEntrega(
      ej.orden.fechaEntrega,
      ej.orden.porcentajeGlobal,
      ahora
    )

    if (!sinActividad && !riesgoEntrega) continue

    let tipo: TipoAlerta
    let severidad: SeveridadAlerta

    if (sinActividad && riesgoEntrega) {
      tipo = 'ambas'
      severidad = 'rojo'
    } else if (sinActividad) {
      tipo = 'sin_actividad'
      severidad = diasParaEntrega !== undefined && diasParaEntrega <= 3 ? 'rojo' : 'ambar'
    } else {
      tipo = 'riesgo_entrega'
      severidad = severidadEntrega
    }

    alertas.push({
      ejecucionId: ej.id,
      ordenId: ej.orden.id,
      ordenNombre: `${ej.orden.sistema} / ${ej.orden.producto}`,
      proyectoNombre: ej.orden.proyecto?.nombre,
      etapaNombre: ej.etapaRuta.nombreEtapa,
      tipo,
      severidad,
      minutosInactivo: Math.round(minutosInactivo),
      diasParaEntrega,
      porcentajeGlobal: ej.orden.porcentajeGlobal,
    })
  }

  return alertas.sort((a, b) => {
    if (a.severidad !== b.severidad) return a.severidad === 'rojo' ? -1 : 1
    return b.minutosInactivo - a.minutosInactivo
  })
}
```

- [ ] **Step 4: Correr tests y verificar que pasan**

```bash
cd app && npx vitest run tests/lib/alertas.test.ts
```

Expected: PASS, 10 tests passed

- [ ] **Step 5: Correr todos los tests para verificar que no hay regresiones**

```bash
cd app && npx vitest run
```

Expected: todos los tests pasan

- [ ] **Step 6: Commit**

```bash
git add app/src/lib/alertas.ts app/tests/lib/alertas.test.ts
git commit -m "feat: add calcularAlertas pure function with tests"
```

---

## Task 3: Actualizar rutas para setear `ultimoProgresoEn`

**Files:**
- Modify: `app/src/app/api/ordenes/[id]/progreso/route.ts` — línea 104-112
- Modify: `app/src/app/api/ejecuciones/[id]/override/route.ts` — línea 57-63

- [ ] **Step 1: Modificar la ruta de progreso**

En `app/src/app/api/ordenes/[id]/progreso/route.ts`, el UPDATE de `EjecucionEtapa` está en las líneas 104-113. Reemplazar:

```typescript
  // Update current execution
  const { error: updateEjError } = await supabase
    .from('EjecucionEtapa')
    .update({
      porcentajeActual: nuevoPorcentaje,
      estado: nuevoPorcentaje >= 100 ? 'COMPLETADA' : 'ACTIVA',
      fechaFin: nuevoPorcentaje >= 100 ? new Date().toISOString() : null,
    })
    .eq('id', ejecucionEtapaId)
```

Con:

```typescript
  // Update current execution
  const { error: updateEjError } = await supabase
    .from('EjecucionEtapa')
    .update({
      porcentajeActual: nuevoPorcentaje,
      estado: nuevoPorcentaje >= 100 ? 'COMPLETADA' : 'ACTIVA',
      fechaFin: nuevoPorcentaje >= 100 ? new Date().toISOString() : null,
      ultimoProgresoEn: new Date().toISOString(),
    })
    .eq('id', ejecucionEtapaId)
```

- [ ] **Step 2: Modificar la ruta de override**

En `app/src/app/api/ejecuciones/[id]/override/route.ts`, el UPDATE de `EjecucionEtapa` está en las líneas 57-63. Reemplazar:

```typescript
  const { error: updateError } = await supabase
    .from('EjecucionEtapa')
    .update({
      estado: 'ACTIVA',
      fechaInicio: new Date().toISOString(),
      fueOverride: true,
    })
    .eq('id', params.id)
```

Con:

```typescript
  const { error: updateError } = await supabase
    .from('EjecucionEtapa')
    .update({
      estado: 'ACTIVA',
      fechaInicio: new Date().toISOString(),
      fueOverride: true,
      ultimoProgresoEn: new Date().toISOString(),
    })
    .eq('id', params.id)
```

- [ ] **Step 3: Verificar TypeScript**

```bash
cd app && npx tsc --noEmit
```

Expected: 0 errores

- [ ] **Step 4: Commit**

```bash
git add app/src/app/api/ordenes/[id]/progreso/route.ts app/src/app/api/ejecuciones/[id]/override/route.ts
git commit -m "feat: set ultimoProgresoEn on progress and override events"
```

---

## Task 4: `PATCH /api/configuracion` endpoint

**Files:**
- Create: `app/src/app/api/configuracion/route.ts`

- [ ] **Step 1: Crear el archivo del endpoint**

Crear `app/src/app/api/configuracion/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'

export async function PATCH(req: Request) {
  const supabaseAuth = createSupabaseServerClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const supabase = createSupabaseAdminClient() as any

  const { data: usuario } = await supabase
    .from('Usuario')
    .select('rol')
    .eq('email', user.email!)
    .single()

  if (!usuario || usuario.rol !== 'SUPERVISOR') {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
  }

  const body = await req.json()
  const { horasSinActividadAlerta } = body

  if (
    typeof horasSinActividadAlerta !== 'number' ||
    !Number.isInteger(horasSinActividadAlerta) ||
    horasSinActividadAlerta < 1 ||
    horasSinActividadAlerta > 72
  ) {
    return NextResponse.json(
      { error: 'horasSinActividadAlerta debe ser un entero entre 1 y 72' },
      { status: 400 }
    )
  }

  const { error } = await supabase
    .from('Configuracion')
    .update({
      horasSinActividadAlerta,
      actualizadoEn: new Date().toISOString(),
    })
    .eq('id', 'singleton')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, configuracion: { horasSinActividadAlerta } })
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd app && npx tsc --noEmit
```

Expected: 0 errores

- [ ] **Step 3: Commit**

```bash
git add app/src/app/api/configuracion/route.ts
git commit -m "feat: add PATCH /api/configuracion endpoint"
```

---

## Task 5: `ConfiguracionModal` component

**Files:**
- Create: `app/src/components/supervisor/ConfiguracionModal.tsx`

- [ ] **Step 1: Crear el componente**

Crear `app/src/components/supervisor/ConfiguracionModal.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  umbralActual: number
  onClose: () => void
}

export default function ConfiguracionModal({ umbralActual, onClose }: Props) {
  const router = useRouter()
  const [horas, setHoras] = useState(umbralActual)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleGuardar() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/configuracion', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ horasSinActividadAlerta: horas }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Error al guardar')
        return
      }
      onClose()
      router.refresh()
    } catch {
      setError('Error de red')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-80 shadow-2xl">
        <div className="flex items-center gap-3 mb-5">
          <div className="bg-gray-700 rounded-lg p-2 text-xl">⚙️</div>
          <div>
            <h2 className="text-white font-bold">Umbral de alerta</h2>
            <p className="text-gray-400 text-xs">Horas sin actividad</p>
          </div>
        </div>

        <label className="block text-gray-400 text-xs uppercase tracking-wider mb-2">
          Horas sin actividad para alertar
        </label>
        <div className="flex items-center gap-3 mb-3">
          <input
            type="number"
            min={1}
            max={72}
            value={horas}
            onChange={e => setHoras(Number(e.target.value))}
            className="w-20 bg-gray-800 text-white border border-gray-600 rounded-lg px-3 py-2 text-base font-bold focus:outline-none focus:border-purple-500"
          />
          <span className="text-gray-400 text-sm">horas</span>
        </div>

        <div className="bg-gray-800 rounded-lg p-3 mb-5 text-xs text-gray-400">
          Con umbral {horas} h: una etapa ACTIVA sin registros de progreso por más de{' '}
          {horas} horas dispara una alerta.
        </div>

        {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg py-2 text-sm transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleGuardar}
            disabled={loading || horas < 1 || horas > 72}
            className="flex-1 bg-purple-700 hover:bg-purple-600 disabled:opacity-50 text-white rounded-lg py-2 text-sm font-bold transition-colors"
          >
            {loading ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd app && npx tsc --noEmit
```

Expected: 0 errores

- [ ] **Step 3: Commit**

```bash
git add app/src/components/supervisor/ConfiguracionModal.tsx
git commit -m "feat: add ConfiguracionModal component"
```

---

## Task 6: `AlertasBanner` component

**Files:**
- Create: `app/src/components/shared/AlertasBanner.tsx`

- [ ] **Step 1: Crear el componente**

Crear `app/src/components/shared/AlertasBanner.tsx`:

```tsx
'use client'

import { useState } from 'react'
import type { AlertaCuello } from '@/lib/alertas'
import ConfiguracionModal from '@/components/supervisor/ConfiguracionModal'

interface Props {
  alertas: AlertaCuello[]
  readonly: boolean
  umbralHoras: number
}

function formatMinutos(minutos: number): string {
  if (minutos < 60) return `${minutos} min`
  const h = Math.floor(minutos / 60)
  const m = minutos % 60
  return m > 0 ? `${h} h ${m} min` : `${h} h`
}

function AlertaRow({
  alerta,
  isReadonly,
  umbralHoras,
}: {
  alerta: AlertaCuello
  isReadonly: boolean
  umbralHoras: number
}) {
  const esRojo = alerta.severidad === 'rojo'

  function handleOverride() {
    const el = document.getElementById(`orden-${alerta.ordenId}`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  return (
    <div
      className={`rounded-lg px-3 py-2 flex items-center justify-between gap-3 ${
        esRojo
          ? 'bg-red-950/50 border border-red-900'
          : 'bg-amber-950/40 border border-amber-900'
      }`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-sm">{esRojo ? '🔴' : '🟡'}</span>
          <span
            className={`text-xs font-bold truncate ${
              esRojo ? 'text-red-300' : 'text-amber-300'
            }`}
          >
            {alerta.ordenNombre} — {alerta.etapaNombre}
          </span>
        </div>
        <p className="text-gray-400 text-xs">
          {alerta.tipo !== 'riesgo_entrega' && (
            <>
              Sin actividad{' '}
              <strong className={esRojo ? 'text-red-300' : 'text-amber-300'}>
                {formatMinutos(alerta.minutosInactivo)}
              </strong>
              {' · '}Umbral: {umbralHoras} h
            </>
          )}
          {alerta.diasParaEntrega !== undefined && (
            <>
              {alerta.tipo !== 'riesgo_entrega' && ' · '}
              Entrega en{' '}
              <strong className={esRojo ? 'text-red-300' : 'text-amber-300'}>
                {alerta.diasParaEntrega} días
              </strong>
            </>
          )}
          {' · '}Progreso global {alerta.porcentajeGlobal.toFixed(0)}%
        </p>
      </div>

      {!isReadonly && (
        <div className="flex gap-1.5 flex-shrink-0">
          {alerta.tipo !== 'riesgo_entrega' && (
            <button
              onClick={handleOverride}
              className="bg-purple-700 hover:bg-purple-600 text-white text-xs font-bold px-2 py-1 rounded transition-colors"
            >
              ⚡ Override
            </button>
          )}
          <button
            onClick={() => console.warn('[VELUM] Asignar — Fase 3')}
            className="bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs px-2 py-1 rounded transition-colors"
          >
            👤 Asignar
          </button>
          <button
            onClick={() => console.warn('[VELUM] Urgente — Fase 3')}
            className="bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs px-2 py-1 rounded transition-colors"
          >
            ↑ Urgente
          </button>
        </div>
      )}
    </div>
  )
}

export default function AlertasBanner({ alertas, readonly, umbralHoras }: Props) {
  const [expanded, setExpanded] = useState(true)
  const [showConfig, setShowConfig] = useState(false)

  const rojasCount = alertas.filter(a => a.severidad === 'rojo').length
  const ambarCount = alertas.filter(a => a.severidad === 'ambar').length

  if (alertas.length === 0) {
    return (
      <div className="bg-green-950/50 border border-green-800 rounded-xl px-4 py-3 flex items-center gap-3 mb-4">
        <span className="text-lg">✅</span>
        <span className="text-green-300 text-sm font-semibold">
          Todo en orden — sin cuellos de botella
        </span>
      </div>
    )
  }

  return (
    <>
      {showConfig && !readonly && (
        <ConfiguracionModal
          umbralActual={umbralHoras}
          onClose={() => setShowConfig(false)}
        />
      )}

      <div className="bg-red-950/40 border border-red-800 rounded-xl mb-4 overflow-hidden">
        <div
          className="flex justify-between items-center px-4 py-2.5 cursor-pointer select-none"
          onClick={() => setExpanded(e => !e)}
        >
          <div className="flex items-center gap-2">
            <span className="bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-black flex-shrink-0">
              {alertas.length}
            </span>
            <span className="text-red-300 text-sm font-semibold">
              Cuellos de botella activos
            </span>
            {rojasCount > 0 && (
              <span className="bg-red-900/80 text-red-300 text-xs px-2 py-0.5 rounded-full">
                {rojasCount} crítico{rojasCount > 1 ? 's' : ''}
              </span>
            )}
            {ambarCount > 0 && (
              <span className="bg-amber-900/80 text-amber-300 text-xs px-2 py-0.5 rounded-full">
                {ambarCount} moderado{ambarCount > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!readonly && (
              <button
                onClick={e => {
                  e.stopPropagation()
                  setShowConfig(true)
                }}
                className="text-gray-500 hover:text-gray-300 text-base transition-colors p-1"
                title="Configurar umbral"
              >
                ⚙️
              </button>
            )}
            <span className="text-gray-500 text-xs">{expanded ? '▲' : '▾'}</span>
          </div>
        </div>

        {expanded && (
          <div className="border-t border-red-900 px-4 py-3 flex flex-col gap-2">
            {alertas.map(alerta => (
              <AlertaRow
                key={alerta.ejecucionId}
                alerta={alerta}
                isReadonly={readonly}
                umbralHoras={umbralHoras}
              />
            ))}
          </div>
        )}
      </div>
    </>
  )
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd app && npx tsc --noEmit
```

Expected: 0 errores

- [ ] **Step 3: Commit**

```bash
git add app/src/components/shared/AlertasBanner.tsx
git commit -m "feat: add AlertasBanner component with ConfiguracionModal integration"
```

---

## Task 7: Integración en Dashboard Supervisor

**Files:**
- Modify: `app/src/app/(supervisor)/dashboard/page.tsx`

- [ ] **Step 1: Actualizar la página del dashboard**

Reemplazar el contenido completo de `app/src/app/(supervisor)/dashboard/page.tsx`:

```tsx
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import OrdenCascadaCard from '@/components/supervisor/OrdenCascadaCard'
import MaquinasStatus from '@/components/supervisor/MaquinasStatus'
import RealtimeListener from '@/components/supervisor/RealtimeListener'
import NuevaOrdenModal from '@/components/supervisor/NuevaOrdenModal'
import AlertasBanner from '@/components/shared/AlertasBanner'
import { calcularAlertas } from '@/lib/alertas'
import type { EjecucionParaAlerta } from '@/lib/alertas'

export const dynamic = 'force-dynamic'

export default async function SupervisorDashboard() {
  const supabase = createSupabaseAdminClient() as any

  const [{ data: ordenes }, { data: maquinas }, { data: config }] = await Promise.all([
    supabase
      .from('OrdenProduccion')
      .select(`
        id, sistema, producto, cantidad, unidad, porcentajeGlobal, estado, prioridad,
        proyecto:Proyecto ( nombre, cliente, fechaEntrega ),
        ejecuciones:EjecucionEtapa (
          id, porcentajeActual, estado, fechaInicio, fueOverride, ultimoProgresoEn,
          maquina:Maquina ( id, nombre, tipo ),
          etapaRuta:EtapaRuta ( nombreEtapa, ordenSecuencia, umbralActivacion )
        )
      `)
      .in('estado', ['EN_PRODUCCION', 'EN_ESPERA'])
      .order('prioridad', { ascending: false })
      .order('createdAt', { ascending: false }),
    supabase
      .from('Maquina')
      .select('id, nombre, tipo, estadoActual')
      .order('nombre', { ascending: true }),
    supabase
      .from('Configuracion')
      .select('horasSinActividadAlerta')
      .eq('id', 'singleton')
      .single(),
  ])

  const umbralHoras: number = config?.horasSinActividadAlerta ?? 4

  const ejecucionesParaAlerta: EjecucionParaAlerta[] = ((ordenes ?? []) as any[]).flatMap(
    (orden) =>
      ((orden.ejecuciones ?? []) as any[]).map((ej: any) => ({
        id: ej.id,
        estado: ej.estado,
        ultimoProgresoEn: ej.ultimoProgresoEn ?? null,
        fechaInicio: ej.fechaInicio ?? null,
        porcentajeActual: ej.porcentajeActual,
        orden: {
          id: orden.id,
          sistema: orden.sistema,
          producto: orden.producto,
          porcentajeGlobal: orden.porcentajeGlobal,
          fechaEntrega: orden.proyecto?.fechaEntrega ?? null,
          proyecto: orden.proyecto ? { nombre: orden.proyecto.nombre } : null,
        },
        etapaRuta: { nombreEtapa: ej.etapaRuta?.nombreEtapa ?? '' },
      }))
  )

  const alertas = calcularAlertas(ejecucionesParaAlerta, umbralHoras)

  return (
    <main className="min-h-screen bg-gray-950 p-6">
      <RealtimeListener />
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-white text-2xl font-bold">VELUM · Planta en vivo</h1>
        <NuevaOrdenModal />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <div className="xl:col-span-3 flex flex-col gap-4">
          <AlertasBanner alertas={alertas} readonly={false} umbralHoras={umbralHoras} />
          {(!ordenes || ordenes.length === 0) ? (
            <p className="text-gray-500 mt-8">No hay órdenes activas.</p>
          ) : (
            ordenes.map((orden: any) => (
              <div id={`orden-${orden.id}`} key={orden.id}>
                <OrdenCascadaCard orden={orden} />
              </div>
            ))
          )}
        </div>
        <div>
          <MaquinasStatus maquinas={maquinas ?? []} />
        </div>
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd app && npx tsc --noEmit
```

Expected: 0 errores

- [ ] **Step 3: Verificar todos los tests**

```bash
cd app && npx vitest run
```

Expected: todos pasan

- [ ] **Step 4: Commit**

```bash
git add app/src/app/(supervisor)/dashboard/page.tsx
git commit -m "feat: integrate AlertasBanner into supervisor dashboard"
```

---

## Task 8: Integración en Dashboard Gerencia + badge en ProyectoCard

**Files:**
- Modify: `app/src/components/gerencia/ProyectoCard.tsx`
- Modify: `app/src/app/(gerencia)/gerencia/page.tsx`

- [ ] **Step 1: Agregar prop `tieneAlerta` a ProyectoCard**

Reemplazar el contenido de `app/src/components/gerencia/ProyectoCard.tsx`:

```tsx
import { calcularSemaforo } from '@/lib/semaforo'

const SEMAFORO_CONFIG = {
  verde: {
    border: 'border-green-500',
    text: 'text-green-400',
    bar: 'bg-green-500',
  },
  ambar: {
    border: 'border-yellow-500',
    text: 'text-yellow-400',
    bar: 'bg-yellow-500',
  },
  rojo: {
    border: 'border-red-500',
    text: 'text-red-400',
    bar: 'bg-red-500',
  },
} as const

type Props = {
  nombre: string
  fechaEntrega: string
  progreso: number
  tieneAlerta?: boolean
}

export default function ProyectoCard({
  nombre,
  fechaEntrega,
  progreso,
  tieneAlerta = false,
}: Props) {
  const semaforo = calcularSemaforo(new Date(fechaEntrega), progreso)
  const config = SEMAFORO_CONFIG[semaforo]

  const diasRestantes = Math.ceil(
    (new Date(fechaEntrega).getTime() - Date.now()) / 86_400_000
  )
  const diasLabel =
    diasRestantes < 0
      ? 'VENCIDO'
      : diasRestantes === 0
        ? 'HOY'
        : `${diasRestantes}d`

  return (
    <div className={`bg-gray-900 rounded-lg p-4 border-l-4 ${config.border}`}>
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <span className="text-white font-semibold">{nombre}</span>
          {tieneAlerta && (
            <span className="text-amber-400 text-xs font-bold" title="Cuello de botella activo">
              ⚠
            </span>
          )}
        </div>
        <span className={`${config.text} text-sm font-medium`}>{diasLabel}</span>
      </div>
      <div className="bg-gray-800 rounded-full h-2 mb-2">
        <div
          className={`h-2 rounded-full transition-all ${config.bar}`}
          style={{ width: `${Math.max(2, progreso)}%` }}
        />
      </div>
      <div className="flex justify-end">
        <span className={`${config.text} text-sm font-bold`}>
          {Math.round(progreso)}%
        </span>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Actualizar la página de Gerencia**

Reemplazar el contenido completo de `app/src/app/(gerencia)/gerencia/page.tsx`:

```tsx
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import ProyectoCard from '@/components/gerencia/ProyectoCard'
import MaquinaEstado from '@/components/gerencia/MaquinaEstado'
import GerenciaRealtimeListener from '@/components/gerencia/GerenciaRealtimeListener'
import AlertasBanner from '@/components/shared/AlertasBanner'
import { calcularAlertas } from '@/lib/alertas'
import type { EjecucionParaAlerta } from '@/lib/alertas'

export const dynamic = 'force-dynamic'

type Proyecto = {
  id: string
  nombre: string
  fechaEntrega: string
}

type Maquina = {
  id: string
  nombre: string
  estadoActual: 'OPERATIVA' | 'MANTENIMIENTO' | 'FUERA_DE_SERVICIO'
}

function calcularProgresoMap(ordenes: { proyectoId: string | null; porcentajeGlobal: number }[]): Map<string, number> {
  const groups = new Map<string, number[]>()
  for (const orden of ordenes) {
    if (!orden.proyectoId) continue
    const arr = groups.get(orden.proyectoId) ?? []
    arr.push(orden.porcentajeGlobal)
    groups.set(orden.proyectoId, arr)
  }
  const result = new Map<string, number>()
  for (const [id, valores] of Array.from(groups.entries())) {
    result.set(id, valores.reduce((a, b) => a + b, 0) / valores.length)
  }
  return result
}

export default async function GerenciaPage() {
  const supabase = createSupabaseAdminClient() as any

  const [{ data: proyectos }, { data: ordenes }, { data: maquinas }, { data: config }] =
    await Promise.all([
      supabase
        .from('Proyecto')
        .select('id, nombre, fechaEntrega')
        .eq('estado', 'ACTIVO')
        .order('fechaEntrega', { ascending: true }),
      supabase
        .from('OrdenProduccion')
        .select(`
          id, sistema, producto, porcentajeGlobal, proyectoId,
          proyecto:Proyecto ( nombre, fechaEntrega ),
          ejecuciones:EjecucionEtapa (
            id, estado, porcentajeActual, ultimoProgresoEn, fechaInicio,
            etapaRuta:EtapaRuta ( nombreEtapa )
          )
        `)
        .not('proyectoId', 'is', null)
        .in('estado', ['PENDIENTE', 'EN_PRODUCCION', 'EN_ESPERA']),
      supabase
        .from('Maquina')
        .select('id, nombre, estadoActual')
        .order('nombre', { ascending: true }),
      supabase
        .from('Configuracion')
        .select('horasSinActividadAlerta')
        .eq('id', 'singleton')
        .single(),
    ])

  const umbralHoras: number = config?.horasSinActividadAlerta ?? 4

  const ejecucionesParaAlerta: EjecucionParaAlerta[] = ((ordenes ?? []) as any[]).flatMap(
    (orden) =>
      ((orden.ejecuciones ?? []) as any[]).map((ej: any) => ({
        id: ej.id,
        estado: ej.estado,
        ultimoProgresoEn: ej.ultimoProgresoEn ?? null,
        fechaInicio: ej.fechaInicio ?? null,
        porcentajeActual: ej.porcentajeActual,
        orden: {
          id: orden.id,
          sistema: orden.sistema,
          producto: orden.producto,
          porcentajeGlobal: orden.porcentajeGlobal,
          fechaEntrega: orden.proyecto?.fechaEntrega ?? null,
          proyecto: orden.proyecto ? { nombre: orden.proyecto.nombre } : null,
        },
        etapaRuta: { nombreEtapa: ej.etapaRuta?.nombreEtapa ?? '' },
      }))
  )

  const alertas = calcularAlertas(ejecucionesParaAlerta, umbralHoras)

  const progresoMap = calcularProgresoMap((ordenes ?? []) as any[])

  // Build set of proyectoIds that have at least one active alert
  const ordenPorId = new Map(((ordenes ?? []) as any[]).map((o: any) => [o.id, o]))
  const proyectosConAlerta = new Set(
    alertas
      .map(a => ordenPorId.get(a.ordenId)?.proyectoId)
      .filter(Boolean)
  )

  const ahora = new Date().toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <main className="min-h-screen bg-[#0f0f0f] flex flex-col">
      <GerenciaRealtimeListener />

      <header className="px-8 py-4 border-b border-gray-800 flex justify-between items-center shrink-0">
        <span className="text-[#c9a96e] font-bold tracking-widest text-lg">VELUM</span>
        <span className="text-gray-500 text-sm">{ahora}</span>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Proyectos — 65% */}
        <section className="flex-1 p-8 border-r border-gray-800 overflow-y-auto">
          <AlertasBanner alertas={alertas} readonly={true} umbralHoras={umbralHoras} />

          <p className="text-gray-500 text-xs font-semibold uppercase tracking-widest mb-6">
            Proyectos Activos
          </p>
          {!proyectos || proyectos.length === 0 ? (
            <p className="text-gray-600 text-sm">Sin proyectos activos.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {(proyectos as Proyecto[]).map((p) => (
                <ProyectoCard
                  key={p.id}
                  nombre={p.nombre}
                  fechaEntrega={p.fechaEntrega}
                  progreso={progresoMap.get(p.id) ?? 0}
                  tieneAlerta={proyectosConAlerta.has(p.id)}
                />
              ))}
            </div>
          )}
        </section>

        {/* Máquinas — 35% (fixed width) */}
        <aside className="w-80 p-8 bg-[#0d0d0d] overflow-y-auto">
          <p className="text-gray-500 text-xs font-semibold uppercase tracking-widest mb-6">
            Estado Máquinas
          </p>
          <div className="flex flex-col gap-2">
            {((maquinas ?? []) as Maquina[]).map((m) => (
              <MaquinaEstado
                key={m.id}
                nombre={m.nombre}
                estadoActual={m.estadoActual}
              />
            ))}
          </div>
        </aside>
      </div>
    </main>
  )
}
```

- [ ] **Step 3: Verificar TypeScript**

```bash
cd app && npx tsc --noEmit
```

Expected: 0 errores

- [ ] **Step 4: Verificar todos los tests**

```bash
cd app && npx vitest run
```

Expected: todos pasan

- [ ] **Step 5: Smoke test manual**

1. Correr `cd app && npm run dev`
2. Abrir http://localhost:3000 (o el puerto configurado) en la sesión de Supervisor
3. Verificar que el `AlertasBanner` verde "Todo en orden" aparece cuando no hay alertas
4. Para simular una alerta: ejecutar en Supabase SQL Editor:
   ```sql
   UPDATE "EjecucionEtapa"
   SET "ultimoProgresoEn" = now() - interval '5 hours'
   WHERE estado = 'ACTIVA'
   LIMIT 1;
   ```
5. Refrescar el dashboard — debe aparecer el banner rojo con la alerta
6. Verificar que el botón ⚡ Override hace scroll a la card correspondiente
7. Abrir el dashboard de Gerencia y verificar que el banner aparece en modo readonly (sin botones de acción ni ⚙️)
8. Verificar que el badge ⚠ aparece en la ProyectoCard afectada

- [ ] **Step 6: Commit final**

```bash
git add app/src/components/gerencia/ProyectoCard.tsx app/src/app/(gerencia)/gerencia/page.tsx
git commit -m "feat: integrate AlertasBanner into gerencia dashboard with tieneAlerta badge"
```

- [ ] **Step 7: Push a master**

```bash
git push origin master
```
