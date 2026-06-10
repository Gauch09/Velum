# Override con Motivo — Design Spec

**Fecha:** 2026-06-10
**Feature:** Override de umbral de cascada con motivo obligatorio
**Rol:** Supervisor (y Gerencia)

---

## 1. Contexto

El motor de cascada activa etapas automáticamente cuando la etapa anterior supera su `umbralActivacion`. En situaciones excepcionales (proveedor anticipado, decisión operativa), el supervisor necesita activar manualmente una etapa PENDIENTE antes de que se alcance el umbral. La acción debe quedar registrada con trazabilidad completa.

Los campos `fueOverride` y `motivoOverride` ya existen en `RegistroProgreso` y el tipo `RegistrarProgresoInput` ya los declara, pero ninguna UI los expone todavía.

---

## 2. Alcance

**In scope:**
- Panel de overrides disponibles en `OrdenCascadaCard` (dashboard supervisor)
- Modal de confirmación con advertencia y campo de motivo obligatorio
- Endpoint `POST /api/ejecuciones/[id]/override`
- Badge visual `⚡` en etapas activadas por override
- Broadcast Realtime para refrescar el dashboard en tiempo real

**Out of scope:**
- Historial de overrides (consulta de `RegistroProgreso` con `fueOverride=true`) — Fase 3
- Override desde la vista operario
- Notificación push a gerencia por override

---

## 3. Flujo de usuario

1. Supervisor ve `OrdenCascadaCard` con etapas PENDIENTE bloqueadas
2. Al pie de la card aparece un panel: "Etapas disponibles para override" con cada etapa bloqueada, su progreso actual, umbral requerido y botón "Activar manualmente"
3. Supervisor hace clic → se abre el modal
4. Modal muestra: nombre de orden + etapa, banner ámbar con el gap (ej. "47% actual — umbral 60%"), campo de motivo (obligatorio), botón "Activar de todas formas" (deshabilitado hasta que haya texto en el motivo)
5. Supervisor escribe el motivo y confirma
6. API activa la etapa + registra en `RegistroProgreso`
7. Modal cierra, dashboard refresca vía Realtime (canal `ordenes`, evento `progreso`)
8. La etapa activada muestra chip ACTIVA + badge `⚡`

---

## 4. Componentes UI

### 4.1 Panel de overrides en `OrdenCascadaCard`

**Archivo:** `src/components/supervisor/OrdenCascadaCard.tsx` (existente, a modificar)

- Se renderiza solo cuando `ejecuciones.some(e => e.estado === 'PENDIENTE')`
- Separado del área de pills por un `border-top`
- Por cada etapa PENDIENTE:
  - Nombre de la etapa
  - "Progreso actual X% — umbral Y%" (en gris)
  - Botón "Activar manualmente" (color `violet-700`)
- Al hacer clic, llama a `onOverride(ejecucionId, etapaNombre, umbral, progreso)`

### 4.2 Modal `OverrideModal`

**Archivo:** `src/components/supervisor/OverrideModal.tsx` (nuevo)

Props:
```ts
interface OverrideModalProps {
  ejecucionId: string
  etapaNombre: string
  ordenNombre: string
  porcentajeActual: number
  umbralActivacion: number
  onClose: () => void
  onSuccess: () => void
}
```

Estructura:
- Header: ícono ⚡ + "Override de umbral" + nombre orden/etapa
- Banner ámbar: "Esta etapa está al X% — el umbral automático es Y%. Activarla ahora saltea la validación de cascada."
- Textarea `motivoOverride` (obligatorio, mínimo 10 caracteres)
- Botón "Cancelar" (cierra modal sin acción)
- Botón "Activar de todas formas" (deshabilitado mientras `motivo.trim().length < 10`)
- On submit: `POST /api/ejecuciones/[id]/override` con `{ motivoOverride }`
- Estado de carga: botón muestra spinner, deshabilitado durante el fetch
- On error: mensaje de error inline bajo el textarea

### 4.3 Badge `⚡` en etapas activadas por override

El campo `fueOverride` NO está en los datos actuales que carga el dashboard. Para mostrar el badge sin añadir una query extra, se agrega `fueOverride` al select de `EjecucionEtapa` en la page del dashboard.

**Archivo:** `src/app/(supervisor)/dashboard/page.tsx` (existente, a modificar)

