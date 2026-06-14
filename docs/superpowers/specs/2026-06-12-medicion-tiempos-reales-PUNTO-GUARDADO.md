# Medición de Tiempos Reales — Punto de Guardado

**Fecha:** 2026-06-12 (noche)
**Rama:** `feat/ordenes-produccion`
**Estado:** Implementación completa y revisada. Falta solo el checklist E2E manual (requiere fichar como operario en producción).

---

## 1. Para qué es esto (el porqué)

El **Cotizador de Costeo** necesita un dato que no existía: el **factor de utilización real** de cada máquina. La hoja `datos` del Excel "Control de Produccion dinamico" solo tiene capacidad **pico** (piezas/hora teóricas × 8 h, sin setup, sin paradas, sin OEE). Multiplicar así da el famoso error ×10: asume 8 horas 100% productivas.

Las hojas de seguimiento real del Excel están vacías, así que el factor **no se puede sacar de la historia**. Hay que medirlo en el taller. Este módulo es el instrumento de medición: el operario ficha el tiempo real, el sistema lo compara contra el teórico, y **el factor emerge solo** — por máquina, por producto, por operario — a medida que se produce.

Un tiro, dos pájaros: construir esto también cargó el **input #1 del cotizador** (la tabla de capacidades teóricas, ahora en `CapacidadTeorica`).

## 2. La arquitectura, en una frase

> Una **capa de medición** montada sobre el flujo de producción que ya existía (`EjecucionEtapa`), que captura **tramos de trabajo** reales y los compara contra una tabla de **capacidad teórica**, sin tocar el motor de rutas.

### Las tres ideas que sostienen el diseño

1. **Tramo, no marca única.** Un trabajo ("plegar 400 PIC") puede partirse en varias sesiones a lo largo del día. El operario ficha *cada vez que se pone y deja* la tarea (Empezar/Pausar/Terminar). La suma de tramos = tiempo real de máquina. Una sola marca inicio→fin sería tiempo de calendario (incluiría noches y esperas), que es justo lo que NO sirve.

2. **Setup separado de producción.** Al iniciar un tramo el operario elige **Preparación** o **Producción** (un toque). El setup es el factor ×10; si no se separa, no se puede amortizar por tamaño de lote en el costeo.

3. **El factor se calcula, nunca se almacena.** Funciones puras leen los tramos + los teóricos y devuelven los factores on-demand, agregables por cualquier eje. Nada que se desincronice.

### Qué quedó explícitamente afuera (y por qué)

- **El motor de rutas.** Hoy las 7 rutas clavan cada etapa a UNA máquina (siempre "Plegadora Uno Huaxia", siempre "Láser Uno Leapion"); la segunda plegadora (Datech) y el segundo láser (Bodor) existen como equipos pero ninguna ruta los usa. Rutear a "la máquina libre del tipo" es un proyecto aparte de planificación de planta. La medición **no lo necesita**: el operario indica la máquina real al fichar. Deuda ya anotada en `prisma/seed.ts`.

## 3. Flujo de datos (cómo se mueve la información)

```
Excel hoja "datos"  ──(ya espejado)──►  tabla Supabase "Velum_tiempos" (55 productos, piezas/DÍA)
                                              │  seed: ÷ horas_dia (8)
                                              ▼
                                      CapacidadTeorica (217 filas, piezas/HORA por producto×tipoMáquina)
                                              │
   Operario en /operario:                     │  ← el cotizador también lee de acá
   Preparar/Producir → Pausar/Terminar         │
        │ POST /api/tramos                      │
        │ PATCH /api/tramos/[id]                │
        ▼                                       │
   TramoTrabajo (inicio, fin, tipo, máquina,    │
   cantidadProducida, dudoso)                   │
        │                                       │
        └──────────────┬────────────────────────┘
                        ▼
        src/lib/factores.ts  (funciones puras, calculan el factor)
                        ▼
        /rendimiento → FactoresUtilizacion (3 tablas) + Export CSV → alimenta el cotizador
```

