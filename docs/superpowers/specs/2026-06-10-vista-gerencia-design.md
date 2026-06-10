# Vista Gerencia — Spec de Diseño

**Fecha:** 2026-06-10  
**Proyecto:** VELUM — Sistema de Gestión de Producción  
**Estado:** Aprobado

---

## Contexto

VELUM necesita una pantalla de dirección (TV/monitor siempre visible) que le permita al dueño ver el estado del negocio de un vistazo sin interacción. El sistema ya cuenta con auth por roles, proyectos, órdenes de producción, ejecuciones por etapa y cascada automática. Esta vista es 100% read-only.

---

## Ruta y Acceso

- **URL:** `/gerencia`
- **Route group:** `src/app/(gerencia)/gerencia/page.tsx`
- **Protección (capa 1):** el middleware de Supabase Auth existente en `src/middleware.ts` bloquea usuarios no autenticados → redirige a `/login`.
- **Protección (capa 2):** el propio `page.tsx` verifica el rol con `supabase.from('Usuario').select('rol').eq('authId', user.id)`. Si el rol no es `GERENCIA`, llama `redirect('/login')`.
- **Sin navbar lateral** — pantalla completa, sin distracciones.

---

## Layout

**Opción seleccionada:** dos columnas fijas, fondo oscuro (`#0f0f0f`).

```
┌─────────────────────────────────────────────────────────┐
│  VELUM · Vista Gerencia                     [10/06 14:32]│
├────────────────────────────────┬────────────────────────┤
│  PROYECTOS ACTIVOS (65%)       │  MÁQUINAS (35%)         │
│                                │                         │
│  ┌──────────────────────────┐  │  Láser        ACTIVA ● │
│  │ Edificio Vera        72% │  │  Punzonadora  ACTIVA ● │
│  │ ████████████░░░░  14 días│  │  Fresadora    MANT.  ⚠ │
│  └──────────────────────────┘  │  Expansora    ACTIVA ● │
│  ┌──────────────────────────┐  │  Plegadora    ACTIVA ● │
│  │ Torre San Martín     38% │  │  Lavado       ACTIVA ● │
│  │ ██████░░░░░░░░  ⚠ 3 días │  │  Pintado      ACTIVA ● │
│  └──────────────────────────┘  │  Horno        ACTIVA ● │
│  ┌──────────────────────────┐  │  Embalaje     FUERA  ✕ │
│  │ Residencial Norte    55% │  │  Despacho     ACTIVA ● │
│  │ █████████░░░░░  VENCIDO  │  │                         │
│  └──────────────────────────┘  │                         │
└────────────────────────────────┴────────────────────────┘
```

---

## Datos y Queries

Todas las queries usan `@supabase/supabase-js` (REST). **Nunca PrismaClient directo.**

### Proyectos activos

```ts
supabase
  .from('ProyectoProduccion')
  .select('id, nombre, fechaEntrega, estado')
  .neq('estado', 'COMPLETADO')
  .order('fechaEntrega', { ascending: true })
```

### Progreso global por proyecto

Promedio de `porcentajeGlobal` de todas las `OrdenProduccion` asociadas al proyecto:

```ts
supabase
  .from('OrdenProduccion')
  .select('proyectoId, porcentajeGlobal')
  .in('proyectoId', proyectoIds)
```

Calcular en el servidor: `avg(porcentajeGlobal)` agrupado por `proyectoId`.

### Estado de máquinas

```ts
supabase
  .from('Maquina')
  .select('id, nombre, tipo, estado')
  .order('tipo', { ascending: true })
```

---

## Semáforo de Proyectos

Lógica pura en el Server Component, sin llamada extra a la DB.

| Color | Condición |
|-------|-----------|
| 🔴 Rojo | `fechaEntrega < hoy` (vencido) |
| 🟡 Ámbar | `diasRestantes <= 7` AND `progreso < 60` |
| 🟢 Verde | cualquier otro caso |

`diasRestantes = Math.ceil((fechaEntrega - hoy) / 86400000)`

---

## Semáforo de Máquinas

Directo del campo `estado` de la tabla `Maquina`:

| Estado DB | Color | Label |
|-----------|-------|-------|
| `ACTIVA` | 🟢 Verde | ACTIVA |
| `MANTENIMIENTO` | 🟡 Ámbar | MANT. |
| `FUERA_DE_SERVICIO` | 🔴 Rojo | FUERA |

---

## Actualización en Tiempo Real

El page.tsx hace el fetch inicial server-side. Un Client Component `GerenciaRealtimeListener` se suscribe a Supabase Realtime y llama `router.refresh()` al detectar cambios:

- Canal: `postgres_changes` en tabla `OrdenProduccion` (para % de avance)
- Canal: `postgres_changes` en tabla `Maquina` (para estado de máquinas)

No hay polling manual. La página se actualiza sola cuando cambia algo en producción.

---

## Componentes

| Archivo | Tipo | Responsabilidad |
|---------|------|-----------------|
| `src/app/(gerencia)/gerencia/page.tsx` | Server Component | Fetch inicial, layout raíz |
| `src/components/gerencia/ProyectoCard.tsx` | Server Component | Tarjeta con barra de progreso y semáforo |
| `src/components/gerencia/MaquinaEstado.tsx` | Server Component | Chip de estado de máquina |
| `src/components/gerencia/GerenciaRealtimeListener.tsx` | Client Component | Suscripción Realtime → `router.refresh()` |

---

## Restricciones

- **Sin interacción del usuario** — 100% read-only, no hay botones ni formularios.
- **Sin nueva ruta API** — todo el fetch es server-side en `page.tsx`.
- **Sin PrismaClient** — todas las queries vía `supabase-js` (constraint de red IPv4).
- **IDs:** no se insertan registros en esta vista, no aplica `createId()`.
- **Sin `prisma migrate`** — esta feature no requiere cambios de schema.

---

## Fuera de Scope

- Drill-down a detalle de proyecto (pertenece a una vista futura).
- Alertas de cuello de botella (Fase 2, ítem 2 — spec separado).
- Exportar o compartir el dashboard.
