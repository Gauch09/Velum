-- ══════════════════════════════════════════════════════════════════════════
-- VELUM · MODELO OPERATIVO (espejo fiel de las pantallas .dc.html)
-- ══════════════════════════════════════════════════════════════════════════
-- Derivado del CONTRATO REAL extraído de los .dc.html que armaron producción y
-- los operarios (no del handoff). Cada tabla = una clave de localStorage; cada
-- columna = el nombre EXACTO del campo en el JS, para que la migración solo
-- tenga que cambiar _load/_save por fetch() a la API (la "regla de oro" del
-- equipo). Las columnas camelCase van entre comillas para conservar el casing.
--
-- Ejecutar en el SQL Editor de Supabase. NUNCA prisma migrate / db push
-- (red local solo IPv4 → falla).
--
-- ⚠️ NO confundir con las tablas espejo legacy `velum_proyectos` / `velum_piezas`
--    (snake_case) que alimenta un sincronizador externo: son OTRO sistema y no
--    se tocan. Estas tablas (velum_*_custom, velum_estacion_full, etc.) son la
--    fuente de verdad de la app de planta.
-- ══════════════════════════════════════════════════════════════════════════

-- 1) velum_proyectos_custom — proyectos (datos generales). Lo escribe el Panel de oficina.
CREATE TABLE IF NOT EXISTS velum_proyectos_custom (
  id             TEXT PRIMARY KEY,                 -- 'cust'+Date.now()
  "createdTs"    BIGINT NOT NULL,                  -- timestamp ms de creación
  name           TEXT NOT NULL,                    -- nombre (la app lo guarda en MAYÚSCULAS)
  producto       TEXT NOT NULL DEFAULT 'Nuevo proyecto',
  tipo           TEXT,                             -- = material o 'Por definir'
  contacto       TEXT,
  tel            TEXT,
  "deadlineDays" INTEGER NOT NULL DEFAULT 7,       -- ⚠️ DÍAS hasta la entrega, NO una fecha
  pago           TEXT NOT NULL DEFAULT 'IMPAGO' CHECK (pago IN ('IMPAGO','SEÑA','PAGADO')),
  montaje        BOOLEAN NOT NULL DEFAULT false,
  urgencia       TEXT NOT NULL DEFAULT 'NORMAL' CHECK (urgencia IN ('ALTA','MEDIA','NORMAL')),
  "basePct"      NUMERIC NOT NULL DEFAULT 0,       -- avance base si no hay live en velum_obras
  material       TEXT,
  pintado        BOOLEAN NOT NULL DEFAULT false,
  "colorName"    TEXT,                             -- código de pintura si pintado (ej. 'RAL 7016')
  "colorHex"     TEXT DEFAULT '#8B7355',
  lugar          TEXT DEFAULT 'A definir'
);

-- 2) velum_estacion_full — proyectos con sus PIEZAS (el corazón). 1 fila por proyecto.
--    `files` conserva la forma exacta del array de piezas de la app:
--    { id, archivo, pieza, material, matName, esp, ppc, objChapas, lote, paquete,
--      procesos:[...], prog:{procId:Number}, chapas, retazo, fallas,
--      fallasProc:{procId:Number}, pintado }
--    (objUni y sortOrder NO se almacenan: son derivados / inexistentes.)
--    Nota: la app vieja además cacheaba marcas por dispositivo en
--    velum_estacion_<projectId>; eso se colapsa acá: `files` es la única verdad.
CREATE TABLE IF NOT EXISTS velum_estacion_full (
  id    TEXT PRIMARY KEY,                          -- MISMO id que velum_proyectos_custom
  name  TEXT NOT NULL,
  files JSONB NOT NULL DEFAULT '[]'
);

-- 3) velum_obras — % de avance en vivo por proyecto { projectId: pct }.
CREATE TABLE IF NOT EXISTS velum_obras (
  "projectId" TEXT PRIMARY KEY,
  pct         NUMERIC NOT NULL DEFAULT 0
);

