# Cotizador Superador — Modelo de Costeo de Fabricación

**Fecha:** 2026-06-12 (actualizado 2026-06-13 con el modelo v3)
**Estado:** Modelo **v3 implementado y validado** en planilla (`Cotizador VELUM - Validacion Modelo v3.xlsx`, en Desktop) con **datos reales** de costos fijos (jun 2026). Pendiente: integración a VELUM y reemplazo de provisionales (horno real, capacidad real medida, TC del día).
**Objetivo:** Determinar el **costo real de fabricación por unidad de producto** para evaluar márgenes y rentabilidad. (Montaje queda fuera de alcance en esta etapa.)
**Destino final:** Módulo dentro del sistema VELUM (Next.js 14 + Supabase). Esta etapa define solo la lógica de costeo, validada antes de implementar.

---

## 0. Decisiones de modelo y datos reales (actualización 2026-06-13)

Esta sección **supersede** lo que digan más abajo las Capas 0 y 2 sobre tarifa por centro y unidades de capacidad. El modelo conceptual de 5 capas se mantiene; cambian tres cosas estructurales que se resolvieron al cargar datos reales.

### Decisiones tomadas

1. **Moneda: pesos indexados al dólar.** El costo de fabricación se expresa en **$ARS**, con un **Tipo de Cambio (TC) parametrizable** (una celda editable). Los insumos dolarizados (materiales `precio/ton`, pintura `u$d/kg`) se multiplican por el TC; la mano de obra y el overhead están en pesos. La planilla muestra además el equivalente en u$d (÷ TC). Cambiar el TC reajusta solo lo importado, no la mano de obra — exactamente "indexado al dólar".
2. **Overhead a TASA DE PLANTA ÚNICA (no por centro).** En vez de una tarifa por centro de trabajo, se usa **una sola tarifa $/h de planta**:
   ```
   pool_mensual   = overhead_fábrica + mano_de_obra_producción
   tasa_planta[$/h] = pool_mensual / horas_productivas_mes   (horas_productivas = dotación × horas/mes)
   ```
   La precisión de ruta se conserva: cada producto sigue pagando el **tiempo que pasa en cada centro** (1/capacidad horaria), pero todos a la misma tarifa. Razón: el dato de costo es de planta, no por máquina; repartir por centro requeriría drivers (energía/dotación/m² por máquina) que hoy no existen. Refinable a per-centro más adelante.
3. **Montaje/Mantenimiento cuenta como producción.** El sueldo de Monzón (área "Montaje/Manten.") entra al pool de mano de obra de producción (no se excluye por "montaje fuera de alcance").

### Unidad de capacidad (corregido)

La hoja `datos` del Excel "Control de Produccion dinamico" tiene el bloque de máquinas (Láser/Plegadora/…) **rotulado "piezas/hora" pero es "Capacidad DIARIA"**. La capacidad horaria real = diaria ÷ horas/día (8). Ej.: Láser PIC/PEC-150 = 759,86/8 = **94,98 pz/h** (coincide con la tabla `CapacidadTeorica` de VELUM). Es el **pico horario sin setup**; el real con setup lo entrega el módulo de Tiempos Reales (`TramoTrabajo`) y lo reemplaza, **una sola vez**, en la celda de capacidad (el factor de utilización entra ahí, no en la tarifa, para no castigar dos veces).

### Datos reales cargados (pesos/mes, jun 2026)

Documentados en la hoja **`Costos Fijos`** de la planilla, con su clasificación (OVH / MP / COM / PROD / DEPTO):

| Concepto | $/mes | Nota |
|---|---:|---|
| Overhead fábrica | 7.227.000 | = 8.427.000 gastos grales − 1.200.000 pintura (la pintura es **MP**, se cobra por pieza) |
| MO Producción (4 nómina UOM + Monzón, cargas 26%) | 8.089.328 | entra al pool |
| **Pool de planta** | **15.316.328** | overhead + MO prod |
| Tasa de planta (÷ 5 pers × 179,7 h = 898,5 h) | **≈ 17.047 $/h** | |
| Depto Técnico (Diseño/Of.Técnica, 3 monotributistas) | 6.764.440 | centro aparte, vía "Min depto" por pieza |
| Gastos de Juan (tarjeta propia) | 385.000 | **comercial**, excluido de fabricación |

