# VELUM Producción · Handoff para Claude Code
> Documento autocontenido. Claude Code debe leer SOLO este archivo para arrancar.
> No requiere contexto previo de ninguna conversación.

---

## 0. Qué es este proyecto

Sistema de gestión de producción para **VELUM Studio SAS** (fábrica de revestimientos metálicos, Santa Fe, Argentina). Reemplaza un sistema heredado de pantallas HTML con `localStorage`. El objetivo es migrar a una base de datos central compartida (Supabase/Postgres) con sincronización en tiempo real entre todos los dispositivos de la fábrica, manteniendo exactamente la misma lógica operativa que las pantallas actuales.

**Decisión de diseño fundamental:** la realidad operativa la definen las pantallas `.dc.html` (construidas con los operarios). El repo Next.js aporta la infraestructura. No se debate el modelo operativo: se porta.

---

## 1. Stack y restricciones críticas

```
Frontend:  Next.js 14 App Router · TypeScript strict · Tailwind CSS · React 18
Backend:   Supabase (PostgreSQL) — REST via supabase-js (NO Prisma en runtime)
Auth:      Supabase Auth con guards por rol
Realtime:  Supabase Broadcast
Deploy:    Vercel
Tests:     Vitest (unitarios) · Playwright (E2E)
```

### Restricciones que NO se pueden ignorar:
1. **NUNCA correr `prisma migrate dev`, `prisma migrate reset`, `prisma db push`** desde local. La red local de la fábrica es solo IPv4 y la conexión directa de Prisma falla. Todos los cambios de schema van por el **SQL Editor de Supabase**.
2. El runtime usa **`supabase-js`** únicamente, no Prisma Client. `schema.prisma` es solo documentación.
3. Siempre `npm run dev`, nunca `vercel dev` ni `vercel env pull` (sobrescriben `.env.local`).
4. IDs: usar siempre `createId()` de `@paralleldrive/cuid2` en inserts del lado servidor.
5. Auth pattern obligatorio en cada API route:
```typescript
const supabaseAuth = createSupabaseServerClient()
const { data: { user } } = await supabaseAuth.auth.getUser()
if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
const supabase = createSupabaseAdminClient() as any
const { data: usuario } = await supabase
  .from('Usuario').select('rol').eq('email', user.email!).single()
```

---

## 2. Estructura del repo (carpeta `app/`)

```
app/
├── prisma/
│   └── schema.prisma          ← solo documentación, no se usa en runtime
├── src/
│   ├── lib/
│   │   ├── supabase-server.ts
│   │   ├── supabase-admin.ts
│   │   ├── supabase-browser.ts
│   │   ├── calcularBach.ts    ← conservar
│   │   ├── calcularSugerenciaConteo.ts ← conservar
│   │   ├── tramos.ts          ← conservar (fichaje de tiempos)
│   │   ├── factores.ts        ← conservar
│   │   └── registrar-progreso.ts ← reemplazar con nueva lógica
│   ├── types/index.ts
│   └── app/
│       ├── api/               ← todos los endpoints
│       ├── (auth)/login/
│       ├── (operario)/
│       ├── (supervisor)/
│       └── (gerencia)/
```

---

## 3. Roles del sistema

| Rol Supabase | Personas | Acceso |
|---|---|---|
| `SUPERVISOR` | Luciano, Germán, Mariu, Joaquín, Juani, PC Oficina | Todo |
| `OPERARIO` | Alexis, Fran, Lionel, Erick, Javier | Estación + TV |
| `GERENCIA` | (futuro) | Vista ejecutiva |

**Lista canónica de usuarios a crear en Supabase Auth:**
```
Oficina (SUPERVISOR):
  luciano   → Luciano   → color #E0A56A
  german    → Germán    → color #5FB87E
  mariu     → Mariu     → color #E76A95
  joaquin   → Joaquín   → color #8CB7E8
  juani     → Juani     → color #C9B79A
  pc_oficina → PC Oficina → color #6E7E85

Planta (OPERARIO):
  alexis  → Alexis → color #E5A52B
  fran    → Fran   → color #21C7D6
  lionel  → Lionel → color #9B82DC
  erick   → Erick  → color #F0814F
  javier  → Javier → color #4FB870
  pc_planta → PC Planta → color #6E7E85
```
Emails: `{id}@velum.local` (ej: `luciano@velum.local`). Passwords provisorios.

---

## 4. Modelo de datos canónico