Detalle clave: al **Terminar** un tramo con cantidad, se reusa la lógica de progreso existente (`registrarProgreso`), así que el avance de la orden, la cascada de etapas y el broadcast Realtime funcionan **idénticos** al botón "Registrar" clásico. Tiempo y cantidad se cargan en un solo gesto, no se duplican.

## 4. Qué se construyó (archivos)

### Base de datos (Supabase, vía SQL Editor — NUNCA prisma migrate)
- `app/supabase/tiempos_reales.sql` — crea `CapacidadTeorica` y `TramoTrabajo`, índices, y seed. **Ya corrido: 217 filas en CapacidadTeorica, 0 en TramoTrabajo.** ✅
- `app/supabase/velum_tiempos.sql` — tabla `"Velum_tiempos"` (renombrada de `hull_tiempos`).
- **Regla de oro a nivel DB:** índice único parcial `uniq_tramo_abierto_por_operario` garantiza un solo tramo abierto (`fin is null`) por operario. No depende del código.

### Modelo (documental — el runtime usa supabase-js, no Prisma Client)
- `app/prisma/schema.prisma` — modelos `CapacidadTeorica`, `TramoTrabajo`, enums `TipoTramo`, `MotivoPausa`, y relaciones inversas en `EjecucionEtapa`/`Usuario`/`Maquina`.

### Lógica pura (testeada, `app/src/lib/`)
- `tramos.ts` — `esHuerfano()` (abierto >12 h = dudoso), `duracionMinutos()`, tipos, `MOTIVOS_PAUSA`.
- `factores.ts` — las tres agregaciones: `resumenPorMaquina` (disponibilidad), `velocidadRealPorProductoMaquina` (real vs teórico), `setupPromedioPorProducto`. Excluyen dudosos y tramos abiertos.
- `registrar-progreso.ts` — extraída del route de progreso; única fuente de verdad del avance (cascada, cierre de orden/proyecto, broadcast). Sin cambio de comportamiento (verificado por review).

### API (`app/src/app/api/`)
- `tramos/route.ts` — `POST`: abre tramo. Valida etapa ACTIVA, asignación, coincidencia de tipo de máquina. Cierra el tramo previo del operario (dudoso si huérfano). Conflicto concurrente → 409 con mensaje claro.
- `tramos/[id]/route.ts` — `PATCH`: `pausar` (con motivo opcional) o `terminar`. Ambos setean `fin`. Terminar registra progreso; si falla, **revierte el cierre** (rollback) para reintentar. `cantidad=0` cierra sin registrar avance.

### UI
- `app/src/components/operario/TramoControl.tsx` — cronómetro en la card del operario. 4 sub-estados: botones Preparar/Producir → selector de máquina (solo si el tipo tiene >1 instancia, recuerda la última) → corriendo (Pausar/Terminar, y Producir si está en Preparación) → cierre con cantidad.
- `app/src/components/operario/OrdenCard.tsx` y `app/src/app/(operario)/operario/page.tsx` — integración (trae el tramo abierto y las máquinas; el widget de cantidad clásico quedó intacto).
- `app/src/components/supervisor/FactoresUtilizacion.tsx` — vista de 3 tablas en `/rendimiento`, con `n` (cantidad de tramos que respaldan cada número) y aviso de dudosos excluidos.
- `app/src/app/api/exportar/route.ts` + `ExportarCsvButton.tsx` — export CSV `tipo=factores` (`tramos-trabajo-*.csv`).

## 5. Estado de verificación

- **69 tests verdes** (`npm run test:run`), 10 archivos.
- **Build OK** (`npx next build`), sin errores de tipos.
- **Dev server arranca limpio** en localhost:3001; rutas protegidas por auth (307 → login).
- **Review final (Opus)**: aprobado tras corregir 1 issue Important (conflicto concurrente → 409, ya aplicado en commit `f9198e4`). Minors documentados (día UTC vs ART en disponibilidad: aceptado mientras no haya turno noche).
- Seed verificado: PIC/PEC-150 LÁSER = 94,98 piezas/hora (= 759,86 ÷ 8, correcto).

## 6. Lo único que falta — checklist E2E manual

