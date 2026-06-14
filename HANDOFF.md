# VELUM — Sistema de Gestión de Producción · Documento de Handoff

> Para el equipo de **Aplica.dev**. Resume qué es el sistema, cómo está construido, qué está hecho, qué falta y cómo continuar.

---

## 1. Qué es

VELUM es una empresa de fachadas metálicas (Santa Fe, AR). Este sistema gestiona la **producción de taller**: órdenes de producción, seguimiento de avance por etapa/máquina, fichaje de tiempos reales de los operarios, dashboard para supervisión, y un modelo de costeo de fabricación.

Reemplaza a un sistema heredado (una app de escritorio + planillas Excel).

## 2. Stack

- **Next.js 14** (App Router, React 18, TypeScript) — carpeta `app/`.
- **Supabase** (PostgreSQL) como base de datos y auth. El runtime usa **`supabase-js`** (no Prisma Client en runtime).
- **Prisma** se usa **solo como documentación del schema** (`app/prisma/schema.prisma`) y para generar tipos; **no** se usa `prisma migrate` (ver restricciones).
- **Tailwind CSS**, `@react-pdf/renderer` (PDFs), `bwip-js` + `qrcode` (códigos), `resend` (emails), `vitest` (tests), `playwright` (E2E).
- Deploy en **Vercel**.

## 3. Cómo correr (local)

```bash
cd app
npm install
npm run dev        # http://localhost:3000  (SIEMPRE npm run dev)
npm run test:run   # tests unitarios (vitest)
npm run build      # prisma generate + next build
```

Variables de entorno en `app/.env.local` (ver `.env.local.example`): URL y keys de Supabase (anon + service role).

> ⚠️ **No usar `vercel dev` ni `vercel env pull`** — sobreescriben `.env.local` con valores vacíos.

## 4. Arquitectura

### Roles y rutas (App Router route groups)
- `(auth)` → login.
- `(operario)` → pantalla del operario: registra avance y ficha tiempos.
- `(supervisor)` → órdenes, proyectos, rutas, máquinas, usuarios, dashboard, rendimiento, calendario.
- `(gerencia)` → vista ejecutiva.

### Base de datos (Supabase)
Modelo en `app/prisma/schema.prisma`. Tablas principales:
- **Producción base**: `Proyecto`, `Maquina`, `Ruta`, `EtapaRuta`, `OrdenProduccion`, `EjecucionEtapa`, `RegistroProgreso`, `Usuario`.
- **Órdenes primarias (OPP/OPS/OPB)**: `OrdenPrimaria`, `ItemProduccion`, `BatchProceso`, `ConfiguracionEquipo`.
- **Tiempos reales / costeo**: `CapacidadTeorica` (capacidad teórica por producto × tipo de máquina), `TramoTrabajo` (fichaje real), `Velum_tiempos`.
- **Dashboard espejo** (datos sincronizados desde el sistema viejo): `velum_proyectos`, `velum_ordenes`, `velum_piezas`, `velum_sync_meta`.

Los scripts SQL de creación/seed están en `app/supabase/*.sql`.

## 5. Módulos (estado)

| Módulo | Qué hace | Estado |
|---|---|---|
| **Órdenes de Producción (OPP/OPS/OPB)** | Wizard 3 pasos → emisión → PDF con códigos. Genera batches de lavado/horno. | ✅ Verificado en runtime |
| **Flujo de etapas** | Avance por etapa/máquina con cascada de activación y cierre de orden. | ✅ |
| **Medición de Tiempos Reales** | Cronómetro de tramos del operario (Preparar/Producir/Pausar/Terminar); compara real vs. teórico → factor de utilización en `/rendimiento` + export CSV. | 🟡 Implementado; falta checklist E2E manual |
| **Dashboard de Producción** | Tablas espejo + estimación de días por proceso. | ✅ (depende de un sincronizador externo) |
| **Modelo de Costeo (cotizador)** | Costo de fabricación por unidad: MP + operaciones (tasa de planta × tiempo de ruta) + pintura + horno + depto técnico. | 🟠 Diseñado y validado en planilla; **no** implementado en la app todavía |

## 6. Restricciones críticas del proyecto (LEER)

1. **Red local solo IPv4** → la conexión directa de Prisma a Supabase falla. **NUNCA `prisma migrate`.** Todo cambio de schema se hace por el **SQL Editor de Supabase**. El pooler (puerto 6543) sí funciona.
2. **El runtime usa `supabase-js`**, no Prisma Client. El schema de Prisma es documentación.
3. **`npm run dev` siempre**; nunca `vercel dev`/`vercel env pull`.
4. **Sincronizador de fábrica**: las tablas `velum_*` del dashboard las refresca un script externo (corre en la máquina de la fábrica, lee MySQL del sistema viejo). Ese script vive **fuera de este repo**; si se renombran tablas, hay que actualizarlo.

## 7. Convenciones

- Lógica de negocio pura extraída a `app/src/lib/` y testeada (vitest). Ej.: `factores.ts`, `tramos.ts`, `registrar-progreso.ts`, cálculos de batches/conteo.
- El factor de utilización **se calcula on-demand, nunca se almacena**.
- Código y comentarios en español.

## 8. Pendientes / próximos pasos

- **Checklist E2E** del fichaje de tiempos (requiere login de operario con etapa activa).
- **Recolección de datos reales** de tramos (operarios piloto) → el factor de utilización emerge con `n` alto.
- **Cotizador en la app**: hoy el modelo vive en una planilla de validación. Próximo: tablas de parámetros + UI de cotización que lea de `CapacidadTeorica` + factores reales.
- **Catálogo de piezas estructurado**: reemplazar la carga de piezas por texto libre por un catálogo Sistema → Variante → Piezas (spec en `docs/superpowers/specs/`).
- **Motor de ruteo a "máquina libre del tipo"** (hoy cada ruta clava una máquina específica; hay 2 láseres y 2 plegadoras).

## 9. Documentación de referencia

En `docs/superpowers/specs/` están los specs de diseño y puntos de guardado de cada módulo (órdenes, tiempos reales, costeo, catálogo, dashboard). En `docs/referencias/` hay fichas técnicas de equipos.

> **Nota:** el spec del cotizador incluye datos de estructura de costos. Confirmar con el dueño del proyecto qué información de costos/RRHH se comparte antes de difundir.
