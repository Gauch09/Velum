INSERT INTO "ParametroCosteo" (id, clave, valor, unidad, descripcion, "actualizadoEn")
VALUES (
  gen_random_uuid()::text,
  'fresado_costo_m2',
  6.0,
  'u$d/m²',
  'Costo de fresado por m² (ACM, MDF, Melamina, madera)',
  now()
)
ON CONFLICT (clave) DO UPDATE
  SET valor = EXCLUDED.valor, "actualizadoEn" = now();
