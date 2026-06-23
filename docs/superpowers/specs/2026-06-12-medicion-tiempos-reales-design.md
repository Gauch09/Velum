# Medición de Tiempos Reales de Producción — Diseño

**Fecha:** 2026-06-12
**Estado:** Aprobado para planificación
**Origen:** Relevamiento del factor de utilización real para el Cotizador de Costeo (ver `2026-06-12-cotizador-costeo-design.md`). El Excel "Control de Produccion dinamico" tiene capacidades teóricas pico (hoja `datos`) pero nunca registró tiempo productivo real; la hoja `Semana laboral` está vacía. El factor real no se puede inferir de la historia: hay que medirlo en el taller.

## Objetivo

Que el factor de utilización **emerja de la producción real** en vez de estimarse una vez: el sistema conoce el tiempo teórico de cada tarea (cantidad ÷ capacidad teórica) y el operario ficha el tiempo real con un cronómetro de tramos. La comparación real ÷ teórico, acumulada por máquina, producto y operario, alimenta el cotizador con tres datos que hoy no existen:

1. **Disponibilidad** — cuántas de las 8 h efectivas de jornada la máquina realmente corre → infla el costo de hora-máquina.
2. **Velocidad real por producto × máquina** — piezas/hora reales vs. teórico → corrige el tiempo de ciclo.
3. **Setup real por producto** — duración de los tramos de preparación → se amortiza por tamaño de lote.

## Alcance

**Dentro:** capa de medición sobre el flujo de producción existente (`EjecucionEtapa`), carga de capacidades teóricas, vista de factores en `/rendimiento`.

**Fuera (explícitamente):** el motor de ruteo. Hoy las 7 rutas clavan cada etapa a una máquina específica (todos los "Plegado" → Plegadora Uno Huaxia; todos los "Corte Láser" → Láser Uno Leapion). Ruteo a "la máquina libre del tipo" es un proyecto aparte, ya anotado como pendiente en el seed. La medición NO lo necesita: el operario indica la máquina real al fichar.

## Contexto de equipos (relevado de Supabase, jun 2026)

13 máquinas. Tipos con más de una instancia:
- **LASER:** Laser Uno Leapion, Laser Dos Bodor
- **PLEGADORA:** Plegadora Uno Huaxia, Plegadora Dos Datech

Marcas distintas → rendimientos presumiblemente distintos. La hoja `datos` tiene un solo teórico por proceso: se arranca con teórico por proceso y el real revela la diferencia entre instancias.

Jornada: 9 h con 1 h de descanso = **8 h efectivas**. El descanso queda fuera de la medición; "Pausar" es para interrupciones (material, otra orden, avería).

## Modelo de datos

Dos tablas nuevas. Cero columnas modificadas en tablas existentes. Schema vía SQL Editor de Supabase (constraint de red: NUNCA `prisma migrate`; ver memoria del proyecto).

### `CapacidadTeorica`

| Campo | Tipo | Notas |
|---|---|---|
| `id` | cuid | |
| `producto` | string | Los 55 productos de la hoja `datos` |
| `tipoMaquina` | enum `TipoMaquina` | Existente |
| `piezasPorHora` | float | Teórico pico de la hoja `datos` |
| `minutosSetupEstimado` | float? | Opcional; para comparar contra preparación real |
| `vigenteDesde` | datetime | Permite versionar el teórico sin pisar historia |

Carga inicial: seed generado desde la hoja `datos` del Excel "Control de Produccion dinamico" (columnas: Unidades proceso, Unidades de plegado, Unidades de fresado, Unidades de Pintado por percha, Unidades de embalado). El cotizador lee de esta tabla.

### `TramoTrabajo`

| Campo | Tipo | Notas |
|---|---|---|
| `id` | cuid | |
| `ejecucionEtapaId` | FK → `EjecucionEtapa` | De qué tarea es |
| `operarioId` | FK → `Usuario` | Quién ficha |
| `maquinaId` | FK → `Maquina` | Instancia específica (Leapion vs Bodor) |
| `tipo` | enum: `PREPARACION` \| `PRODUCCION` | |
| `inicio` | datetime | |
| `fin` | datetime? | null = tramo corriendo |
| `cantidadProducida` | float? | Se pide al cerrar con "Terminar"; opcional en pausa |
| `motivoPausa` | enum?: `MATERIAL` \| `OTRA_ORDEN` \| `AVERIA` \| `OTRO` | Opcional, salteable |
| `dudoso` | boolean, default false | Auto-cerrados; excluidos del cálculo |
| `notas` | string? | |

### Reglas de integridad

1. **Un tramo abierto por operario.** Abrir uno nuevo cierra el anterior automáticamente con aviso en UI (banner de confirmación de un toque). Evita el "me olvidé de parar el reloj" en cascada.
2. **Tramos huérfanos:** abiertos > 12 h se cierran automáticamente con `dudoso = true` y quedan fuera del factor.
3. La máquina del tramo debe coincidir en `tipo` con la máquina de la etapa.
4. Solo el dueño del tramo puede cerrarlo (mismas reglas de asignación que el progreso actual).

### El factor NO se almacena

