# Cotizador VELUM — PUNTO DE GUARDADO (2026-06-19, cierre) · retomar LUNES 2026-06-22

> Hoy: se CERRÓ y validó **Skin** (geométrico por vano), se migró la fab a capacidad×tasa, se armó **Rail** (en progreso) y se corrigió el **ACM/Bond**. **GUARDADO hasta el lunes 22**, cuando el dueño tendrá **pruebas exactas de capacidades** (omega y ACM).

## PLAN DEL LUNES 22 (lo que falta, espera datos del dueño)
1. **Capacidades reales de planta** (el dueño hace pruebas exactas): la tabla `Control de Produccion dinamico.xlsx` (hoja `datos`) tiene las piezas pero con **datos dudosos** (ej. omega 50x50 daría ~8-10 u/h, "muy poco" según el dueño) y **mezcla pzs/hora con pzs/día** (confusión ya conocida). NO clavar la fab del omega/ACM hasta tener las pruebas.
2. **Cerrar fab de Rail:** con la capacidad real del **omega 50x50**, agregarlo a `Capacidad Fab` y reemplazar en `Simulador Rail`. También Empalme omega. *(Provisorio actual = **Costilla 3000 ÷ 3 = 0,82 u$d/m**, porque el dueño dice que la producción del omega es casi igual a la de la costilla; `Simulador Rail!B25`='Capacidad Fab'!H6/3. A confirmar con las pruebas.)*
3. **ACM — CERRADO y andando:** fab por placa = fresado 8 + (punzonado 10, **condicional** `H19`) + plegado/armado 25 = 43 min → **8,37 u$d/placa** (`Parametros!H14:H21`). Panel ACM = `(área×Kp/7,5) × fab/placa` (`Simulador!E19`). **Accesorios** = 4 × **1,50 u$d** por panel, al material (`Simulador!E18`). **El tamaño del panel Bond NO es estándar** — se define por proyecto según la fachada → es **input** (`B12`/`B13` módulo); paneles y accesorios se recalculan solos (panel grande = menos accesorios = más barato). Test 750 m² panel 1×1: 74,22 u$d/m²; con casetes grandes baja a ~68. **Único pendiente del ACM: calibrar el Kp/merma** (idea a futuro: **automatizarlo geométricamente** = cuántos casetes entran en la placa 5000×1500 con flechas alineadas → merma real por proyecto).
4. Luego **Skin.Rail** (= Skin + omega).

## Archivos
- **Repo GitHub privado `Gauch09/Costeo-Velum`. Carpeta de trabajo: `C:\Users\Nissei\Costeo-Velum`.** Planilla viva: `planilla/Cotizador VELUM - Validacion Modelo v7.xlsx`. Se trabaja DENTRO del repo y se commitea cada avance.
- v7 = 15 hojas: las 12 de v6 + **`Capacidad Fab`** + **`Simulador Rail`** (+ ajustes en `Simulador`, `Parametros`).
- La planilla NO recalcula sola con openpyxl: forzar con Excel COM (`CalculateFullRebuild`). Modo de cálculo ya en automático.

## ACM / Bond — corregido hoy (2026-06-19)
- El aluminio compuesto **se compra por m²** (placa 5000×1500, PVDF un lado), NO es chapa maciza. Antes se calculaba por peso + Kp → daba el doble.
- **Material ahora por precio directo/m²:** `Parametros!E26` = **37 u$d/m²** (Bond 4mm; el 5mm se descartó, no se usa). El panel usa precio/m² cuando la familia tiene precio en col E; los metales siguen por peso. Lógica en `Simulador!E18`.
- **Sin pintura:** el ACM viene pintado de fábrica (PVDF) → `Simulador!E21` = 0 cuando el material es comprado por m². También **sin embalado** (film/contact con flecha hace de protección).
- **Kp (merma) a calibrar con pruebas:** la merma sale de la modulación (placa 5000×1500 con todas las flechas en la misma dirección). Hoy usa Kp Composite 1,6 → material = 37×1,6 = 59,2 u$d/m². El dueño calibra el Kp probando.
- **Proceso ACM (para su fab):** fresado (CNC/router) → punzonado (si va) → plegado (manual, tras fresar el perímetro) → armado (4 accesorios de ángulo). Sin pintura ni embalado.
- Test corrido (Skin/Bond 4mm/750 m² = 30×25, panel 1×1): costo **74,99 u$d/m²**, precio venta **187,47 u$d/m²** (con fab de panel provisoria).

