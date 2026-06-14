# AlertaOverlay — Panel de Alerta Crítica en Dashboard

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mostrar un panel prominente sticky en la parte superior del dashboard del Supervisor cuando hay alertas rojas activas, con texto grande visible desde 10+ metros en una pantalla de 70".

**Architecture:** Componente Client `AlertaOverlay.tsx` que recibe `alertasRojas: AlertaCuello[]` como prop desde el Server Component del dashboard. Si el array está vacío, retorna `null`. Cuando hay alertas rojas, muestra un panel sticky con animación de pulso rojo CSS, texto en 5xl, y alterna el título de la pestaña vía `useEffect`. Sin cambios de DB ni de API — los datos llegan del mismo `calcularAlertas()` ya existente.

**Tech Stack:** Next.js 14 App Router · TypeScript strict · Tailwind CSS · CSS @keyframes

---

### Task 1: Agregar animación CSS al globals.css

**Files:**
- Modify: `app/src/app/globals.css`

- [ ] **Step 1: Agregar el keyframe de pulso al final del archivo**

Agregar al final de `app/src/app/globals.css`:

```css
@keyframes velum-alert-pulse {
  0%, 100% { background-color: rgb(185, 28, 28); }
  50%       { background-color: rgb(239, 68, 68); }
}

.velum-alert-pulse {
  animation: velum-alert-pulse 1.5s ease-in-out infinite;
}
```

- [ ] **Step 2: Commit**

```bash
git add app/src/app/globals.css
git commit -m "feat: add velum-alert-pulse CSS animation for factory screen"
```

---

### Task 2: Crear AlertaOverlay.tsx

**Files:**
- Create: `app/src/components/supervisor/AlertaOverlay.tsx`

- [ ] **Step 1: Crear el archivo con el siguiente contenido exacto**

```tsx
'use client'

import { useEffect } from 'react'
import type { AlertaCuello } from '@/lib/alertas'

interface Props {
  alertasRojas: AlertaCuello[]
}

function formatMinutos(minutos: number): string {
  if (minutos < 60) return `${minutos} min`
  const h = Math.floor(minutos / 60)
  const m = minutos % 60
  return m > 0 ? `${h} h ${m} min` : `${h} h`
}

export default function AlertaOverlay({ alertasRojas }: Props) {
  useEffect(() => {
    if (alertasRojas.length === 0) {
      document.title = 'VELUM'
      return
    }

    let toggle = false
    const id = setInterval(() => {
      document.title = toggle ? '🔴 ALERTA — VELUM' : 'VELUM'
      toggle = !toggle
    }, 2000)

    return () => {
      clearInterval(id)
      document.title = 'VELUM'
    }
  }, [alertasRojas.length])

  if (alertasRojas.length === 0) return null

  return (
    <div className="velum-alert-pulse sticky top-0 z-40 rounded-xl mb-4 overflow-hidden min-h-[28vh]">
      <div className="px-6 py-5 h-full flex flex-col justify-center">
        <div className="flex items-center gap-3 mb-4">
          <span className="bg-white text-red-700 rounded-full w-9 h-9 flex items-center justify-center text-base font-black flex-shrink-0">
            {alertasRojas.length}
          </span>
          <span className="text-white text-2xl font-black tracking-widest uppercase">
            ⚠ Atención requerida
          </span>
        </div>

        <div className="flex flex-col gap-3">
          {alertasRojas.map(alerta => (
            <div
              key={alerta.ejecucionId}
              className="bg-black/30 rounded-lg px-5 py-4"
            >
              <p className="text-white text-5xl font-black leading-tight">
                {alerta.ordenNombre}
              </p>
              <p className="text-red-200 text-2xl mt-2 font-semibold">
                {alerta.etapaNombre}
                {alerta.tipo !== 'riesgo_entrega' && (
                  <span className="ml-4">
                    · Sin actividad:{' '}
                    <strong className="text-white">
                      {formatMinutos(alerta.minutosInactivo)}
                    </strong>
                  </span>
                )}
                {alerta.diasParaEntrega !== undefined && (
                  <span className="ml-4">
                    · Entrega en{' '}
                    <strong className="text-white">
                      {alerta.diasParaEntrega} días
                    </strong>
                  </span>
                )}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verificar que no hay errores de TypeScript**

```bash
cd app && npx tsc --noEmit
```

Esperado: sin errores.

- [ ] **Step 3: Commit**

```bash
git add app/src/components/supervisor/AlertaOverlay.tsx
git commit -m "feat: add AlertaOverlay component for factory screen alerts"
```

---

### Task 3: Integrar AlertaOverlay en el dashboard del Supervisor

**Files:**
- Modify: `app/src/app/(supervisor)/dashboard/page.tsx`

- [ ] **Step 1: Reemplazar el contenido del archivo por completo**

```tsx
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import OrdenCascadaCard from '@/components/supervisor/OrdenCascadaCard'
import MaquinasStatus from '@/components/supervisor/MaquinasStatus'
import RealtimeListener from '@/components/supervisor/RealtimeListener'
import NuevaOrdenModal from '@/components/supervisor/NuevaOrdenModal'
import AlertasBanner from '@/components/shared/AlertasBanner'
import AlertaOverlay from '@/components/supervisor/AlertaOverlay'
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
  const alertasRojas = alertas.filter(a => a.severidad === 'rojo')

  return (
    <main className="min-h-screen bg-gray-950 p-6">
      <RealtimeListener />
      <AlertaOverlay alertasRojas={alertasRojas} />
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

Esperado: sin errores.

- [ ] **Step 3: Correr el dev server y verificar visualmente**

```bash
cd app && npm run dev
```

Abrir http://localhost:3000.

Para simular una alerta roja, ejecutar en el SQL Editor de Supabase:

```sql
UPDATE "EjecucionEtapa"
SET "ultimoProgresoEn" = now() - interval '5 hours'
WHERE estado = 'ACTIVA'
LIMIT 1;
```

Luego recargar la página y verificar:
- El overlay aparece encima del header con fondo rojo pulsante
- El texto de la orden es legible en `text-5xl` (3rem)
- La etapa y el tiempo inactivo aparecen en `text-2xl`
- El título de la pestaña alterna entre `🔴 ALERTA — VELUM` y `VELUM` cada 2 segundos
- Al hacer scroll hacia abajo, el overlay se mantiene visible (sticky)
- El `AlertasBanner` sigue visible debajo con sus botones de acción
- Sin alertas rojas (revertir el SQL): el overlay desaparece completamente

Para revertir la simulación:

```sql
UPDATE "EjecucionEtapa"
SET "ultimoProgresoEn" = now()
WHERE estado = 'ACTIVA';
```

- [ ] **Step 4: Commit final**

```bash
git add app/src/app/(supervisor)/dashboard/page.tsx
git commit -m "feat: integrate AlertaOverlay into supervisor dashboard"
```
