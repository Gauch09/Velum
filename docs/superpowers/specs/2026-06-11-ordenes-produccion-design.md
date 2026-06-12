# Módulo de Órdenes de Producción — Diseño

**Fecha:** 2026-06-11  
**Proyecto:** VELUM — Sistema de gestión de producción  
**Stack:** Next.js 14 App Router · TypeScript strict · Tailwind · Supabase REST · Vitest

---

## 1. Contexto y objetivo

VELUM ya gestiona el seguimiento de producción en planta (dashboards de Supervisor, Operario, Gerencia). Este módulo agrega la **creación estructurada de Órdenes de Producción** que hoy el técnico genera manualmente con software externo.

El sistema actual produce documentos físicos (PDFs impresos con código de barras) que los operarios usan en planta. VELUM reemplaza y supera ese flujo:
- Genera los mismos PDFs desde la app
- Agrega tracking digital: el operario escanea el QR y registra completados sin papel
- El Supervisor ve el avance en tiempo real

---

## 2. Tipos de documento

El sistema produce tres tipos de orden según el proceso:

| Tipo | Nombre | Procesos | Color hoja |
|------|--------|----------|------------|
| OPP | Orden de Producción Primaria | Corte Laser, Punzonadora, Fresadora | ROJO |
| OPS | Orden de Proceso Secundaria | Plegadora, Expansora | CELESTE |
| OPB Lavado | Orden de Proceso por Bach | Lavado | NARANJA |
| OPB Horno  | Orden de Proceso por Bach | Horno  | VERDE   |

Los IDs de pieza persisten a través de todos los documentos — una pieza creada en la OPP mantiene su ID en la OPS y en la OPB.

---

## 3. Flujo de producción

```
Fase 1 — Procesos individuales (top-down desde el diseño)
─────────────────────────────────────────────────────────
OPP: Corte Laser / Punzonadora / Fresadora
  → cantidades del BOM del técnico
  → lotes de chapa (OT): cuántas chapas físicas cargar en la máquina

OPS: Plegadora / Expansora
  → mismos IDs de pieza
  → lotes ergonómicos (~30 piezas/lote)
  → placeholder imagen (sketch de plegado)

Fase 2 — Procesos por bach (capacity-driven)
─────────────────────────────────────────────
OPB: Lavado
  → bach calculado: floor(capacidadLavado_m² / área_pieza_m²)

OPB: Horno
  → bach calculado: floor(capacidadHorno_m² / área_pieza_m²)
  → bach Horno > bach Lavado siempre

Pintado y Embalaje siguen al Horno sin documento propio (integrados al flujo existente de EjecucionEtapa).
```

El técnico crea la OPP y el sistema genera automáticamente las OPS para los procesos siguientes de la Fase 1. Los OPB de Fase 2 se generan cuando el Supervisor los emite (cuando hay piezas disponibles de la etapa anterior).

---

## 4. Modelo de datos

### Nuevas tablas

