# VELUM — Resumen de Sesión de Trabajo
> Fecha: 10 de junio de 2026 | Repo: https://github.com/Gauch09/Velum.git | Branch: master

---

## Estado del proyecto

Sistema de gestión de producción en planta para VELUM (empresa de fachadas metálicas).  
Stack: Next.js 14 App Router · TypeScript strict · Tailwind CSS · Supabase REST · Vitest.

**3 roles con dashboards propios:**
- `SUPERVISOR` — planta en vivo, control total
- `GERENCIA` — vista ejecutiva de proyectos
- `OPERARIO` — vista de su próxima tarea

---

## Lo que está funcionando (en producción / pusheado a master)

### Feature 1: Sistema base de producción (Fase 1 — mergeada a master)
- Login con Supabase Auth, guards por rol
- Dashboard Supervisor: órdenes de producción en cascada (`OrdenCascadaCard`) con etapas, semáforo de progreso, máquinas asignadas
- Dashboard Gerencia: proyectos activos con `ProyectoCard` (semáforo de entrega), estado de máquinas
- Dashboard Operario: su orden activa con botón para registrar progreso
- API completa: `/api/ordenes`, `/api/proyectos`, `/api/rutas`, `/api/maquinas`, `/api/ejecuciones/[id]/asignar`, `/api/ordenes/[id]/progreso`, `/api/ordenes/[id]`
- Realtime: Supabase Broadcast en canal `ordenes` → `RealtimeListener` / `GerenciaRealtimeListener` hacen `router.refresh()`
- Lib pura `calcularSemaforo()` con tests Vitest
- Lib pura `calcularCascada()` (lógica de activación de etapas)

### Feature 2: Override con motivo (commits `530a884` → `34f3cfd`)
Permite que el Supervisor active manualmente una etapa PENDIENTE que aún no llegó al umbral de activación, con motivo obligatorio.

**Archivos clave:**
- `app/src/lib/override.ts` — `validarMotivoOverride()` pura con tests
- `app/src/app/api/ejecuciones/[id]/override/route.ts` — POST, solo SUPERVISOR
- `app/src/components/supervisor/OverridePanel.tsx` — modal con textarea motivo + confirmación
- `OrdenCascadaCard.tsx` — badge 🔓 en etapas con `fueOverride: true`

**DB:** columna `fueOverride BOOLEAN DEFAULT false` + `motivoOverride TEXT` en `EjecucionEtapa`, columna `fueOverride` + `motivoOverride` en `RegistroProgreso`.

### Feature 3: Alertas de cuellos de botella (commits `6d8949e` → `bf7f05b`) ← **RECIÉN TERMINADA**
Banner en tiempo real que detecta etapas ACTIVA sin progreso por más de N horas, o proyectos en riesgo de no llegar a la fecha de entrega.

**Archivos creados/modificados:**
```
app/src/lib/alertas.ts                              ← función pura calcularAlertas()
app/tests/lib/alertas.test.ts                       ← 10 tests TDD con AHORA fijo
app/src/app/api/configuracion/route.ts              ← PATCH, solo SUPERVISOR
app/src/components/shared/AlertasBanner.tsx         ← banner rojo/verde con AlertaRow
app/src/components/supervisor/ConfiguracionModal.tsx ← modal para cambiar umbral
app/src/components/gerencia/ProyectoCard.tsx        ← +prop tieneAlerta, badge ⚠
app/src/app/(supervisor)/dashboard/page.tsx         ← integración completa
app/src/app/(gerencia)/gerencia/page.tsx            ← integración completa
app/src/app/api/ordenes/[id]/progreso/route.ts      ← setea ultimoProgresoEn
app/src/app/api/ejecuciones/[id]/override/route.ts  ← setea ultimoProgresoEn
app/prisma/schema.prisma                            ← +ultimoProgresoEn, +Configuracion
```

**DB (SQL ya aplicado en Supabase):**
```sql
-- Ya ejecutado
ALTER TABLE "EjecucionEtapa" ADD COLUMN "ultimoProgresoEn" TIMESTAMPTZ;
CREATE TABLE "Configuracion" (
  "id" TEXT PRIMARY KEY DEFAULT 'singleton',
  "horasSinActividadAlerta" INT NOT NULL DEFAULT 4,
  "creadoEn" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "actualizadoEn" TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO "Configuracion" ("id") VALUES ('singleton') ON CONFLICT DO NOTHING;
```

**Cómo funciona:**
- `calcularAlertas(ejecuciones, umbralHoras, ahora?)` — pura, determinista
- Dos tipos de alerta: `sin_actividad` (sin progreso por >N horas) y `riesgo_entrega` (≤7 días y progreso global <60%)
- Severidad `rojo` si entrega en ≤3 días o ambas condiciones; `ambar` en el resto
- Banner verde "Todo en orden" si no hay alertas
- Botón ⚡ Override en el banner hace scroll al `<div id="orden-{id}">` de la OrdenCascadaCard
- ⚙️ abre ConfiguracionModal para cambiar el umbral (persiste en DB, solo SUPERVISOR)
- Dashboard Gerencia: mismo banner en readonly (sin botones), ProyectoCard con ⚠ si tiene alerta

