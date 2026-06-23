-- =============================================================================
-- F0 Cotizador — DDL + Seed idempotente para Supabase SQL Editor
-- Generado: 2026-06-21
-- Instrucciones: pegar en Supabase → SQL Editor → Run
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. ENUMS (idempotentes)
-- ---------------------------------------------------------------------------

DO $$ BEGIN CREATE TYPE "CondicionIva" AS ENUM ('RESPONSABLE_INSCRIPTO','MONOTRIBUTO','EXENTO'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "EstadoCotizacion" AS ENUM ('BORRADOR','ENVIADA','VISTA','ACEPTADA','RECHAZADA'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "AlcanceCotizacion" AS ENUM ('PROVISION','PROVISION_MONTAJE'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "ModoPagoMontaje" AS ENUM ('INCLUIDO_PAQUETE','CERTIFICACIONES'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "TipoRetencion" AS ENUM ('IVA','GANANCIAS','IIBB','SUSS'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "CentroTrabajo" AS ENUM ('LASER','PLEGADORA','PUNZONADORA','PINTURA','EMBALADO'); EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ---------------------------------------------------------------------------
-- 2. TABLAS
-- ---------------------------------------------------------------------------

-- Cliente
CREATE TABLE IF NOT EXISTS "Cliente" (
  id                 text PRIMARY KEY,
  "razonSocial"      text NOT NULL,
  cuit               text NOT NULL UNIQUE,
  "condicionIva"     "CondicionIva" NOT NULL,
  "domicilioFiscal"  text,
  "jurisdiccionIibb" text,
  "esAgenteRetencion" boolean NOT NULL DEFAULT false,
  "createdAt"        timestamptz NOT NULL DEFAULT now()
);

-- Contacto
CREATE TABLE IF NOT EXISTS "Contacto" (
  id          text PRIMARY KEY,
  "clienteId" text NOT NULL REFERENCES "Cliente"(id),
  nombre      text NOT NULL,
  cargo       text,
  email       text NOT NULL,
  telefono    text
);

-- Cotizacion
CREATE TABLE IF NOT EXISTS "Cotizacion" (
  id              text PRIMARY KEY,
  numero          text NOT NULL UNIQUE,
  "clienteId"     text NOT NULL REFERENCES "Cliente"(id),
  -- proyectoId apunta a la tabla Proyecto de produccion; se deja sin FK intencional para no acoplar esquemas
  "proyectoId"    text,
  version         integer NOT NULL DEFAULT 1,
  estado          "EstadoCotizacion" NOT NULL DEFAULT 'BORRADOR',
  alcance         "AlcanceCotizacion" NOT NULL DEFAULT 'PROVISION',
  "margenPct"     double precision NOT NULL DEFAULT 0,
  "totalProducto" double precision NOT NULL DEFAULT 0,
  "totalMontaje"  double precision NOT NULL DEFAULT 0,
  "tcUsado"       double precision NOT NULL,
  "ubicacionObra" text,
  "createdAt"     timestamptz NOT NULL DEFAULT now()
);

-- CotizacionVano
CREATE TABLE IF NOT EXISTS "CotizacionVano" (
  id               text PRIMARY KEY,
  "cotizacionId"   text NOT NULL REFERENCES "Cotizacion"(id),
  sistema          text NOT NULL,
  material         text NOT NULL,
  terminacion      text NOT NULL,
  ancho            double precision NOT NULL,
  alto             double precision NOT NULL,
  "costoFab"       double precision NOT NULL DEFAULT 0,
  "costoMaterial"  double precision NOT NULL DEFAULT 0,
  precio           double precision NOT NULL DEFAULT 0
);

-- CondicionesComerciales
CREATE TABLE IF NOT EXISTS "CondicionesComerciales" (
  id                   text PRIMARY KEY,
  "cotizacionId"       text NOT NULL UNIQUE REFERENCES "Cotizacion"(id),
  "formaPagoProducto"  text NOT NULL,
  "modoPagoMontaje"    "ModoPagoMontaje" NOT NULL DEFAULT 'INCLUIDO_PAQUETE',
  "variosPct"          double precision NOT NULL DEFAULT 10
);

-- Retencion
CREATE TABLE IF NOT EXISTS "Retencion" (
  id            text PRIMARY KEY,
  "condicionId" text NOT NULL REFERENCES "CondicionesComerciales"(id),
  tipo          "TipoRetencion" NOT NULL,
  porcentaje    double precision NOT NULL
);

-- Certificacion
CREATE TABLE IF NOT EXISTS "Certificacion" (
  id            text PRIMARY KEY,
  "condicionId" text NOT NULL REFERENCES "CondicionesComerciales"(id),
  descripcion   text NOT NULL,
  porcentaje    double precision NOT NULL,
  monto         double precision
);

-- ParametroCosteo
CREATE TABLE IF NOT EXISTS "ParametroCosteo" (
  id            text PRIMARY KEY,
  clave         text NOT NULL UNIQUE,
  valor         double precision NOT NULL,
  unidad        text,
  descripcion   text,
  "actualizadoEn" timestamptz NOT NULL DEFAULT now()
);

-- CapacidadCentro
CREATE TABLE IF NOT EXISTS "CapacidadCentro" (
  id               text PRIMARY KEY,
  pieza            text NOT NULL,
  centro           "CentroTrabajo" NOT NULL,
  "unidadesPorDia" double precision,
  "actualizadoEn"  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (pieza, centro)
);

-- FactorKp
CREATE TABLE IF NOT EXISTS "FactorKp" (
  id              text PRIMARY KEY,
  clave           text NOT NULL UNIQUE,
  valor           double precision NOT NULL,
  "actualizadoEn" timestamptz NOT NULL DEFAULT now()
);

-- SistemaCotizador
CREATE TABLE IF NOT EXISTS "SistemaCotizador" (
  id     text PRIMARY KEY,
  nombre text NOT NULL UNIQUE,
  activo boolean NOT NULL DEFAULT true
);

-- MaterialCotizador
CREATE TABLE IF NOT EXISTS "MaterialCotizador" (
  id       text PRIMARY KEY,
  codigo   text NOT NULL UNIQUE,
  nombre   text NOT NULL,
  "precioU" double precision,
  unidad   text NOT NULL DEFAULT 'kg'
);

-- MedioElevacion
CREATE TABLE IF NOT EXISTS "MedioElevacion" (
  id           text PRIMARY KEY,
  nombre       text NOT NULL UNIQUE,
  "alturaMaxM" double precision NOT NULL,
  "costoDia"   double precision
);

-- CatalogoRenglonMontaje
CREATE TABLE IF NOT EXISTS "CatalogoRenglonMontaje" (
  id          text PRIMARY KEY,
  nombre      text NOT NULL UNIQUE,
  categoria   text NOT NULL,
  unidad      text NOT NULL,
  activo      boolean NOT NULL DEFAULT true
);

-- ---------------------------------------------------------------------------
-- 3. SEED — ParametroCosteo / CapacidadCentro / FactorKp
--    (extraido de Cotizador VELUM - Validacion Modelo v7.xlsx)
-- ---------------------------------------------------------------------------

-- ParametroCosteo
INSERT INTO "ParametroCosteo" (id, clave, valor, unidad, descripcion, "actualizadoEn") VALUES (gen_random_uuid()::text, 'tasa_planta', 17046.553144129102, '$/h', 'Tasa de planta unica', now()) ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor, "actualizadoEn" = now();
INSERT INTO "ParametroCosteo" (id, clave, valor, unidad, descripcion, "actualizadoEn") VALUES (gen_random_uuid()::text, 'tipo_cambio', 1460.0, '$/u$d', 'TC pesos por dolar', now()) ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor, "actualizadoEn" = now();

-- CapacidadCentro
INSERT INTO "CapacidadCentro" (id, pieza, centro, "unidadesPorDia", "actualizadoEn") VALUES (gen_random_uuid()::text, 'PIC 150 (mensula)', 'LASER', 760.0, now()) ON CONFLICT (pieza, centro) DO UPDATE SET "unidadesPorDia" = EXCLUDED."unidadesPorDia";
INSERT INTO "CapacidadCentro" (id, pieza, centro, "unidadesPorDia", "actualizadoEn") VALUES (gen_random_uuid()::text, 'PIC 150 (mensula)', 'PLEGADORA', 680.0, now()) ON CONFLICT (pieza, centro) DO UPDATE SET "unidadesPorDia" = EXCLUDED."unidadesPorDia";
INSERT INTO "CapacidadCentro" (id, pieza, centro, "unidadesPorDia", "actualizadoEn") VALUES (gen_random_uuid()::text, 'PIC 150 (mensula)', 'PINTURA', 667.0, now()) ON CONFLICT (pieza, centro) DO UPDATE SET "unidadesPorDia" = EXCLUDED."unidadesPorDia";
INSERT INTO "CapacidadCentro" (id, pieza, centro, "unidadesPorDia", "actualizadoEn") VALUES (gen_random_uuid()::text, 'PIC 150 (mensula)', 'EMBALADO', 640.0, now()) ON CONFLICT (pieza, centro) DO UPDATE SET "unidadesPorDia" = EXCLUDED."unidadesPorDia";
INSERT INTO "CapacidadCentro" (id, pieza, centro, "unidadesPorDia", "actualizadoEn") VALUES (gen_random_uuid()::text, 'Costilla 1500', 'LASER', 112.0, now()) ON CONFLICT (pieza, centro) DO UPDATE SET "unidadesPorDia" = EXCLUDED."unidadesPorDia";
INSERT INTO "CapacidadCentro" (id, pieza, centro, "unidadesPorDia", "actualizadoEn") VALUES (gen_random_uuid()::text, 'Costilla 1500', 'PLEGADORA', 824.0, now()) ON CONFLICT (pieza, centro) DO UPDATE SET "unidadesPorDia" = EXCLUDED."unidadesPorDia";
INSERT INTO "CapacidadCentro" (id, pieza, centro, "unidadesPorDia", "actualizadoEn") VALUES (gen_random_uuid()::text, 'Costilla 1500', 'PINTURA', 320.0, now()) ON CONFLICT (pieza, centro) DO UPDATE SET "unidadesPorDia" = EXCLUDED."unidadesPorDia";
INSERT INTO "CapacidadCentro" (id, pieza, centro, "unidadesPorDia", "actualizadoEn") VALUES (gen_random_uuid()::text, 'Costilla 1500', 'EMBALADO', 800.0, now()) ON CONFLICT (pieza, centro) DO UPDATE SET "unidadesPorDia" = EXCLUDED."unidadesPorDia";
INSERT INTO "CapacidadCentro" (id, pieza, centro, "unidadesPorDia", "actualizadoEn") VALUES (gen_random_uuid()::text, 'Costilla 3000', 'LASER', 56.0, now()) ON CONFLICT (pieza, centro) DO UPDATE SET "unidadesPorDia" = EXCLUDED."unidadesPorDia";
INSERT INTO "CapacidadCentro" (id, pieza, centro, "unidadesPorDia", "actualizadoEn") VALUES (gen_random_uuid()::text, 'Costilla 3000', 'PLEGADORA', 736.0, now()) ON CONFLICT (pieza, centro) DO UPDATE SET "unidadesPorDia" = EXCLUDED."unidadesPorDia";
INSERT INTO "CapacidadCentro" (id, pieza, centro, "unidadesPorDia", "actualizadoEn") VALUES (gen_random_uuid()::text, 'Costilla 3000', 'PINTURA', 160.0, now()) ON CONFLICT (pieza, centro) DO UPDATE SET "unidadesPorDia" = EXCLUDED."unidadesPorDia";
INSERT INTO "CapacidadCentro" (id, pieza, centro, "unidadesPorDia", "actualizadoEn") VALUES (gen_random_uuid()::text, 'Costilla 3000', 'EMBALADO', 1200.0, now()) ON CONFLICT (pieza, centro) DO UPDATE SET "unidadesPorDia" = EXCLUDED."unidadesPorDia";
INSERT INTO "CapacidadCentro" (id, pieza, centro, "unidadesPorDia", "actualizadoEn") VALUES (gen_random_uuid()::text, 'Empalme Costilla', 'LASER', 432.0, now()) ON CONFLICT (pieza, centro) DO UPDATE SET "unidadesPorDia" = EXCLUDED."unidadesPorDia";
INSERT INTO "CapacidadCentro" (id, pieza, centro, "unidadesPorDia", "actualizadoEn") VALUES (gen_random_uuid()::text, 'Empalme Costilla', 'PLEGADORA', 688.0, now()) ON CONFLICT (pieza, centro) DO UPDATE SET "unidadesPorDia" = EXCLUDED."unidadesPorDia";
INSERT INTO "CapacidadCentro" (id, pieza, centro, "unidadesPorDia", "actualizadoEn") VALUES (gen_random_uuid()::text, 'Empalme Costilla', 'PINTURA', 667.0, now()) ON CONFLICT (pieza, centro) DO UPDATE SET "unidadesPorDia" = EXCLUDED."unidadesPorDia";
INSERT INTO "CapacidadCentro" (id, pieza, centro, "unidadesPorDia", "actualizadoEn") VALUES (gen_random_uuid()::text, 'Empalme Costilla', 'EMBALADO', 920.0, now()) ON CONFLICT (pieza, centro) DO UPDATE SET "unidadesPorDia" = EXCLUDED."unidadesPorDia";
INSERT INTO "CapacidadCentro" (id, pieza, centro, "unidadesPorDia", "actualizadoEn") VALUES (gen_random_uuid()::text, 'Parante 300', 'LASER', 2080.0, now()) ON CONFLICT (pieza, centro) DO UPDATE SET "unidadesPorDia" = EXCLUDED."unidadesPorDia";
INSERT INTO "CapacidadCentro" (id, pieza, centro, "unidadesPorDia", "actualizadoEn") VALUES (gen_random_uuid()::text, 'Parante 300', 'PLEGADORA', 1120.0, now()) ON CONFLICT (pieza, centro) DO UPDATE SET "unidadesPorDia" = EXCLUDED."unidadesPorDia";
INSERT INTO "CapacidadCentro" (id, pieza, centro, "unidadesPorDia", "actualizadoEn") VALUES (gen_random_uuid()::text, 'Parante 300', 'PINTURA', 533.0, now()) ON CONFLICT (pieza, centro) DO UPDATE SET "unidadesPorDia" = EXCLUDED."unidadesPorDia";
INSERT INTO "CapacidadCentro" (id, pieza, centro, "unidadesPorDia", "actualizadoEn") VALUES (gen_random_uuid()::text, 'Parante 300', 'EMBALADO', 800.0, now()) ON CONFLICT (pieza, centro) DO UPDATE SET "unidadesPorDia" = EXCLUDED."unidadesPorDia";
INSERT INTO "CapacidadCentro" (id, pieza, centro, "unidadesPorDia", "actualizadoEn") VALUES (gen_random_uuid()::text, 'Skin Standard', 'LASER', 16.0, now()) ON CONFLICT (pieza, centro) DO UPDATE SET "unidadesPorDia" = EXCLUDED."unidadesPorDia";
INSERT INTO "CapacidadCentro" (id, pieza, centro, "unidadesPorDia", "actualizadoEn") VALUES (gen_random_uuid()::text, 'Skin Standard', 'PLEGADORA', 192.0, now()) ON CONFLICT (pieza, centro) DO UPDATE SET "unidadesPorDia" = EXCLUDED."unidadesPorDia";
INSERT INTO "CapacidadCentro" (id, pieza, centro, "unidadesPorDia", "actualizadoEn") VALUES (gen_random_uuid()::text, 'Skin Standard', 'PINTURA', 53.0, now()) ON CONFLICT (pieza, centro) DO UPDATE SET "unidadesPorDia" = EXCLUDED."unidadesPorDia";
INSERT INTO "CapacidadCentro" (id, pieza, centro, "unidadesPorDia", "actualizadoEn") VALUES (gen_random_uuid()::text, 'Skin Standard', 'EMBALADO', 200.0, now()) ON CONFLICT (pieza, centro) DO UPDATE SET "unidadesPorDia" = EXCLUDED."unidadesPorDia";
INSERT INTO "CapacidadCentro" (id, pieza, centro, "unidadesPorDia", "actualizadoEn") VALUES (gen_random_uuid()::text, 'Skin Custom', 'LASER', 16.0, now()) ON CONFLICT (pieza, centro) DO UPDATE SET "unidadesPorDia" = EXCLUDED."unidadesPorDia";
INSERT INTO "CapacidadCentro" (id, pieza, centro, "unidadesPorDia", "actualizadoEn") VALUES (gen_random_uuid()::text, 'Skin Custom', 'PLEGADORA', 192.0, now()) ON CONFLICT (pieza, centro) DO UPDATE SET "unidadesPorDia" = EXCLUDED."unidadesPorDia";
INSERT INTO "CapacidadCentro" (id, pieza, centro, "unidadesPorDia", "actualizadoEn") VALUES (gen_random_uuid()::text, 'Skin Custom', 'PINTURA', 53.0, now()) ON CONFLICT (pieza, centro) DO UPDATE SET "unidadesPorDia" = EXCLUDED."unidadesPorDia";
INSERT INTO "CapacidadCentro" (id, pieza, centro, "unidadesPorDia", "actualizadoEn") VALUES (gen_random_uuid()::text, 'Skin Custom', 'EMBALADO', 200.0, now()) ON CONFLICT (pieza, centro) DO UPDATE SET "unidadesPorDia" = EXCLUDED."unidadesPorDia";
INSERT INTO "CapacidadCentro" (id, pieza, centro, "unidadesPorDia", "actualizadoEn") VALUES (gen_random_uuid()::text, 'MultiSlim Standard', 'LASER', 24.0, now()) ON CONFLICT (pieza, centro) DO UPDATE SET "unidadesPorDia" = EXCLUDED."unidadesPorDia";
INSERT INTO "CapacidadCentro" (id, pieza, centro, "unidadesPorDia", "actualizadoEn") VALUES (gen_random_uuid()::text, 'MultiSlim Standard', 'PLEGADORA', 320.0, now()) ON CONFLICT (pieza, centro) DO UPDATE SET "unidadesPorDia" = EXCLUDED."unidadesPorDia";
INSERT INTO "CapacidadCentro" (id, pieza, centro, "unidadesPorDia", "actualizadoEn") VALUES (gen_random_uuid()::text, 'MultiSlim Standard', 'PUNZONADORA', 480.0, now()) ON CONFLICT (pieza, centro) DO UPDATE SET "unidadesPorDia" = EXCLUDED."unidadesPorDia";
INSERT INTO "CapacidadCentro" (id, pieza, centro, "unidadesPorDia", "actualizadoEn") VALUES (gen_random_uuid()::text, 'MultiSlim Standard', 'PINTURA', 80.0, now()) ON CONFLICT (pieza, centro) DO UPDATE SET "unidadesPorDia" = EXCLUDED."unidadesPorDia";
INSERT INTO "CapacidadCentro" (id, pieza, centro, "unidadesPorDia", "actualizadoEn") VALUES (gen_random_uuid()::text, 'MultiSlim Standard', 'EMBALADO', 400.0, now()) ON CONFLICT (pieza, centro) DO UPDATE SET "unidadesPorDia" = EXCLUDED."unidadesPorDia";
INSERT INTO "CapacidadCentro" (id, pieza, centro, "unidadesPorDia", "actualizadoEn") VALUES (gen_random_uuid()::text, 'MultiSlim Custom', 'LASER', 24.0, now()) ON CONFLICT (pieza, centro) DO UPDATE SET "unidadesPorDia" = EXCLUDED."unidadesPorDia";
INSERT INTO "CapacidadCentro" (id, pieza, centro, "unidadesPorDia", "actualizadoEn") VALUES (gen_random_uuid()::text, 'MultiSlim Custom', 'PLEGADORA', 320.0, now()) ON CONFLICT (pieza, centro) DO UPDATE SET "unidadesPorDia" = EXCLUDED."unidadesPorDia";
INSERT INTO "CapacidadCentro" (id, pieza, centro, "unidadesPorDia", "actualizadoEn") VALUES (gen_random_uuid()::text, 'MultiSlim Custom', 'PUNZONADORA', 384.0, now()) ON CONFLICT (pieza, centro) DO UPDATE SET "unidadesPorDia" = EXCLUDED."unidadesPorDia";
INSERT INTO "CapacidadCentro" (id, pieza, centro, "unidadesPorDia", "actualizadoEn") VALUES (gen_random_uuid()::text, 'MultiSlim Custom', 'PINTURA', 80.0, now()) ON CONFLICT (pieza, centro) DO UPDATE SET "unidadesPorDia" = EXCLUDED."unidadesPorDia";
INSERT INTO "CapacidadCentro" (id, pieza, centro, "unidadesPorDia", "actualizadoEn") VALUES (gen_random_uuid()::text, 'MultiSlim Custom', 'EMBALADO', 400.0, now()) ON CONFLICT (pieza, centro) DO UPDATE SET "unidadesPorDia" = EXCLUDED."unidadesPorDia";

-- FactorKp
INSERT INTO "FactorKp" (id, clave, valor, "actualizadoEn") VALUES (gen_random_uuid()::text, 'composite', 1.5, now()) ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor, "actualizadoEn" = now();

-- ---------------------------------------------------------------------------
-- 4. SEED — Retenciones default (promedios tipicos)
-- ---------------------------------------------------------------------------

INSERT INTO "ParametroCosteo" (id, clave, valor, unidad, descripcion, "actualizadoEn") VALUES
 (gen_random_uuid()::text, 'retencion_default_iva', 10.5, '%', 'Promedio tipico retencion IVA', now()),
 (gen_random_uuid()::text, 'retencion_default_ganancias', 2, '%', 'Promedio tipico retencion Ganancias', now()),
 (gen_random_uuid()::text, 'retencion_default_iibb', 3, '%', 'Promedio tipico retencion IIBB', now()),
 (gen_random_uuid()::text, 'retencion_default_suss', 1.2, '%', 'Promedio tipico retencion SUSS', now())
ON CONFLICT (clave) DO NOTHING;
