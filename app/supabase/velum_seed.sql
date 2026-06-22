-- ══════════════════════════════════════════════════════════════════════════
-- VELUM · SEED de datos reales (de las pantallas .dc.html)
-- Ejecutar DESPUÉS de velum_modelo_operativo.sql.
-- ══════════════════════════════════════════════════════════════════════════
-- Contiene SOLO los datos hardcodeados/semilla que ya viven en las pantallas:
--   · usuarios de login (Inicio.dc.html _usuarios())
--   · 8 productos de capacidad (Capacidad.dc.html _seed())
--   · 4 consumibles (Materia Prima.dc.html _readCons())
--
-- ⚠️ velum_capacidades puede tener MÁS productos cargados a mano en el navegador
--    (solo viven en localStorage, no en el HTML). Si es así, hay que exportar ese
--    JSON del browser de la fábrica y completarlo. Estos 8 son el piso semilla.
-- Stock y tareas arrancan VACÍOS (así están en la app real).
-- ══════════════════════════════════════════════════════════════════════════

-- ── Usuarios de login (Inicio.dc.html) ──
INSERT INTO velum_usuarios (id, name, color, area, display) VALUES
  ('luciano',    'Luciano',    '#E0A56A', 'Oficina', false),
  ('german',     'Germán',     '#5FB87E', 'Oficina', false),
  ('mariu',      'Mariu',      '#E76A95', 'Oficina', false),
  ('joaquin',    'Joaquín',    '#8CB7E8', 'Oficina', false),
  ('juani',      'Juani',      '#C9B79A', 'Oficina', false),
  ('pc_oficina', 'PC Oficina', '#6E7E85', 'Oficina', true),
  ('alexis',     'Alexis',     '#E5A52B', 'Planta',  false),
  ('fran',       'Fran',       '#21C7D6', 'Planta',  false),
  ('lionel',     'Lionel',     '#9B82DC', 'Planta',  false),
  ('erick',      'Erick',      '#F0814F', 'Planta',  false),
  ('javier',     'Javier',     '#4FB870', 'Planta',  false),
  ('pc_planta',  'PC Planta',  '#6E7E85', 'Planta',  true)
ON CONFLICT (id) DO UPDATE SET
  name = excluded.name, color = excluded.color,
  area = excluded.area, display = excluded.display;

-- ── Capacidades (8 productos semilla; el seed del HTML no trae dims/lote/paquete) ──
INSERT INTO velum_capacidades (id, nombre, "enChapa", laser, plegado, fresado, pintura, embalado) VALUES
  ('pic150',   'PIC 150',            135, 95,  85,  0,  25, 80),
  ('cost1500', 'Costilla 1500',       13, 13, 103,  0,  12, 100),
  ('cost3000', 'Costilla 3000',        7,  7,  92,  0,   6, 150),
  ('empcost',  'Empalme Costilla',    90, 54,  86,  0,  25, 115),
  ('skinstd',  'Skin Standard',        2,  2,  24,  0,   2, 25),
  ('skinctm',  'Skin Custom',          2,  2,  24,  0,   2, 25),
  ('msstd',    'MultiSlim Standard',   3,  3,  40, 60,   3, 50),
  ('msctm',    'MultiSlim Custom',     3,  3,  40, 48,   3, 50)
ON CONFLICT (id) DO UPDATE SET
  nombre = excluded.nombre, "enChapa" = excluded."enChapa",
  laser = excluded.laser, plegado = excluded.plegado, fresado = excluded.fresado,
  pintura = excluded.pintura, embalado = excluded.embalado;

-- ── Consumibles (Materia Prima.dc.html) ──
INSERT INTO velum_consumibles (id, nombre, categoria, stock, unidad) VALUES
  ('c1', 'Autoperforante 1/4 x 1"',     'Fijaciones', 1200, 'unidades'),
  ('c2', 'Autoperforante 1/4 x 1 1/2"', 'Fijaciones',  800, 'unidades'),
  ('c3', 'Pintura en polvo gris',       'Pintura',       6, 'cajas'),
  ('c4', 'Pintura en polvo negra',      'Pintura',       4, 'cajas')
ON CONFLICT (id) DO UPDATE SET
  nombre = excluded.nombre, categoria = excluded.categoria,
  stock = excluded.stock, unidad = excluded.unidad;