**Para simular una alerta en dev:**
```sql
UPDATE "EjecucionEtapa"
SET "ultimoProgresoEn" = now() - interval '5 hours'
WHERE estado = 'ACTIVA'
LIMIT 1;
```

---

## Arquitectura y constraints importantes

### DB / Supabase
- **NUNCA** correr `prisma migrate dev`, `prisma db push`, `prisma migrate reset` desde local
- Red local solo IPv4 — el DIRECT_URL no conecta
- Todos los cambios de schema: SQL Editor de Supabase
- Queries: `@supabase/supabase-js` REST únicamente
- Puerto Pooler: 6543 ✅ | Puerto directo: ❌
- IDs: siempre `createId()` de `@paralleldrive/cuid2` en inserts

### Auth pattern
```typescript
const supabaseAuth = createSupabaseServerClient()   // para auth.getUser()
const supabase = createSupabaseAdminClient() as any // para queries de datos
const { data: { user } } = await supabaseAuth.auth.getUser()
const { data: usuario } = await supabase.from('Usuario').select('rol').eq('email', user.email!).single()
```

### Realtime pattern
```typescript
// Server (broadcast): broadcastClient.channel('ordenes').send({ type: 'broadcast', event: 'update', payload: {} })
// Client: suscribe a canal 'ordenes', en evento 'update' llama router.refresh()
```

---

## Tests: 30/30 pasando
```
app/tests/lib/semaforo.test.ts   — calcularSemaforo (8 tests)
app/tests/lib/override.test.ts   — validarMotivoOverride (12 tests)
app/tests/lib/alertas.test.ts    — calcularAlertas (10 tests)
```

---

## Estructura de archivos clave

```
app/
├── prisma/schema.prisma
├── src/
│   ├── lib/
│   │   ├── alertas.ts          ← calcularAlertas()
│   │   ├── semaforo.ts         ← calcularSemaforo()
│   │   ├── cascada.ts          ← lógica de activación de etapas
│   │   ├── override.ts         ← validarMotivoOverride()
│   │   ├── supabase-server.ts
│   │   ├── supabase-admin.ts
│   │   └── supabase-browser.ts
│   ├── app/
│   │   ├── api/
│   │   │   ├── ordenes/[id]/progreso/route.ts
│   │   │   ├── ordenes/[id]/route.ts
│   │   │   ├── ordenes/route.ts
│   │   │   ├── ejecuciones/[id]/override/route.ts
│   │   │   ├── ejecuciones/[id]/asignar/route.ts
│   │   │   ├── maquinas/route.ts
│   │   │   ├── maquinas/[id]/route.ts
│   │   │   ├── proyectos/route.ts
│   │   │   ├── proyectos/[id]/route.ts
│   │   │   ├── rutas/route.ts
│   │   │   └── configuracion/route.ts  ← PATCH umbral alertas
│   │   ├── (supervisor)/dashboard/page.tsx
│   │   ├── (gerencia)/gerencia/page.tsx
│   │   └── (operario)/operario/page.tsx
│   └── components/
│       ├── shared/
│       │   └── AlertasBanner.tsx
│       ├── supervisor/
│       │   ├── OrdenCascadaCard.tsx
│       │   ├── OverridePanel.tsx
│       │   ├── ConfiguracionModal.tsx
│       │   ├── NuevaOrdenModal.tsx
│       │   ├── MaquinasStatus.tsx
│       │   └── RealtimeListener.tsx
│       ├── gerencia/
│       │   ├── ProyectoCard.tsx     ← +tieneAlerta badge
│       │   ├── MaquinaEstado.tsx
│       │   └── GerenciaRealtimeListener.tsx
│       └── operario/
│           └── OrdenCard.tsx
```

---

## Próximas features candidatas (del spec)

Nada confirmado — a decidir esta noche. Posibles:

1. **Historial de alertas** — guardar alertas disparadas en tabla `AlertaLog` para auditoría
2. **Asignación de operario desde banner** — el botón 👤 Asignar ya está en la UI (marcado como "Fase 3")
3. **Priorización de orden desde banner** — el botón ↑ Urgente ya está en la UI (marcado como "Fase 3")
4. **Vista de carga de máquinas** — heatmap de qué máquinas están saturadas
5. **Notificaciones por email/webhook** — cuando salta una alerta roja, avisar al supervisor
6. **Dashboard de rendimiento** — tiempo promedio por etapa, cuellos históricos
7. **Gestión de rutas (Maestros)** — CRUD de rutas de producción desde la UI

---

## Cómo retomar esta noche

```bash
cd C:\Users\Nissei\Velum\app
npm run dev
# App en http://localhost:3000
```

Tests:
```bash
cd C:\Users\Nissei\Velum\app
npx vitest run
```

Repo GitHub: https://github.com/Gauch09/Velum.git (branch master, 51 commits)