## QUÉ SE HIZO HOY (v6 → v7)

### 1. Migración de FAB a "capacidad × tasa" (reemplaza tarifas fijas de HULL)
- Nueva hoja **`Capacidad Fab`**: tabla de capacidad (u/día a 8hs por centro: Láser·Plegadora·Punzonadora·Pintura·Embalado) que el dueño pasó, + cálculo por pieza:
  - **Tiempo/pieza = 8hs ÷ capacidad**, sumado por los centros que recorre (absorción).
  - **Fab u$d = tiempo × `Parametros!B13` (tasa planta 17.046 $/h) ÷ `Parametros!B4` (TC 1460)** → tasa = **11,68 u$d/h**.
- Valores derivados: Costilla 3000 = **2,46** · Costilla 1500 = 1,36 · Empalme Costilla = 0,59 · Parante 300 = **0,42** · PIC 150 (ménsula) = **0,55** · Skin Standard (panel) = 8,55.
- **Ménsula VALIDADA en 0,55** (no 1,35 de HULL): el dueño confirmó que el proceso de la PIC es corte→plegado→lavado→pintura→horneado→embalado, sin operaciones ocultas (ni soldadura ni doble plegado ni punzonado). El 1,35 de HULL estaba inflado.
- El Simulador engancha fab: `B24` (panel)→Skin Standard, `B25` (costilla)→Costilla 3000, `B26` (ménsula)→PIC 150.

### 2. Geometría por vano (el motor YA existía en el Simulador, estaba mal parametrizado)
Driver = la **grilla de paneles**, NO un coeficiente plano por m² (confirmado por el dueño, pregunta 4):
- **Costillas = columnas_panel + 1** (`E9`): una en cada borde de columna.
- **Ménsulas = costillas × (filas_panel + 1)** (`E13`): una en cada NODO de la grilla. *(Fix clave: antes `E12` usaba `Sep.mensula=3`; ahora `E12=E7+1`.)*
- **Paneles = columnas × filas** (`E8`).
- Verificado contra los ejemplos del dueño: vano 1×1 → 2 cost / 4 mens / 1 panel; vano 2×3 (panel 1×1) → 3 / 12 / 6. ✓

### 3. Costilla por LARGO real + empalmes J
- Costilla material y fab pasan a calcularse **por metro lineal** (`E10 = costillas × alto`), no por tramos fijos de 3m:
  - Fab costilla = `E10 × (B25/3)` (fab de 3m ÷ 3 = por metro).
  - Material costilla = `E10 × (B19/3) × espesor × dens·precio GALV`.
- **Empalmes "J"** (accesorio 300×95mm, 1,6mm galv): `E40 = costillas × MAX(CEILING(alto/3)-1, 0)`. Material (0,0387 m²) + fab (`Capacidad Fab` Empalme Costilla 0,59). Verificado: vano 10m alto → 4 tramos → 3 empalmes/costilla → 9 totales. ✓
- Regla del dueño: vano 1m → costilla de 1m; vano 10m → 3×3m + 1×0,9m, empalmadas con J.

### 4. BUG corregido: estructura a galvanizado
- El material de costilla y ménsula se calculaba con **densidad y precio del PANEL** (ej. aluminio 8000 u$d/ton). Corregido a **galvanizado** (`Parametros!B22`=7850, `C22`=1400). La estructura siempre es galv.

### 5. Parante (separación opcional)
- `B36` "Separación pared mm (0=pegado)". Si >0: **parantes = ménsulas** (1 por ménsula), largo = separación.
- **Costo parante = costo base 300mm × (largo/300)** — factor por largo (`Capacidad Fab!B17` = material Costeo + fab 0,42). Tabla de factores 250–1000mm en `Capacidad Fab`.

### 6. Fijación real (cadena de montaje)
- Cadena: pared —[2 brocas]→ ménsula —[4 autoperf.]→ parante —[4 autoperf.]→ costilla — panel.
- **2 brocas/ménsula siempre.** Autoperforantes = **4 por unión (peor caso)**: `E15 = IF(sep>0, 8, 4) × ménsulas` (8 con parante: 2 uniones; 4 sin parante: costilla→ménsula directo).

### 7. Kp del panel
- Dato del dueño: panel plegado terminado consume **1,2 m² de chapa bruta** → **Kp Standard = 1,2** (en hoja `Factores Kp`). *Asumido panel de referencia 1 m² — falta confirmar tamaño.*