Se calcula on-demand desde los tramos: `(cantidad ÷ piezasPorHora teórico)` vs. suma de tramos reales, agregable por máquina, producto, operario y rango de fechas. Cada agregado expone `n` (cantidad de tramos que lo respaldan).

## Pantalla del operario

La `OrdenCard` existente gana una franja de cronómetro. El flujo de cantidad actual NO se duplica: se fusiona con el cierre del tramo.

### Estado 1 — Sin tramo abierto
Dos botones grandes: **▶ PREPARAR** y **▶ PRODUCIR**. Al tocar:
- Si el tipo de máquina tiene más de una instancia → selector de un toque ("¿En cuál? Huaxia / Datech"), con la última usada como default. Si hay una sola, no pregunta.
- El tramo arranca.

### Estado 2 — Tramo corriendo
Muestra `⏱ PRODUCIENDO en <máquina> · <minutos>` y dos botones:
- **⏸ PAUSAR** — interrupción. Pregunta motivo opcional de un toque (`Material | Otra orden | Avería | Otro`), salteable.
- **■ TERMINAR** — pide cantidad hecha con el widget −/+ existente; **un solo gesto cierra el tramo Y registra el progreso** (reusa la lógica de `/api/ordenes/[id]/progreso` con su cascada).
- Durante una PREPARACION, el botón **PRODUCIR** sigue visible: un toque cierra el setup y abre producción (el caso típico: 40 min de reglaje → arranca el lote).

### Estado 3 — Cambio de contexto
Con tramo abierto en tarea X, tocar "Producir" en tarea Y muestra banner: "Cerrando tramo de X (47 min). ¿Continuar?" — un toque. El operario nunca queda bloqueado.

## Vista de supervisor (`/rendimiento`)

Tres niveles, cada número con su `n` y con `dudosos` excluidos:

1. **Factor global por máquina:** horas fichadas vs. disponibles (8 h × días hábiles), desglose preparación/producción.
2. **Velocidad real por producto × máquina:** piezas/hora real vs. teórico. Acá aparece Leapion vs. Bodor medido.
3. **Setup real por producto:** promedio de tramos PREPARACION.

Exportable a CSV para alimentar las celdas naranjas de la planilla "Cotizador VELUM - Validacion Modelo v1.xlsx" mientras el cotizador no esté integrado a VELUM.

## API

| Endpoint | Acción |
|---|---|
| `POST /api/tramos` | Abrir tramo (cierra el anterior del operario si existe) |
| `PATCH /api/tramos/[id]` | Pausar o terminar. Ambos setean `fin` (no hay estado "suspendido": pausar cierra el tramo; retomar crea uno nuevo). Terminar además registra cantidad e invoca la lógica de progreso existente |
| `GET /api/rendimiento/factores` | Agregados con filtros por máquina/producto/operario/fechas |

Validaciones server-side: un tramo abierto por operario; coincidencia de tipo máquina-etapa; ownership del tramo; auth con el mismo patrón Supabase de las rutas existentes.

## Manejo de errores

- Tramo huérfano (> 12 h): auto-cierre con `dudoso = true`, visible en `/rendimiento` como dato excluido.
- Doble apertura concurrente (dos pestañas): la segunda apertura cierra la primera; la constraint "un abierto por operario" se valida en servidor, no solo en UI.
- Cierre con cantidad que falla en la cascada de progreso: el tramo NO se cierra (transaccional) — el operario ve el error y reintenta.
- Pérdida de conectividad con tramo corriendo: el tramo vive en el servidor (`inicio` ya persistido); al recuperar conexión la UI re-sincroniza el estado real.

## Testing

- **Unit:** lógica de agregación del factor (disponibilidad, velocidad real, setup promedio, exclusión de dudosos, cálculo de `n`).
- **Integration:** ciclo abrir → pausar → reabrir → cerrar; auto-cierre por apertura de otro tramo; auto-cierre huérfano.
- **Crítico:** cerrar tramo con cantidad dispara la cascada de etapas exactamente igual que el "Registrar" actual (mismo resultado en `EjecucionEtapa`, `RegistroProgreso`, activación de etapa siguiente, cierre de orden/proyecto).

## Decisiones registradas

| Decisión | Elección | Razón |
|---|---|---|
| Relación con flujo existente | Fusionar: cronómetro + cantidad en un gesto | Dos lugares para la misma tarea muere en taller |
| Granularidad | Tramos (sesiones), no una marca por etapa | Calendario ≠ tiempo de máquina |
| Setup vs producción | Se distingue al iniciar (un toque) | El setup es el factor ×10; sin separarlo no se puede amortizar por lote |
| Instancias de máquina | El operario elige al fichar; rutas no se tocan | Medición no necesita ruteo; Leapion/Bodor y Huaxia/Datech rinden distinto |
| Teórico inicial | Por proceso (hoja `datos`), no por instancia | No existe dato por instancia; el real lo revela |
| Factor | Calculado, nunca almacenado | Evita desincronización; agregable por cualquier eje |
| Motor de rutas a máquina libre | Proyecto aparte, fuera de alcance | Ya era deuda anotada en seed; no bloquea la medición |
