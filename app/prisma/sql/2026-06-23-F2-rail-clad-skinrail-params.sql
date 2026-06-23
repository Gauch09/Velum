-- =============================================================================
-- F2: Parámetros Rail / Clad / Skin.Rail
-- Aplicar en: Supabase SQL Editor (NUNCA prisma migrate)
-- Generado: 2026-06-23
-- =============================================================================

-- ParametroCosteo: escalares nuevos para omega, empalme C, tornillería Clad
INSERT INTO "ParametroCosteo" (id, clave, valor, unidad, descripcion, "actualizadoEn") VALUES
  (gen_random_uuid()::text, 'omega_area_3m',     0.57,   'm2', 'Área m² de tramo omega de 3 m', now()),
  (gen_random_uuid()::text, 'omega_espesor_mm',  1.6,    'mm', 'Espesor omega en mm', now()),
  (gen_random_uuid()::text, 'omega_tramo_max_m', 3.0,    'm',  'Tramo máximo omega entre empalmes C', now()),
  (gen_random_uuid()::text, 'sep_omega_vert_m',  1.5,    'm',  'Separación vertical entre omegas', now()),
  (gen_random_uuid()::text, 'empalme_c_area_m2', 0.0242, 'm2', 'Área de empalme C', now()),
  (gen_random_uuid()::text, 'costo_t1',          0.007,  'u$d','Costo tornillo T1 por unidad', now()),
  (gen_random_uuid()::text, 'costo_taco',        0.34,   'u$d','Costo taco por unidad', now()),
  (gen_random_uuid()::text, 'costo_tirafondo',   0.34,   'u$d','Costo tirafondo por unidad', now())
ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor, "actualizadoEn" = now();

-- DisenoKp: Kp de las variantes de lama MultiSlim
-- Nota: los Kp de lama son fijos (geometría del producto), no por diseño arquitectónico
INSERT INTO "DisenoKp" (id, diseno, kp, "actualizadoEn") VALUES
  (gen_random_uuid()::text, 'MultiSlim Standard', 1.333, now()),
  (gen_random_uuid()::text, 'MultiSlim.A',        1.45,  now())
ON CONFLICT (diseno) DO UPDATE SET kp = EXCLUDED.kp, "actualizadoEn" = now();

-- MaterialVariante: lamas MultiSlim (galvanizado 0.7mm)
-- CapacidadCentro para estas piezas ya está en F0 ('MultiSlim Standard', 'MultiSlim Custom')
INSERT INTO "MaterialVariante" (id, material, familia, "espesorMm", "actualizadoEn") VALUES
  (gen_random_uuid()::text, 'MultiSlim Standard', 'Acero Galvanizado', 0.7, now()),
  (gen_random_uuid()::text, 'MultiSlim.A',        'Acero Galvanizado', 0.7, now())
ON CONFLICT (material) DO UPDATE SET familia = EXCLUDED.familia, "espesorMm" = EXCLUDED."espesorMm", "actualizadoEn" = now();
