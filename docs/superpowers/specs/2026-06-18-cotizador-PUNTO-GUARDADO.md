# Cotizador VELUM — PUNTO DE GUARDADO (2026-06-18) · retomar 2026-06-19

> Para retomar mañana. El detalle completo (datos, decisiones, preguntas) está en
> `2026-06-18-cotizador-estado-y-preguntas.md`. Este archivo es el resumen de "dónde quedamos y qué sigue".

## Archivos
- **Planilla viva:** `Desktop/Cotizador VELUM - Validacion Modelo v5.xlsx` (v4 = checkpoint con simulador Skin manual; v3 = original intacto).
- **Estado + preguntas:** `docs/superpowers/specs/2026-06-18-cotizador-estado-y-preguntas.md`.
- Base de datos Supabase: **sin cambios** (el cotizador vive 100% en Excel; el schema no tiene costeo aún).

## v4 — 9 hojas
`LEEME · Simulador · Costos Fijos · Parametros · Costeo · Comparacion · Factores Kp · Ref Estadistica HULL · Insumos Fijacion`

## Qué se completó hoy
1. **Parámetros:** anodizado 36 u$d/m² (solo aluminio, excluyente con pintura), aluminio 8.000 u$d/ton,
   formato de chapa por material (galv 3,66 / alu 4,05 / compuesto 7,5 / luxsteel 3,735), Luxidier→Luxsteel.
2. **Factores Kp** (37 diseños, de `Valores Frisados`; Standard 1,25, MultiSlim.O 1,33).
3. **Insumos Fijacion** (costos reales: autoperf 1"×1/4 0,0285 · T1 0,007 · broca 0,62 · taco 0,34 · tirafondo 0,34).
4. **Ref Estadistica HULL** (validación: costo fab por pieza + insumos/m²).
5. **Análisis exhaustivo del HULL Presupuestador 3.1** → veredicto: jubilarlo (bugs graves).
6. **Modelo de estructura por m²** validado con caso real (hueco 2,9 m²):
   - `N paños en fila → N+1 costillas y 2(N+1) ménsulas` (comparten la del medio).
   - Ménsula = PIC/PEC (a la pared) · Costilla = soporte panel (siempre) · Parante = separador (condicional).
   - Paneles se **enganchan** (sin tornillería panel-costilla).
   - Costeo demo: **42,66 u$d/m² aislado · 35,15 continua** (galv, todo pintado, Standard).
7. **Simulador** interactivo: ingresás ancho×alto + producto + material + margen → costo y precio de venta.
   8×16 m = **4.100 u$d costo (32,04/m²) · 6.560 venta (51,25/m²)** con 60% margen.
   Desplegables de Producto y Material funcionan; margen funciona.

## PLAN DE MAÑANA (priorizado)

### 1. Validar el supuesto del Kp (lo único que deja el modelo "con asterisco")
Con UNA obra real: `chapa comprada (kg o m²) ÷ m² de fachada` de un diseño. Si un Standard da ~1,25 →
confirmado que el Kp ya trae la merma (y no se aplica el 95% aparte). **Es el dato más importante a cruzar.**

### 2. Modelar un segundo sistema (hoy el Simulador solo hace "Skin")
Elegir uno (Skin.Rail / Rail / Clad / SunShield / SkyCap) y que el dueño explique el **montaje**
(qué piezas y cuántas por m²/paño), como hizo con el hueco de Skin. Luego activarlo en el desplegable.

### 3. Tabla producto × material → autocompletar el espesor  ✅ HECHO (2026-06-19, en v5)
- Hojas nuevas: `Catalogo Variantes` (460 filas, 11 sistemas, de HULL_Variantes_Arbol_Relaciones.md) y `Listas`.
- Simulador con cascada dependiente: Sistema(Skin)→Producto(7)→Material(válidos del producto)→Espesor auto + Familia auto.
- Espesor sale del nombre del material (parseado); ya no es manual. Familia (B15) alimenta densidad/precio (B17/B18).
- Steel/Acero común e Inox EXCLUIDOS de los desplegables (descartados); datos cargados en catálogo por si se reactivan.
- Recalculado en Excel: sin errores. Demo Standard+Alum 1,5mm = 59,51 u$d/m² (alu real; el 32 de ayer era galv).
- Pendiente menor: productos sin materiales en el doc HULL (ej. Sheet Diamond/Lattice) quedaron sin filas (no se inventó).

### Menores / pendientes de dato
- Anodizado: ¿36 u$d/m² es por cara o por m² total de pieza? (hoy ×2 caras).
- Pintura: confirmar precio (14 u$d/kg) y cobertura (8-10 m²/kg) definitivos.
- Parantes: modelar el caso "piel separada X cm de la pared" (suma parantes por m²).
- ¿Se reactivan Acero común e Inox? (hoy descartados) → si sí, sus formatos de chapa.
- ¿Faltan insumos? (selladores, juntas, remaches, burletes).

### Más adelante (cuando el modelo esté cerrado)
- Llevar el cotizador a la app: crear tablas de costeo en Supabase **vía SQL Editor** (nunca prisma migrate).

## Recordatorios de criterio (no re-discutir)
- Todo **neto sin IVA**. Cotización **por m² de fachada** (`material = m² × Kp`).
- El **Kp incluye la merma** (provisional, a validar en paso 1).
- HULL Presupuestador 3.1: **no copiar fórmulas**, solo re-validar datos de `Estadistica` y Kp de `Valores Frisados`.
