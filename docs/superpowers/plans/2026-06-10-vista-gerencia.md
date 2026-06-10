# Vista Gerencia Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Crear `/gerencia` — pantalla full-screen de TV para el rol GERENCIA que muestra proyectos activos con % de avance + semáforo de deadline, y estado de las 10 máquinas en tiempo real.

**Architecture:** Server Component principal que hace fetch inicial de `Proyecto`, `OrdenProduccion` y `Maquina` via `supabase-js`. Un Client Component `GerenciaRealtimeListener` suscribe a canales Realtime de Supabase y llama `router.refresh()` para mantener la pantalla actualizada. La lógica del semáforo vive en una función pura testeable.

**Tech Stack:** Next.js 14 App Router, TypeScript strict, Tailwind CSS, `@supabase/supabase-js`, Supabase Realtime (broadcast), Vitest.

---

## Mapa de archivos

| Acción | Archivo |
|--------|---------|
| Crear | `src/lib/semaforo.ts` |
| Crear | `tests/lib/semaforo.test.ts` |
| Crear | `src/app/(gerencia)/layout.tsx` |
| Crear | `src/components/gerencia/MaquinaEstado.tsx` |
| Crear | `src/components/gerencia/ProyectoCard.tsx` |
| Crear | `src/components/gerencia/GerenciaRealtimeListener.tsx` |
| Crear | `src/app/(gerencia)/gerencia/page.tsx` |
| Modificar | `src/app/api/maquinas/[id]/route.ts` |

---

## Task 1: Función pura `calcularSemaforo` + tests (TDD)

**Files:**
- Create: `src/lib/semaforo.ts`
- Create: `tests/lib/semaforo.test.ts`

- [ ] **Step 1.1: Escribir el test (RED)**

Crear `tests/lib/semaforo.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { calcularSemaforo } from '../../src/lib/semaforo'

const d = (offsetMs: number) => new Date(Date.now() + offsetMs)
const DAY = 86_400_000

describe('calcularSemaforo', () => {
  it('devuelve rojo cuando el deadline ya pasó', () => {
    expect(calcularSemaforo(d(-DAY), 50)).toBe('rojo')
  })

  it('devuelve ambar cuando faltan ≤7 días y progreso < 60%', () => {
    expect(calcularSemaforo(d(3 * DAY), 40)).toBe('ambar')
  })

  it('devuelve verde cuando faltan ≤7 días pero progreso ≥ 60%', () => {
    expect(calcularSemaforo(d(5 * DAY), 65)).toBe('verde')
  })

  it('devuelve verde cuando hay más de 7 días sin importar el progreso', () => {
    expect(calcularSemaforo(d(30 * DAY), 5)).toBe('verde')
  })

  it('devuelve ambar en el límite exacto: 7 días y 59%', () => {
    expect(calcularSemaforo(d(7 * DAY), 59)).toBe('ambar')
  })

  it('devuelve verde en el límite exacto: 7 días y 60%', () => {
    expect(calcularSemaforo(d(7 * DAY), 60)).toBe('verde')
  })
})
```

- [ ] **Step 1.2: Correr el test — debe fallar**

```bash
npm run test:run
```

Resultado esperado: `FAIL — calcularSemaforo is not a function`

- [ ] **Step 1.3: Implementar `calcularSemaforo`**

Crear `src/lib/semaforo.ts`:

```ts
export type Semaforo = 'verde' | 'ambar' | 'rojo'

export function calcularSemaforo(fechaEntrega: Date, progreso: number): Semaforo {
  const diasRestantes = Math.ceil(
    (fechaEntrega.getTime() - Date.now()) / 86_400_000
  )
  if (diasRestantes < 0) return 'rojo'
  if (diasRestantes <= 7 && progreso < 60) return 'ambar'
  return 'verde'
}
```

- [ ] **Step 1.4: Correr tests — deben pasar**

```bash
npm run test:run
```

Resultado esperado: `6 tests passed`

- [ ] **Step 1.5: Commit**

```bash
git add src/lib/semaforo.ts tests/lib/semaforo.test.ts
git commit -m "feat: add calcularSemaforo pure function with tests"
```

---

## Task 2: Layout con guard de rol GERENCIA