```sql
-- Orden primaria (cabecera del documento)
CREATE TABLE "OrdenPrimaria" (
  "id"          TEXT PRIMARY KEY,
  "numero"      INT NOT NULL UNIQUE,   -- auto-incremental global (382, 383...)
  "proyectoId"  TEXT REFERENCES "Proyecto"("id"),
  "tipo"        TEXT NOT NULL,         -- 'OPP' | 'OPS' | 'OPB'
  "equipo"      TEXT NOT NULL,         -- TipoMaquina enum
  "colorHoja"   TEXT NOT NULL,         -- 'ROJO' | 'CELESTE' | 'VERDE' | 'AMARILLO'
  "responsable" TEXT NOT NULL,
  "fecha"       DATE NOT NULL,
  "estado"      TEXT NOT NULL DEFAULT 'BORRADOR',  -- BORRADOR | EMITIDA | EN_PRODUCCION | COMPLETADA
  "creadoEn"    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Item de producción (los "ID de pieza" que viajan por toda la ruta)
CREATE TABLE "ItemProduccion" (
  "id"                  TEXT PRIMARY KEY,
  "ordenPrimariaId"     TEXT NOT NULL REFERENCES "OrdenPrimaria"("id"),
  "codigo"              INT NOT NULL,        -- secuencial global único entre todas las órdenes (1956, 1957...)
  "nombre"              TEXT NOT NULL,       -- "MultiSlim.O - 1322 - 1400mm"
  "material"            TEXT NOT NULL,       -- "Chapa Galv."
  "espesor"             FLOAT NOT NULL,      -- mm (0.7)
  "largo"               FLOAT NOT NULL,      -- mm
  "ancho"               FLOAT NOT NULL,      -- mm
  "cantidadTotal"       INT NOT NULL,
  "cantidadCompletada"  INT NOT NULL DEFAULT 0,
  "cantidadRehacer"     INT NOT NULL DEFAULT 0,
  "proximoProceso"      TEXT NOT NULL,       -- "Plegado" | "Control" | etc.
  "archivoDxfUrl"       TEXT,
  "imagenUrl"           TEXT,                -- sketch para OPS
  "notas"               TEXT,
  -- Calculados al guardar:
  "bachLavado"          INT,                 -- piezas por bach en lavado
  "bachHorno"           INT,                 -- piezas por bach en horno
  "creadoEn"            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE ("codigo")  -- global, no por orden
);

-- Lote de chapa (OT) — solo en OPP de Corte Laser
CREATE TABLE "LoteChapa" (
  "id"               TEXT PRIMARY KEY,
  "ordenPrimariaId"  TEXT NOT NULL REFERENCES "OrdenPrimaria"("id"),
  "codigo"           TEXT NOT NULL,     -- "2026.4\L16"
  "material"         TEXT NOT NULL,
  "colorChapa"       TEXT NOT NULL,     -- "Crudo"
  "medidaLargo"      FLOAT NOT NULL,    -- m (3.0)
  "medidaAncho"      FLOAT NOT NULL,    -- m (1.2)
  "espesor"          FLOAT NOT NULL,    -- mm
  "cantidadChapas"   INT NOT NULL,
  "creadoEn"         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Bach de proceso (Fase 2: Lavado y Horno)
CREATE TABLE "BatchProceso" (
  "id"                  TEXT PRIMARY KEY,
  "itemProduccionId"    TEXT NOT NULL REFERENCES "ItemProduccion"("id"),
  "proceso"             TEXT NOT NULL,   -- 'LAVADO' | 'HORNO'
  "numero"              INT NOT NULL,    -- 1, 2, 3...
  "cantidadPiezas"      INT NOT NULL,
  "cantidadCompletada"  INT NOT NULL DEFAULT 0,
  "cantidadRehacer"     INT NOT NULL DEFAULT 0,
  "estado"              TEXT NOT NULL DEFAULT 'PENDIENTE',  -- PENDIENTE | EN_PROCESO | COMPLETADO
  "completadoEn"        TIMESTAMPTZ,
  UNIQUE ("itemProduccionId", "proceso", "numero")
);

-- Capacidad de equipos de bach (singleton por tipo de equipo)
CREATE TABLE "ConfiguracionEquipo" (
  "tipo"          TEXT PRIMARY KEY,   -- 'LAVADO' | 'HORNO'
  "capacidadM2"   FLOAT NOT NULL,     -- metros cuadrados disponibles por corrida
  "actualizadoEn" TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO "ConfiguracionEquipo" ("tipo", "capacidadM2") VALUES
  ('LAVADO', 2.0),
  ('HORNO', 6.0);
```

### Cálculo de bach (lógica pura)

```typescript
// src/lib/calcularBach.ts
export function calcularBach(
  largo_mm: number,
  ancho_mm: number,
  capacidadM2: number
): number {
  const areaM2 = (largo_mm / 1000) * (ancho_mm / 1000)
  return Math.floor(capacidadM2 / areaM2)
}

// src/lib/generarBatches.ts  (archivo separado)
export function generarBatches(
  cantidadTotal: number,
  piezasPorBach: number
): Array<{ numero: number; cantidadPiezas: number }> {
  const batches = []
  let restante = cantidadTotal
  let numero = 1
  while (restante > 0) {
    batches.push({ numero, cantidadPiezas: Math.min(piezasPorBach, restante) })
    restante -= piezasPorBach
    numero++
  }
  return batches
}
```

### Sugerencia de conteo en OPP/OPS

