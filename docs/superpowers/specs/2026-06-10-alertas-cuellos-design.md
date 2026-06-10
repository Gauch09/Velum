# Alertas de Cuellos de Botella — Design Spec

**Fecha:** 2026-06-10  
**Estado:** Aprobado

---

## Objetivo

Detectar y mostrar alertas en tiempo real cuando una etapa ACTIVA lleva demasiado tiempo sin registrar progreso, o cuando una orden tiene riesgo de no llegar a fecha de entrega. Las alertas se muestran en ambos dashboards (Supervisor y Gerencia); solo el Supervisor puede actuar sobre ellas.

---

## Tipos de alerta

| Tipo | Condición | Severidad |
|---|---|---|
| `sin_actividad` | Etapa ACTIVA sin progreso por más de `umbralHoras` horas | `rojo` si la entrega es en ≤ 3 días, sino `ambar` |
| `riesgo_entrega` | `calcularSemaforo()` retorna `rojo` o `ambar` para la orden | misma que el semáforo |
| `ambas` | Etapa cumple ambas condiciones simultáneamente | `rojo` |

---

## Cambios de base de datos

> **CRÍTICO:** Nunca usar `prisma migrate dev/push/reset`. Todos los cambios se aplican vía SQL Editor de Supabase.

### 1. Campo `ultimoProgresoEn` en `EjecucionEtapa`

```sql
ALTER TABLE "EjecucionEtapa"
  ADD COLUMN "ultimoProgresoEn" TIMESTAMPTZ;
```

- Propósito: timestamp desnormalizado de la última actividad registrada. Evita JOIN con `RegistroProgreso` para calcular alertas.
- Se actualiza en:
  - `POST /api/ejecuciones/[id]/progreso` — al insertar un registro
  - `POST /api/ejecuciones/[id]/override` — al activar manualmente (ya existente)

### 2. Tabla `Configuracion` (singleton)

```sql
CREATE TABLE "Configuracion" (
  "id"                       TEXT PRIMARY KEY DEFAULT 'singleton',
  "horasSinActividadAlerta"  INT  NOT NULL DEFAULT 4,
  "creadoEn"                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  "actualizadoEn"            TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO "Configuracion" ("id") VALUES ('singleton')
  ON CONFLICT DO NOTHING;
```

- Siempre existe exactamente una fila con `id = 'singleton'`.
- Solo el rol `SUPERVISOR` puede modificarla.
- `horasSinActividadAlerta`: umbral configurable, mínimo 1, máximo 72.

### Esquema Prisma (solo referencia, no ejecutar migrate)

```prisma
model EjecucionEtapa {
  // ... campos existentes ...
  ultimoProgresoEn  DateTime?
}

model Configuracion {
  id                      String   @id @default("singleton")
  horasSinActividadAlerta Int      @default(4)
  creadoEn                DateTime @default(now())
  actualizadoEn           DateTime @updatedAt
}
```

---

## Lógica pura: `calcularAlertas()`

**Archivo:** `src/lib/alertas.ts`

```typescript
export type SeveridadAlerta = 'rojo' | 'ambar'
export type TipoAlerta = 'sin_actividad' | 'riesgo_entrega' | 'ambas'

export interface AlertaCuello {
  ejecucionId: string
  ordenId: string
  ordenNombre: string       // "sistema / producto"
  proyectoNombre?: string
  etapaNombre: string
  tipo: TipoAlerta
  severidad: SeveridadAlerta
  minutosInactivo: number   // 0 si tipo === 'riesgo_entrega' puro
  diasParaEntrega?: number  // undefined si la orden no tiene fechaEntrega
  porcentajeGlobal: number
}

export interface EjecucionParaAlerta {
  id: string
  estado: string
  ultimoProgresoEn: string | null
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

export function calcularAlertas(
  ejecuciones: EjecucionParaAlerta[],
  umbralHoras: number,
  ahora: Date = new Date()
): AlertaCuello[]
```

### Algoritmo

