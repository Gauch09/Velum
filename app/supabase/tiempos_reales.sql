-- ============================================================================
-- Medición de tiempos reales (spec 2026-06-12-medicion-tiempos-reales)
-- Pegar en el SQL Editor de Supabase. Idempotente.
-- ============================================================================

-- 1) Capacidad teórica por producto × tipo de máquina.
--    Seed desde "Velum_tiempos" (espejo de la hoja `datos` del Excel de control).
--    OJO: los valores de "Velum_tiempos" son piezas por DÍA (jornada de 8 h);
--    se divide por horas_dia para obtener piezas/hora.
create table if not exists public."CapacidadTeorica" (
  id                     text primary key default gen_random_uuid()::text,
  producto               text not null,
  "tipoMaquina"          text not null check ("tipoMaquina" in
    ('LASER','PUNZONADORA_CNC','FRESADORA','EXPANSORA','PLEGADORA',
     'PLEGADO_MANUAL','LAVADO','PINTADO','HORNO','EMBALAJE','DESPACHO')),
  "piezasPorHora"        double precision not null,
  "minutosSetupEstimado" double precision,
  "vigenteDesde"         timestamptz not null default now(),
  unique (producto, "tipoMaquina", "vigenteDesde")
);
alter table public."CapacidadTeorica" enable row level security;

-- 2) Tramo de trabajo (fichaje del operario).
create table if not exists public."TramoTrabajo" (
  id                  text primary key,
  "ejecucionEtapaId"  text not null references public."EjecucionEtapa"(id),
  "operarioId"        text not null references public."Usuario"(id),
  "maquinaId"         text not null references public."Maquina"(id),
  tipo                text not null check (tipo in ('PREPARACION','PRODUCCION')),
  inicio              timestamptz not null default now(),
  fin                 timestamptz,
  "cantidadProducida" double precision,
  "motivoPausa"       text check ("motivoPausa" in ('MATERIAL','OTRA_ORDEN','AVERIA','OTRO')),
  dudoso              boolean not null default false,
  notas               text,
  "createdAt"         timestamptz not null default now()
);
alter table public."TramoTrabajo" enable row level security;

-- Regla de oro a nivel DB: un solo tramo abierto por operario.
create unique index if not exists uniq_tramo_abierto_por_operario
  on public."TramoTrabajo"("operarioId") where fin is null;

create index if not exists idx_tramo_ejecucion on public."TramoTrabajo"("ejecucionEtapaId");
create index if not exists idx_tramo_maquina_inicio on public."TramoTrabajo"("maquinaId", inicio);

-- 3) Seed de CapacidadTeorica desde "Velum_tiempos" (solo filas que no existan ya).
insert into public."CapacidadTeorica" (producto, "tipoMaquina", "piezasPorHora")
select t.producto, v.tipo, v.val / coalesce(t.horas_dia, 8)
from public."Velum_tiempos" t
cross join lateral (values
  ('LASER',           t.laser_uh),
  ('PLEGADORA',       t.plegadora_uh),
  ('PUNZONADORA_CNC', t.punzonadora_uh),
  ('FRESADORA',       t.fresadora_uh),
  ('PINTADO',         t.pintura_uh),
  ('EMBALAJE',        t.embalado_uh)
) as v(tipo, val)
where v.val is not null and v.val > 0
  and not exists (
    select 1 from public."CapacidadTeorica" c
    where c.producto = t.producto and c."tipoMaquina" = v.tipo
  );
