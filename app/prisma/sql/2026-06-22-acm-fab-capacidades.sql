-- =============================================================================
-- Capacidades de fabricacion de la PLACA ACM — medicion real de planta (jun 2026)
-- Pegar en Supabase -> SQL Editor -> Run. Idempotente. NO usar prisma migrate.
-- =============================================================================
--
-- Contexto: placa mecanizada 5000x1500 mm (= 7,5 m2, ya en acm_area_placa);
-- panel terminado listo para instalar 4900x1240 mm. La fabricacion de cada
-- placa pasa por tres operaciones secuenciales medidas en planta:
--   Fresado            14 placas / 8 h
--   Punzonado          30 placas / 8 h
--   Plegado y armado    14 placas / 8 h   (con accesorios)
--
-- El motor calcula fab/placa = 8h * Σ(1/unidadesPorDia) * tasa_planta / tipo_cambio
-- (mismo metodo que las piezas Skin). Con tasa 17.046,55 $/h y TC 1.460 $/u$d:
--   (8/14 + 8/30 + 8/14) h × 17046,55 / 1460 ≈ 16,46 u$d/placa
-- Esto reemplaza al escalar legacy acm_fab_placa (8,37), que queda solo como
-- fallback si estas filas no estuvieran cargadas.
-- -----------------------------------------------------------------------------

INSERT INTO "CapacidadCentro" (id, pieza, centro, "unidadesPorDia", "actualizadoEn")
VALUES (gen_random_uuid()::text, 'Placa ACM', 'FRESADORA', 14.0, now())
ON CONFLICT (pieza, centro) DO UPDATE SET "unidadesPorDia" = EXCLUDED."unidadesPorDia", "actualizadoEn" = now();

INSERT INTO "CapacidadCentro" (id, pieza, centro, "unidadesPorDia", "actualizadoEn")
VALUES (gen_random_uuid()::text, 'Placa ACM', 'PUNZONADORA', 30.0, now())
ON CONFLICT (pieza, centro) DO UPDATE SET "unidadesPorDia" = EXCLUDED."unidadesPorDia", "actualizadoEn" = now();

INSERT INTO "CapacidadCentro" (id, pieza, centro, "unidadesPorDia", "actualizadoEn")
VALUES (gen_random_uuid()::text, 'Placa ACM', 'PLEGADO Y ARMADO', 14.0, now())
ON CONFLICT (pieza, centro) DO UPDATE SET "unidadesPorDia" = EXCLUDED."unidadesPorDia", "actualizadoEn" = now();

-- Marcar el escalar como legacy/fallback (no cambia su valor; solo documenta).
UPDATE "ParametroCosteo"
SET descripcion = 'Fab costo placa ACM (LEGACY: fallback si no hay capacidades Placa ACM)'
WHERE clave = 'acm_fab_placa';
