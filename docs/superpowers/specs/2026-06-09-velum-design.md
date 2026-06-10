# Velum — Sistema de Gestión de Producción
**Spec v1.0 · 2026-06-09**

---

## 1. Contexto y objetivo

VELUM fabrica sistemas de fachadas metálicas y de revestimiento. Actualmente el seguimiento de producción se hace en Excel. El sistema Velum reemplaza ese proceso con una aplicación web que gestiona órdenes de producción, ejecuta un motor de cascada automático entre etapas de fabricación, y provee trazabilidad completa por orden.

---

## 2. Usuarios y dispositivos

| Rol | Dispositivo | Responsabilidad |
|-----|-------------|----------------|
| Operario | Celular o tablet (mobile-first) | Registra avance por lote en su máquina |
| Supervisor | PC / notebook | Monitorea todas las órdenes en tiempo real, gestiona máquinas y overrides |
| Gerencia | PC / notebook | Ve resumen de proyectos, tiempos, alertas y cuellos de botella |

---

## 3. Catálogo de productos

**11 sistemas** con aproximadamente 80 variantes de producto:

| Sistema | Descripción |
|---------|-------------|
| Sheet | Paneles de chapa sin estructura |
| Skin | Sistema de parantes y costillas |
| Skin.Rail | Parantes y costillas + rieles horizontales omega |
| Rail | Rieles horizontales omega |
| Edge | Rieles C o L para sujeción de paneles / parasoles |
| Clad | Rieles omega livianos para revestimiento de paredes |
| SunShield | Sistema de parantes y vigas cajón omega |
| SkyCap | Sistema de pescantes y rieles para cielorraso |
| FullCustom | Sistema totalmente a medida |
| Organic | Sistema a base de Melamina |
| Frame | Sistema a partir de marcos con perfiles normalizados |

Cada sistema contiene múltiples variantes de producto (ej. Sheet: StandardFlat, CustomFlat, MultiSlim.A–U, Triangle, Square, Diamond). La combinación **Sistema + Producto** determina la ruta de fabricación.

---

## 4. Máquinas disponibles

Láser · Punzonadora CNC · Fresadora · Expansora de metal · Plegadora · Lavado · Pintado / Horno (curado a 200°C) · Embalaje · Despacho

---

## 5. Origen de órdenes de producción

Las órdenes nacen de dos fuentes:
- **Proyecto de cliente**: una obra o proyecto aprobado genera una o más órdenes (Sistema + Producto + Cantidad + Fecha de entrega)
- **Orden manual**: producción crea una orden directa para reposición o urgencias

---

## 6. Motor de cascada — concepto central

La fabricación es **no secuencial con solapamiento**: múltiples etapas de la misma orden corren en paralelo sobre porciones distintas del material.

**Ejemplo — Sheet/MultiSlim.A:**
```
Punzonado  ████████████████░░░░  80% → continúa
Plegado         ████████░░░░░░░░  40% → continúa
Lavado               ████░░░░░░░  20% → continúa
Pintado                   ██░░░░  10% → continúa
Curado (horno)              █░░░   5% → continúa
```

Cada etapa tiene un **umbral de activación** configurable (ej. 50%). Cuando la etapa anterior supera ese umbral, el motor habilita automáticamente la siguiente.

**Flujo del motor:**
1. Operario registra lote (cantidad procesada)
2. Motor evalúa: `porcentaje_actual ≥ umbral_activacion` de la siguiente etapa
3. Si se cumple → crea `EjecucionEtapa` con estado `ACTIVA`
4. WebSocket push a todos los clientes conectados
5. Log inmutable guardado en `RegistroProgreso`

---

## 7. Modelo de datos

### Entidades principales

**Proyecto**
- id, nombre, cliente, fecha_entrega, estado

**OrdenProduccion**
- id, proyecto_id (nullable para órdenes manuales), ruta_id, sistema, producto, cantidad, unidad (piezas / metros / m²), porcentaje_global, estado, prioridad
- `porcentaje_global` = promedio ponderado del porcentaje de todas las `EjecucionEtapa` de la orden. Se recalcula cada vez que un operario registra avance.

**Ruta** *(plantilla precargada por Sistema+Producto)*
- id, sistema, producto, descripcion

**EtapaRuta** *(etapas de una ruta, con máquina y umbral)*
- id, ruta_id, maquina_id, orden_secuencia, nombre_etapa, umbral_activacion (%)

**Maquina**
- id, nombre, tipo, estado_actual (operativa / mantenimiento / fuera_de_servicio)

**EjecucionEtapa** *(instancia de una etapa en una orden real)*
- id, orden_id, etapa_ruta_id, operario_id, porcentaje_actual, estado (pendiente / activa / completada / en_espera), fecha_inicio, fecha_fin

**RegistroProgreso** *(log inmutable — trazabilidad)*
- id, ejecucion_etapa_id, usuario_id, porcentaje_registrado, cantidad_registrada, timestamp, notas, fue_override

**Usuario**
- id, nombre, email, rol (operario / supervisor / gerencia)

---

## 8. Rutas precargadas

Las rutas de fabricación para los 80 productos están definidas por VELUM antes del lanzamiento. Se cargan como seed data en la base de datos. El sistema incluye una pantalla de edición para ajustes futuros, pero no requiere configuración inicial por el usuario.

---

## 9. Casos especiales

| Situación | Comportamiento |
|-----------|---------------|
| Máquina en mantenimiento | Órdenes que la necesitan pasan a `EN_ESPERA`. Al restaurar la máquina, retoman automáticamente. Alerta en dashboard de gerencia. |
| Orden urgente | Supervisor eleva prioridad. Se resalta en rojo en todos los dashboards. No altera la lógica de cascada. |
| Override de umbral | Supervisor habilita manualmente la siguiente etapa antes del umbral. Queda registrado en `RegistroProgreso` con `fue_override=true` y motivo obligatorio. |
| Cierre de turno | Operario registra % final del lote. El estado de cada etapa persiste. El siguiente turno retoma exactamente donde quedó. El historial registra qué operario trabajó en cada turno. |

---

## 10. Stack técnico

| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js 14 · TypeScript · Tailwind CSS |
| Backend | Next.js API Routes · Prisma ORM |
| Base de datos | PostgreSQL via Supabase |
| Tiempo real | Supabase Realtime (WebSockets) |
| Autenticación | Supabase Auth · roles por usuario |
| Deploy | Vercel (frontend) · Supabase (DB + auth + realtime) |

---

## 11. Fases de implementación

### Fase 1 — Core (MVP)
- Autenticación y roles
- CRUD de proyectos y órdenes
- Rutas precargadas (seed data)
- Motor de cascada
- Vista operario (mobile)
- Vista supervisor (dashboard tiempo real)

### Fase 2 — Visibilidad
- Vista gerencia (reportes y proyectos)
- Alertas de cuellos de botella
- Estado de máquinas

### Fase 3 — Configuración
- Pantalla de edición de rutas
- Gestión de umbrales por producto
- Exportación de historial / trazabilidad

---

## 12. Criterios de éxito

- Un operario puede registrar avance en menos de 10 segundos desde su celular
- El supervisor ve el cambio en tiempo real sin recargar la página
- Cuando una etapa supera su umbral, la siguiente se habilita automáticamente en menos de 2 segundos
- Toda acción queda registrada con usuario y timestamp (trazabilidad completa)
- El sistema funciona sin conexión a internet por períodos cortos (PWA offline básico — Fase 2)