Requiere login de operario con etapa ACTIVA (y crea filas reales en la base de producción). Server en `npm run dev`. Probar:
1. Card muestra **▶ Preparar / ▶ Producir**.
2. Producir en **Plegado** → aparece selector **Huaxia / Datech**; en **Embalaje** → sin selector.
3. Tramo corriendo muestra `⏱ ... en <máquina> · N min`.
4. Pausar → motivos (Material/Otra orden/Avería/Otro) + Saltear.
5. En Preparación, el botón Producir cierra setup y abre producción de una.
6. Terminar → pide cantidad; el % avanza igual que "Registrar" y activa la etapa siguiente.
7. Tramo en otra tarea → confirm "Cerrando tramo de otra tarea (N min)".
8. Supervisor `/rendimiento`: 3 tablas pobladas; filtro de período afecta; CSV descarga.

## 7. Mapa de continuación (mañana y después)

**Inmediato:**
- Correr el checklist E2E (punto 6). Si algo falla, el detalle del comportamiento esperado está en cada archivo y en el plan.

**Cuando haya datos reales acumulados:**
- Los factores en `/rendimiento` empiezan a tener `n` alto → ahí Leapion vs Bodor y Huaxia vs Datech quedan **medidos, no estimados**.
- Exportar el CSV y volcar los factores a las celdas naranjas de la planilla del cotizador (`Cotizador VELUM - Validacion Modelo v1.xlsx` en Desktop), o integrar el cotizador a VELUM para que lea directo de `CapacidadTeorica` + la agregación de factores.

**Proyectos aparte (anotados, fuera de este alcance):**
- Motor de rutas a "máquina libre del tipo" (para usar las dos plegadoras/lásers en planificación).
- Capacidad teórica **por instancia** de máquina (hoy es por tipo; cuando el real revele diferencias grandes, valdrá la pena cargar el teórico de cada máquina).
- Cierre de huérfanos: hoy es lazy (al abrir el siguiente tramo del operario). Operarios que nunca vuelven a fichar dejan el tramo abierto pero igual se excluye del cálculo. Si molesta, un cron/route de barrido.

## 8. Restricciones del proyecto a no olvidar

- **DB:** red local solo IPv4 → NUNCA `prisma migrate`. Schema por SQL Editor de Supabase. Pooler (6543) sí funciona.
- **Dev:** siempre `npm run dev`; nunca `vercel dev` ni `vercel env pull` (pisa `.env.local` con vacíos).
- **Tabla de tiempos:** se llama `"Velum_tiempos"` (ex `hull_tiempos`, renombrada hoy).

## 9. Documentos relacionados

- Diseño: `docs/superpowers/specs/2026-06-12-medicion-tiempos-reales-design.md`
- Plan de implementación (10 tareas, paso a paso): `docs/superpowers/plans/2026-06-12-medicion-tiempos-reales.md`
- Cotizador (consumidor de este dato): `docs/superpowers/specs/2026-06-12-cotizador-costeo-design.md`

## 10. Commits de este módulo (rama `feat/ordenes-produccion`)

```
71b2b25 docs: spec medicion de tiempos reales
7662a02 docs: plan de implementacion medicion de tiempos reales
4e30a2f refactor: renombrar tabla hull_tiempos a Velum_tiempos
36da158 feat: tablas CapacidadTeorica y TramoTrabajo + seed desde Velum_tiempos
5f1f3ff docs: modelos TramoTrabajo y CapacidadTeorica en schema prisma
9c6d11f feat: lib de tramos (huerfanos y duracion)
b1866a3 feat: lib de agregacion de factores de utilizacion
9b18507 refactor: extraer logica de progreso a lib compartida
3ad4017 fix: Array.from sobre iteradores de Map en factores (build ES5)
10adc0e feat: endpoint abrir tramo de trabajo
08f6c39 feat: endpoint pausar/terminar tramo con registro de progreso
df7fd08 feat: cronometro de tramos en pantalla del operario
becbe75 feat: vista de factores de utilizacion en rendimiento + export CSV
f9198e4 fix: manejar conflicto de tramo abierto concurrente (409) y escape CSV
```