### 4.1 Máquinas del taller (hardcodeado, es el canon)
```typescript
const MACHINES = [
  { id:'laser',     name:'Láser CNC',   color:'#21C7D6', on:'#0C2226', units:2,
    unitNames:['LEAPION','BODOR'] },
  { id:'plegadora', name:'Plegadora',   color:'#E5A52B', on:'#23190A', units:2,
    unitNames:['DERATECH','HUAXIA'] },   // ⚠️ HUAXIA, no MUAXIA
  { id:'punzon',    name:'Punzonadora', color:'#9B82DC', on:'#FFFFFF', units:1 },
  { id:'fresa',     name:'Fresa CNC',   color:'#3E7CE0', on:'#FFFFFF', units:1 },
  { id:'expansora', name:'Expansora',   color:'#F0814F', on:'#2A1107', units:1 },
  { id:'pintura',   name:'Pintura',     color:'#E76A95', on:'#FFFFFF', units:1 },
  { id:'embalado',  name:'Embalado',    color:'#C9B79A', on:'#23190A', units:1 },
]
// Key de MaquinaEstado:
// máquina con 2 unidades: "laser|LEAPION", "laser|BODOR", "plegadora|DERATECH", "plegadora|HUAXIA"
// máquina con 1 unidad:   "punzon", "fresa", "expansora", "pintura", "embalado"
```

### 4.2 Mapeo de capacidades (⚠️ nombres históricos, no renombrar)
```
machineId   → campo en Capacidad
laser       → laser       (u/h)
plegadora   → plegado     (u/h) ← campo histórico, corresponde a PLEGADORA
punzon      → fresado     (u/h) ← campo histórico, corresponde a PUNZONADORA
pintura     → pintura     (u/percha; 10 perchas = 3 h)
embalado    → embalado    (u/h)
fresa       → (sin ritmo cargado)
expansora   → (sin ritmo cargado)
```
En la UI siempre mostrar el nombre correcto de la máquina, no el nombre del campo.

---

## 5. SQL a ejecutar en Supabase (en orden)

