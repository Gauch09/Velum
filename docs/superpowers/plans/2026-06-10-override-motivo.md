# Override con Motivo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir al supervisor activar manualmente una etapa PENDIENTE antes de su umbral de cascada, con motivo obligatorio registrado en `RegistroProgreso`.

**Architecture:** Nuevo endpoint `POST /api/ejecuciones/[id]/override` que valida auth + rol SUPERVISOR/GERENCIA, actualiza `EjecucionEtapa` a ACTIVA, inserta en `RegistroProgreso` con `fueOverride=true`, y emite broadcast Realtime. La UI vive en un nuevo `OverridePanel` client component que se embebe al pie de `OrdenCascadaCard`.

**Tech Stack:** Next.js 14 App Router, TypeScript strict, Tailwind CSS, `@supabase/supabase-js` REST, `@paralleldrive/cuid2`, Vitest, Supabase Realtime broadcast.

---

## Archivos

| Acción | Ruta |
|--------|------|
| Crear | `src/lib/override.ts` |
| Crear | `tests/lib/override.test.ts` |
| Crear | `src/components/supervisor/OverridePanel.tsx` |
| Crear | `src/app/api/ejecuciones/[id]/override/route.ts` |
| Modificar | `prisma/schema.prisma` |
| Modificar | `src/types/index.ts` |
| Modificar | `src/components/supervisor/OrdenCascadaCard.tsx` |
| Modificar | `src/app/(supervisor)/dashboard/page.tsx` |

---

## Task 1: Columna `fueOverride` en DB + schema + tipos

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `src/types/index.ts`
- Modify: `src/app/(supervisor)/dashboard/page.tsx`

- [ ] **Step 1: Ejecutar SQL en Supabase**

Abrir Supabase Dashboard → SQL Editor → ejecutar:

```sql
ALTER TABLE "EjecucionEtapa" ADD COLUMN "fueOverride" BOOLEAN NOT NULL DEFAULT false;
```

Verificar con:
```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'EjecucionEtapa' AND column_name = 'fueOverride';
```

Expected: una fila con `column_name = fueOverride`, `data_type = boolean`, `column_default = false`.

- [ ] **Step 2: Actualizar `prisma/schema.prisma`**

Localizar el modelo `EjecucionEtapa` (buscar `model EjecucionEtapa`). Agregar el campo `fueOverride` después de `estado`:

```prisma
model EjecucionEtapa {
  id               String          @id
  ordenId          String
  etapaRutaId      String
  maquinaId        String
  operarioId       String?
  porcentajeActual Float           @default(0)
  estado           EstadoEjecucion @default(PENDIENTE)
  fueOverride      Boolean         @default(false)
  fechaInicio      DateTime?
  fechaFin         DateTime?
  createdAt        DateTime        @default(now())
  // ... relaciones existentes sin cambios
}
```

- [ ] **Step 3: Actualizar `src/types/index.ts`**

Agregar `fueOverride` a `EjecucionConDetalle`:

```ts
export interface EjecucionConDetalle {
  id: string
  porcentajeActual: number
  estado: string
  fechaInicio: string | null
  fueOverride: boolean
  maquina: { id: string; nombre: string; tipo: string }
  etapaRuta: { nombreEtapa: string; ordenSecuencia: number; umbralActivacion: number }
}
```

- [ ] **Step 4: Actualizar el select en `src/app/(supervisor)/dashboard/page.tsx`**

Localizar la query de `EjecucionEtapa` (línea ~16-23). Agregar `fueOverride` al select:

```ts
ejecuciones:EjecucionEtapa (
  id, porcentajeActual, estado, fechaInicio, fueOverride,
  maquina:Maquina ( id, nombre, tipo ),
  etapaRuta:EtapaRuta ( nombreEtapa, ordenSecuencia, umbralActivacion )
)
```

- [ ] **Step 5: Verificar TypeScript**

```bash
cd app && npx tsc --noEmit
```

Expected: 0 errores.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma app/src/types/index.ts app/src/app/\(supervisor\)/dashboard/page.tsx
git commit -m "feat: add fueOverride column to EjecucionEtapa schema and types"
```

---

## Task 2: `validarMotivoOverride` + tests (TDD)

**Files:**
- Create: `src/lib/override.ts`
- Create: `tests/lib/override.test.ts`

- [ ] **Step 1: Escribir el test primero**

Crear `tests/lib/override.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { validarMotivoOverride } from '../../src/lib/override'

