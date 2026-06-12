-- ============================================================================
-- Dashboard de Producción (datos espejados desde HULL · base access_data)
-- Tablas destino en Supabase. El sincronizador (corre en la máquina de la
-- fábrica) las refresca cada 10-15 min leyendo MySQL con el usuario read-only
-- `velum_dash`. El dashboard de VELUM (diseño "Foco en proyectos" / variante C)
-- lee de estas tablas vía service role.
--
-- Idempotente: se puede correr varias veces sin romper nada.
-- ============================================================================

-- 1) Proyectos: una fila por proyecto con su estado de producción agregado.
create table if not exists public.hull_proyectos (
  proyecto_id     text primary key,                 -- ej. '1273'
  nombre          text not null,                     -- ej. 'Gran Tortola'
  cliente         text,
  total_piezas    integer not null default 0,
  completadas     integer not null default 0,
  prioridad       text    not null default 'MEDIA',  -- ALTA | MEDIA | BAJA
  fecha_entrega   date,
  atrasado        boolean not null default false,
  sincronizado_en timestamptz not null default now()
);

-- 2) Órdenes de producción (OT) por proyecto y proceso.
create table if not exists public.hull_ordenes (
  numero          text primary key,                  -- ej. 'OT-1816'
  proyecto_id     text references public.hull_proyectos(proyecto_id) on delete cascade,
  proceso         text,                               -- Corte Láser | Plegado | Pintura | Armado
  operario        text,
  descripcion     text,
  piezas          integer not null default 0,
  avance          integer not null default 0,        -- 0-100
  estado          text    not null default 'PENDIENTE', -- EN PROCESO | EN ESPERA | PENDIENTE
  sincronizado_en timestamptz not null default now()
);

create index if not exists idx_hull_ordenes_proyecto on public.hull_ordenes(proyecto_id);

-- 3) Metadatos de la última sincronización (para mostrar "actualizado hace X").
create table if not exists public.hull_sync_meta (
  id              text primary key default 'singleton',
  ultima_sync     timestamptz,
  filas_proyectos integer default 0,
  filas_ordenes   integer default 0
);
insert into public.hull_sync_meta (id) values ('singleton')
  on conflict (id) do nothing;

-- 4) Seguridad: RLS activado. Solo el service role (que usa el dashboard) accede.
alter table public.hull_proyectos enable row level security;
alter table public.hull_ordenes   enable row level security;
alter table public.hull_sync_meta enable row level security;

-- ============================================================================
-- Datos de ejemplo (los mismos del boceto) para ver el dashboard funcionando
-- ANTES de que esté listo el sincronizador. El sync real los reemplaza luego.
-- ============================================================================
insert into public.hull_proyectos (proyecto_id, nombre, cliente, total_piezas, completadas, prioridad, fecha_entrega, atrasado) values
  ('1273','Gran Tortola','Constructora del Sur',142, 88,'ALTA' ,'2026-06-24',false),
  ('1268','Mirador Norte','Grupo Aliaga'       , 96, 71,'MEDIA','2026-06-19',false),
  ('1281','Edificio Aurora','Inmobiliaria Vega',210, 35,'ALTA' ,'2026-06-16',true ),
  ('1275','Casa del Puente','Estudio Roan'      , 54, 54,'BAJA' ,'2026-06-12',false),
  ('1279','Torre Liena','Constructora del Sur' ,168,102,'MEDIA','2026-07-02',false)
on conflict (proyecto_id) do update set
  nombre=excluded.nombre, cliente=excluded.cliente, total_piezas=excluded.total_piezas,
  completadas=excluded.completadas, prioridad=excluded.prioridad,
  fecha_entrega=excluded.fecha_entrega, atrasado=excluded.atrasado, sincronizado_en=now();

insert into public.hull_ordenes (numero, proyecto_id, proceso, operario, descripcion, piezas, avance, estado) values
  ('OT-1816','1273','Corte Láser','ERIK'    ,'Perfil Omega Inclinado · Chapa Galv. 1.2mm Crudo'  ,142,62,'EN PROCESO'),
  ('OT-1809','1268','Plegado'    ,'CRISTIAN','Bandeja lisa · Chapa Luxider 0.6mm Gris Grafito'    , 96,74,'EN PROCESO'),
  ('OT-1822','1281','Corte Láser','ERIK'    ,'Panel perforado · Chapa Galv. 0.7mm Crudo'         ,210,17,'EN ESPERA'),
  ('OT-1827','1279','Plegado'    ,'CRISTIAN','Cassette plegado · Chapa Luxider 0.8mm Gris Grafito',168,61,'EN PROCESO'),
  ('OT-1831','1281','Pintura'    ,'ERIK'    ,'Terminación gris grafito mate'                      , 64, 0,'PENDIENTE')
on conflict (numero) do update set
  proyecto_id=excluded.proyecto_id, proceso=excluded.proceso, operario=excluded.operario,
  descripcion=excluded.descripcion, piezas=excluded.piezas, avance=excluded.avance,
  estado=excluded.estado, sincronizado_en=now();

update public.hull_sync_meta
  set ultima_sync = now(),
      filas_proyectos = (select count(*) from public.hull_proyectos),
      filas_ordenes   = (select count(*) from public.hull_ordenes)
  where id = 'singleton';