```sql
-- ══════════════════════════════════════════════════════════════
-- TABLAS DEL MODELO OPERATIVO VELUM
-- Ejecutar en SQL Editor de Supabase, en este orden exacto
-- ══════════════════════════════════════════════════════════════

-- 5.1 Usuario (extiende Supabase Auth)
CREATE TABLE IF NOT EXISTS "Usuario" (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  nombre      TEXT NOT NULL,
  email       TEXT UNIQUE NOT NULL,
  rol         TEXT NOT NULL CHECK (rol IN ('OPERARIO','SUPERVISOR','GERENCIA')),
  color       TEXT,
  slug        TEXT UNIQUE,     -- "luciano", "alexis", etc.
  area        TEXT CHECK (area IN ('Oficina','Planta')),
  "maquinaId" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5.2 Proyectos (datos comerciales del proyecto)
CREATE TABLE IF NOT EXISTS "Proyecto" (
  id             TEXT PRIMARY KEY,   -- "cust{timestamp}"
  "createdTs"    BIGINT NOT NULL DEFAULT extract(epoch from now())*1000,
  nombre         TEXT NOT NULL,
  producto       TEXT,
  contacto       TEXT,
  tel            TEXT,
  lugar          TEXT,
  urgencia       TEXT NOT NULL DEFAULT 'NORMAL'
                 CHECK (urgencia IN ('ALTA','MEDIA','NORMAL')),
  pago           TEXT NOT NULL DEFAULT 'IMPAGO'
                 CHECK (pago IN ('IMPAGO','SEÑA','PAGADO')),
  montaje        BOOLEAN NOT NULL DEFAULT false,
  pintado        BOOLEAN NOT NULL DEFAULT false,
  "colorName"    TEXT,
  material       TEXT,
  "fechaEntrega" TIMESTAMPTZ,
  archivado      BOOLEAN NOT NULL DEFAULT false,
  "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5.3 Piezas (hijas de Proyecto — el corazón del sistema)
CREATE TABLE IF NOT EXISTS "Pieza" (
  id             TEXT PRIMARY KEY,   -- "n{timestamp}"
  "proyectoId"   TEXT NOT NULL REFERENCES "Proyecto"(id) ON DELETE CASCADE,
  pieza          TEXT NOT NULL,      -- "COSTILLA 1500" (nombre display y de búsqueda)
  archivo        TEXT NOT NULL,      -- nombre archivo de corte
  material       TEXT,               -- "Acero 1,6 mm"
  "matName"      TEXT,               -- "Acero"
  esp            TEXT,               -- "1.6"
  ppc            NUMERIC NOT NULL DEFAULT 1,       -- piezas por chapa
  "objChapas"    NUMERIC NOT NULL DEFAULT 1,       -- ⚠️ NUMERIC no INTEGER (acepta 7.5)
  "objUni"       NUMERIC NOT NULL DEFAULT 1,       -- unidades necesarias
  lote           INTEGER NOT NULL DEFAULT 20,      -- piezas por lote
  paquete        INTEGER NOT NULL DEFAULT 5,       -- piezas por paquete (downstream)
  procesos       TEXT[] NOT NULL DEFAULT '{"laser"}', -- ⚠️ ORDEN IMPORTA
  prog           JSONB NOT NULL DEFAULT '{}',      -- { "laser": 6.5, "plegadora": 4 }
  chapas         NUMERIC NOT NULL DEFAULT 0,       -- alias de prog[procesos[0]]
  retazo         NUMERIC NOT NULL DEFAULT 0,
  fallas         INTEGER NOT NULL DEFAULT 0,
  "fallasProc"   JSONB NOT NULL DEFAULT '{}',      -- { "laser": 1 }
  pintado        BOOLEAN NOT NULL DEFAULT false,
  "sortOrder"    INTEGER NOT NULL DEFAULT 0,
  "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "Pieza_proyectoId_idx" ON "Pieza"("proyectoId");

-- 5.4 Avance por proyecto (caché recalculada automáticamente)
CREATE TABLE IF NOT EXISTS "ProyectoAvance" (
  "proyectoId"  TEXT PRIMARY KEY REFERENCES "Proyecto"(id) ON DELETE CASCADE,
  pct           NUMERIC NOT NULL DEFAULT 0,
  "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5.5 Historial de marcas (append-only, nunca se borra)
CREATE TABLE IF NOT EXISTS "MarcaHistorial" (
  id            BIGSERIAL PRIMARY KEY,
  ts            BIGINT NOT NULL,
  "dateKey"     TEXT NOT NULL,       -- "2026-06-22"
  hour          SMALLINT NOT NULL,
  dow           SMALLINT NOT NULL,   -- 0=dom, 1=lun...
  "proyectoId"  TEXT NOT NULL,
  proyecto      TEXT NOT NULL,       -- nombre (denormalizado para reportes)
  "machineId"   TEXT NOT NULL,       -- "laser"|"plegadora"|etc.
  unit          TEXT NOT NULL,       -- "LEAPION"|"BODOR"|"DERATECH"|"HUAXIA"|""
  "piezaId"     TEXT NOT NULL,
  pieza         TEXT NOT NULL,       -- nombre (denormalizado)
  field         TEXT NOT NULL,       -- "chapas"|"retazo"
  kind          TEXT NOT NULL CHECK (kind IN ('chapa','retazo','falla')),
  delta         NUMERIC NOT NULL,
  pieces        NUMERIC NOT NULL,    -- delta × ppc
  "usuarioId"   TEXT,                -- quién marcó (de Supabase Auth)
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "MarcaHistorial_dateKey_idx" ON "MarcaHistorial"("dateKey");
CREATE INDEX IF NOT EXISTS "MarcaHistorial_proyectoId_idx" ON "MarcaHistorial"("proyectoId");
CREATE INDEX IF NOT EXISTS "MarcaHistorial_machineId_idx" ON "MarcaHistorial"("machineId");

-- 5.6 Capacidades por producto (⚠️ YA TIENE DATOS REALES — no hacer seed vacío)
CREATE TABLE IF NOT EXISTS "Capacidad" (
  id        TEXT PRIMARY KEY,
  nombre    TEXT NOT NULL UNIQUE,  -- debe coincidir EXACTAMENTE con Pieza.pieza
  "enChapa" NUMERIC NOT NULL DEFAULT 0,
  lote      INTEGER NOT NULL DEFAULT 20,
  paquete   INTEGER NOT NULL DEFAULT 5,
  laser     NUMERIC NOT NULL DEFAULT 0,    -- u/h → machineId "laser"
  plegado   NUMERIC NOT NULL DEFAULT 0,    -- u/h → machineId "plegadora" (nombre histórico)
  fresado   NUMERIC NOT NULL DEFAULT 0,    -- u/h → machineId "punzon" (nombre histórico)
  pintura   NUMERIC NOT NULL DEFAULT 0,    -- u/percha (10 perchas = 3h)
  embalado  NUMERIC NOT NULL DEFAULT 0,    -- u/h
  material  TEXT,
  ancho     NUMERIC,    -- mm
  alto      NUMERIC,    -- mm
  esp       TEXT,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5.7 Estado de máquinas (fuera de servicio)
CREATE TABLE IF NOT EXISTS "MaquinaEstado" (
  key         TEXT PRIMARY KEY,  -- "laser|LEAPION"|"plegadora|HUAXIA"|"punzon"|etc.
  motivo      TEXT NOT NULL DEFAULT 'Sin especificar',
  maquina     TEXT NOT NULL,     -- display: "Láser CNC · LEAPION"
  ts          BIGINT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5.8 Tareas de oficina
CREATE TABLE IF NOT EXISTS "Tarea" (
  id          TEXT PRIMARY KEY,
  proyecto    TEXT,
  tarea       TEXT NOT NULL,
  resp        TEXT[] NOT NULL DEFAULT '{}',    -- slugs: ["luciano","juani"]
  prioridad   TEXT NOT NULL DEFAULT 'Media'
              CHECK (prioridad IN ('Urgente','Alta','Media','Baja')),
  estado      TEXT NOT NULL DEFAULT 'Sin iniciar'
              CHECK (estado IN ('Sin iniciar','En curso','Hecho')),
  obs         TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5.9 Stock de chapas (materia prima)
CREATE TABLE IF NOT EXISTS "StockChapa" (
  id          TEXT PRIMARY KEY,
  material    TEXT NOT NULL,
  espesor     TEXT NOT NULL,
  dimension   TEXT NOT NULL,
  terminacion TEXT,
  chapas      NUMERIC NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5.10 Consumibles
CREATE TABLE IF NOT EXISTS "Consumible" (
  id        TEXT PRIMARY KEY,
  nombre    TEXT NOT NULL,
  categoria TEXT,
  stock     NUMERIC NOT NULL DEFAULT 0,
  unidad    TEXT,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5.11 Avisos del TV de planta
CREATE TABLE IF NOT EXISTS "Aviso" (
  id        TEXT PRIMARY KEY,
  text      TEXT NOT NULL,
  ts        BIGINT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5.12 Faltantes del taller (cargados por operarios)
CREATE TABLE IF NOT EXISTS "Faltante" (
  id      TEXT PRIMARY KEY,
  text    TEXT NOT NULL,
  maquina TEXT,
  ts      BIGINT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5.13 Habilitar Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE "Pieza";
ALTER PUBLICATION supabase_realtime ADD TABLE "ProyectoAvance";
ALTER PUBLICATION supabase_realtime ADD TABLE "MarcaHistorial";
ALTER PUBLICATION supabase_realtime ADD TABLE "Aviso";
ALTER PUBLICATION supabase_realtime ADD TABLE "Faltante";
ALTER PUBLICATION supabase_realtime ADD TABLE "MaquinaEstado";
```