describe('validarMotivoOverride', () => {
  it('devuelve true con 10 caracteres exactos', () => {
    expect(validarMotivoOverride('1234567890')).toBe(true)
  })

  it('devuelve true con texto válido real', () => {
    expect(validarMotivoOverride('Proveedor entregó material antes de lo previsto')).toBe(true)
  })

  it('devuelve false con menos de 10 caracteres', () => {
    expect(validarMotivoOverride('corto')).toBe(false)
  })

  it('devuelve false con string vacío', () => {
    expect(validarMotivoOverride('')).toBe(false)
  })

  it('devuelve false con solo espacios en blanco', () => {
    expect(validarMotivoOverride('          ')).toBe(false)
  })

  it('devuelve false con null', () => {
    expect(validarMotivoOverride(null)).toBe(false)
  })

  it('devuelve false con undefined', () => {
    expect(validarMotivoOverride(undefined)).toBe(false)
  })
})
```

- [ ] **Step 2: Correr el test — debe fallar**

```bash
cd app && npm run test:run -- tests/lib/override.test.ts
```

Expected: FAIL con "Cannot find module '../../src/lib/override'"

- [ ] **Step 3: Implementar `src/lib/override.ts`**

```ts
export function validarMotivoOverride(motivo: string | null | undefined): boolean {
  return typeof motivo === 'string' && motivo.trim().length >= 10
}
```

- [ ] **Step 4: Correr el test — debe pasar**

```bash
cd app && npm run test:run -- tests/lib/override.test.ts
```

Expected: 7 passed.

- [ ] **Step 5: Correr suite completa**

```bash
cd app && npm run test:run
```

Expected: todos los tests pasan.

- [ ] **Step 6: Commit**

```bash
git add app/src/lib/override.ts app/tests/lib/override.test.ts
git commit -m "feat: add validarMotivoOverride pure function with tests"
```

---

## Task 3: `OverridePanel` — panel + modal client component

**Files:**
- Create: `src/components/supervisor/OverridePanel.tsx`

Este componente muestra el panel al pie de `OrdenCascadaCard` con las etapas PENDIENTE disponibles para override, y contiene el modal de confirmación.

- [ ] **Step 1: Crear `src/components/supervisor/OverridePanel.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { validarMotivoOverride } from '@/lib/override'

type EjecucionPendiente = {
  id: string
  etapaNombre: string
  umbralActivacion: number
  porcentajeActual: number
}

type Props = {
  ejecuciones: EjecucionPendiente[]
  ordenNombre: string
}