**Files:**
- Create: `src/app/(gerencia)/layout.tsx`

Patrón idéntico a `src/app/(supervisor)/layout.tsx` pero verifica `rol === 'GERENCIA'`.

- [ ] **Step 2.1: Crear el layout**

Crear `src/app/(gerencia)/layout.tsx`:

```tsx
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { redirect } from 'next/navigation'

export default async function GerenciaLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createSupabaseAdminClient()
  const { data: usuario } = (await admin
    .from('Usuario')
    .select('id, rol')
    .eq('email', user.email!)
    .single()) as { data: { id: string; rol: string } | null; error: unknown }

  if (!usuario || usuario.rol !== 'GERENCIA') redirect('/login')

  return <>{children}</>
}
```

- [ ] **Step 2.2: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Resultado esperado: sin errores en el archivo nuevo.

- [ ] **Step 2.3: Commit**

```bash
git add src/app/(gerencia)/layout.tsx
git commit -m "feat: add gerencia route group with GERENCIA role guard"
```

---

## Task 3: Componente `MaquinaEstado`

**Files:**
- Create: `src/components/gerencia/MaquinaEstado.tsx`

Componente Server (sin interacción — solo muestra estado).

- [ ] **Step 3.1: Crear el componente**

Crear `src/components/gerencia/MaquinaEstado.tsx`:

```tsx
const ESTADO_CONFIG = {
  OPERATIVA: {
    bg: 'bg-green-900',
    text: 'text-green-300',
    border: 'border-green-700',
    label: 'ACTIVA',
    icon: '●',
  },
  MANTENIMIENTO: {
    bg: 'bg-yellow-900',
    text: 'text-yellow-300',
    border: 'border-yellow-700',
    label: 'MANT.',
    icon: '⚠',
  },
  FUERA_DE_SERVICIO: {
    bg: 'bg-red-900',
    text: 'text-red-300',
    border: 'border-red-700',
    label: 'FUERA',
    icon: '✕',
  },
} as const

type EstadoMaquina = keyof typeof ESTADO_CONFIG

type Props = {
  nombre: string
  estadoActual: EstadoMaquina
}

export default function MaquinaEstado({ nombre, estadoActual }: Props) {
  const config = ESTADO_CONFIG[estadoActual] ?? ESTADO_CONFIG.FUERA_DE_SERVICIO
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-gray-300 text-sm">{nombre}</span>
      <span
        className={`${config.bg} ${config.text} border ${config.border} text-xs px-2 py-0.5 rounded font-medium`}
      >
        {config.label} {config.icon}
      </span>
    </div>
  )
}
```

- [ ] **Step 3.2: Verificar TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 3.3: Commit**

```bash
git add src/components/gerencia/MaquinaEstado.tsx
git commit -m "feat: add MaquinaEstado chip component"
```

---

## Task 4: Componente `ProyectoCard`

**Files:**
- Create: `src/components/gerencia/ProyectoCard.tsx`

Usa `calcularSemaforo` de `@/lib/semaforo`.

- [ ] **Step 4.1: Crear el componente**

Crear `src/components/gerencia/ProyectoCard.tsx`:

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
  fechaEntrega: string   // ISO string desde Supabase
  progreso: number       // 0–100
}