---

## 6. Lógica de negocio crítica (portar exactamente)

### 6.1 Motor de avance — el más importante
```typescript
// Progreso actual de una pieza en un proceso dado
function progOf(pieza: Pieza, machineId: string): number {
  return pieza.prog[machineId] ?? (machineId === pieza.procesos[0] ? pieza.chapas : 0)
}

// Capacidad disponible para el proceso actual
// El proceso i solo puede avanzar hasta lo que entregó el proceso i-1
function capOf(pieza: Pieza, machineId: string): number {
  const idx = pieza.procesos.indexOf(machineId)
  if (idx <= 0) return pieza.objChapas           // primer proceso: tope = objetivo
  const prev = pieza.procesos[idx - 1]
  return Math.min(pieza.objChapas, progOf(pieza, prev)) // limitado por el anterior
}

// Aplicar marca (POST /api/piezas/[id]/progreso)
function aplicarMarca(pieza: Pieza, machineId: string, delta: number): Partial<Pieza> {
  const cur = progOf(pieza, machineId)
  const cap = capOf(pieza, machineId)
  const nv = Math.max(0, Math.min(cap, Math.round((cur + delta) * 10) / 10))
  const applied = nv - cur
  const prog = { ...pieza.prog, [machineId]: nv }
  const esPrimero = machineId === pieza.procesos[0]
  return { prog, ...(esPrimero ? { chapas: nv } : {}) }
  // también retornar applied para saber cuánto se registró realmente
}
```

### 6.2 Lotes y paquetes
```typescript
// Lote: unidad de producción del primer proceso
const objUni = pieza.objChapas * pieza.ppc
const fullLotes = Math.floor(objUni / pieza.lote)
const lotesHechos = Math.floor((chapasActuales * pieza.ppc) / pieza.lote)

// Paquete: subdivisión para procesos downstream (plegadora en adelante)
const paqTot = Math.ceil(objUni / pieza.paquete)
const paqHechos = Math.floor((chapasActuales * pieza.ppc) / pieza.paquete)

// Botón +1 en proceso 0 = +1 chapa
// Botón +1 en procesos i>0 = +1 paquete = +(paquete / ppc) chapas equivalentes
```

### 6.3 Avance global del proyecto (para ProyectoAvance.pct)
```typescript
function calcularPctProyecto(piezas: Pieza[]): number {
  let totWork = 0, doneWork = 0
  for (const f of piezas) {
    const objU = f.objChapas * f.ppc
    for (let i = 0; i < f.procesos.length; i++) {
      const pid = f.procesos[i]
      let done = progOf(f, pid)
      if (i > 0) done = Math.min(done, progOf(f, f.procesos[i-1]))
      doneWork += Math.min(objU, done * f.ppc)
      totWork += objU
    }
  }
  return totWork > 0 ? Math.min(100, Math.round(doneWork / totWork * 100)) : 0
}
```

### 6.4 Estado de máquina fuera de servicio (para Tiempos)
```typescript
// Cuando una unidad está fuera, se descuenta de la capacidad disponible
// Si LEAPION está fuera: el láser tiene n=1 en vez de n=2
// Si ambas unidades están fuera: n=0, días = Infinity

function capacidadEfectiva(machineId: string, maqEstado: Record<string, any>): number {
  const M = MACHINES.find(m => m.id === machineId)!
  if (M.units === 1) return maqEstado[machineId] ? 0 : 1
  let fuera = 0
  for (const u of M.unitNames!) {
    if (maqEstado[`${machineId}|${u}`]) fuera++
  }
  return M.units - fuera
}
```

---

## 7. APIs a construir

