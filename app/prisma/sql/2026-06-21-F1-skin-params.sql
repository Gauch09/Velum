-- =============================================================================
-- F1 Skin Params — DDL + Seed idempotente para Supabase SQL Editor
-- Generado: 2026-06-21
-- Instrucciones: pegar en Supabase → SQL Editor → Run
-- NO aplicar con prisma migrate (red IPv4 local).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. TABLAS NUEVAS (idempotentes)
-- ---------------------------------------------------------------------------

-- MaterialFamilia
CREATE TABLE IF NOT EXISTS "MaterialFamilia" (
  id              text PRIMARY KEY,
  nombre          text NOT NULL UNIQUE,
  densidad        double precision NOT NULL,
  "precioTon"     double precision NOT NULL,
  "precioM2"      double precision NOT NULL DEFAULT 0,
  "actualizadoEn" timestamptz NOT NULL DEFAULT now()
);

-- MaterialVariante
CREATE TABLE IF NOT EXISTS "MaterialVariante" (
  id              text PRIMARY KEY,
  material        text NOT NULL UNIQUE,
  familia         text NOT NULL,
  "espesorMm"     double precision NOT NULL,
  "actualizadoEn" timestamptz NOT NULL DEFAULT now()
);

-- DisenoKp
CREATE TABLE IF NOT EXISTS "DisenoKp" (
  id              text PRIMARY KEY,
  diseno          text NOT NULL UNIQUE,
  kp              double precision NOT NULL,
  "actualizadoEn" timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 2. SEED — extraido de Cotizador VELUM - Validacion Modelo v7.xlsx
--    via app/scripts/extraer-parametros-skin.py
-- ---------------------------------------------------------------------------

-- MaterialFamilia
INSERT INTO "MaterialFamilia" (id, nombre, densidad, "precioTon", "precioM2", "actualizadoEn") VALUES (gen_random_uuid()::text, 'Acero Galvanizado', 7850.0, 1400.0, 0.0, now()) ON CONFLICT (nombre) DO UPDATE SET densidad = EXCLUDED.densidad, "precioTon" = EXCLUDED."precioTon", "precioM2" = EXCLUDED."precioM2", "actualizadoEn" = now();
INSERT INTO "MaterialFamilia" (id, nombre, densidad, "precioTon", "precioM2", "actualizadoEn") VALUES (gen_random_uuid()::text, 'Acero', 7850.0, 1350.0, 0.0, now()) ON CONFLICT (nombre) DO UPDATE SET densidad = EXCLUDED.densidad, "precioTon" = EXCLUDED."precioTon", "precioM2" = EXCLUDED."precioM2", "actualizadoEn" = now();
INSERT INTO "MaterialFamilia" (id, nombre, densidad, "precioTon", "precioM2", "actualizadoEn") VALUES (gen_random_uuid()::text, 'Aluminio', 2700.0, 8000.0, 0.0, now()) ON CONFLICT (nombre) DO UPDATE SET densidad = EXCLUDED.densidad, "precioTon" = EXCLUDED."precioTon", "precioM2" = EXCLUDED."precioM2", "actualizadoEn" = now();
INSERT INTO "MaterialFamilia" (id, nombre, densidad, "precioTon", "precioM2", "actualizadoEn") VALUES (gen_random_uuid()::text, 'Inox', 8000.0, 9000.0, 0.0, now()) ON CONFLICT (nombre) DO UPDATE SET densidad = EXCLUDED.densidad, "precioTon" = EXCLUDED."precioTon", "precioM2" = EXCLUDED."precioM2", "actualizadoEn" = now();
INSERT INTO "MaterialFamilia" (id, nombre, densidad, "precioTon", "precioM2", "actualizadoEn") VALUES (gen_random_uuid()::text, 'Al. Compuesto', 1900.0, 5000.0, 37.0, now()) ON CONFLICT (nombre) DO UPDATE SET densidad = EXCLUDED.densidad, "precioTon" = EXCLUDED."precioTon", "precioM2" = EXCLUDED."precioM2", "actualizadoEn" = now();
INSERT INTO "MaterialFamilia" (id, nombre, densidad, "precioTon", "precioM2", "actualizadoEn") VALUES (gen_random_uuid()::text, 'Luxsteel', 7850.0, 3800.0, 0.0, now()) ON CONFLICT (nombre) DO UPDATE SET densidad = EXCLUDED.densidad, "precioTon" = EXCLUDED."precioTon", "precioM2" = EXCLUDED."precioM2", "actualizadoEn" = now();

-- DisenoKp
INSERT INTO "DisenoKp" (id, diseno, kp, "actualizadoEn") VALUES (gen_random_uuid()::text, 'StandardFlat', 1.0, now()) ON CONFLICT (diseno) DO UPDATE SET kp = EXCLUDED.kp, "actualizadoEn" = now();
INSERT INTO "DisenoKp" (id, diseno, kp, "actualizadoEn") VALUES (gen_random_uuid()::text, 'CustomFlat', 1.3, now()) ON CONFLICT (diseno) DO UPDATE SET kp = EXCLUDED.kp, "actualizadoEn" = now();
INSERT INTO "DisenoKp" (id, diseno, kp, "actualizadoEn") VALUES (gen_random_uuid()::text, 'CustomPanel', 1.5, now()) ON CONFLICT (diseno) DO UPDATE SET kp = EXCLUDED.kp, "actualizadoEn" = now();
INSERT INTO "DisenoKp" (id, diseno, kp, "actualizadoEn") VALUES (gen_random_uuid()::text, 'Standard', 1.2, now()) ON CONFLICT (diseno) DO UPDATE SET kp = EXCLUDED.kp, "actualizadoEn" = now();
INSERT INTO "DisenoKp" (id, diseno, kp, "actualizadoEn") VALUES (gen_random_uuid()::text, 'Prism', 2.3, now()) ON CONFLICT (diseno) DO UPDATE SET kp = EXCLUDED.kp, "actualizadoEn" = now();
INSERT INTO "DisenoKp" (id, diseno, kp, "actualizadoEn") VALUES (gen_random_uuid()::text, 'Lattice', 1.3, now()) ON CONFLICT (diseno) DO UPDATE SET kp = EXCLUDED.kp, "actualizadoEn" = now();
INSERT INTO "DisenoKp" (id, diseno, kp, "actualizadoEn") VALUES (gen_random_uuid()::text, 'Crossbar', 1.5, now()) ON CONFLICT (diseno) DO UPDATE SET kp = EXCLUDED.kp, "actualizadoEn" = now();
INSERT INTO "DisenoKp" (id, diseno, kp, "actualizadoEn") VALUES (gen_random_uuid()::text, 'Expanded', 0.8, now()) ON CONFLICT (diseno) DO UPDATE SET kp = EXCLUDED.kp, "actualizadoEn" = now();
INSERT INTO "DisenoKp" (id, diseno, kp, "actualizadoEn") VALUES (gen_random_uuid()::text, 'Composite', 1.6, now()) ON CONFLICT (diseno) DO UPDATE SET kp = EXCLUDED.kp, "actualizadoEn" = now();
INSERT INTO "DisenoKp" (id, diseno, kp, "actualizadoEn") VALUES (gen_random_uuid()::text, 'Cinetik', 1.25, now()) ON CONFLICT (diseno) DO UPDATE SET kp = EXCLUDED.kp, "actualizadoEn" = now();

-- MaterialVariante
INSERT INTO "MaterialVariante" (id, material, familia, "espesorMm", "actualizadoEn") VALUES (gen_random_uuid()::text, 'Galv 0,7mm', 'Acero Galvanizado', 0.7, now()) ON CONFLICT (material) DO UPDATE SET familia = EXCLUDED.familia, "espesorMm" = EXCLUDED."espesorMm", "actualizadoEn" = now();
INSERT INTO "MaterialVariante" (id, material, familia, "espesorMm", "actualizadoEn") VALUES (gen_random_uuid()::text, 'Galv 1,2mm', 'Acero Galvanizado', 1.2, now()) ON CONFLICT (material) DO UPDATE SET familia = EXCLUDED.familia, "espesorMm" = EXCLUDED."espesorMm", "actualizadoEn" = now();
INSERT INTO "MaterialVariante" (id, material, familia, "espesorMm", "actualizadoEn") VALUES (gen_random_uuid()::text, 'Galv 1,6mm', 'Acero Galvanizado', 1.6, now()) ON CONFLICT (material) DO UPDATE SET familia = EXCLUDED.familia, "espesorMm" = EXCLUDED."espesorMm", "actualizadoEn" = now();
INSERT INTO "MaterialVariante" (id, material, familia, "espesorMm", "actualizadoEn") VALUES (gen_random_uuid()::text, 'Galv 2mm', 'Acero Galvanizado', 2.0, now()) ON CONFLICT (material) DO UPDATE SET familia = EXCLUDED.familia, "espesorMm" = EXCLUDED."espesorMm", "actualizadoEn" = now();
INSERT INTO "MaterialVariante" (id, material, familia, "espesorMm", "actualizadoEn") VALUES (gen_random_uuid()::text, 'Galv 3,2mm', 'Acero Galvanizado', 3.2, now()) ON CONFLICT (material) DO UPDATE SET familia = EXCLUDED.familia, "espesorMm" = EXCLUDED."espesorMm", "actualizadoEn" = now();
INSERT INTO "MaterialVariante" (id, material, familia, "espesorMm", "actualizadoEn") VALUES (gen_random_uuid()::text, 'Steel 1,6mm', 'Acero', 1.6, now()) ON CONFLICT (material) DO UPDATE SET familia = EXCLUDED.familia, "espesorMm" = EXCLUDED."espesorMm", "actualizadoEn" = now();
INSERT INTO "MaterialVariante" (id, material, familia, "espesorMm", "actualizadoEn") VALUES (gen_random_uuid()::text, 'Steel 2mm', 'Acero', 2.0, now()) ON CONFLICT (material) DO UPDATE SET familia = EXCLUDED.familia, "espesorMm" = EXCLUDED."espesorMm", "actualizadoEn" = now();
INSERT INTO "MaterialVariante" (id, material, familia, "espesorMm", "actualizadoEn") VALUES (gen_random_uuid()::text, 'Luxsteel 0,6mm', 'Luxsteel', 0.6, now()) ON CONFLICT (material) DO UPDATE SET familia = EXCLUDED.familia, "espesorMm" = EXCLUDED."espesorMm", "actualizadoEn" = now();
INSERT INTO "MaterialVariante" (id, material, familia, "espesorMm", "actualizadoEn") VALUES (gen_random_uuid()::text, 'Alum 1,2mm', 'Aluminio', 1.2, now()) ON CONFLICT (material) DO UPDATE SET familia = EXCLUDED.familia, "espesorMm" = EXCLUDED."espesorMm", "actualizadoEn" = now();
INSERT INTO "MaterialVariante" (id, material, familia, "espesorMm", "actualizadoEn") VALUES (gen_random_uuid()::text, 'Alum 1,5mm', 'Aluminio', 1.5, now()) ON CONFLICT (material) DO UPDATE SET familia = EXCLUDED.familia, "espesorMm" = EXCLUDED."espesorMm", "actualizadoEn" = now();
INSERT INTO "MaterialVariante" (id, material, familia, "espesorMm", "actualizadoEn") VALUES (gen_random_uuid()::text, 'Galv 0,9mm', 'Acero Galvanizado', 0.9, now()) ON CONFLICT (material) DO UPDATE SET familia = EXCLUDED.familia, "espesorMm" = EXCLUDED."espesorMm", "actualizadoEn" = now();
INSERT INTO "MaterialVariante" (id, material, familia, "espesorMm", "actualizadoEn") VALUES (gen_random_uuid()::text, 'Steel 2,5mm', 'Acero', 2.5, now()) ON CONFLICT (material) DO UPDATE SET familia = EXCLUDED.familia, "espesorMm" = EXCLUDED."espesorMm", "actualizadoEn" = now();
INSERT INTO "MaterialVariante" (id, material, familia, "espesorMm", "actualizadoEn") VALUES (gen_random_uuid()::text, 'Galv 0,5mm', 'Acero Galvanizado', 0.5, now()) ON CONFLICT (material) DO UPDATE SET familia = EXCLUDED.familia, "espesorMm" = EXCLUDED."espesorMm", "actualizadoEn" = now();
INSERT INTO "MaterialVariante" (id, material, familia, "espesorMm", "actualizadoEn") VALUES (gen_random_uuid()::text, 'Bond 4mm', 'Al. Compuesto', 4.0, now()) ON CONFLICT (material) DO UPDATE SET familia = EXCLUDED.familia, "espesorMm" = EXCLUDED."espesorMm", "actualizadoEn" = now();
INSERT INTO "MaterialVariante" (id, material, familia, "espesorMm", "actualizadoEn") VALUES (gen_random_uuid()::text, 'Steel 0,5mm', 'Acero', 0.5, now()) ON CONFLICT (material) DO UPDATE SET familia = EXCLUDED.familia, "espesorMm" = EXCLUDED."espesorMm", "actualizadoEn" = now();
INSERT INTO "MaterialVariante" (id, material, familia, "espesorMm", "actualizadoEn") VALUES (gen_random_uuid()::text, 'Steel 0,7mm', 'Acero', 0.7, now()) ON CONFLICT (material) DO UPDATE SET familia = EXCLUDED.familia, "espesorMm" = EXCLUDED."espesorMm", "actualizadoEn" = now();
INSERT INTO "MaterialVariante" (id, material, familia, "espesorMm", "actualizadoEn") VALUES (gen_random_uuid()::text, 'Alum 1mm', 'Aluminio', 1.0, now()) ON CONFLICT (material) DO UPDATE SET familia = EXCLUDED.familia, "espesorMm" = EXCLUDED."espesorMm", "actualizadoEn" = now();
INSERT INTO "MaterialVariante" (id, material, familia, "espesorMm", "actualizadoEn") VALUES (gen_random_uuid()::text, 'Alum 2,5mm', 'Aluminio', 2.5, now()) ON CONFLICT (material) DO UPDATE SET familia = EXCLUDED.familia, "espesorMm" = EXCLUDED."espesorMm", "actualizadoEn" = now();
INSERT INTO "MaterialVariante" (id, material, familia, "espesorMm", "actualizadoEn") VALUES (gen_random_uuid()::text, 'Alum 2mm', 'Aluminio', 2.0, now()) ON CONFLICT (material) DO UPDATE SET familia = EXCLUDED.familia, "espesorMm" = EXCLUDED."espesorMm", "actualizadoEn" = now();
INSERT INTO "MaterialVariante" (id, material, familia, "espesorMm", "actualizadoEn") VALUES (gen_random_uuid()::text, 'Steel 1,2mm', 'Acero', 1.2, now()) ON CONFLICT (material) DO UPDATE SET familia = EXCLUDED.familia, "espesorMm" = EXCLUDED."espesorMm", "actualizadoEn" = now();
INSERT INTO "MaterialVariante" (id, material, familia, "espesorMm", "actualizadoEn") VALUES (gen_random_uuid()::text, 'Luxsteel 0,7mm', 'Luxsteel', 0.7, now()) ON CONFLICT (material) DO UPDATE SET familia = EXCLUDED.familia, "espesorMm" = EXCLUDED."espesorMm", "actualizadoEn" = now();
INSERT INTO "MaterialVariante" (id, material, familia, "espesorMm", "actualizadoEn") VALUES (gen_random_uuid()::text, 'Steel 0,9mm', 'Acero', 0.9, now()) ON CONFLICT (material) DO UPDATE SET familia = EXCLUDED.familia, "espesorMm" = EXCLUDED."espesorMm", "actualizadoEn" = now();
INSERT INTO "MaterialVariante" (id, material, familia, "espesorMm", "actualizadoEn") VALUES (gen_random_uuid()::text, 'Luxsteel 0,5mm', 'Luxsteel', 0.5, now()) ON CONFLICT (material) DO UPDATE SET familia = EXCLUDED.familia, "espesorMm" = EXCLUDED."espesorMm", "actualizadoEn" = now();
INSERT INTO "MaterialVariante" (id, material, familia, "espesorMm", "actualizadoEn") VALUES (gen_random_uuid()::text, 'Bond 5mm', 'Al. Compuesto', 5.0, now()) ON CONFLICT (material) DO UPDATE SET familia = EXCLUDED.familia, "espesorMm" = EXCLUDED."espesorMm", "actualizadoEn" = now();
INSERT INTO "MaterialVariante" (id, material, familia, "espesorMm", "actualizadoEn") VALUES (gen_random_uuid()::text, 'MDF.Cedro 16mm', 'MDF', 16.0, now()) ON CONFLICT (material) DO UPDATE SET familia = EXCLUDED.familia, "espesorMm" = EXCLUDED."espesorMm", "actualizadoEn" = now();
INSERT INTO "MaterialVariante" (id, material, familia, "espesorMm", "actualizadoEn") VALUES (gen_random_uuid()::text, 'MDF.Melamina 19mm', 'MDF', 19.0, now()) ON CONFLICT (material) DO UPDATE SET familia = EXCLUDED.familia, "espesorMm" = EXCLUDED."espesorMm", "actualizadoEn" = now();
INSERT INTO "MaterialVariante" (id, material, familia, "espesorMm", "actualizadoEn") VALUES (gen_random_uuid()::text, 'Bond 3mm', 'Al. Compuesto', 3.0, now()) ON CONFLICT (material) DO UPDATE SET familia = EXCLUDED.familia, "espesorMm" = EXCLUDED."espesorMm", "actualizadoEn" = now();
INSERT INTO "MaterialVariante" (id, material, familia, "espesorMm", "actualizadoEn") VALUES (gen_random_uuid()::text, 'MDF.Mel. 18mm H3730', 'MDF', 18.0, now()) ON CONFLICT (material) DO UPDATE SET familia = EXCLUDED.familia, "espesorMm" = EXCLUDED."espesorMm", "actualizadoEn" = now();
INSERT INTO "MaterialVariante" (id, material, familia, "espesorMm", "actualizadoEn") VALUES (gen_random_uuid()::text, 'MDF.Mel. 18mm W1100', 'MDF', 18.0, now()) ON CONFLICT (material) DO UPDATE SET familia = EXCLUDED.familia, "espesorMm" = EXCLUDED."espesorMm", "actualizadoEn" = now();
INSERT INTO "MaterialVariante" (id, material, familia, "espesorMm", "actualizadoEn") VALUES (gen_random_uuid()::text, 'Alum 0,5mm', 'Aluminio', 0.5, now()) ON CONFLICT (material) DO UPDATE SET familia = EXCLUDED.familia, "espesorMm" = EXCLUDED."espesorMm", "actualizadoEn" = now();
INSERT INTO "MaterialVariante" (id, material, familia, "espesorMm", "actualizadoEn") VALUES (gen_random_uuid()::text, 'Inox 0,5mm', 'Inox', 0.5, now()) ON CONFLICT (material) DO UPDATE SET familia = EXCLUDED.familia, "espesorMm" = EXCLUDED."espesorMm", "actualizadoEn" = now();
INSERT INTO "MaterialVariante" (id, material, familia, "espesorMm", "actualizadoEn") VALUES (gen_random_uuid()::text, 'Inox 0,7mm', 'Inox', 0.7, now()) ON CONFLICT (material) DO UPDATE SET familia = EXCLUDED.familia, "espesorMm" = EXCLUDED."espesorMm", "actualizadoEn" = now();
INSERT INTO "MaterialVariante" (id, material, familia, "espesorMm", "actualizadoEn") VALUES (gen_random_uuid()::text, 'Inox 0,9mm', 'Inox', 0.9, now()) ON CONFLICT (material) DO UPDATE SET familia = EXCLUDED.familia, "espesorMm" = EXCLUDED."espesorMm", "actualizadoEn" = now();
INSERT INTO "MaterialVariante" (id, material, familia, "espesorMm", "actualizadoEn") VALUES (gen_random_uuid()::text, 'Inox 1,2mm', 'Inox', 1.2, now()) ON CONFLICT (material) DO UPDATE SET familia = EXCLUDED.familia, "espesorMm" = EXCLUDED."espesorMm", "actualizadoEn" = now();
INSERT INTO "MaterialVariante" (id, material, familia, "espesorMm", "actualizadoEn") VALUES (gen_random_uuid()::text, 'Inox 1,5mm', 'Inox', 1.5, now()) ON CONFLICT (material) DO UPDATE SET familia = EXCLUDED.familia, "espesorMm" = EXCLUDED."espesorMm", "actualizadoEn" = now();

-- ParametroCosteo (escalares Skin)
INSERT INTO "ParametroCosteo" (id, clave, valor, unidad, descripcion, "actualizadoEn") VALUES (gen_random_uuid()::text, 'skin_costilla_area', 0.522, 'm2', 'Area costilla Skin', now()) ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor, "actualizadoEn" = now();
INSERT INTO "ParametroCosteo" (id, clave, valor, unidad, descripcion, "actualizadoEn") VALUES (gen_random_uuid()::text, 'skin_costilla_espesor', 1.6, 'mm', 'Espesor costilla Skin', now()) ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor, "actualizadoEn" = now();
INSERT INTO "ParametroCosteo" (id, clave, valor, unidad, descripcion, "actualizadoEn") VALUES (gen_random_uuid()::text, 'skin_mensula_area', 0.02584, 'm2', 'Area mensula Skin', now()) ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor, "actualizadoEn" = now();
INSERT INTO "ParametroCosteo" (id, clave, valor, unidad, descripcion, "actualizadoEn") VALUES (gen_random_uuid()::text, 'skin_mensula_espesor', 2.5, 'mm', 'Espesor mensula Skin', now()) ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor, "actualizadoEn" = now();
INSERT INTO "ParametroCosteo" (id, clave, valor, unidad, descripcion, "actualizadoEn") VALUES (gen_random_uuid()::text, 'pintura_polvo', 14.0, 'u$d/kg', 'Precio pintura polvo', now()) ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor, "actualizadoEn" = now();
INSERT INTO "ParametroCosteo" (id, clave, valor, unidad, descripcion, "actualizadoEn") VALUES (gen_random_uuid()::text, 'pintura_cobertura', 9.0, 'm2/kg', 'Cobertura pintura polvo', now()) ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor, "actualizadoEn" = now();
INSERT INTO "ParametroCosteo" (id, clave, valor, unidad, descripcion, "actualizadoEn") VALUES (gen_random_uuid()::text, 'pintura_sobreaplic', 1.3, '-', 'Factor sobre-aplicacion pintura', now()) ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor, "actualizadoEn" = now();
INSERT INTO "ParametroCosteo" (id, clave, valor, unidad, descripcion, "actualizadoEn") VALUES (gen_random_uuid()::text, 'pintura_horneada_costo', 27.5, 'u$d/pz', 'Costo horneado por pieza', now()) ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor, "actualizadoEn" = now();
INSERT INTO "ParametroCosteo" (id, clave, valor, unidad, descripcion, "actualizadoEn") VALUES (gen_random_uuid()::text, 'pintura_horneada_piezas', 100.0, 'pz', 'Piezas por horneada', now()) ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor, "actualizadoEn" = now();
INSERT INTO "ParametroCosteo" (id, clave, valor, unidad, descripcion, "actualizadoEn") VALUES (gen_random_uuid()::text, 'fijacion_broca', 0.62, 'u$d', 'Costo broca por unidad', now()) ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor, "actualizadoEn" = now();
INSERT INTO "ParametroCosteo" (id, clave, valor, unidad, descripcion, "actualizadoEn") VALUES (gen_random_uuid()::text, 'fijacion_autoperf', 0.0285, 'u$d', 'Costo tornillo autoperforante', now()) ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor, "actualizadoEn" = now();
INSERT INTO "ParametroCosteo" (id, clave, valor, unidad, descripcion, "actualizadoEn") VALUES (gen_random_uuid()::text, 'acm_area_placa', 7.5, 'm2', 'Area placa ACM', now()) ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor, "actualizadoEn" = now();
INSERT INTO "ParametroCosteo" (id, clave, valor, unidad, descripcion, "actualizadoEn") VALUES (gen_random_uuid()::text, 'acm_fab_placa', 8.367600287643281, 'u$d/pz', 'Fab costo placa ACM', now()) ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor, "actualizadoEn" = now();
INSERT INTO "ParametroCosteo" (id, clave, valor, unidad, descripcion, "actualizadoEn") VALUES (gen_random_uuid()::text, 'acm_acc_panel', 4.0, 'pz', 'Accesorios por panel ACM', now()) ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor, "actualizadoEn" = now();
INSERT INTO "ParametroCosteo" (id, clave, valor, unidad, descripcion, "actualizadoEn") VALUES (gen_random_uuid()::text, 'acm_acc_costo', 1.5, 'u$d', 'Costo accesorio ACM', now()) ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor, "actualizadoEn" = now();
INSERT INTO "ParametroCosteo" (id, clave, valor, unidad, descripcion, "actualizadoEn") VALUES (gen_random_uuid()::text, 'galv_densidad', 7850.0, 'kg/m3', 'Densidad Acero Galvanizado', now()) ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor, "actualizadoEn" = now();
INSERT INTO "ParametroCosteo" (id, clave, valor, unidad, descripcion, "actualizadoEn") VALUES (gen_random_uuid()::text, 'galv_precio_ton', 1400.0, 'u$d/t', 'Precio ton Acero Galvanizado', now()) ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor, "actualizadoEn" = now();
INSERT INTO "ParametroCosteo" (id, clave, valor, unidad, descripcion, "actualizadoEn") VALUES (gen_random_uuid()::text, 'skin_empalme_area', 0.0387, 'm2', 'Area empalme costilla Skin', now()) ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor, "actualizadoEn" = now();
INSERT INTO "ParametroCosteo" (id, clave, valor, unidad, descripcion, "actualizadoEn") VALUES (gen_random_uuid()::text, 'skin_empalme_espesor', 1.6, 'mm', 'Espesor empalme costilla Skin', now()) ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor, "actualizadoEn" = now();