```typescript
// src/lib/calcularSugerenciaConteo.ts
export function calcularSugerenciaConteo(
  cantidadTotal: number,
  maxPorLote: number = 30
): Array<number> {
  // Divide en lotes ≤ maxPorLote con distribución uniforme
  const nLotes = Math.ceil(cantidadTotal / maxPorLote)
  const base = Math.floor(cantidadTotal / nLotes)
  const resto = cantidadTotal % nLotes
  return Array.from({ length: nLotes }, (_, i) => (i < resto ? base + 1 : base))
}
```

---

## 5. Flujo de usuario — Wizard de creación

### Ruta: `/ordenes/nueva`

Wizard de 3 pasos con barra de progreso. Solo accesible para SUPERVISOR.

#### Paso 1 — Encabezado

| Campo | Tipo | Notas |
|-------|------|-------|
| Proyecto | Selector | Proyectos existentes en DB |
| Tipo de orden | Selector | OPP / OPS / OPB |
| Equipo | Selector | Filtrado por tipo seleccionado |
| Responsable | Texto libre | Ej: "ERIK" |
| Color de hoja | Selector | Auto-sugerido por equipo |
| Fecha | Date picker | Default: hoy |

Número de OP se asigna automáticamente al emitir (no en borrador).

#### Paso 2 — Piezas y lotes

**Panel superior (solo OPP):** gestión de LotesChapa (OT)
```
[+ Agregar lote]
OT: 2026.4\L16 | Chapa Galv. 3×1,2m | ESP: 0,7mm | 12 chapas  [editar] [×]
```

**Panel principal — Items de producción:**
```
[+ Agregar pieza]

ID 1956  MultiSlim.O - 1322 - 1400mm
  Mat: Chapa Galv. · 0,7mm · 1400×200mm · Necesarios: 48
  Bach Lavado: 20 piezas · Bach Horno: 60 piezas
  DXF: [subir]   Imagen: [subir]   [editar] [×]
```

Cada pieza se agrega/edita en un mini-modal con todos los campos de `ItemProduccion`. Al guardar, los bachs se calculan automáticamente con `calcularBach()`.

#### Paso 3 — Revisión y emisión

Vista previa del documento (layout similar al PDF final). El técnico puede:
- **Guardar como borrador** — sin número OP asignado, sin PDF
- **Emitir** — asigna número correlativo, genera PDF, habilita tracking digital

---

## 6. PDF generado

Generado server-side con `@react-pdf/renderer`. Un endpoint:  
`GET /api/ordenes-primarias/[id]/pdf`

### Estructura OPP

```
Header: Logo VELUM | OPP PRIMARIA | N/[numero] + barcode
        Fecha | Proyecto | Equipo | Responsable | Color

Body:
  Para cada LoteChapa:
    OT: [codigo]                          barcode
    Mat · Color · Medida · ESP · CANT
    Burbujas para marcar chapas (○ × CANT)
    Resumen: "ID×CANT / ID×CANT / ..."

  RESUMEN DE PIEZAS:
  Para cada ItemProduccion:
    ID [codigo]                           barcode
    PIEZA: [nombre]
    Mat · ESP · NOTAS
    NECESARIOS: X  COMPLETADOS: ___  REHACER: ___
    SUGERENCIA: N lotes de X piezas   ○X  ○X  ○X
    PROXIMO PROCESO: [proximoProceso]
```

### Estructura OPS

Igual que OPP excepto:
- Sin sección de LotesChapa (OT)
- Cada ItemProduccion tiene placeholder imagen derecha
- Lotes ergonómicos calculados con `calcularSugerenciaConteo()`

### Estructura OPB

```
Header: Logo VELUM | OPB | Proceso: LAVADO/HORNO | N/[numero] + barcode

Body:
  Para cada ItemProduccion:
    ID [codigo]                           barcode
    PIEZA: [nombre] · Mat · ESP
    NECESARIOS: X
    Para cada BatchProceso:
      ○  [numero] | [IDpieza] | [bach]    barcode
         CANT: X   COMPLETADOS: ___   REHACER: ___
```

### QR por pieza (mejora sobre el sistema actual)

Cada ID de pieza lleva un QR además del barcode:
```
velum.app/op/[numero]/item/[codigo]
```
El operario escanea → abre vista mobile-friendly → registra completados digitalmente.

---

## 7. Tracking digital

### Vista del operario (mobile-friendly)

Ruta: `/op/[numero]/item/[codigo]`

