# Lee la planilla viva y emite INSERTs SQL de parametros de calibracion.
# Celdas segun docs/2026-06-22-lunes-checklist.md.
# Correcciones al mapa de celdas original:
#   - PIEZAS: "PIC 150" -> "PIC 150 (mensula)" (nombre real en col A, fila 4)
#   - Resto de nombres y celdas coinciden con el sheet.
import sys
from openpyxl import load_workbook

RUTA = sys.argv[1] if len(sys.argv) > 1 else "Cotizador VELUM - Validacion Modelo v7.xlsx"
wb = load_workbook(RUTA, data_only=True)

def cell(hoja, ref):
    return wb[hoja][ref].value

# Parametros escalares: clave -> (hoja, celda, unidad, descripcion)
PARAMS = {
    "tasa_planta": ("Parametros", "B13", "$/h", "Tasa de planta unica"),
    "tipo_cambio": ("Parametros", "B4", "$/u$d", "TC pesos por dolar"),
}
print("-- ParametroCosteo")
for clave, (hoja, ref, unidad, desc) in PARAMS.items():
    v = cell(hoja, ref)
    print(f"INSERT INTO \"ParametroCosteo\" (id, clave, valor, unidad, descripcion, \"actualizadoEn\") "
          f"VALUES (gen_random_uuid()::text, '{clave}', {v}, '{unidad}', '{desc}', now()) "
          f"ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor;")

# Capacidades: fila de 'Capacidad Fab', columnas B..F = Laser/Plegadora/Punzonadora/Pintura/Embalado
CENTROS = [("B", "LASER"), ("C", "PLEGADORA"), ("D", "PUNZONADORA"), ("E", "PINTURA"), ("F", "EMBALADO")]
PIEZAS = {
    "PIC 150 (mensula)": 4, "Costilla 1500": 5, "Costilla 3000": 6, "Empalme Costilla": 7,
    "Parante 300": 8, "Skin Standard": 9, "Skin Custom": 10,
    "MultiSlim Standard": 11, "MultiSlim Custom": 12,
}
print("-- CapacidadCentro")
for pieza, fila in PIEZAS.items():
    for col, centro in CENTROS:
        v = cell("Capacidad Fab", f"{col}{fila}")
        if v is None or v == "-":
            continue
        print(f"INSERT INTO \"CapacidadCentro\" (id, pieza, centro, \"unidadesPorDia\", \"actualizadoEn\") "
              f"VALUES (gen_random_uuid()::text, '{pieza}', '{centro}', {v}, now()) "
              f"ON CONFLICT (pieza, centro) DO UPDATE SET \"unidadesPorDia\" = EXCLUDED.\"unidadesPorDia\";")

# Kp
print("-- FactorKp")
kp = cell("Factores Kp", "B11")
print(f"INSERT INTO \"FactorKp\" (id, clave, valor, \"actualizadoEn\") "
      f"VALUES (gen_random_uuid()::text, 'composite', {kp}, now()) "
      f"ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor;")