### Estructura de rutas
```
app/src/app/api/
├── proyectos/
│   ├── route.ts                    GET (lista activos) / POST (nuevo)
│   └── [id]/
│       ├── route.ts                GET / PATCH / DELETE
│       └── archivar/route.ts       POST (toggle archivar)
├── piezas/
│   ├── route.ts                    GET ?proyectoId= / POST
│   └── [id]/
│       ├── route.ts                PATCH (editar) / DELETE
│       └── progreso/route.ts       POST (marcar chapa/retazo/falla) ← CRÍTICO
├── historial/route.ts              GET ?dateKey=&machineId=&proyectoId=
├── capacidades/
│   ├── route.ts                    GET (lista completa)
│   └── [id]/route.ts               PATCH (actualizar ritmo)
├── avance/route.ts                 GET → { [proyectoId]: pct }
├── maquinas-estado/
│   ├── route.ts                    GET (todas las fuera) / POST (marcar fuera)
│   └── [key]/route.ts              DELETE (volver a servicio)
├── tareas/
│   ├── route.ts                    GET / POST
│   └── [id]/route.ts               PATCH / DELETE
├── stock/
│   ├── route.ts                    GET / POST
│   └── [id]/route.ts               PATCH / DELETE
├── consumibles/
│   ├── route.ts                    GET / POST
│   └── [id]/route.ts               PATCH / DELETE
├── avisos/
│   ├── route.ts                    GET / POST
│   └── [id]/route.ts               DELETE
└── faltantes/
    ├── route.ts                    GET / POST
    └── [id]/route.ts               DELETE
```

### Endpoint más crítico: POST /api/piezas/[id]/progreso
```typescript
// Body:
{
  machineId: string      // "laser" | "plegadora" | etc.
  unit: string           // "LEAPION" | "HUAXIA" | "" (para máquinas de 1 unidad)
  kind: 'chapa' | 'retazo' | 'falla'
  delta: number          // chapas (+1, +0.5), piezas de retazo, o 1 para falla
}

// Lógica del servidor (en orden):
// 1. Verificar auth
// 2. Leer pieza actual de Supabase
// 3. Calcular nuevo prog usando aplicarMarca() (sección 6.1)
// 4. Si kind === 'falla': actualizar fallasProc[machineId]++ y fallas++
// 5. Actualizar Pieza en Supabase (prog, chapas, fallas, fallasProc)
// 6. INSERT en MarcaHistorial con todos los campos
// 7. Recalcular y UPDATE ProyectoAvance.pct
// 8. Broadcast en canal 'velum-prod' → evento 'pieza:update'
// 9. Return { prog, chapas, pct }
```

---

## 8. Realtime

```typescript
// Canal único: 'velum-prod'
// Eventos:
//   'pieza:update'      → payload: { proyectoId, piezaId }
//   'avance:update'     → payload: { proyectoId, pct }
//   'aviso:change'      → payload: {}
//   'faltante:change'   → payload: {}
//   'maquina:estado'    → payload: { key, fuera: boolean }

// Pattern en cada página cliente:
const supabase = createSupabaseBrowserClient()
useEffect(() => {
  const ch = supabase.channel('velum-prod')
    .on('broadcast', { event: 'pieza:update' }, () => router.refresh())
    .on('broadcast', { event: 'avance:update' }, () => router.refresh())
    .subscribe()
  return () => { supabase.removeChannel(ch) }
}, [])
```

---

## 9. Rutas de la app (App Router groups)

```
app/src/app/
├── (auth)/login/page.tsx           ← ya existe, mantener
├── (operario)/
│   ├── layout.tsx                  ← guard: solo OPERARIO y SUPERVISOR
│   └── estacion/page.tsx           ← NUEVO (reemplaza Estacion_Tarjetas_dc.html)
├── (supervisor)/
│   ├── layout.tsx                  ← guard: solo SUPERVISOR
│   ├── dashboard/page.tsx          ← REEMPLAZAR con Dashboard_Oficina_dc.html
│   ├── gestion/page.tsx            ← NUEVO (Gestion_Resumen_dc.html)
│   ├── capacidad/page.tsx          ← NUEVO (Capacidad_dc.html)
│   ├── tiempos/page.tsx            ← NUEVO (Tiempos_dc.html)
│   ├── ocupacion/page.tsx          ← NUEVO (Ocupacion_dc.html)
│   ├── tareas/page.tsx             ← NUEVO (Tareas_dc.html)
│   └── insumos/page.tsx            ← NUEVO (Materia_Prima_dc.html)
├── (tv)/
│   ├── layout.tsx                  ← SIN AUTH (acceso libre por IP)
│   └── page.tsx                    ← NUEVO (TV_Bloques_con_Embalado_dc.html)
└── page.tsx                        ← login redirect
```

El middleware ya existe. Agregar excepción para `/(tv)/*` (acceso sin auth).

---

## 10. Pantallas por rol y sus fuentes de datos