Cambio en el select de ejecuciones: agregar join a `RegistroProgreso` para traer si algún registro tiene `fueOverride=true` para esa ejecución. Alternativamente (más simple): agregar campo `fueOverride Boolean @default(false)` directamente en `EjecucionEtapa` y actualizarlo en el endpoint de override.

**Decisión de diseño:** Agregar `fueOverride Boolean @default(false)` en `EjecucionEtapa` directamente. Evita el join y simplifica la query del dashboard. El endpoint de override lo setea en `true` al activar.

> **Nota:** `EjecucionEtapa` vive en Supabase. El campo se agrega vía SQL Editor (no via prisma migrate), luego se actualiza el schema.prisma para mantenerlo sincronizado (solo como documentación).

---

## 5. Endpoint

### `POST /api/ejecuciones/[id]/override`

**Archivo:** `src/app/api/ejecuciones/[id]/override/route.ts` (nuevo)

**Autenticación:** `createSupabaseServerClient()` → `getUser()` → verificar `rol IN ('SUPERVISOR', 'GERENCIA')`

**Request body:**
```ts
{ motivoOverride: string }  // requerido, min 10 chars
```

**Validaciones:**
- `motivoOverride` presente y `>= 10` caracteres
- `EjecucionEtapa` con ese `id` debe existir y tener `estado = 'PENDIENTE'`
- El usuario autenticado debe tener rol `SUPERVISOR` o `GERENCIA`

**Lógica:**
1. Cargar `EjecucionEtapa` → validar estado PENDIENTE
2. Cargar `Usuario` del auth → validar rol
3. `UPDATE EjecucionEtapa SET estado='ACTIVA', fechaInicio=now(), fueOverride=true WHERE id=?`
4. `INSERT RegistroProgreso (id=cuid, ejecucionEtapaId, usuarioId, cantidadRegistrada=0, porcentajeRegistrado=porcentajeActual, fueOverride=true, motivoOverride, notas=null)`
5. Broadcast en canal `ordenes`, evento `progreso`, payload `{ ordenId, etapaActivada: id }`
6. Return `{ ok: true }`

**Error responses:**
- `400` — motivo inválido o etapa no está PENDIENTE
- `401` — sin autenticación
- `403` — rol insuficiente
- `404` — ejecución no encontrada
- `500` — error de DB

---

## 6. Schema change

Agregar en `EjecucionEtapa`:
```sql
ALTER TABLE "EjecucionEtapa" ADD COLUMN "fueOverride" BOOLEAN NOT NULL DEFAULT false;
```

Ejecutar vía Supabase SQL Editor (no prisma migrate).

Actualizar `schema.prisma` para documentación:
```prisma
fueOverride Boolean @default(false)
```

---

## 7. Data flow

```
Supervisor click "Activar manualmente"
  → OverrideModal abre
  → Supervisor escribe motivo
  → POST /api/ejecuciones/[id]/override
      → Valida auth + rol + estado PENDIENTE
      → UPDATE EjecucionEtapa (estado=ACTIVA, fueOverride=true, fechaInicio)
      → INSERT RegistroProgreso (fueOverride=true, motivoOverride, cantidadRegistrada=0)
      → Broadcast canal 'ordenes' evento 'progreso'
  → Modal cierra, onSuccess()
  → GerenciaRealtimeListener / SupervisorRealtimeListener escucha broadcast
  → router.refresh() → dashboard recarga con etapa ACTIVA + badge ⚡
```

---

## 8. Testing

- `calcularOverride` no es una función pura separada — la lógica vive en el endpoint. Tests de integración manuales.
- Unit test para la validación de motivo: función `validarMotivoOverride(motivo: string): boolean` (largo >= 10, no vacío).
- Test: botón "Activar de todas formas" deshabilitado con motivo corto, habilitado con motivo válido.

---

## 9. Archivos afectados

| Archivo | Acción |
|---------|--------|
| `src/components/supervisor/OrdenCascadaCard.tsx` | Modificar — agregar panel de overrides |
| `src/components/supervisor/OverrideModal.tsx` | Crear |
| `src/app/api/ejecuciones/[id]/override/route.ts` | Crear |
| `src/app/(supervisor)/dashboard/page.tsx` | Modificar — agregar `fueOverride` al select de ejecuciones |
| `prisma/schema.prisma` | Modificar — documentar campo `fueOverride` en `EjecucionEtapa` |
| Supabase SQL Editor | Ejecutar `ALTER TABLE` para agregar columna |
