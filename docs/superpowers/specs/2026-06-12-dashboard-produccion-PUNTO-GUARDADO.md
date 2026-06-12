# Punto de Guardado — Dashboard de Producción (datos de HULL)

**Fecha:** 2026-06-12
**Branch:** `feat/ordenes-produccion` (sin mergear)
**Estado:** Dashboard de producción funcionando con datos de ejemplo + motor de estimación de tiempos andando y testeado. Falta: (1) estimación de fecha de entrega por capacidad, (2) sincronizador en la fábrica.

---

## Objetivo
Dar a VELUM un **dashboard de producción** que muestre el estado real de HULL (el software de escritorio de la fábrica) y **estime tiempos/fechas**, accesible tanto en la red de la fábrica como por internet.

## Arquitectura — el "puente" (decidida y cerrada)
HULL (app WPF .NET 8 en la fábrica) escribe en una **MySQL nativa** (`access_data`) que **solo acepta conexiones locales** (3306 cerrado desde afuera). Por eso:

```
PC Fábrica (LAN 192.168.1.159, siempre prendida)        Supabase (nube)        Usuario
  MySQL access_data (HULL)                                                     📱 celular
        │ lee (usuario read-only velum_dash)             copia de los datos     💻 casa
        ▼                                          ───►  (hull_proyectos, ...)   🏭 fábrica
   SINCRONIZADOR  ───────────────────────────────►                            
   (corre en la fábrica, cada 10-15 min)                      │ lee
                                                       Dashboard VELUM (/produccion)
```

El sincronizador corre **en la fábrica** porque es la única máquina que llega a MySQL. Empuja a Supabase; VELUM lee de Supabase (sirve en red local y por internet, sin abrir puertos).

## Conexión a HULL (referencia)
- MySQL nativa en la fábrica, servicio Windows `MySQL80`, base **`access_data`** (~30 tablas, nombres kebab-case heredados de MS Access).
- HULL usa internamente el usuario `AdminHull`.
- **Llave read-only creada para el dashboard:** usuario MySQL **`velum_dash`** con `GRANT SELECT ON access_data.*` (solo lectura). Host `192.168.1.159`, puerto `3306`.
- ⚠️ La **contraseña de `velum_dash` NO está en el repo** (está en la config local / memoria del asistente). Para el sincronizador irá en una variable de entorno en la fábrica, nunca en git.
- Tablas de HULL relevantes para producción: `120-despiece-pedido` (piezas: producto, material, espesor, cantidad, completados, estado, procesos), `125-orden-produccion`, `126-lotes-produccion`, `400-stock`, `000-proyecto`.

## Lo construido (en este repo)
**Frontend / lógica (VELUM, Next.js):**
- `app/src/app/(supervisor)/produccion/page.tsx` — la página real del dashboard (diseño elegido: **"Foco en proyectos"**, tarjetas por proyecto con anillo de avance). Protegida por login. Lee de Supabase.
- `app/src/components/supervisor/produccion/ProyectoCardHull.tsx` y `AnilloProgreso.tsx` — componentes de la tarjeta.
- `app/src/lib/estimacion.ts` — **motor de estimación** (`días = cantidad ÷ piezas/hora ÷ horas_día`). Maneja productos sin tiempo cargado (los marca, no inventa).
- `app/src/lib/estimacion.test.ts` — 9 tests (pasan ✓). Correr: `cd app && npx vitest run src/lib/estimacion.test.ts`.
- `app/src/app/prototipo-produccion/` — **boceto descartable** (3 variantes A/B/C). El usuario eligió la C. ⚠️ Tiene una excepción temporal en `app/src/middleware.ts` que lo hace público — **QUITAR el prototipo + la excepción antes de mergear/deployar**.

**Datos (Supabase — SQL en `app/supabase/`, ya corridos en el SQL Editor):**
- `hull_dashboard.sql` → tablas `hull_proyectos`, `hull_ordenes`, `hull_sync_meta` (+ datos de ejemplo).
- `hull_tiempos.sql` → tabla `hull_tiempos`: 55 productos con velocidad (piezas/hora) por máquina, importados de la hoja **"datos"** del Excel `Control de Produccion dinamico.xlsx`.
- `hull_piezas.sql` → tabla `hull_piezas`: despiece por producto/proceso (datos de ejemplo con nombres reales del Excel; incluye un "Cassette especial" SIN tiempo para mostrar ese caso).

Verificado end-to-end con datos reales de Supabase: la estimación calcula trabajo de máquina restante por proyecto y marca los productos sin tiempo. Hoy da en **horas** porque las máquinas son rápidas; estimar **fecha de entrega** necesita el modelo de capacidad (abajo).

## El Excel de tiempos (`Control de Produccion dinamico.xlsx`)
Solo importan 2 hojas (el usuario lo confirmó):
- **"datos"** → velocidad por producto por máquina (Láser, Plegadora, Pintura/Polvo, Embalado, Punzonadora, Fresadora) en piezas/hora. Cobertura PARCIAL (55 productos). Ya cargada en `hull_tiempos`.
- **"Proyecto"** → planilla de seguimiento que estima días por proceso y días restantes (la referencia de cómo se usa la capacidad).

---

## PRÓXIMO PASO — Estimación de fecha de entrega por capacidad
Para pasar de "trabajo de máquina" a "fecha estimada de fin" y "llega / no llega a la entrega", falta modelar la **capacidad diaria de cada máquina compartida entre todos los proyectos**.

**Lo que el usuario tiene que traer (las 3 cosas):**
1. **Cuántas máquinas de cada tipo** hay (Láser, Plegadora, Pintura/Polvo, Embalado, Punzonadora, Fresadora). Si es una de cada, alcanza con decirlo.
2. **Horario de trabajo:** horas por día (¿8?), días laborables (¿lun-vie? ¿sábados?), turnos.
3. **Regla de prioridad** cuando varios proyectos compiten por una máquina (el Excel usa prioridad + fecha de entrega).

**Cómo se modela:** capacidad diaria por máquina = `velocidad (piezas/hora) × nº de máquinas × horas/día`. Se reparte la demanda de todos los proyectos día por día respetando la prioridad → fecha estimada de fin por proyecto → alerta "llega/no llega". Todo en VELUM, no toca la fábrica.

## PASO FINAL — Sincronizador (cuando la lógica esté redonda)
Proceso chico que corre en la PC de la fábrica (idealmente contenedor Docker — ya está instalado ahí), lee `access_data` con `velum_dash` y refresca las tablas `hull_*` de Supabase cada 10-15 min. Reemplaza los datos de ejemplo por los reales. La contraseña va en variable de entorno en la fábrica.

---

## Cómo retomar
1. Abrir Claude Code en `C:\Users\Nissei\Velum` (la carpeta del proyecto).
2. Decir algo como: **"seguimos con el dashboard de producción, te traigo la capacidad de las máquinas"**.
3. Pasar las 3 cosas de arriba (aunque sea: *"una de cada máquina, 8 h lun-vie, por prioridad y fecha de entrega"*).
4. El asistente ya tiene el contexto en memoria + este documento, así que retoma al instante y arma la estimación por capacidad.

Para volver a ver el dashboard mientras tanto: `cd app && npm run dev`, loguearse en VELUM y entrar a `http://localhost:3000/produccion`. (El boceto está en `/prototipo-produccion`.)