### 10.1 Estación de máquina — operario
**Fuente original:** `Estacion_Tarjetas_dc.html`
**Rol:** OPERARIO + SUPERVISOR
**Lee:** `GET /api/proyectos`, `GET /api/piezas?proyectoId=`, `GET /api/capacidades`
**Escribe:** `POST /api/piezas/[id]/progreso`, `POST /api/faltantes`, `POST /api/maquinas-estado`
**Features clave:**
- Selector de máquina activa (7 máquinas con sus unidades)
- Selector de proyecto activo
- 5 layouts intercambiables: Lista / Tarjetas / Grilla / Kiosco / Proyecto
- Para láser (proceso 0): muestra chapas, botones +1 / -1 / +½ / calculadora retazo / ✓ listo
- Para downstream (plegadora, pintura, etc.): muestra lotes/paquetes recibidos del anterior
- Botón "⛔ Fuera de servicio" con modal de motivo
- Panel lateral de "Faltantes del taller" (🔧)
- Panel de registros con deshacer (últimas 30 marcas en sesión)
- Si machineId === 'pintura' y el proyecto es pintado: muestra banner con el código RAL
- Color de acento cambia según la máquina activa
- Realtime: recarga cuando otro dispositivo modifica el mismo proyecto

### 10.2 Panel de oficina — supervisor
**Fuente original:** `Dashboard_Oficina_dc.html`
**Rol:** SUPERVISOR
**Lee:** `GET /api/proyectos`, `GET /api/avance`, `GET /api/stock`, `GET /api/capacidades`, `GET /api/avisos`, `GET /api/maquinas-estado`
**Escribe:** `POST /api/proyectos`, `PATCH /api/proyectos/[id]`, `POST /api/proyectos/[id]/archivar`, `POST /api/avisos`, `DELETE /api/avisos/[id]`
**Features clave:**
- Formulario de nuevo proyecto: nombre, lugar, contacto, tel, producto, material, urgencia (ALTA/MEDIA/NORMAL), pago (IMPAGO/SEÑA/PAGADO), montaje bool, pintado bool + color RAL, fecha de entrega
- Vista de tarjetas por proyecto con % de avance, barra de urgencia, estado de pago, días restantes
- Al hacer clic en un proyecto → panel de detalle con piezas y avance por proceso
- Detalle incluye botón "Exportar estado" (genera PDF)
- Modal de confirmación para archivar proyecto (no usa `confirm()` del browser)
- Carga de piezas por proyecto (sugiere desde Capacidades)
- Avisos para el TV de planta (crear/borrar)
- Badge de alerta si hay máquinas fuera de servicio
- Grid de proyectos con scroll (sin cálculo de escala fija)

### 10.3 Gestión de producción — jefe de planta
**Fuente original:** `Gestion_Resumen_dc.html`
**Rol:** SUPERVISOR
**Lee:** `GET /api/proyectos`, `GET /api/piezas`, `GET /api/historial`, `GET /api/capacidades`, `GET /api/maquinas-estado`
**Escribe:** solo lectura
**Features clave:**
- Resumen de avance por proceso de todos los proyectos activos
- Tiempo estimado vs. fecha de entrega (semáforo de riesgo)
- Banner animado si hay máquinas fuera de servicio
- Historial de marcas del día (chapas por máquina)
- Ocupación actual de cada máquina (% del día)

### 10.4 Monitor TV de planta
**Fuente original:** `TV_Bloques_con_Embalado_dc.html`
**Rol:** Público (sin auth, acceso por IP interna)
**Lee:** `GET /api/avance`, `GET /api/piezas`, `GET /api/avisos`, `GET /api/maquinas-estado`
**Escribe:** nada
**Features clave:**
- Grid de máquinas (una tarjeta por máquina)
- Cada tarjeta muestra: qué proyecto está haciendo, qué pieza, avance en lotes/paquetes
- Si la máquina está fuera de servicio: muestra "FUERA DE SERVICIO" + motivo en rojo
- Si solo una unidad está fuera (parcial): badge naranja con qué unidad
- Si la máquina está inactiva: tarjeta apagada (grayscale)
- Panel de avisos: rojo parpadeando si hay avisos, gris apagado si no hay
- Reloj en tiempo real
- Realtime: actualiza automáticamente cuando cambia el estado

### 10.5 Capacidad y tiempos — supervisor
**Fuente original:** `Capacidad_dc.html` y `Tiempos_dc.html`
**Rol:** SUPERVISOR
**Lee/Escribe:** `GET/PATCH /api/capacidades`, `GET /api/proyectos`, `GET /api/piezas`, `GET /api/maquinas-estado`
**Features clave (Capacidad):**
- Tabla editable de ritmos por producto/máquina (inline editing)
- Muestra horas disponibles por día (configurable)
- Calcula cuántas unidades se hacen por jornada en cada máquina
- ⚠️ Datos reales ya cargados — esta pantalla NO debe arrancar vacía

