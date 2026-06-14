-- Despiece por producto y proceso (espejo del sistema anterior, 120-despiece-pedido).
-- Es lo que se cruza con "Velum_tiempos" para estimar días por proceso.
-- Datos de ejemplo con nombres de producto reales del Excel (hoja "datos"),
-- incluyendo algún producto sin tiempo cargado para mostrar ese caso.

create table if not exists public.velum_piezas (
  proyecto_id  text not null references public.velum_proyectos(proyecto_id) on delete cascade,
  producto     text not null,
  proceso      text not null,           -- Corte Láser | Plegado | Pintura | Embalado
  cantidad     integer not null default 0,
  completado   integer not null default 0,
  sincronizado_en timestamptz not null default now(),
  primary key (proyecto_id, producto, proceso)
);
create index if not exists idx_velum_piezas_proyecto on public.velum_piezas(proyecto_id);
alter table public.velum_piezas enable row level security;

insert into public.velum_piezas (proyecto_id, producto, proceso, cantidad, completado) values
  -- 1273 Gran Tortola
  ('1273','Costilla 1500','Corte Láser', 80, 50),
  ('1273','Costilla 1500','Plegado',     80, 40),
  ('1273','Omega 50x50','Corte Láser',   62, 38),
  -- 1268 Mirador Norte
  ('1268','Skin ctm','Corte Láser',      70, 52),
  ('1268','Skin ctm','Plegado',          70, 50),
  ('1268','PIL/PEL','Embalado',          26, 19),
  -- 1281 Edificio Aurora (atrasado)
  ('1281','PIC/PEC - 150','Corte Láser',130, 20),
  ('1281','PIC/PEC - 150','Plegado',    130, 15),
  ('1281','Parante 300mm','Corte Láser', 80,  0),
  ('1281','Cassette especial','Plegado', 40,  0),   -- producto SIN tiempo cargado (a propósito)
  -- 1275 Casa del Puente (terminado)
  ('1275','Panel std','Corte Láser',     54, 54),
  -- 1279 Torre Liena
  ('1279','Costilla 3000','Plegado',    168,102),
  ('1279','Quadroline','Corte Láser',   100, 60)
on conflict (proyecto_id, producto, proceso) do update set
  cantidad=excluded.cantidad, completado=excluded.completado, sincronizado_en=now();
