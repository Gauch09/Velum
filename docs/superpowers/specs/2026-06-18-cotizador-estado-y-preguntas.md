# Cotizador VELUM — Estado y preguntas para completarlo (2026-06-18)

Punto de guardado del trabajo sobre el modelo de costeo. La planilla viva es
`Desktop/Cotizador VELUM - Validacion Modelo v4.xlsx` (la v3 queda como original intacto).

---

## 1. Decisiones de modelo cerradas

- **Cotización por m² de fachada** (top-down). El método histórico: definido el producto,
  `material = m² de fachada × Kp`.
- **Kp = material requerido por el producto** (desarrollo del diseño/patrón), NO aprovechamiento de chapa.
  `StandardFlat = 1` es el liso de referencia.
- **Aprovechamiento de corte** = palanca separada, depende del **formato de chapa de cada material**.
- **IVA:** todo neto, sin IVA (es costo de fabricación; el IVA de compra es crédito fiscal).
- **Anodizado:** solo aluminio, **excluyente con pintura** (una pieza va pintada O anodizada).
- **Terminación** como selector único: Pintura / Anodizado / Crudo.

### Nomenclatura de estructura (confirmada por el dueño)
- **Ménsula = Placa de Anclaje** (PIL/PEL) → fija la estructura a la pared. *Siempre va.*
- **Costilla** → accesorio donde se atornillan los paneles. *Siempre va (soporte de la piel).*
- **Parante** → separador, solo si la piel se aleja X cm de la pared. *Condicional.*

`estructura/m² = (ménsulas + costillas)  fijo  +  (parantes)  solo si hay separación`

---

## 2. Datos concretos cargados en v4

### Parámetros / materiales
- **Aluminio: 8.000 u$d/ton** (corregido de 6.500). Neto.
- **Anodizado: 36 u$d/m²** (neto). Solo aluminio.
- **Formato de chapa por material** (área que define el aprovechamiento):
  | Material | Área chapa | Formato |
  |---|---|---|
  | Galvanizado | 3,660 m² | 3000×1220 |
  | Aluminio | 4,050 m² | 3000×1350 |
  | Al. Compuesto | 7,500 m² | 5000×1500 (la más usada; existe 5500×1500 = 8,25) |
  | Luxsteel | 3,735 m² | 3000×1245 |
  | Acero / Inox | *(descartados por ahora)* | — |
- (Renombrado: **Luxidier → Luxsteel**.)

### Tabla Factores Kp (hoja `Factores Kp`, 37 diseños)
Fuente canónica: **`Valores Frisados`** del HULL Presupuestador 3.1 (NO `Valores` ni `Costos`,
que estaban editadas a mano y divergían). Correcciones del dueño:
- **Standard = 1,25** (no 1,4).
- **MultiSlim.O = 1,33** (renombrada desde `.S`; es `MultiSlim.C` con plegado invertido = mismo material).
- Rango 0,8 (Expanded) → 2,5 (D_Tipe), promedio 1,46.

### Insumos de fijación / tornillería (hoja `Insumos Fijacion`) — costos unitarios reales
| Insumo | u$d/u |
|---|---|
| Autoperforante 1"×1/4 hexagonal punta mecha | 0,0285 |
| Autoperforante T1 punta mecha | 0,0070 |
| Broca | 0,6200 |
| Taco fischer | 0,3400 |
| Tirafondo | 0,3400 |

- Regla: fijación a obra por **broca** O por **(taco + tirafondo)**, excluyentes.
- Consumo /m² tomado de `Estadistica` (4 obras). **Costo de fijación ≈ 1 u$d/m²** (el viejo lo
  sobreestimaba ~5×, usaba costos unitarios inflados).

### Validación (hoja `Ref Estadistica HULL`)
- **Costo de fabricación por pieza, sin material** (medido en obra): MultiSlim STD 6,8 / Custom 11,8 /
  Panel Skin 6,6 / Costilla 2,74 / Omega 1,8 / Placa anclaje 1,35 u$d.
- **Costo insumos+material por m² de fachada por sistema:** Skin.Rail 23,69 / Skin 19,63 / Rail 22,04.
- NO se tomó: costo/min 0,60 ni factor de uso 3/7 (los mide el módulo de Tiempos Reales).