Insumos: **pintura Interpon (AkzoNobel) = 14 u$d/kg**, rendimiento teórico **8-10 m²/kg** (@60-80µm, dens 1,5); factor sobreaplicación 1,3 se mantiene (cubre overspray). TC al 2026-06-13 = **1.460 $/u$d**.

### Flujo de datos de la planilla

```
Hoja "Costos Fijos" (gastos + sueldos reales, clasificados con SUMIF)
        │  overhead, MO producción, depto técnico
        ▼
Hoja "Parametros" (TC, pool, tasa de planta, tarifa depto, materiales, pintura)
        │
        ▼
Hoja "Costeo" (55 productos): MP×TC + Σ(tasa_planta / capacidad) + pintura + horno + depto
        │
        ▼
Hoja "Comparacion" (costo nuevo en u$d vs. viejo, sanity-check)
```

### Provisionales que quedan (no estructurales)

- **Horno**: 27,5 u$d/100pz (estimado a la mitad; el valor de 55 estaba inflado). Reemplazar con consumo real. Posible doble conteo con la energía que ya está en overhead.
- **Capacidad**: hoy pico sin setup; la reemplaza el dato medido de `TramoTrabajo`. Subirá el costo de operaciones.
- **Min depto** = 0: el costo de diseño no impacta hasta cargar minutos de Of. Técnica por pieza.
- **TC**: cambia día a día (celda editable).

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

> Revisado en v3 (ver § 0): **una tasa de planta única** en lugar de tarifa por centro; **TC** para indexar lo dolarizado.