-- 4) velum_historial — marcas de operarios (append-only). Base de Ocupación y tiempos reales.
CREATE TABLE IF NOT EXISTS velum_historial (
  id          BIGSERIAL PRIMARY KEY,
  ts          BIGINT NOT NULL,                     -- Date.now()
  "dateKey"   TEXT NOT NULL,                       -- 'YYYY-MM-DD'
  hour        SMALLINT NOT NULL,                   -- 0-23
  dow         SMALLINT NOT NULL,                   -- 0=domingo
  "projectId" TEXT NOT NULL,
  project     TEXT NOT NULL,                       -- nombre (denormalizado)
  "machineId" TEXT NOT NULL,                       -- laser|plegadora|punzon|fresa|expansora|pintura|embalado
  unit        TEXT,                                -- LEAPION|BODOR|DERATECH|HUAXIA|'' (ver máquinas abajo)
  "fileId"    TEXT NOT NULL,
  pieza       TEXT NOT NULL,                       -- f.pieza (fallback f.archivo)
  field       TEXT NOT NULL,                       -- 'chapas' | 'retazo'
  kind        TEXT NOT NULL CHECK (kind IN ('chapa','retazo','falla')), -- la app hoy solo pushea chapa/retazo
  delta       NUMERIC NOT NULL,
  pieces      NUMERIC NOT NULL                     -- chapas→delta*ppc ; retazo→delta
);
CREATE INDEX IF NOT EXISTS velum_historial_datekey_idx   ON velum_historial("dateKey");
CREATE INDEX IF NOT EXISTS velum_historial_projectid_idx ON velum_historial("projectId");
CREATE INDEX IF NOT EXISTS velum_historial_machineid_idx ON velum_historial("machineId");

-- 5) velum_prod_diaria — producción diaria { dateKey: { byProj:{projectId:chapas}, fallas } }.
CREATE TABLE IF NOT EXISTS velum_prod_diaria (
  "dateKey" TEXT PRIMARY KEY,
  "byProj"  JSONB NOT NULL DEFAULT '{}',
  fallas    NUMERIC NOT NULL DEFAULT 0
);

-- 6) velum_capacidades — ritmos por producto ⚠️ TIENE DATOS REALES (ver velum_seed.sql).
--    Mapeo machineId→campo: laser→laser, plegadora→plegado, punzon→fresado,
--    pintura→pintura (u/percha, 10 perchas=3h), embalado→embalado. Fresa/Expansora sin ritmo.
CREATE TABLE IF NOT EXISTS velum_capacidades (
  id        TEXT PRIMARY KEY,
  nombre    TEXT NOT NULL UNIQUE,    -- debe coincidir con pieza.pieza (match por nombre)
  "enChapa" NUMERIC NOT NULL DEFAULT 0,   -- unidades por chapa
  lote      INTEGER NOT NULL DEFAULT 20,
  paquete   INTEGER NOT NULL DEFAULT 0,
  laser     NUMERIC NOT NULL DEFAULT 0,   -- u/h
  plegado   NUMERIC NOT NULL DEFAULT 0,   -- u/h (plegadora)
  fresado   NUMERIC NOT NULL DEFAULT 0,   -- u/h (punzonadora; nombre histórico)
  pintura   NUMERIC NOT NULL DEFAULT 0,   -- u/percha
  embalado  NUMERIC NOT NULL DEFAULT 0,   -- u/h
  material  TEXT DEFAULT 'Acero',
  ancho     NUMERIC,    -- mm
  alto      NUMERIC,    -- mm
  esp       TEXT
);

-- 7) velum_tareas — tareas de oficina. resp = ids de personas hardcodeadas en la pantalla
--    (lucho, juani, joa, german, mariu, claudio, produccion) — NO es FK a velum_usuarios.
CREATE TABLE IF NOT EXISTS velum_tareas (
  id        TEXT PRIMARY KEY,
  proyecto  TEXT,
  tarea     TEXT NOT NULL,
  resp      TEXT[] NOT NULL DEFAULT '{}',
  prioridad TEXT NOT NULL DEFAULT 'Media' CHECK (prioridad IN ('Urgente','Alta','Media','Baja')),
  estado    TEXT NOT NULL DEFAULT 'Sin iniciar' CHECK (estado IN ('Sin iniciar','En curso','Hecho')),
  fecha     TEXT DEFAULT '',          -- existe en el modelo pero sin UI (siempre '')
  obs       TEXT
);