export default function ProyectoCard({ nombre, fechaEntrega, progreso }: Props) {
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
        <span className="text-white font-semibold">{nombre}</span>
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

- [ ] **Step 4.2: Verificar TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 4.3: Commit**

```bash
git add src/components/gerencia/ProyectoCard.tsx
git commit -m "feat: add ProyectoCard component with semaphore"
```

---

## Task 5: Componente `GerenciaRealtimeListener`

**Files:**
- Create: `src/components/gerencia/GerenciaRealtimeListener.tsx`

Client Component. Suscribe al canal `gerencia` para eventos `progreso` (emitido por el endpoint de progreso) y `maquinas` (emitido por el endpoint de máquinas — Task 7).

- [ ] **Step 5.1: Crear el componente**

Crear `src/components/gerencia/GerenciaRealtimeListener.tsx`:

```tsx
'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'

export default function GerenciaRealtimeListener() {
  const router = useRouter()

  useEffect(() => {
    // Canal 'ordenes': recibe evento 'progreso' — emitido por /api/ordenes/[id]/progreso
    const ordenesChannel = supabaseBrowser
      .channel('ordenes')
      .on('broadcast', { event: 'progreso' }, () => {
        router.refresh()
      })
      .subscribe()

    // Canal 'gerencia': recibe evento 'maquinas' — emitido por /api/maquinas/[id] (Task 7)
    const gerenciaChannel = supabaseBrowser
      .channel('gerencia')
      .on('broadcast', { event: 'maquinas' }, () => {
        router.refresh()
      })
      .subscribe()

    return () => {
      supabaseBrowser.removeChannel(ordenesChannel)
      supabaseBrowser.removeChannel(gerenciaChannel)
    }
  }, [router])

  return null
}
```

- [ ] **Step 5.2: Verificar TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 5.3: Commit**

```bash
git add src/components/gerencia/GerenciaRealtimeListener.tsx
git commit -m "feat: add GerenciaRealtimeListener for live updates"
```

---

## Task 6: Page `/gerencia`

**Files:**
- Create: `src/app/(gerencia)/gerencia/page.tsx`

Server Component. Fetch inicial de `Proyecto`, `OrdenProduccion` y `Maquina`. Calcula progreso promedio por proyecto. Renderiza el layout de dos columnas.

- [ ] **Step 6.1: Crear la página**

Crear `src/app/(gerencia)/gerencia/page.tsx`:

```tsx
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import ProyectoCard from '@/components/gerencia/ProyectoCard'
import MaquinaEstado from '@/components/gerencia/MaquinaEstado'
import GerenciaRealtimeListener from '@/components/gerencia/GerenciaRealtimeListener'

export const dynamic = 'force-dynamic'

type Proyecto = {
  id: string
  nombre: string
  fechaEntrega: string
}

type Orden = {
  proyectoId: string | null
  porcentajeGlobal: number
}

type Maquina = {
  id: string
  nombre: string
  estadoActual: 'OPERATIVA' | 'MANTENIMIENTO' | 'FUERA_DE_SERVICIO'
}

function calcularProgresoMap(ordenes: Orden[]): Map<string, number> {
  const groups = new Map<string, number[]>()
  for (const orden of ordenes) {
    if (!orden.proyectoId) continue
    const arr = groups.get(orden.proyectoId) ?? []
    arr.push(orden.porcentajeGlobal)
    groups.set(orden.proyectoId, arr)
  }
  const result = new Map<string, number>()
  for (const [id, valores] of groups) {
    result.set(id, valores.reduce((a, b) => a + b, 0) / valores.length)
  }
  return result
}

export default async function GerenciaPage() {
  const supabase = createSupabaseAdminClient() as any

  const [{ data: proyectos }, { data: ordenes }, { data: maquinas }] =
    await Promise.all([
      supabase
        .from('Proyecto')
        .select('id, nombre, fechaEntrega')
        .eq('estado', 'ACTIVO')
        .order('fechaEntrega', { ascending: true }),
      supabase
        .from('OrdenProduccion')
        .select('proyectoId, porcentajeGlobal')
        .not('proyectoId', 'is', null)
        .in('estado', ['PENDIENTE', 'EN_PRODUCCION', 'EN_ESPERA']),
      supabase
        .from('Maquina')
        .select('id, nombre, estadoActual')
        .order('nombre', { ascending: true }),
    ])

  const progresoMap = calcularProgresoMap((ordenes ?? []) as Orden[])

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
        <span className="text-[#c9a96e] font-bold tracking-widest text-lg">
          VELUM
        </span>
        <span className="text-gray-500 text-sm">{ahora}</span>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Proyectos — 65% */}
        <section className="flex-1 p-8 border-r border-gray-800 overflow-y-auto">
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

- [ ] **Step 6.2: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Resultado esperado: sin errores.

- [ ] **Step 6.3: Correr todos los tests**

```bash
npm run test:run
```

Resultado esperado: todos los tests en verde (incluyendo los 6 de semaforo + los 6 de cascada).

- [ ] **Step 6.4: Commit**

```bash
git add src/app/(gerencia)/gerencia/page.tsx
git commit -m "feat: add Vista Gerencia page with projects and machines"
```

---

## Task 7: Broadcast desde el endpoint de máquinas

**Files:**
- Modify: `src/app/api/maquinas/[id]/route.ts`

Agrega un `broadcastClient` (igual al patrón del endpoint de progreso) que emite el evento `maquinas` al canal `gerencia` después de cada PATCH exitoso. Esto permite que `GerenciaRealtimeListener` reciba actualizaciones cuando un supervisor cambia el estado de una máquina.

- [ ] **Step 7.1: Modificar el PATCH handler**

Abrir `src/app/api/maquinas/[id]/route.ts` y reemplazar el contenido completo:

```ts
import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { createClient } from '@supabase/supabase-js'

const broadcastClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const ESTADOS_VALIDOS = ['OPERATIVA', 'MANTENIMIENTO', 'FUERA_DE_SERVICIO']

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { estadoActual } = await req.json()

  if (!ESTADOS_VALIDOS.includes(estadoActual)) {
    return NextResponse.json({ error: 'Estado inválido' }, { status: 400 })
  }

  const supabase = createSupabaseAdminClient() as any

  const { data: maquina, error: maquinaError } = await supabase
    .from('Maquina')
    .update({ estadoActual })
    .eq('id', params.id)
    .select()
    .single()

  if (maquinaError)
    return NextResponse.json({ error: maquinaError.message }, { status: 500 })

  if (estadoActual !== 'OPERATIVA') {
    await supabase
      .from('EjecucionEtapa')
      .update({ estado: 'EN_ESPERA' })
      .eq('maquinaId', params.id)
      .eq('estado', 'ACTIVA')
  } else {
    await supabase
      .from('EjecucionEtapa')
      .update({ estado: 'ACTIVA' })
      .eq('maquinaId', params.id)
      .eq('estado', 'EN_ESPERA')
  }

  // Notify gerencia dashboard
  await broadcastClient.channel('gerencia').send({
    type: 'broadcast',
    event: 'maquinas',
    payload: { maquinaId: params.id, estadoActual },
  })

  return NextResponse.json(maquina)
}
```

- [ ] **Step 7.2: Verificar TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 7.3: Commit final**

```bash
git add src/app/api/maquinas/[id]/route.ts
git commit -m "feat: broadcast maquinas event from PATCH endpoint for gerencia dashboard"
```

---

## Task 8: Smoke test manual

Una vez que el servidor de desarrollo esté corriendo (`npm run dev`):

- [ ] **Step 8.1:** Ir a `/login` e ingresar con un usuario de rol `GERENCIA`. Si no existe ese usuario en la DB, crearlo desde el Supabase Auth dashboard con `email` y luego hacer un `INSERT` en la tabla `Usuario` con `rol = 'GERENCIA'`.

- [ ] **Step 8.2:** Navegar a `/gerencia`. Verificar que:
  - Se ven los proyectos activos con sus barras de progreso y semáforos
  - Se ven las 10 máquinas con sus chips de estado
  - El header muestra el logo VELUM y la fecha/hora

- [ ] **Step 8.3:** Probar el Realtime. Desde el dashboard de supervisor, cambiar el estado de una máquina. La Vista Gerencia debe actualizarse sin recargar manualmente.

- [ ] **Step 8.4:** Probar el guard de rol. Ingresar con un usuario `SUPERVISOR` e intentar ir a `/gerencia`. Debe redirigir a `/login`.

---

## Notas técnicas

- **Tabla real:** el schema usa `Proyecto` (no `ProyectoProduccion`). El campo de estado es `estado` con valores `ACTIVO/COMPLETADO/CANCELADO`.
- **Máquinas:** el campo de estado es `estadoActual` con valores `OPERATIVA/MANTENIMIENTO/FUERA_DE_SERVICIO`.
- **NUNCA** usar `prisma migrate` — todas las queries via `supabase-js`.
- El hook `export const dynamic = 'force-dynamic'` en `page.tsx` garantiza que cada `router.refresh()` desde el Realtime listener regenere el Server Component con datos frescos.
- La función `calcularProgresoMap` es pura y podría testearse, pero su lógica está cubierta por los tests de `calcularSemaforo`. Si la complejidad crece, extraer y testear por separado.