1. Filtrar `ejecuciones` con `estado === 'ACTIVA'`.
2. Para cada una, calcular `minutosInactivo`:
   - Si `ultimoProgresoEn` es null → usar `fechaInicio` si existe, sino considerar inactiva desde ahora.
   - `minutosInactivo = (ahora - ultimoProgresoEn) / 60_000`
3. Determinar `sinActividad = minutosInactivo >= umbralHoras * 60`.
4. Determinar `riesgoEntrega` usando `calcularSemaforo(orden.fechaEntrega, orden.porcentajeGlobal)` → alertar si resultado es `'rojo'` o `'ambar'`.
5. Si ninguno → no generar alerta.
6. Si ambos → `tipo = 'ambas'`, `severidad = 'rojo'`.
7. Si solo `sinActividad` → `tipo = 'sin_actividad'`, severidad = `'rojo'` si `diasParaEntrega <= 3` sino `'ambar'`.
8. Si solo `riesgoEntrega` → `tipo = 'riesgo_entrega'`, severidad según semáforo.
9. Ordenar resultado: `rojo` primero, luego `ambar`; dentro de cada grupo, por `minutosInactivo` desc.

**Archivo de tests:** `tests/lib/alertas.test.ts`  
Casos obligatorios: sin alertas, solo sin_actividad ambar, sin_actividad crítico (entrega ≤ 3 días), solo riesgo_entrega, ambas, umbral exacto, null ultimoProgresoEn, ordenamiento.

---

## Endpoints

### `PATCH /api/configuracion`

- Auth: rol `SUPERVISOR` o `GERENCIA` (solo SUPERVISOR puede modificar).
- Body: `{ horasSinActividadAlerta: number }` — validar `>= 1` y `<= 72`.
- UPDATE en tabla `Configuracion` donde `id = 'singleton'`.
- Response: `{ ok: true, configuracion: { horasSinActividadAlerta: number } }`.
- Solo SUPERVISOR puede llegar a este endpoint; GERENCIA recibe 403.

### Actualización de `ultimoProgresoEn`

En `POST /api/ejecuciones/[id]/progreso` (ya existente), agregar al UPDATE de `EjecucionEtapa`:

```typescript
.update({ ultimoProgresoEn: new Date().toISOString(), /* ...resto... */ })
```

En `POST /api/ejecuciones/[id]/override` (ya existente), ídem — ya setea `fechaInicio`, agregar `ultimoProgresoEn`.

---

## Componentes

### `AlertasBanner`

**Archivo:** `src/components/shared/AlertasBanner.tsx`  
**Tipo:** `'use client'`

Props:
```typescript
interface Props {
  alertas: AlertaCuello[]
  readonly: boolean           // true en Gerencia, false en Supervisor
  umbralHoras: number         // para mostrar en cada alerta
  onUmbralChange?: () => void // abre ConfiguracionModal (solo si !readonly)
}
```

Comportamiento:
- Si `alertas.length === 0`: muestra banner verde "Todo en orden".
- Si hay alertas: barra roja/ambar sticky con contador, pills de severidad, chevron expandible.
- Panel expandido: lista de `AlertaRow` (ver abajo).
- Si `!readonly`: botón ⚙️ en el extremo derecho abre `ConfiguracionModal`.

### `AlertaRow`

Sub-componente inline de `AlertasBanner`. Muestra una fila de alerta con:
- Icono 🔴/🟡, nombre de orden + etapa.
- Texto secundario: minutos/horas inactivo, días para entrega, progreso global.
- Botones (solo si `!readonly`):
  - `⚡ Override` — solo si `tipo` incluye `sin_actividad`. Al hacer click hace scroll a la `OrdenCascadaCard` de esa orden (via `document.getElementById(ordenId).scrollIntoView()`) para que el supervisor vea el `OverridePanel` existente con las etapas PENDIENTE downstream. No requiere nuevo endpoint.
  - `👤 Asignar` — stub no-op (Fase 3).
  - `↑ Urgente` — stub no-op (Fase 3).

