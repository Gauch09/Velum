# Cotizador Superador — Modelo de Costeo de Fabricación

**Fecha:** 2026-06-12
**Estado:** Diseño aprobado (conceptual). Pendiente carga de datos reales.
**Objetivo:** Determinar el **costo real de fabricación por unidad de producto** para evaluar márgenes y rentabilidad. (Montaje queda fuera de alcance en esta etapa.)
**Destino final:** Módulo dentro del sistema VELUM (Next.js 14 + Supabase). Esta etapa define solo la lógica de costeo, validada antes de implementar.

---

## 1. Contexto y origen

El modelo nace de analizar dos planillas existentes:

- **`HULL - Presupuestador 3.1.xlsm`** — contiene dos motores mezclados:
  - *Motor comercial* (hojas `Presupuesto`, `Valores`, `Costos`, `Variantes`): calcula **precio de venta al cliente por m²** con factores K paramétricos. No es costo real.
  - *Motor de costo real* (hoja `Costos Productos`): costeo bottom-up de ~16 piezas estándar a partir de un **costo operativo único de 1,159 u$d/min**. Es la base que este diseño reemplaza y mejora.
- **`Control de Produccion dinamico.xlsx`** — la hoja **`datos`** aporta, para ~55 productos: tiempos reales por proceso (min/100u corte y plegado), aprovechamiento (unidades por chapa) y **capacidad por máquina** (piezas/hora de Láser, Punzonadora, Plegadora, Fresadora, Polvo, Embalado). Es la fuente de tiempos del nuevo modelo.

---

## 2. Hallazgos del modelo viejo que este diseño corrige

| # | Problema en `Costos Productos` | Corrección en este diseño |
|---|-------------------------------|----------------------------|
| 1 | Un **único** costo de 1,159 u$d/min aplicado igual a láser, plegado, pintura y depto técnico; el factor `×4` ("capacidad operativa") asume 4 procesos siempre en paralelo. | **Tarifa horaria por centro de trabajo**, repartiendo el costo fijo de cada centro sobre su **capacidad instalada máxima**. |
| 2 | Costo de pintura `=D6*11*I*2*1.3` **multiplica** por la cobertura (11 m²/kg) en lugar de dividir → ~121× el valor; además mezcla escala 1u con 100u. | Fórmula de polvo **divide** por la cobertura, todo por unidad consistente. |
| 3 | MP usa **peso neto teórico** de la pieza, ignora merma de chapa. | MP por **fracción de chapa consumida** vía *unidades por chapa* (dato medido). |
| 4 | El aprovechamiento (col K) se calcula pero **no** se usa en el costo de MP. | El aprovechamiento es el divisor directo del costo de MP. |
| 5 | Densidad fija de acero (7,85) y precio fijo (1.400 u$d/t galvanizado) para **todos** los materiales. | Tabla de **Materiales** con densidad y precio/ton propios (acero, aluminio, inox, compuesto, Luxidier…). |
| 6 | Factor `×2,5` del Depto Técnico sin justificación. | Depto Técnico es un centro de trabajo más, con su tarifa real. |
| 7 | Costo y margen e impuestos mezclados; el "costo unitario crudo" (AF) resta la pintura pero incluye margen e impuestos. | **5 capas separadas**: costo / margen / impuestos no se contaminan. |

---

## 3. Arquitectura — 5 capas

### Capa 0 — Parámetros maestros (tablas que se cargan y casi no cambian)

- **Centros de trabajo**: `nombre`, `costo_mensual` (u$d), `horas_disponibles_mes`. Deriva `tarifa_horaria`.
  Centros: Láser, Punzonadora, Plegadora, Fresadora, Cabina de Polvo, Horno, Embalado, Depto Técnico.
- **Materiales**: `nombre`, `densidad` (kg/m³), `precio` (u$d/ton). Ej.: acero 7.850, aluminio 2.700, inox 8.000, aluminio compuesto, Luxidier.
- **Insumos**: pintura en polvo (`precio_kg`, `cobertura_m2_kg`), consumibles, gases.
- **Planta**: horas hábiles/mes, factores de merma por tipo de corte (si aplica).
- **Chapa**: dimensiones y área de la chapa estándar por material.

