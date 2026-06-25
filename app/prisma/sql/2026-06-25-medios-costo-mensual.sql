-- Costo mensual de los medios de elevación (alquiler por mes).
-- El motor de montaje divide por 26 días laborables (lun-sáb) y suma 20% al
-- costo diario cuando la obra dura menos de un mes (< 26 días).
alter table "MedioElevacion" add column if not exists "costoMes" numeric;

-- Catálogo definitivo (valores NETOS, sin IVA).
-- costoDia se rellena por compatibilidad (= costoMes / 26); el motor usa costoMes.
insert into "MedioElevacion" ("id","nombre","alturaMaxM","costoMes","costoDia") values
  ('med_tijera_10', 'Tijera hasta 10 m',           10,  800,  800/26.0),
  ('med_tijera_12', 'Tijera 12 m',                 12, 1500, 1500/26.0),
  ('med_tijera_16', 'Tijera hasta 16 m',           16, 1700, 1700/26.0),
  ('med_brazo_16',  'Brazo articulado hasta 16 m', 16, 2400, 2400/26.0),
  ('med_brazo_20',  'Brazo articulado 20 m',       20, 3000, 3000/26.0)
on conflict ("id") do update set
  "nombre"     = excluded."nombre",
  "alturaMaxM" = excluded."alturaMaxM",
  "costoMes"   = excluded."costoMes",
  "costoDia"   = excluded."costoDia";

-- Limpiar medios de prueba viejos: borra los que NO son del catálogo definitivo
-- y que NO están referenciados por ningún montaje existente (evita romper FKs).
delete from "MedioElevacion"
 where "id" not in ('med_tijera_10','med_tijera_12','med_tijera_16','med_brazo_16','med_brazo_20')
   and "id" not in (select distinct "medioElevacionId" from "MontajeObra" where "medioElevacionId" is not null);