## ESTADO: Skin CERRADO y validado ✅
Costo verificado (panel aluminio por defecto, panel 1×1): vano 2×3 pegado = **64,74 u$d/m²**; con sep 500mm = 68,98; vano 2×10 = 64,27 (escala parejo). La pintura SÍ incluye estructura (correcto: "cuando el panel va pintado, también se pinta ménsula y costilla").

## RAIL — en progreso (hoja `Simulador Rail` creada y verificada geométricamente)
Composición confirmada: **omega horizontal 50x50 + PIC 150 + lamas MultiSlim verticales. SIN costillas, SIN separación (no admite parante).**

Datos del dueño (jun 2026):
- Omega 50x50 galv 1,6mm, largo máx 3000mm. Empalme = accesorio **"C"** (alma 50, alas 30, largo 200mm, galv 1,6mm) cuando el omega supera 3000mm.
- Panel = **MultiSlim**, lama útil 300×3000mm galv 0,7mm, de chapa bruta 400×3000 → **Kp = 1,2/0,9 = 1,333**.
- Proceso omega: corte→plegado→lavado→pintura→horno→embalado (sin ops ocultas, como la PIC).

Geometría implementada (vano A ancho × H alto), verificada contra ejemplo 2×3 → 7 lamas / 2 omegas / 4 PIC ✓:
- **Lamas** = `ROUNDUP(A/0,3) × ROUNDUP(H/3)` (verticales).
- **Omegas** = `ROUNDUP(H/1,5)` (uno cada 1,5m de altura — CONFIRMADO).
- **PIC** = `omegas × ROUNDUP(A/1)` (1 cada ~1m de omega; las PIC van "cerradas", no en extremos, para distribuir carga — validado con 4 PIC del ejemplo).
- **Empalme C** = `omegas × MAX(ROUNDUP(A/3)-1, 0)`.
- Costo verificado vano 2×3 = **26,50 u$d/m²** (panel MultiSlim galv 0,7mm → bastante más barato que Skin).

**PROVISORIOS marcados en la hoja (a cerrar para Rail):**
1. **Fab del omega** = 1,8 HULL ÷ 3 = **0,6 u$d/m** (provisorio). FALTA la **capacidad del omega 50x50 por centro** (Láser/Plegadora/Pintura/Embalado u/día) para derivarla como las otras piezas y agregarla a `Capacidad Fab`.
2. **Fab del empalme C** = usa el de Empalme Costilla (0,59) como proxy. Falta su capacidad real.
3. **Cadena de fijación de Rail** = se asumió 2 brocas + 4 autoperf por PIC (como Skin). Falta la cadena real de Rail (pared→PIC→omega→lama).

Luego: **Skin.Rail** = Skin (costilla+parante opc+ménsula) **+ omega horizontal** (combinar ambos modelos).

## PENDIENTES NO BLOQUEANTES (de Skin)
- **Confirmar tamaño del panel de referencia** del Kp (asumido 1 m² → Kp 1,2).
- **Selector de "Alcance de terminación"** (Ninguno/Frente/Completo/Completo+Estructura): hoy el Simulador siempre pinta la estructura (= "Completo+Estructura"). Faltan los otros casos (Crudo no pinta; Frente/Completo pinta solo panel).
- Empalme J: el material usa el área fija 0,0387 m² (ok). Validar si la fab "Empalme Costilla" (0,59) corresponde al accesorio J real.
- Kp por diseño (Pattern/HalfTone/Scales vs Standard) — solo se fijó Standard=1,2.

## RECORDATORIOS DE CRITERIO (no re-discutir)
- Todo **neto sin IVA**. Cotización **por m² de fachada**; el motor calcula por **vano (ancho×alto + módulo de panel)**.
- **Estructura siempre galvanizado** (costilla/ménsula/omega/empalme), independiente del material del panel.
- **Fab = capacidad × tasa** (absorción, suma de centros). Tasa planta única 17.046 $/h, TC 1460. Reemplaza tarifas fijas de HULL.
- Cada sistema = su propia configuración de piezas. No unificar.
- Costilla y parante se costean **por largo real** (factor); ménsula y empalme son por pieza.
- HULL Presupuestador 3.1: no copiar fórmulas; solo re-validar datos (y varios estaban inflados, ej. ménsula 1,35).