```
ID 1956 — MultiSlim.O 1322 - 1400mm
Necesarios: 48

Completados  [  -  ]  [ 32 ]  [  +  ]
Rehacer      [  -  ]  [  2 ]  [  +  ]

[Guardar]
```

Actualiza `ItemProduccion.cantidadCompletada` y `cantidadRehacer`.

Para OPB, la vista muestra el bach específico:
```
Bach 2 de 3 — Lavado
ID 1956 — MultiSlim.O 1322 - 1400mm
Cantidad: 20

[Completado]  [Rehacer: ___]
```

### Dashboard Supervisor — sección Órdenes Primarias

Nueva sección en el sidebar: **Órdenes Primarias**

Lista de OPs con filtros (proyecto, estado, fecha). Al expandir una OP:

```
OP 382 — ERIK — Corte Laser — EMITIDA — 20/04/2026
  ID 1956  MultiSlim.O 1400mm   ████████░░  67% (32/48)
  ID 1957  MultiSlim.O  800mm   ░░░░░░░░░░   0% (0/24)
```

---

## 8. Configuración de equipos de bach

Nueva sección en `ConfiguracionModal` (existente) o modal propio:

```
Capacidad Máquina de Lavado:  [2.0] m²
Capacidad Horno:              [6.0] m²
```

Solo SUPERVISOR puede modificar. Los cambios aplican a nuevas órdenes (no retroactivo).

---

## 9. Archivos adjuntos

Los DXF y archivos de imagen se suben a **Supabase Storage** bucket `ordenes-produccion`. URLs guardadas en `ItemProduccion.archivoDxfUrl` e `ItemProduccion.imagenUrl`. El PDF generado también se persiste en Storage al emitir.

---

## 10. Tests requeridos

```
src/lib/calcularBach.ts
  - piezas pequeñas dan bach grande
  - piezas grandes dan bach 1
  - area exacta da bach exacto

src/lib/calcularSugerenciaConteo.ts
  - cantidad divisible → lotes iguales
  - cantidad no divisible → distribución uniforme
  - cantidad menor al máximo → un solo lote

src/lib/generarBatches.ts
  - genera cantidad correcta de bachs
  - último bach tiene el resto
  - cantidadTotal = suma de todos los bachs
```

---

## 11. Páginas y componentes nuevos

```
app/src/
  app/
    (supervisor)/
      ordenes/
        nueva/page.tsx              ← wizard creación
        page.tsx                    ← lista de OPs
      op/[numero]/item/[codigo]/
        page.tsx                    ← vista mobile tracking operario
    api/
      ordenes-primarias/
        route.ts                    ← GET list, POST create
        [id]/route.ts               ← GET, PATCH, DELETE
        [id]/emitir/route.ts        ← POST → asigna numero, genera PDF
        [id]/pdf/route.ts           ← GET → devuelve PDF
      items-produccion/
        [id]/progreso/route.ts      ← PATCH cantidadCompletada/Rehacer
      batch-proceso/
        route.ts                    ← POST crear batches
        [id]/route.ts               ← PATCH estado/completada
      configuracion-equipo/
        route.ts                    ← GET, PATCH capacidades

  components/
    supervisor/
      NuevaOrdenPrimariaWizard.tsx  ← wizard 3 pasos
      ItemProduccionForm.tsx        ← mini-modal agregar/editar pieza
      LoteChapaForm.tsx             ← mini-modal agregar/editar OT
      OrdenPrimariaCard.tsx         ← card en lista con progreso por item
    shared/
      OrdenPrimariaTracker.tsx      ← vista mobile para operario
  lib/
    calcularBach.ts
    calcularSugerenciaConteo.ts
    generarBatches.ts
  tests/lib/
    calcularBach.test.ts
    calcularSugerenciaConteo.test.ts
    generarBatches.test.ts
```

---

## 12. Constraints del proyecto

- **NUNCA** correr `prisma migrate` — todos los cambios de schema vía SQL Editor de Supabase
- Queries con `@supabase/supabase-js` REST únicamente
- IDs siempre con `createId()` de `@paralleldrive/cuid2`
- Auth pattern: `createSupabaseServerClient()` para auth, `createSupabaseAdminClient()` para datos
- PDF generado server-side con `@react-pdf/renderer`
- Archivos adjuntos → Supabase Storage bucket `ordenes-produccion`