**Features clave (Tiempos):**
- Para el conjunto de proyectos activos: calcula días de fabricación por máquina
- Si una máquina está fuera de servicio: descuenta esa unidad de la capacidad
- Si n=0 (todas las unidades fuera): muestra ∞ días y color rojo
- Exportar PDF: tabla de carga + Gantt por máquina
- Gantt horizontal mostrando solapamiento entre proyectos

### 10.6 Ocupación de máquinas
**Fuente original:** `Ocupacion_dc.html`
**Rol:** SUPERVISOR
**Lee:** `GET /api/historial`, `GET /api/capacidades`
**Escribe:** nada
**Features clave:**
- Heatmap de actividad por hora (7-16h) y por día/semana/mes
- % de ocupación por máquina vs. capacidad teórica
- Días hábiles = lunes a viernes únicamente
- Exportar PDF con tabla de ocupación + gráfico de barras
- Botón de "limpiar demo" si hay datos de prueba

### 10.7 Insumos (materia prima y consumibles)
**Fuente original:** `Materia_Prima_dc.html`
**Rol:** SUPERVISOR
**Lee/Escribe:** `GET/POST/PATCH/DELETE /api/stock`, `GET/POST/PATCH/DELETE /api/consumibles`, `GET /api/piezas`
**Features clave:**
- Tab "Materia prima": stock de chapas por material/espesor/dimensión
- Calcula demanda desde piezas de proyectos activos → muestra saldo (stock - demanda)
- Tab "Consumibles": lista de fijaciones, pintura, etc. con stock
- Exportar PDF: planilla imprimible para contar chapas en planta

### 10.8 Tareas de oficina
**Fuente original:** `Tareas_dc.html`
**Rol:** SUPERVISOR
**Lee/Escribe:** `GET/POST/PATCH/DELETE /api/tareas`, `GET /api/proyectos`
**Features clave:**
- Tabla de tareas con proyecto, responsables (multi), prioridad, estado, observaciones
- Inline editing de todos los campos
- Filtro por responsable

---

## 11. Qué conservar del repo actual

| Archivo | Acción | Razón |
|---|---|---|
| `src/lib/supabase-*.ts` | ✅ Conservar | Funciona |
| `src/middleware.ts` | ✅ Conservar + agregar excepción TV | Funciona |
| `src/app/(auth)/login/` | ✅ Conservar | Funciona |
| `calcularBach.ts` | ✅ Conservar | Útil para lotes de lavado/horno |
| `calcularSugerenciaConteo.ts` | ✅ Conservar | Útil para sugerir lotes |
| `tramos.ts` / `factores.ts` | ✅ Conservar | Fichaje de tiempos (convive) |
| `src/app/(supervisor)/rendimiento/` | ✅ Conservar | Fichaje de tiempos |
| `src/app/api/tramos/` | ✅ Conservar | Fichaje de tiempos |
| `src/app/api/ordenes*` | ⚠️ Deprecar gradual | Reemplazado por el nuevo modelo |
| `src/app/api/ejecuciones/` | ⚠️ Deprecar gradual | Reemplazado |
| `src/components/supervisor/OrdenCascadaCard.tsx` | ⚠️ Deprecar | Reemplazado por nuevo dashboard |
| Tablas `velum_*` en Supabase (espejo legacy) | ❌ Dejar quietas | El sincronizador externo las maneja |
| `schema.prisma` | 📝 Actualizar documentación | Agregar las nuevas tablas |

---

## 12. Plan de fases — ejecutar en este orden

### FASE 1: Base de datos (sin tocar código)
1. Ejecutar el SQL completo de la Sección 5 en Supabase SQL Editor.
2. Verificar que todas las tablas existen con `\dt` en Supabase.
3. Crear los usuarios de Supabase Auth (Sección 3) con emails `{slug}@velum.local`.
4. Insertar registros en tabla `Usuario` con slug, color y área de cada persona.
5. **MIGRAR `Capacidad`**: exportar el JSON de `velum_capacidades` desde el localStorage del navegador donde está la app vieja e insertar en la nueva tabla. Esta tabla tiene datos reales que no se pueden perder.
6. Actualizar `schema.prisma` para documentar las nuevas tablas (solo documentación).

**Test de Fase 1:** hacer un INSERT de prueba en `Proyecto` y `Pieza`, verificar que aparece en Supabase Dashboard.

### FASE 2: APIs core
1. Implementar en orden: `proyectos`, `piezas`, `piezas/[id]/progreso`, `avance`, `historial`.
2. Luego: `capacidades`, `maquinas-estado`, `tareas`, `stock`, `consumibles`, `avisos`, `faltantes`.
3. Cada endpoint: auth check + query Supabase + broadcast si corresponde.
4. Tests unitarios para la lógica pura: `calcularPctProyecto`, `aplicarMarca`, `capOf`.

**Test de Fase 2:** con curl o Postman, crear un proyecto, agregarle 2 piezas, marcar avance en una, verificar que `ProyectoAvance` se actualiza y que `MarcaHistorial` tiene la fila.