-- 8) velum_stock — materia prima (chapas).
CREATE TABLE IF NOT EXISTS velum_stock (
  id          TEXT PRIMARY KEY,
  material    TEXT NOT NULL,
  espesor     TEXT DEFAULT '—',
  dimension   TEXT DEFAULT '—',
  terminacion TEXT DEFAULT '—',
  chapas      NUMERIC NOT NULL DEFAULT 0
);

-- 9) velum_consumibles — consumibles (ver seed). Categorías: Fijaciones|Pintura|Abrasivos|Otros.
CREATE TABLE IF NOT EXISTS velum_consumibles (
  id        TEXT PRIMARY KEY,
  nombre    TEXT NOT NULL,
  categoria TEXT NOT NULL DEFAULT 'Fijaciones' CHECK (categoria IN ('Fijaciones','Pintura','Abrasivos','Otros')),
  stock     NUMERIC NOT NULL DEFAULT 0,
  unidad    TEXT NOT NULL DEFAULT 'unidades'
);

-- 10) velum_avisos — avisos para el TV de planta.
CREATE TABLE IF NOT EXISTS velum_avisos (
  id     TEXT PRIMARY KEY,
  "text" TEXT NOT NULL,
  ts     BIGINT NOT NULL
);

-- 11) velum_faltantes_taller — faltantes cargados por planta desde la Estación.
CREATE TABLE IF NOT EXISTS velum_faltantes_taller (
  id      TEXT PRIMARY KEY,
  "text"  TEXT NOT NULL,
  maquina TEXT,
  ts      BIGINT NOT NULL
);

-- 12) velum_maquinas_estado — unidades fuera de servicio.
--     key = machineId  ó  machineId|UNIDAD (laser|LEAPION, laser|BODOR,
--     plegadora|DERATECH, plegadora|HUAXIA). ⚠️ Es HUAXIA, no MUAXIA.
CREATE TABLE IF NOT EXISTS velum_maquinas_estado (
  key     TEXT PRIMARY KEY,
  motivo  TEXT NOT NULL DEFAULT 'Sin especificar',
  maquina TEXT NOT NULL,    -- display, ej. 'Plegadora · HUAXIA'
  ts      BIGINT NOT NULL
);

-- 13) velum_archivados — proyectos cerrados (1 fila por id archivado).
CREATE TABLE IF NOT EXISTS velum_archivados (
  "projectId"  TEXT PRIMARY KEY,
  "archivedTs" BIGINT
);

-- 14) velum_usuarios — catálogo de login (de Inicio.dc.html _usuarios()).
--     El acceso por pantalla se deriva del area + casos especiales pc_oficina/pc_planta
--     (no se almacena). `velum_usuario_actual` es estado por-dispositivo: lo maneja la app.
CREATE TABLE IF NOT EXISTS velum_usuarios (
  id      TEXT PRIMARY KEY,
  name    TEXT NOT NULL,
  color   TEXT,
  area    TEXT NOT NULL CHECK (area IN ('Oficina','Planta')),
  display BOOLEAN NOT NULL DEFAULT false   -- true = usuario "TRANSMISIÓN" (pc_oficina/pc_planta)
);

-- ── Realtime (las tablas de alta frecuencia / que se ven en vivo) ──
ALTER PUBLICATION supabase_realtime ADD TABLE velum_estacion_full;
ALTER PUBLICATION supabase_realtime ADD TABLE velum_obras;
ALTER PUBLICATION supabase_realtime ADD TABLE velum_historial;
ALTER PUBLICATION supabase_realtime ADD TABLE velum_prod_diaria;
ALTER PUBLICATION supabase_realtime ADD TABLE velum_avisos;
ALTER PUBLICATION supabase_realtime ADD TABLE velum_faltantes_taller;
ALTER PUBLICATION supabase_realtime ADD TABLE velum_maquinas_estado;
ALTER PUBLICATION supabase_realtime ADD TABLE velum_tareas;
ALTER PUBLICATION supabase_realtime ADD TABLE velum_stock;
