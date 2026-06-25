-- Extender CotizacionVano: persistir cara y despiece
alter table "CotizacionVano"
  add column if not exists "cara"      text,
  add column if not exists "geometria" jsonb,
  add column if not exists "compras"   jsonb;

-- Lista de Materiales (BOM): un snapshot por cotización
-- IDs son text (Prisma String @default(cuid())), no uuid.
create table if not exists "ListaMateriales" (
  "id"           text primary key,
  "cotizacionId" text not null unique references "Cotizacion"("id") on delete cascade,
  "estado"       text not null default 'EN_REVISION',  -- EN_REVISION | LIBERADA
  "createdAt"    timestamptz not null default now(),
  "liberadaAt"   timestamptz
);

-- Líneas del BOM (editables)
create table if not exists "LineaMateriales" (
  "id"           text primary key,
  "listaId"      text   not null references "ListaMateriales"("id") on delete cascade,
  "area"         text   not null,           -- COMPRAS | PRODUCCION
  "cara"         text,                       -- nombre de cara, NULL = consolidado de obra
  "insumo"       text   not null,
  "unidad"       text   not null,           -- un | kg | m2 | chapa
  "cantidad"     numeric not null,
  "cantidadCalc" numeric,                    -- valor original del motor; NULL en MANUAL
  "origen"       text   not null,           -- CALCULADA | MANUAL
  "nota"         text,
  "orden"        int    not null default 0
);
create index if not exists "LineaMateriales_listaId_idx" on "LineaMateriales"("listaId");