export default function OverridePanel({ ejecuciones, ordenNombre }: Props) {
  const router = useRouter()
  const [selected, setSelected] = useState<EjecucionPendiente | null>(null)
  const [motivo, setMotivo] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  if (ejecuciones.length === 0) return null

  function handleOpen(ej: EjecucionPendiente) {
    setSelected(ej)
    setMotivo('')
    setError('')
  }

  function handleClose() {
    setSelected(null)
    setMotivo('')
    setError('')
  }

  async function handleConfirm() {
    if (!selected || !validarMotivoOverride(motivo)) return
    setIsLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/ejecuciones/${selected.id}/override`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivoOverride: motivo }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Error al activar la etapa')
        return
      }
      handleClose()
      router.refresh()
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <div className="border-t border-gray-800 mt-3 pt-3">
        <p className="text-gray-600 text-xs uppercase tracking-widest mb-2">Override disponible</p>
        <div className="flex flex-col gap-2">
          {ejecuciones.map(ej => (
            <div
              key={ej.id}
              className="flex justify-between items-center bg-gray-800 px-3 py-2 rounded-lg"
            >
              <span className="text-gray-300 text-sm">
                {ej.etapaNombre}
                <span className="text-gray-500 text-xs ml-2">
                  {Number(ej.porcentajeActual).toFixed(0)}% actual · umbral {ej.umbralActivacion}%
                </span>
              </span>
              <button
                type="button"
                onClick={() => handleOpen(ej)}
                className="bg-violet-700 hover:bg-violet-600 text-white text-xs px-3 py-1.5 rounded-md font-semibold transition-colors"
              >
                Activar manualmente
              </button>
            </div>
          ))}
        </div>
      </div>

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          onClick={e => { if (e.target === e.currentTarget) handleClose() }}
        >
          <div className="bg-gray-900 rounded-xl w-full max-w-md shadow-2xl border border-gray-700">
            <div className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 bg-violet-900 rounded-lg flex items-center justify-center text-lg flex-shrink-0">
                  ⚡
                </div>
                <div>
                  <h3 className="text-white font-bold text-base">Override de umbral</h3>
                  <p className="text-gray-400 text-xs">{ordenNombre} · {selected.etapaNombre}</p>
                </div>
              </div>

              <div className="bg-amber-950 border border-amber-700 rounded-lg px-4 py-3 mb-4 flex gap-2">
                <span className="text-base">⚠️</span>
                <p className="text-amber-300 text-xs leading-relaxed">
                  Esta etapa está al{' '}
                  <strong>{Number(selected.porcentajeActual).toFixed(0)}%</strong> — el umbral
                  automático es <strong>{selected.umbralActivacion}%</strong>. Activarla ahora
                  saltea la validación de cascada.
                </p>
              </div>

              <label className="block text-gray-400 text-xs uppercase tracking-widest mb-2">
                Motivo <span className="text-red-400">*</span>
              </label>
              <textarea
                value={motivo}
                onChange={e => setMotivo(e.target.value)}
                placeholder="Describí por qué se activa esta etapa antes del umbral..."
                rows={3}
                className="w-full bg-gray-800 text-white text-sm px-3 py-2 rounded-lg border border-gray-600 focus:border-violet-500 outline-none resize-none"
              />
              {error && <p className="text-red-400 text-xs mt-2">{error}</p>}

              <div className="flex gap-3 mt-4">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg font-medium text-sm transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={!validarMotivoOverride(motivo) || isLoading}
                  className="flex-1 bg-violet-700 hover:bg-violet-600 text-white py-2 rounded-lg font-bold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Activando...' : 'Activar de todas formas'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd app && npx tsc --noEmit
```

Expected: 0 errores.

- [ ] **Step 3: Commit**

```bash
git add app/src/components/supervisor/OverridePanel.tsx
git commit -m "feat: add OverridePanel client component with modal"
```

---

## Task 4: `POST /api/ejecuciones/[id]/override`

**Files:**
- Create: `src/app/api/ejecuciones/[id]/override/route.ts`

La carpeta `src/app/api/ejecuciones/[id]/` ya existe (hay un `asignar/` dentro). Crear subcarpeta `override/`.

- [ ] **Step 1: Crear `src/app/api/ejecuciones/[id]/override/route.ts`**

```ts
import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { createClient } from '@supabase/supabase-js'
import { createId } from '@paralleldrive/cuid2'
import { validarMotivoOverride } from '@/lib/override'

const broadcastClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const supabaseAuth = createSupabaseServerClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const { motivoOverride } = body

  if (!validarMotivoOverride(motivoOverride)) {
    return NextResponse.json(
      { error: 'El motivo debe tener al menos 10 caracteres' },
      { status: 400 }
    )
  }

  const supabase = createSupabaseAdminClient() as any

  const { data: usuario } = await supabase
    .from('Usuario')
    .select('id, rol')
    .eq('email', user.email!)
    .single()

  if (!usuario || !['SUPERVISOR', 'GERENCIA'].includes(usuario.rol)) {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
  }

  const { data: ejecucion, error: ejError } = await supabase
    .from('EjecucionEtapa')
    .select('id, ordenId, estado, porcentajeActual')
    .eq('id', params.id)
    .single()

  if (ejError || !ejecucion) {
    return NextResponse.json({ error: 'Ejecución no encontrada' }, { status: 404 })
  }

  if (ejecucion.estado !== 'PENDIENTE') {
    return NextResponse.json(
      { error: 'La etapa debe estar en estado PENDIENTE para hacer override' },
      { status: 400 }
    )
  }

  const { error: updateError } = await supabase
    .from('EjecucionEtapa')
    .update({
      estado: 'ACTIVA',
      fechaInicio: new Date().toISOString(),
      fueOverride: true,
    })
    .eq('id', params.id)

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  const { error: logError } = await supabase.from('RegistroProgreso').insert({
    id: createId(),
    ejecucionEtapaId: params.id,
    usuarioId: usuario.id,
    cantidadRegistrada: 0,
    porcentajeRegistrado: ejecucion.porcentajeActual,
    fueOverride: true,
    motivoOverride,
    notas: null,
  })

  if (logError) return NextResponse.json({ error: logError.message }, { status: 500 })

  try {
    await broadcastClient.channel('ordenes').send({
      type: 'broadcast',
      event: 'progreso',
      payload: { ordenId: ejecucion.ordenId, etapaActivada: params.id },
    })
  } catch {
    // best-effort — DB ya está actualizado
  }

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd app && npx tsc --noEmit
```

Expected: 0 errores.

- [ ] **Step 3: Correr tests**

```bash
cd app && npm run test:run
```

Expected: todos los tests pasan.

- [ ] **Step 4: Commit**

```bash
git add "app/src/app/api/ejecuciones/[id]/override/route.ts"
git commit -m "feat: add POST /api/ejecuciones/[id]/override endpoint"
```

---

## Task 5: Actualizar `OrdenCascadaCard` — panel + badge

**Files:**
- Modify: `src/components/supervisor/OrdenCascadaCard.tsx`

- [ ] **Step 1: Reemplazar el contenido completo de `src/components/supervisor/OrdenCascadaCard.tsx`**

```tsx
import type { OrdenConEjecuciones } from '@/types'
import OverridePanel from './OverridePanel'

const ESTADO_PILL: Record<string, string> = {
  ACTIVA:     'bg-green-900 text-green-300 border border-green-700',
  PENDIENTE:  'bg-gray-800 text-gray-500',
  EN_ESPERA:  'bg-yellow-900 text-yellow-300 border border-yellow-700',
  COMPLETADA: 'bg-blue-900 text-blue-300',
}

export default function OrdenCascadaCard({ orden }: { orden: OrdenConEjecuciones }) {
  const borderColor = orden.prioridad > 0 ? 'border-red-500' : 'border-green-800'

  const ejecucionesOrdenadas = [...(orden.ejecuciones ?? [])].sort(
    (a, b) => (a.etapaRuta?.ordenSecuencia ?? 0) - (b.etapaRuta?.ordenSecuencia ?? 0)
  )

  const pendientes = ejecucionesOrdenadas
    .filter(ej => ej.estado === 'PENDIENTE')
    .map(ej => ({
      id: ej.id,
      etapaNombre: ej.etapaRuta?.nombreEtapa ?? '',
      umbralActivacion: ej.etapaRuta?.umbralActivacion ?? 0,
      porcentajeActual: ej.porcentajeActual,
    }))

  const ordenNombre = `${orden.sistema} / ${orden.producto}`

  return (
    <div className={`bg-gray-900 rounded-xl p-4 border-l-4 ${borderColor}`}>
      <div className="flex justify-between items-center mb-3">
        <div>
          <span className="text-white font-bold text-base">{orden.sistema} / {orden.producto}</span>
          {orden.proyecto && (
            <span className="text-gray-400 text-sm ml-3">{orden.proyecto.nombre}</span>
          )}
          {orden.prioridad > 0 && (
            <span className="ml-2 text-red-400 text-xs font-bold uppercase">Urgente</span>
          )}
        </div>
        <span className="text-green-400 font-bold text-lg">
          {Number(orden.porcentajeGlobal).toFixed(0)}%
        </span>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        {ejecucionesOrdenadas.map((ej: any) => (
          <span key={ej.id} className={`px-2 py-1 rounded-md text-xs font-medium ${ESTADO_PILL[ej.estado] ?? ''}`}>
            {ej.etapaRuta?.nombreEtapa}
            {ej.estado === 'ACTIVA' && ` ${Number(ej.porcentajeActual).toFixed(0)}%`}
            {ej.estado === 'ACTIVA' && ej.fueOverride && ' ⚡'}
            {ej.estado === 'PENDIENTE' && ` ⏳ ${ej.etapaRuta?.umbralActivacion}%`}
          </span>
        ))}
      </div>

      <div className="bg-gray-700 rounded-full h-1.5">
        <div
          className="bg-green-500 h-1.5 rounded-full transition-all duration-500"
          style={{ width: `${Math.min(Number(orden.porcentajeGlobal), 100)}%` }}
        />
      </div>

      <OverridePanel ejecuciones={pendientes} ordenNombre={ordenNombre} />
    </div>
  )
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd app && npx tsc --noEmit
```

Expected: 0 errores.

- [ ] **Step 3: Correr tests completos**

```bash
cd app && npm run test:run
```

Expected: todos los tests pasan.

- [ ] **Step 4: Commit**

```bash
git add app/src/components/supervisor/OrdenCascadaCard.tsx
git commit -m "feat: add override panel and fueOverride badge to OrdenCascadaCard"
```

---

## Task 6: Smoke test manual

- [ ] **Step 1: Arrancar el servidor de desarrollo**

```bash
cd app && npm run dev
```

- [ ] **Step 2: Login como supervisor**

Ir a `http://localhost:3000/login`. Ingresar con una cuenta de rol `SUPERVISOR`.

- [ ] **Step 3: Verificar panel de override**

Ir al dashboard de supervisor. Encontrar una `OrdenCascadaCard` que tenga etapas en estado `PENDIENTE`. Verificar que al pie de la card aparece la sección "Override disponible" con los botones "Activar manualmente".

Si no hay órdenes con etapas PENDIENTE, crear una nueva orden desde el botón "+ Nueva Orden".

- [ ] **Step 4: Probar el override**

Hacer clic en "Activar manualmente" para una etapa PENDIENTE. Verificar:
- Se abre el modal con el banner ámbar mostrando el gap correcto (% actual vs umbral)
- El botón "Activar de todas formas" está deshabilitado
- Escribir menos de 10 caracteres — el botón sigue deshabilitado
- Escribir 10+ caracteres — el botón se habilita
- Confirmar — el modal cierra y el dashboard refresca con la etapa ACTIVA + badge ⚡

- [ ] **Step 5: Probar guard de rol**

Intentar hacer el POST directamente desde la terminal (o con un usuario OPERARIO). Expected: 403.

```bash
curl -X POST http://localhost:3000/api/ejecuciones/cualquier-id/override \
  -H "Content-Type: application/json" \
  -d '{"motivoOverride": "test sin auth"}' \
  -i
```

Expected: `401 No autorizado`.

- [ ] **Step 6: Verificar trazabilidad en DB**

En Supabase → Table Editor → `RegistroProgreso`. Buscar el registro recién creado. Verificar:
- `fueOverride = true`
- `motivoOverride` contiene el texto ingresado
- `cantidadRegistrada = 0`

- [ ] **Step 7: Verificar `EjecucionEtapa`**

En `EjecucionEtapa`, buscar la fila del override. Verificar:
- `estado = ACTIVA`
- `fueOverride = true`
- `fechaInicio` tiene timestamp

---

## Self-Review Checklist

**Cobertura del spec:**
- ✅ Panel C al pie de OrdenCascadaCard → Task 5
- ✅ Modal B con advertencia y delta → Task 3 (OverridePanel contiene el modal)
- ✅ Motivo mínimo 10 chars, botón deshabilitado → Tasks 2 y 3
- ✅ `POST /api/ejecuciones/[id]/override` → Task 4
- ✅ Auth + rol SUPERVISOR/GERENCIA → Task 4
- ✅ `EjecucionEtapa.estado = ACTIVA`, `fueOverride = true`, `fechaInicio` → Task 4
- ✅ `INSERT RegistroProgreso` con `fueOverride=true`, `motivoOverride`, `cantidadRegistrada=0` → Task 4
- ✅ Broadcast canal `ordenes` evento `progreso` → Task 4
- ✅ Badge `⚡` en etapas activadas por override → Task 5
- ✅ Campo `fueOverride` en DB + schema + types → Task 1

**Tipos consistentes entre tasks:**
- `EjecucionPendiente` definida en Task 3, usada en Task 5 — coincide
- `validarMotivoOverride` definida en Task 2, importada en Tasks 3 y 4 — path `@/lib/override` en ambos
- `fueOverride: boolean` agregado a `EjecucionConDetalle` en Task 1, usado en Task 5 (`ej.fueOverride`) — coincide