### Capa 1 — Definición de producto (receta + hoja de ruta)

- **Geometría**: ancho `a` [mm], largo `l` [mm], espesor `e` [mm], `material`.
- **Hoja de ruta**: secuencia **variable** de pasos (cada producto tiene la suya). Cada paso referencia un centro de trabajo. Ej.: Láser → Plegadora → Polvo → Embalado; otro: Punzonadora → Embalado.
- **Aprovechamiento**: `unidades_por_chapa` (`U_ch`).
- **Capacidad por paso**: piezas/hora del centro para ese tipo de pieza.
- **Pintura** (si "Polvo" en la ruta): `area_pintar`, `caras` (1 frente / 2 completo).

### Capa 2 — Costo directo unitario

**a) Materia prima (por chapa consumida):**
```
Peso_chapa[kg]  = Área_chapa[m²] × (e[mm] / 1000) × densidad_material[kg/m³]
Costo_MP/u      = (Peso_chapa / 1000) × Precio_material[u$d/ton] / U_ch
```

**b) Operaciones (recorriendo la ruta):**
```
tarifa_centro[u$d/h]  = Costo_mensual_centro / Horas_disponibles_mes
Costo_paso/u          = tarifa_centro / Capacidad_instalada_máx[piezas/h, por tipo de pieza]
Costo_operaciones/u   = Σ Costo_paso  (solo pasos activos de la ruta)
```

**c) Pintura + horno (solo si "Polvo" en la ruta):**
```
Costo_polvo/u  = (Área_pintar × Caras × Factor_sobreaplicación / Cobertura[m²/kg]) × Precio_polvo[u$d/kg]
Costo_horno/u  = Costo_horneada / Piezas_por_horneada
```
Valores de referencia: `Factor_sobreaplicación ≈ 1,3`, `Cobertura = 11 m²/kg`, `Precio_polvo = 13 u$d/kg`.
La mano de obra/máquina de la cabina ya entra como paso de operación en (b); no se duplica.

**d) Consumibles:** tabla por producto, o `% sobre MP` provisional mientras no estén desagregados.

### Capa 3 — Costo de fabricación unitario
```
COSTO_FABRICACIÓN/u = Costo_MP + Costo_operaciones + Costo_polvo + Costo_horno + Consumibles
```
**Aquí termina el objetivo de esta etapa.** Este número es consultable sin que margen ni impuestos lo ensucien.

### Capa 4 — Margen → precio antes de impuestos
Margen parametrizable por producto o por familia. `Precio_pre_imp = Costo_fabricación / (1 − margen)` o `× (1 + markup)` (a definir en implementación).

### Capa 5 — Cargas fiscales y costo financiero → precio final
IVA, IIBB/RG, impuesto al cheque, costo financiero — en capa separada, sobre el precio, no sobre el costo.

---

## 4. Datos pendientes de relevar (placeholders)

Marcados como **"REEMPLAZAR CON DATO REAL"**; el modelo funciona con provisionales hasta entonces:

1. **Capacidad instalada máxima por equipo × tipo de pieza** — driver del costo de operaciones. *Provisional:* piezas/hora de la hoja `datos`.
2. **Costo fijo real por centro de trabajo** — el valor de 50.000 u$d era placeholder; el real es menor y se desagrega por centro. *Provisional:* a definir.
3. Costos de insumos/consumibles desagregados.
4. Densidades y precios/ton por material no-acero.

---

## 5. Alcance explícito

**Incluido:** costo de fabricación por unidad, con ruta variable, por centro de trabajo.
**Excluido (otra etapa):** montaje, transporte, logística, precio de venta al cliente (motor comercial), márgenes finos por proyecto.

---

## 6. Próximo paso

Plan de implementación (writing-plans) para materializar el modelo. Decisión pendiente de implementación: si el primer entregable es una **planilla de validación** del modelo con los datos actuales, o directamente el **módulo en VELUM** (tablas Supabase + UI de cotización).