### Composición de estructura por sistema (extraída de las fórmulas del 3.1, A VALIDAR)
Coeficientes = cantidad por m² (con nomenclatura del Excel viejo, que confunde parante/costilla):
| Sistema | Placa anclaje | Parante 500 | Parante 3000 | Omega 50×50 | Omega 40×20 |
|---|---|---|---|---|---|
| Skin | 1 | 1 | 0,55 | — | — |
| Skin.Rail | 1 | 1 | 0,55 | 0,4 | — |
| Rail | 2 | — | — | 0,4 | — |
| Clad | — | — | — | — | 1 |
| SunShield | 2 | — | — | 0,5 | — |
| SkyCap | 2 | — | — | 0,8 | 1 |

### Datos del catálogo Skin (PDF)
- Fijación de todos los Skin: **Parante + Placa PIL/PEL + Costilla**.
- Módulos y espesores:
  | Producto | Módulo máx (ancho×alto) | Espesores |
  |---|---|---|
  | StandardSkin | 1100×1400 | Acero/Galv 1,2 · Alu 1,5 |
  | PrismSkin | 1000×1300 | Acero/Galv 1,2 · Alu 1,5 |
  | Crossbar.Square/Triangle | 1500×1500 | 0,5 · Alu 1,0 · Luxsteel 0,5 |
  | LatticeSkin | 1500×1500 | 0,7/0,9 · Alu 1,0 · Luxsteel 0,7 |
- Perfiles costilla/parante hasta 3 m; módulo mín 0,15 m.

### Veredicto del HULL Presupuestador 3.1: jubilarlo, no parchearlo
Bugs: pintura ×121, MP con peso neto sin merma, Inox/Bond a costo $0, factores sin fundamento
(×4 operativo, ×2,5 depto, 1,159 u$d/min), aprovechamiento atado solo a chapa galvanizado,
datos duplicados/divergentes en 3 hojas. Rescatable (re-validando): `Estadistica` y Kp de `Valores Frisados`.

---

## 3. PREGUNTAS para completar el cotizador (lo más real posible)

### A. Estructura por m² — montaje (lo más crítico, hoy es el mayor hueco)
1. **Costillas:** ¿van continuas de piso a techo o cortadas? ¿Cuántos m² (o ml) de costilla por m² de
   fachada? (El ancho de módulo da la densidad horizontal: Standard 1,1 m → ~0,9 costillas/m.)
2. **Ménsulas (placas de anclaje):** ¿cada cuántos cm se ancla una placa sobre la costilla?
   (ej. 1 cada 1 m de altura) → placas por m².
3. **Parantes:** cuando hay separación de pared, ¿cuántos por m² y a qué separación (cm) corresponde?
   ¿El número escala con los cm de separación?
4. ¿Hay un **manual de montaje/instalación** con estos ratios (como el catálogo) que se pueda leer?

### B. Kp / material
5. **¿El Kp ya incluye la merma de corte, o va aparte?** (StandardFlat=1 sugiere que NO; la merma
   saldría del formato de chapa). Confirmar para no duplicar.
6. Los 5 diseños con **Kp = 1,5** (Prisma, Diamond, Oval, Drop, Alloy): ¿son medidos o placeholder?
7. ¿Cómo se derivó cada Kp: teórico (geometría del desarrollo) o medido (consumo real)?

### C. Aprovechamiento de corte
8. El % de aprovechamiento (hoy 95% genérico): ¿global único, por material, o por pieza?
   ¿O se calcula del nesting real del programa de corte?
9. ¿Se reactivan Acero común e Inox? Si sí, sus formatos de chapa.

### D. Terminación
10. **Pintura:** precio definitivo (¿14 u$d/kg?) y cobertura real (¿8-10 m²/kg?).
11. **Anodizado:** ¿los 36 u$d/m² son por m² total de pieza o por cara? (hoy aplicado ×2 caras).

### E. Tornillería / insumos
12. Confirmar el **consumo /m² real** de autoperforantes y fijaciones (hoy proviene de 4 obras de Estadistica).
13. ¿Faltan insumos? (selladores, juntas, remaches, burletes, etc.)

### F. Catálogo de productos completo
14. Tengo el catálogo **Skin**. ¿Hay catálogos de los otros sistemas (Skin.Rail, Rail, Clad, SunShield,
    SkyCap, MultiSlim, etc.) para mapear módulos, espesores y composición estructural de cada uno?

### G. Operaciones (costo de fabricación)
15. Validar tiempos por proceso / costo de fabricación por pieza contra el módulo de Tiempos Reales
    (cuando haya datos de fichaje reales).