- **Tipo de cambio (TC)**: `$/u$d`, parametrizable. Indexa materiales y pintura.
- **Pool de planta** → `tasa_planta[$/h]`: `pool = overhead_fábrica + MO_producción`; `tasa = pool / (dotación × horas_mes)`. Una sola tarifa para todos los centros de máquina.
- **Depto Técnico**: centro aparte. `tarifa_depto[$/h] = costo_mensual_diseño / horas_mes`. Se aplica por `min_depto` por pieza.
- **Materiales**: `nombre`, `densidad` (kg/m³), `precio` (**u$d**/ton; × TC en el costo). Ej.: acero 7.850, aluminio 2.700, inox 8.000, aluminio compuesto, Luxidier.
- **Insumos**: pintura en polvo (`precio_kg` u$d, `cobertura_m2_kg`, `factor_sobreaplicación`), horno, consumibles.
- **Chapa**: dimensiones y área de la chapa estándar por material.
- **Horas/día**: divisor para convertir la capacidad **diaria** de la hoja `datos` a **horaria** (ver § 0).

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
Costo_MP/u[$]   = (Peso_chapa / 1000) × Precio_material[u$d/ton] / U_ch × TC
```

**b) Operaciones (recorriendo la ruta) — v3, tasa de planta única:**
```
tasa_planta[$/h]      = pool_mensual / horas_productivas_mes        (ver § 0)
Costo_paso/u[$]       = tasa_planta / Capacidad_horaria[pz/h, por tipo de pieza]
Costo_operaciones/u   = Σ Costo_paso  (solo pasos activos de la ruta)
```
La capacidad horaria sale de la hoja `datos` (capacidad diaria ÷ horas/día) = `CapacidadTeorica`. El **factor de utilización real** (módulo Tiempos Reales) reemplaza esa capacidad pico por la real medida — entra **acá, una sola vez**, no en la tarifa.

**c) Pintura + horno (solo si "Polvo" en la ruta):**
```
Costo_polvo/u[$] = (Área_pintar × Caras × Factor_sobreaplicación / Cobertura[m²/kg]) × Precio_polvo[u$d/kg] × TC
Costo_horno/u[$] = Costo_horneada[u$d] / Piezas_por_horneada × TC
```
Valores reales (jun 2026): `Factor_sobreaplicación = 1,3`, `Cobertura = 9 m²/kg` (Interpon 8-10), `Precio_polvo = 14 u$d/kg`, `Costo_horneada = 27,5 u$d/100pz` (provisional, ver § 4).
La mano de obra/máquina de la cabina ya entra como paso de operación en (b); no se duplica.

**d) Consumibles:** tabla por producto, o `% sobre MP` provisional mientras no estén desagregados.

### Capa 3 — Costo de fabricación unitario
```
COSTO_FABRICACIÓN/u[$] = Costo_MP + Costo_operaciones + Costo_polvo + Costo_horno + Costo_depto + Consumibles
COSTO_FABRICACIÓN/u[u$d] = COSTO_FABRICACIÓN/u[$] ÷ TC      (referencia dolarizada)
```
**Aquí termina el objetivo de esta etapa.** Este número es consultable sin que margen ni impuestos lo ensucien. En la planilla v3, columnas `COSTO FAB $/u` y `COSTO FAB u$d/u`.

### Capa 4 — Margen → precio antes de impuestos
Margen parametrizable por producto o por familia. `Precio_pre_imp = Costo_fabricación / (1 − margen)` o `× (1 + markup)` (a definir en implementación).

### Capa 5 — Cargas fiscales y costo financiero → precio final
IVA, IIBB/RG, impuesto al cheque, costo financiero — en capa separada, sobre el precio, no sobre el costo.

---

## 4. Datos pendientes de relevar (estado v3)

| # | Dato | Estado |
|---|---|---|
| 1 | **Capacidad real con setup** por equipo × pieza (driver del costo de operaciones) | ⏳ Provisional: pico horario de `datos`. Lo reemplaza `TramoTrabajo` (módulo Tiempos Reales) cuando haya `n` confiable. |
| 2 | **Costo fijo real de planta** (overhead + MO) | ✅ **Cargado** (jun 2026): pool 15.316.328 $/mes, tasa ≈ 17.047 $/h. Antes era placeholder de 50.000 u$d. |
| 3 | **Pintura en polvo** (precio/cobertura) | ✅ Interpon 14 u$d/kg, 8-10 m²/kg. |
| 4 | **Costo de horneada** | ⏳ Provisional 27,5 u$d/100pz (estimado a la mitad). Verificar consumo real + posible doble conteo con energía del overhead. |
| 5 | **Min depto técnico por pieza** | ⏳ En 0. Cargar minutos de diseño por pieza para que el costo de Of. Técnica impacte. |
| 6 | Densidades/precios por material no-acero; consumibles desagregados | ⏳ Provisional. |
| 7 | **TC del día** | 🔁 Editable (1.460 al 2026-06-13). |

---

## 5. Alcance explícito

**Incluido:** costo de fabricación por unidad, con ruta variable, por centro de trabajo.
**Excluido (otra etapa):** montaje, transporte, logística, precio de venta al cliente (motor comercial), márgenes finos por proyecto.

---

## 6. Próximo paso

La **planilla de validación v3** ya está hecha y cargada con datos reales (`Cotizador VELUM - Validacion Modelo v3.xlsx`; generador `build_cotizador.py`). Lógica y unidades verificadas. Lo que sigue, por dependencia:

1. **Reemplazar provisionales** a medida que lleguen (horno real, capacidad medida de `TramoTrabajo`, min depto). El más impactante es la capacidad real con setup — sube el costo de operaciones.
2. **Decidir el destino**: ¿se sigue validando en planilla hasta tener la capacidad real, o se materializa ya como **módulo en VELUM** (tablas Supabase: `CentroTrabajo`/parámetros, `PiezaCatalogo` con ruta y geometría, y la agregación de factores de `TramoTrabajo`) + UI de cotización? El cotizador en VELUM leería directo de `CapacidadTeorica` + el factor real, sin planilla intermedia.
3. Conecta con el **catálogo de piezas** (ver `2026-06-12-catalogo-piezas-PUNTO-GUARDADO.md`): la geometría/ruta por pieza que el cotizador necesita es la misma que define el catálogo.

### Historial de versiones de la planilla
- **v1**: primer modelo. Bug: capacidad diaria usada como horaria (costo de operaciones ~8× bajo).
- **v2**: corrección de unidades (capacidad horaria), aún en u$d con costos placeholder.
- **v3**: pesos indexados al dólar, tasa de planta única, costos fijos reales, Monzón en producción, pintura real. **Vigente.**
