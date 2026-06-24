-- F3 Montaje: tabla MontajeObra + seeds MedioElevacion + params

CREATE TABLE IF NOT EXISTS "MontajeObra" (
  id                  text PRIMARY KEY,
  "cotizacionId"      text NOT NULL UNIQUE REFERENCES "Cotizacion"(id),
  "medioElevacionId"  text NOT NULL REFERENCES "MedioElevacion"(id),
  "nOperarios"        integer NOT NULL DEFAULT 3,
  "diasObra"          integer NOT NULL,
  "hsPresencial"      boolean NOT NULL DEFAULT false,
  "costoElevacion"    double precision NOT NULL DEFAULT 0,
  "costoOperarios"    double precision NOT NULL DEFAULT 0,
  "costoHS"           double precision NOT NULL DEFAULT 0,
  "costoTotal"        double precision NOT NULL DEFAULT 0,
  "margenPct"         double precision NOT NULL DEFAULT 0,
  "precioVenta"       double precision NOT NULL DEFAULT 0
);

-- Medios de elevacion
-- Tijera: 3000 u$d/mes ÷ 22 días = 136.36 u$d/día
-- Andamio / Silleta / Colgante: valores orientativos, editar desde Calibración
INSERT INTO "MedioElevacion" (id, nombre, "alturaMaxM", "costoDia") VALUES
  (gen_random_uuid()::text, 'Plataforma Tijera',  12.0, 136.36),
  (gen_random_uuid()::text, 'Andamio Tubular',    20.0,  80.00),
  (gen_random_uuid()::text, 'Silleta',            50.0,  50.00),
  (gen_random_uuid()::text, 'Andamio Colgante',  100.0, 200.00)
ON CONFLICT (nombre) DO UPDATE
  SET "costoDia" = EXCLUDED."costoDia", "alturaMaxM" = EXCLUDED."alturaMaxM";

-- Params de costo de montaje
INSERT INTO "ParametroCosteo" (id, clave, valor, unidad, descripcion, "actualizadoEn") VALUES
  (gen_random_uuid()::text, 'montaje_jornal_usd_h',        39.0, 'u$d/h',          'Costo hora operario montaje (salario + cargas)', now()),
  (gen_random_uuid()::text, 'montaje_vianda_usd_dia',      10.0, 'u$d/dia',        'Vianda por operario por dia',                    now()),
  (gen_random_uuid()::text, 'montaje_hs_usd_h',            50.0, 'u$d/h',          'Ingeniero H&S presencial por hora',              now()),
  (gen_random_uuid()::text, 'montaje_rendimiento_m2_op',   20.0, 'm2/operario/dia','Rendimiento de montaje por operario',            now()),
  (gen_random_uuid()::text, 'montaje_horas_dia',            8.0, 'h/dia',          'Horas de trabajo por dia',                       now())
ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor, "actualizadoEn" = now();
