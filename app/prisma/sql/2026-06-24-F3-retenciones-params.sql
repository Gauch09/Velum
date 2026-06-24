-- =============================================================================
-- F3: Porcentajes de retención por defecto
-- Aplicar en: Supabase SQL Editor (NUNCA prisma migrate)
-- Generado: 2026-06-24
-- =============================================================================

INSERT INTO "ParametroCosteo" (id, clave, valor, unidad, descripcion, "actualizadoEn") VALUES
  (gen_random_uuid()::text, 'ret_iva_pct',       10.5, '%', 'Retencion IVA default (%)',            now()),
  (gen_random_uuid()::text, 'ret_ganancias_pct',  2.0, '%', 'Retencion Ganancias default (%)',      now()),
  (gen_random_uuid()::text, 'ret_iibb_pct',        3.0, '%', 'Retencion IIBB default (%)',           now()),
  (gen_random_uuid()::text, 'ret_suss_pct',        1.2, '%', 'Retencion SUSS/Construccion (%)',     now())
ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor, "actualizadoEn" = now();