### FASE 3: Estación de máquina — primera pantalla
1. Crear `/(operario)/estacion/page.tsx`.
2. Portar la lógica de `Estacion_Tarjetas_dc.html`:
   - La lógica de cálculo (`_enrich`, `_projStats`, `progOf`, `capOf`) es pura → portar a `src/lib/estacion.ts`.
   - Reemplazar `_save()` / `_loadFull()` por fetch a las APIs.
   - Reemplazar `_pushHist()` por el POST a `/api/piezas/[id]/progreso`.
   - Mantener los 5 layouts (Lista/Tarjetas/Grilla/Kiosco/Proyecto).
   - Mantener selector de máquina y sus colores de acento.
   - Mantener calculadora de retazo (modal con teclado numérico).
   - Implementar "⛔ Fuera de servicio" contra `/api/maquinas-estado`.
   - Agregar suscripción Realtime.
3. Actualizar middleware para que OPERARIO solo acceda a `/estacion` y `/tv`.

**Test de Fase 3:** dos tablets abiertas en la misma red, una marca una chapa, la otra se actualiza sola en ≤2 segundos.

### FASE 4: Panel de oficina
1. Reemplazar `/(supervisor)/dashboard/page.tsx` con la nueva versión.
2. Formulario completo de nuevo proyecto con todos los campos del modelo.
3. Vista de tarjetas de proyectos con avance, urgencia, pago.
4. Panel de detalle de proyecto con piezas y progreso por proceso.
5. Modal de confirmación para archivar (sin `confirm()` del browser).
6. Avisos del TV.
7. Badge de máquinas fuera de servicio.

### FASE 5: TV de planta
1. Crear `/(tv)/layout.tsx` sin guard de auth.
2. Crear `/(tv)/page.tsx`.
3. Agregar excepción en middleware para `/tv/*`.
4. Implementar grid de máquinas con estados: activa / inactiva / fuera de servicio / parcial.
5. Panel de avisos con animación rojo/gris.
6. Reloj en tiempo real (intervalo cliente).
7. Suscripción Realtime para todo.

### FASE 6: Pantallas de gestión y soporte
En cualquier orden (son independientes):
- `/(supervisor)/gestion` — resumen del jefe de planta
- `/(supervisor)/capacidad` — editar ritmos (⚠️ no vaciar datos)
- `/(supervisor)/tiempos` — estimador con impacto de máquinas fuera
- `/(supervisor)/ocupacion` — heatmap con exportar PDF
- `/(supervisor)/insumos` — stock + consumibles + exportar PDF
- `/(supervisor)/tareas` — tareas por rol

---

## 13. Advertencias finales para Claude Code

1. **`velum_capacidades` tiene datos reales de producción.** La migración (Fase 1, paso 5) es manual: el dueño del proyecto debe exportar ese JSON del browser y dártelo para insertar. No generes datos ficticios de capacidad.

2. **`objChapas` es NUMERIC, no INTEGER.** Acepta 7.5 chapas. Si en algún query haces cast a INTEGER, rompes la media chapa.

3. **El array `procesos[]` define el orden de la cascada.** Nunca ordenar ni filtrar ese array. Guardarlo y leerlo como viene.

4. **`prog` es un objeto dinámico** con claves = machineId. No modelarlo como columnas separadas.

5. **HUAXIA, no MUAXIA.** La segunda plegadora se llama HUAXIA. Revisar todos los strings antes de commitear.

6. **El campo `fresado` en Capacidad = PUNZONADORA.** Es un nombre histórico que no se renombra para no romper los datos existentes. En la UI mostrar "Punzonadora", pero el campo en DB sigue siendo `fresado`.

7. **La TV no tiene auth.** Configurar correctamente el middleware para que `/tv` sea accesible sin login dentro de la red local.

8. **No borrar ni modificar las tablas `velum_*`** que ya existen en Supabase. Las alimenta un sincronizador externo que corre en la fábrica. Dejarlas intactas.

9. **El broadcast de Realtime debe ir en el servidor** (API route), no en el cliente. El cliente solo suscribe y escucha.

10. **Días hábiles = lunes a viernes** (dow 1-5). El código viejo tenía un bug que excluía solo domingo. Ya está corregido en las pantallas nuevas.

---

## 14. Cómo correr el proyecto

```bash
cd app
npm install
npm run dev        # http://localhost:3000

# Tests unitarios
npx vitest run

# Build (genera tipos Prisma + compila Next.js)
npm run build
```

Variables de entorno necesarias en `app/.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

---

## 15. Primer mensaje sugerido para Claude Code

```
Leé el archivo VELUM-handoff-claudecode.md completo antes de hacer cualquier cosa.

Luego arrancá con la FASE 1:
1. Generá el SQL completo de la Sección 5 listo para ejecutar en Supabase.
2. Generá el script de migración de usuarios (Sección 3) como INSERT SQL.
3. Actualizá schema.prisma para documentar las nuevas tablas.

No toques ningún archivo de código todavía. Solo el SQL y el schema.
```