---

## 3bis. Caso de montaje real (ejemplo del dueño) — base para los ratios

**Hueco:** 1000 mm ancho × 2900 mm alto = **2,9 m² de piel**. Vigas de hormigón a 3000 mm.
Piel pegada a la viga → **sin parantes**.

**Secuencia de montaje:**
1. 4 ménsulas (placas) ancladas a las vigas: 2 arriba, 2 abajo, en extremos izq/der; se alinean horizontalmente.
2. **2 brocas por ménsula** al hormigón → 8 brocas.
3. 2 costillas verticales (izq/der), cada una vincula ménsula superior + inferior, perpendiculares.
4. **2 autoperforantes hexagonales por ménsula** (unión costilla-ménsula) → 8 autoperforantes.
5. 3 paneles Skin que **se enganchan a las costillas** (sin tornillería panel→costilla).

**Componentes confirmados:**
- Ménsula = **PIC/PEC** (placa de anclaje). 4 unidades.
- Costilla = **3000 mm** de largo (viga a viga, no se corta). 2 unidades.
- Paneles = **enganchados** a las costillas (sin tornillos).

**Ratios de ESTE hueco (÷ 2,9 m²):** ménsulas 1,38/m² · brocas 2,76/m² · costillas 0,69/m² (2,07 ml/m²)
· autoperf hex 2,76/m². **Tornillería estructural = 1,79 u$d/m²** (brocas 4,96 + autoperf 0,23). Cerrada
(los paneles no agregan tornillería: van enganchados).

**Efecto borde RESUELTO:** cuando hay paneles contiguos, **comparten la costilla del medio** (y sus ménsulas).
→ Para **N paños en fila: N+1 costillas y 2(N+1) ménsulas**. Paño aislado = N=1 (4 ménsulas, 2 costillas);
fachada continua grande → ~1 costilla + 2 ménsulas por paño. El cotizador solo necesita saber cuántos paños van en fila.

### Costeo DEMO del hueco (2,9 m², galvanizado, paneles pintados) — modelo nuevo corriendo
Datos: ménsula PIC/PEC-150 (2,5 mm), costilla 3000 (1,6 mm), panel StandardSkin (1,2 mm), tornillería real.
| Rubro | Paño aislado | Fachada continua |
|---|---|---|
| Material | 72,64 | 61,48 |
| Fabricación (de Estadistica) | 30,68 | 25,24 |
| Pintura (solo paneles) | 12,55 | 12,55 |
| Tornillería | 5,19 | 2,59 |
| **TOTAL** | **121,06 u$d = 41,74/m²** | **101,87 u$d = 35,13/m²** |

**Supuestos RESUELTOS por el dueño (2026-06-18):** (a) se pinta **TODO** (estructura + paneles, 2 caras);
(b) panel = **Standard, Kp 1,25**; (c) **el Kp ya incluye la merma** → NO se aplica el 95% aparte
(las dos mermas: desarrollo geométrico + recorte van dentro del Kp práctico de taller).

### Costeo DEMO FINAL del hueco (2,9 m², galvanizado, todo pintado, Standard Kp 1,25, Kp con merma)
| Rubro | Paño aislado | Fachada continua |
|---|---|---|
| Material | 69,00 | 58,41 |
| Fabricación | 30,68 | 25,24 |
| Pintura (todo, 2 caras) | 18,84 | 15,70 |
| Tornillería | 5,19 | 2,59 |
| **TOTAL** | **123,72 = 42,66/m²** | **101,94 = 35,15/m²** |
Modelo estable (el número casi no cambió entre variantes de supuesto → robusto).

⚠️ **Único punto a validar con dato real (no asumir):** que el Kp traiga la merma. Verificar con una obra:
`chapa comprada (kg/m²) ÷ m² de fachada` de un diseño = Kp real con todo. Si un Standard da ~1,25 → confirmado.
Pendiente menor: sección/desarrollo real de la costilla 3000 (usé area 0,522 m² del modelo).

## 4. Próximo paso técnico (cuando se respondan A, B, C)
Conectar el Kp al costo de MP reestructurando `Unid/chapa` a fórmula:
`Unid/chapa = área_chapa_material × aprovech% ÷ (área_pieza × Kp)`, y armar el motor de
estructura/m² (ménsula+costilla fijo, parante condicional) como capa separada del material de la piel.