Los botones "Asignar" y "Urgente" se implementan como stubs en esta iteración (no-op con `console.warn` en dev). Se implementarán en Fase 3.

### `ConfiguracionModal`

**Archivo:** `src/components/supervisor/ConfiguracionModal.tsx`  
**Tipo:** `'use client'`

Props: `{ umbralActual: number, onClose: () => void, onGuardar: (horas: number) => void }`

- Input numérico, min 1, max 72, paso 1.
- Botón "Guardar" llama `PATCH /api/configuracion`, luego `onGuardar(nuevoValor)`.
- Botón "Cancelar" llama `onClose()`.

---

## Integración en dashboards

### Dashboard Supervisor (`app/(supervisor)/dashboard/page.tsx`)

Servidor ya carga ejecuciones. Agregar:
1. Query `Configuracion` singleton → `umbralHoras`.
2. Incluir `ultimoProgresoEn` y `orden.fechaEntrega` en el SELECT de `EjecucionEtapa`.
3. Llamar `calcularAlertas(ejecuciones, umbralHoras)` en el servidor.
4. Pasar `alertas` y `umbralHoras` a `<AlertasBanner readonly={false} ... />`.

`AlertasBanner` se renderiza justo después del header y antes del grid de cards.

El botón `⚡ Override` del `AlertasBanner` hace scroll a la `OrdenCascadaCard` correspondiente. El `OverridePanel` existente ya muestra las etapas PENDIENTE de esa orden; el supervisor actúa desde ahí.

### Dashboard Gerencia (`app/(gerencia)/proyectos/page.tsx`)

Ídem carga de datos. `<AlertasBanner readonly={true} alertas={alertas} umbralHoras={umbralHoras} />` sin `onOverride` ni `onUmbralChange`.

Además, cada `ProyectoCard` recibe un `tieneAlerta: boolean` — si es true, muestra badge ⚠ en el título.

---

## Realtime

Las alertas se recalculan en el cliente cuando llega un broadcast de evento `'progreso'` en el canal `'ordenes'`. El componente `AlertasBanner` recibe las alertas como prop calculadas en server; en ese caso la recarga se logra con `router.refresh()` desde el hook de suscripción existente en el dashboard.

No se introduce estado local en `AlertasBanner` para las alertas — las alertas vienen del server como prop. El realtime ya dispara `router.refresh()` en los dashboards existentes; las alertas se actualizan en esa misma recarga.

---

## Resumen de archivos

| Acción | Ruta |
|---|---|
| Crear | `src/lib/alertas.ts` |
| Crear | `tests/lib/alertas.test.ts` |
| Crear | `src/components/shared/AlertasBanner.tsx` |
| Crear | `src/components/supervisor/ConfiguracionModal.tsx` |
| Crear | `src/app/api/configuracion/route.ts` |
| Modificar | `src/app/(supervisor)/dashboard/page.tsx` |
| Modificar | `src/app/(gerencia)/proyectos/page.tsx` |
| Modificar | `src/app/api/ejecuciones/[id]/progreso/route.ts` |
| Modificar | `src/app/api/ejecuciones/[id]/override/route.ts` |
| Modificar | `prisma/schema.prisma` (referencia, no migrate) |
| SQL Supabase | `ALTER TABLE EjecucionEtapa ADD COLUMN ultimoProgresoEn` |
| SQL Supabase | `CREATE TABLE Configuracion` + INSERT singleton |

---

## Testing

- `calcularAlertas()` — 8+ casos unitarios puros (Vitest).
- `validarMotivoOverride()` — ya implementado.
- Endpoints — integración manual vía Supabase SQL Editor para los cambios de DB.
- UI — smoke test: iniciar dev server, verificar banner verde con 0 alertas, simular alerta modificando `ultimoProgresoEn` en SQL Editor.

---

## Fuera de scope (esta iteración)

- Botones "Asignar" y "Urgente" (stubs no-op).
- Notificaciones push / email.
- Historial de alertas resueltas.
- Filtros por proyecto en el panel de alertas de Gerencia.
