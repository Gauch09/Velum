# HULL Presupuestador — Árbol de Relaciones: Hoja Variantes

> Documento generado para Velum Studio SAS  
> Fuente: `HULL_Presupuestador_3_1.xlsm` · Hoja: **Variantes**

---

## Estructura general

La hoja **Variantes** define la jerarquía completa de opciones configurables del presupuestador. Tiene **7 niveles** de relación:

```
Sistema
 └── Producto(s)
      └── Diseño(s)
           └── Material(es)
                └── Terminación(es)
                     └── Alcance de terminación
                          └── Tipo de cambio
```

---

## Nivel 1 — Sistemas (12)

| Código | Descripción |
|--------|-------------|
| `Sheet` | Paneles de chapa sin estructura |
| `Skin` | Sistema de parantes y costillas |
| `Skin.Rail` | Sistema de parantes y costillas + rieles horizontales omega |
| `Rail` | Rieles horizontales omega |
| `Edge` | Rieles C o L para sujeción de paneles o parasoles de piso a techo |
| `Clad` | Rieles omega livianos para revestimiento de paredes |
| `SunShield` | Sistema de parantes y vigas cajón omega |
| `SkyCap` | Sistema de pescantes y rieles para cieloraso |
| `FullCustom` | Sistema totalmente a medida |
| `Organic` | Sistema a base de Melamina |
| `Frame` | Sistema a partir de marcos con perfiles normalizados comerciales |

---

## Nivel 2 — Árboles completos por sistema

---

### 1. Sistema `Sheet`

#### Productos

- `StandardFlat`
- `CustomFlat`
- `CustomPanel`
- `Triangle`
- `Square`
- `Diamond`
- `Lattice`
- Familia `MultiSlim`: A · C · D · E · I · L · O · V · W · U

#### Diseños por producto

| Producto | Diseños disponibles |
|----------|-------------------|
| `StandardFlat` | B-Design · Custom-Design |
| `CustomFlat` | A-Design · B-Design · C-Design · D-Design · Custom-Design · Pattern · HalfTone |
| `CustomPanel` | A-Design · B-Design · C-Design · D-Design · Custom-Design · Smooth · Micro · Pattern · HalfTone |
| `Triangle` · `Square` · `Diamond` · `Lattice` | Diseño estándar Sheet |
| `MultiSlim` (todos) | Smooth · Pattern55 · Pattern70 · MSHalfTone · Micro · Bond 4mm |

#### Materiales por producto

| Producto | Materiales disponibles |
|----------|----------------------|
| `SheetStandardFlat` | Galv 0,7mm · Galv 1,2mm · Galv 1,6mm · Galv 2mm · Galv 3,2mm · Steel 1,6mm · Steel 2mm · Luxidier 0,6mm · Alum 1,2mm |
| `SheetCustomFlat` | Alum 1,5mm · Galv 0,7mm · Galv 0,9mm · Galv 1,2mm · Galv 1,6mm · Steel 1,6mm · Steel 2mm · Steel 2,5mm · Luxidier 0,6mm · Galv 0,5mm |
| `SheetCustomPanel` | Alum 1,5mm · Bond 4mm · Galv 0,7mm · Galv 0,9mm · Galv 1,2mm · Galv 1,6mm · Galv 3,2mm · Steel 0,5mm · Steel 1,6mm · Steel 2mm · Luxidier 0,6mm · Galv 0,5mm |
| `SheetTriangle` | Alum 1,5mm · Galv 0,7mm · Galv 0,9mm · Galv 1,2mm · Galv 1,6mm · Steel 1,6mm · Steel 2mm · Steel 2,5mm · Luxidier 0,6mm · Galv 0,5mm · Steel 2mm |
| `SheetSquare` | Luxidier 0,6mm |
| `MultiSlim.A` | Steel 0,7mm · Galv 0,7mm · Galv 0,9mm · Luxidier 0,6mm · Alum 1mm · Bond 4mm · MultiSlim.A (referencia) · Steel 0,7mm |
| `MultiSlim.C–Z` | Steel 0,7mm · Galv 0,7mm · Galv 0,9mm · Luxidier 0,6mm · Alum 1mm |

#### Terminaciones

| Familia | Opciones |
|---------|---------|
| **Steel** | Crudo · OxidoNatur · BlancoStd · NegroStd · GrisIceStd · CortenStd · PersonalizadoRAL · MultiColor |
| **Galv** | Crudo · BlancoStd · NegroStd · GrisIceStd · CortenStd · PersonalizadoRAL · MultiColor |
| **Alum** | Crudo · BlancoStd · NegroStd · GrisIceStd · CortenStd · PersonalizadoRAL · Anodizado · MultiColor |
| **Luxidier** | Crudo · Óxido |
| **Bond** | Crudo · Silver Metallic · Grafito · Madera · PersonalizadoRAL |

---

### 2. Sistema `Skin`

#### Productos

- `Standard`
- `Prism`
- `Lattice`
- `Crossbar`
- `Expanded`
- `Composite`
- `Cinetik`

#### Diseños por producto

| Producto | Diseños disponibles |
|----------|-------------------|
| `Standard` · `Prism` | Smooth · Pattern · HalfTone · Custom · Scales |
| `Lattice` · `Crossbar` | Smooth · Pattern · Custom |
| `Expanded` | A-Diamond · B-Diamond · C-Diamond · D-Diamond |
| `Composite` | SmoothBond · PatternBond · HalfToneBond · CustomBond · ScalesBond |
| `Cinetik` | Rectangle · Rombo |

#### Materiales por producto

| Producto | Materiales |
|----------|-----------|
| `SkinStandard` | Alum 1,5mm · Alum 2,5mm · Alum 2mm · Galv 0,7mm · Galv 1,2mm · Galv 1,6mm · Galv 2mm · Galv 3,2mm |
| `SkinPrism` | Alum 1,5mm · Galv 0,5mm · Galv 1,2mm · Steel 1,2mm · Luxidier 0,6mm · Luxidier 0,7mm · Steel 0,9mm |
| `SkinLattice` | Alum 1mm · Galv 0,7mm · Galv 0,9mm · Galv 2mm · Galv 3,2mm · Luxidier 0,6mm · Luxidier 0,7mm |
| `SkinCrossBar` | Alum 1mm · Galv 0,5mm · Galv 0,7mm · Luxidier 0,5mm · Luxidier 0,6mm · Steel 0,5mm · Galv 2mm |
| `SkinExpanded` | Alum 1,5mm · Alum 2,5mm · Alum 2mm · Galv 1,2mm · Galv 1,6mm · Steel 1,2mm · Steel 1,6mm · Galv 2mm |
| `SkinComposite` | Bond 4mm · Bond 5mm |
| `SkinCinetik` | Alum 1,5mm · Alum 1mm · Galv 0,9mm · Galv 1,2mm · Steel 0,9mm · Steel 1,2mm |

#### Terminaciones

| Familia | Opciones |
|---------|---------|
| **Steel** | Crudo · OxidoNatur · BlancoStd · NegroStd · GrisIceStd · CortenStd · PersonalizadoRAL · MultiColor |
| **Galv** | Crudo · BlancoStd · NegroStd · GrisIceStd · CortenStd · PersonalizadoRAL · MultiColor |
| **Alum** | Crudo · BlancoStd · NegroStd · GrisIceStd · CortenStd · PersonalizadoRAL · Anodizado |
| **Luxidier** | Crudo · Óxido |
| **Bond** | Crudo · Silver Metallic · Grafito · Madera · PersonalizadoRAL |

---

### 3. Sistema `Skin.Rail`

#### Productos

- Familia `MultiSlim`: A · C · D · E · I · L · O · V · W · U
- `Panels`
- `Lattice`
- `Crossbar`
- `Standard`
- `Triangle`
- `Square`
- `CustomPanel`

#### Diseños

| Producto | Diseños disponibles |
|----------|-------------------|
| `MultiSlim` (todos) | Smooth · Pattern55 · Pattern70 · MSHalfTone · Micro · Bond 4mm |
| `Standard` / `CustomPanel` | Smooth |
| `Panels` · `Lattice` · `Crossbar` | Smooth · Pattern · Custom |
| `Triangle` · `Square` | Smooth (estándar) |

#### Materiales

| Producto | Materiales |
|----------|-----------|
| `Skin.RailStandard` | Alum 1,5mm · Alum 1mm · Galv 0,9mm · Galv 1,2mm · Steel 0,9mm · Steel 1,2mm · Galv 0,7mm |
| `MultiSlim.A` | Steel 0,7mm · Galv 0,7mm · Galv 0,9mm · Luxidier 0,6mm · Alum 1mm · Bond 4mm · MultiSlim.A–Z (refs.) |
| `MultiSlim.C–Z` | Steel 0,7mm · Galv 0,7mm · Galv 0,9mm · Luxidier 0,6mm · Alum 1mm |
| `Rail.Latice` | Steel 0,7mm · Galv 0,7mm · Luxidier 0,6mm · Galv 2mm · Galv 3,2mm · Alum 1mm |

#### Terminaciones

Idénticas al sistema `Skin` (Steel · Galv · Alum · Luxidier · Bond).

---

### 4. Sistema `Clad`

#### Productos

- `Triangle`
- `Square`
- `MiniWaves`
- `Panels`
- `PlyWood`
- `CustomPanel`
- Familia `MultiSlim`: A · C · D · E · I · L · O · V · W · U

#### Diseños

| Producto | Diseños disponibles |
|----------|-------------------|
| `Triangle` · `Square` · `MiniWaves` · `Panels` | Smooth · Pattern · HalfTone · Custom · Scales |
| `PlyWood` | Smooth · Dots · Slots · Custom |
| `CustomPanel` | Smooth · Pattern · HalfTone · Custom |
| `MultiSlim` (todos) | Smooth · Pattern55 · Pattern70 · MSHalfTone · Micro · Bond 4mm |

#### Materiales

| Producto | Materiales |
|----------|-----------|
| `CladTriangle` · `CladSquare` · `CladMiniWaves` · `CladPanels` | Steel 0,5mm · Galv 0,5mm · Luxidier 0,5mm · Luxidier 0,6mm · Galv 0,9mm |
| `CladPlyWood` | MDF.Cedro 16mm · MDF.Melamina 19mm · Bond 3mm · Bond 4mm |
| `MultiSlim.A–Z` | Steel 0,7mm · Galv 0,7mm · Galv 0,9mm · Luxidier 0,6mm · Alum 1mm |
| `Lattice (Clad)` | Steel 0,7mm · Galv 0,7mm · Luxidier 0,6mm · Alum 1mm · Galv 0,5mm |

#### Terminaciones

| Familia | Opciones |
|---------|---------|
| **Steel** | Crudo · BlancoStd · NegroStd · GrisIceStd · CortenStd · PersonalizadoRAL · MultiColor |
| **Galv** | Crudo · BlancoStd · NegroStd · GrisIceStd · CortenStd · PersonalizadoRAL |
| **Alum** | Crudo · BlancoStd · PzRAL · Anodizado |
| **Luxidier** | Crudo · Óxido |
| **MDF** | Crudo · Melamina Std · Melamina Esp. |

---

### 5. Sistema `SunShield`

#### Productos

- `Prisma`
- `Diamond`
- `Oval`
- `Drop`
- `Alloy`
- `Square`

#### Diseños

| Producto | Diseños disponibles |
|----------|-------------------|
| `Prisma` · `Diamond` · `Oval` · `Drop` | Smooth · Pattern · HalfTone · Scales · Custom |
| `Alloy` · `Square` | Smooth |

#### Materiales

| Producto | Materiales |
|----------|-----------|
| `SunShieldPrisma` | Steel 0,5mm · Galv 0,5mm · Luxidier 0,6mm · Alum 1,5mm · Bond 4mm |
| `SunShieldDiamond` | Steel 0,5mm · Galv 0,5mm · Luxidier 0,6mm · Alum 1,5mm |
| `SunShieldOval` | Steel 0,5mm · Galv 0,5mm · Luxidier 0,6mm |
| `SunShieldDrop` | Steel 0,5mm · Galv 0,5mm · Luxidier 0,6mm |
| `SunShieldAlloy` | Steel 0,7mm · Galv 0,7mm · Alum 1,5mm |
| `SunShieldSquare` | Steel 0,7mm · Galv 0,7mm · Galv 0,5mm · Luxidier 0,6mm · Alum 1mm |

#### Terminaciones

| Familia | Opciones |
|---------|---------|
| **Steel** | Crudo · BlancoStd · NegroStd · GrisIceStd · CortenStd · PersonalizadoRAL · MultiColor |
| **Galv** | Crudo · BlancoStd · NegroStd · CortenStd · PersonalizadoRAL |
| **Alum** | Crudo · BlancoStd · Anodizado |
| **Luxidier** | Crudo · Óxido |
| **Bond** | Crudo · Silver Metallic · Grafito |

---

### 6. Sistema `SkyCap`

#### Productos

- `SkyPanel`
- `SkyBars`
- `SkyPlyWood`

#### Diseños

| Producto | Diseños disponibles |
|----------|-------------------|
| `SkyPanel` | Smooth · Pattern · HalfTone · Scales · Custom |
| `SkyBars` | Smooth · Pattern · Dots |
| `SkyPlyWood` | Smooth · Dots · Slots |

#### Materiales

| Producto | Materiales |
|----------|-----------|
| `SkyCapSkyPanel` | Steel 0,5mm · Galv 0,5mm · Galv 0,7mm · Luxidier 0,6mm · Bond 3mm · Bond 4mm |
| `SkyCapSkyBars` | Steel 0,5mm · Galv 0,5mm · Luxidier 0,6mm · MDF.Melamina 19mm |
| `SkyCapSkyPlyWood` | MDF.Cedro 16mm · MDF.Melamina 19mm · MDF.Mel. 18mm H3730 · MDF.Mel. 18mm W1100 |

#### Terminaciones

| Familia | Opciones |
|---------|---------|
| **Steel** | Crudo · BlancoStd · NegroStd · GrisIceStd · CortenStd · PersonalizadoRAL |
| **Galv** | Crudo · BlancoStd · NegroStd · CortenStd · PersonalizadoRAL |
| **Luxidier** | Crudo · Óxido |
| **Bond** | Crudo · Silver Metallic |
| **MDF** | Crudo · Melamina Std · Melamina Esp. |

---

### 7. Sistema `FullCustom`

#### Productos

- `A_Tipe`
- `B_Tipe`
- `C_Tipe`
- `D_Tipe`

#### Diseños

Todos los tipos comparten el mismo conjunto:

- Smooth · Pattern · HalfTone · Custom · Scales

#### Materiales

| Producto | Materiales |
|----------|-----------|
| `FullCustomA_Tipe` | Steel 0,5mm · Steel 0,7mm · Steel 0,9mm · Steel 1,2mm · Steel 1,6mm · Galv 0,5mm · Galv 0,7mm · Galv 0,9mm · Galv 1,2mm · Galv 1,6mm · Alum 0,5mm · Alum 1mm · Alum 2mm · Alum 2,5mm · Luxidier 0,5mm · Luxidier 0,6mm · Luxidier 0,7mm · Inox 0,5mm · Inox 0,7mm · Inox 0,9mm · Inox 1,2mm · Inox 1,5mm · Bond 3mm · Bond 4mm · Bond 5mm · MDF.Cedro 16mm · MDF.Melamina 19mm · MDF.Mel. 18mm H3730 · MDF.Mel. 18mm W1100 |
| `FullCustomB_Tipe` | Ídem A_Tipe |
| `FullCustomC_Tipe` | Ídem A_Tipe |
| `FullCustomD_Tipe` | Ídem A_Tipe |

#### Terminaciones

| Familia | Opciones |
|---------|---------|
| **Steel** | Crudo · BlancoStd · NegroStd · GrisIceStd · CortenStd · PersonalizadoRAL · MultiColor |
| **Galv** | Crudo · BlancoStd · NegroStd · GrisIceStd · CortenStd · PersonalizadoRAL · MultiColor |
| **Alum** | Crudo · BlancoStd · NegroStd · GrisIceStd · CortenStd · PersonalizadoRAL · Anodizado · MultiColor |
| **Luxidier** | Crudo · Óxido |
| **Inox** | 0,5mm · 0,7mm · 0,9mm · 1,2mm · 1,5mm |
| **Bond** | Crudo · Silver Metallic · Grafito · Madera · PersonalizadoRAL |
| **MDF** | Crudo · Melamina Std · Melamina Esp. |

---

### 8. Sistema `Organic`

#### Productos

- `StandardWood`
- `CustomWood`
- `ChipBoard`
- `PlyWood`

#### Diseños

| Producto | Diseños disponibles |
|----------|-------------------|
| `StandardWood` · `CustomWood` | Smooth · Dots · Slots · Custom |
| `ChipBoard` · `PlyWood` | Smooth · Dots · Slots |

#### Materiales

| Producto | Materiales |
|----------|-----------|
| Todos | MDF.Cedro 16mm · MDF.Melamina 19mm · MDF.Mel. 18mm H3730 · MDF.Mel. 18mm W1100 |

#### Terminaciones (MDF)

- Crudo · Melamina Std · Melamina Esp.

---

### 9. Sistema `Frame`

#### Productos

- `Expanded`
- `Lattice`
- `Crossbar`
- `Prisma`

#### Diseños

Todos comparten: Smooth · Pattern · HalfTone · Custom · Scales

#### Materiales

| Producto | Materiales |
|----------|-----------|
| `FrameExpanded` | Alum 1,5mm · Alum 2mm · Alum 2,5mm · Galv 0,7mm · Galv 1,2mm · Galv 1,6mm · Galv 2mm · Galv 3,2mm · Steel 1,6mm · Steel 2mm |

#### Terminaciones

| Familia | Opciones |
|---------|---------|
| **Steel** | Crudo · BlancoStd · NegroStd · CortenStd · PersonalizadoRAL |
| **Galv** | Crudo · BlancoStd · NegroStd · CortenStd · PersonalizadoRAL |
| **Alum** | Crudo · BlancoStd · PersonalizadoRAL · Anodizado |

---

## Nivel 3 — Parámetros globales del presupuesto

### Alcance de terminación

| Valor | Descripción |
|-------|-------------|
| `Ninguno` | Sin terminación aplicada |
| `Frente` | Solo cara vista |
| `Completo` | Cara vista + reverso |
| `Completo + Estructura` | Cara vista + reverso + perfiles de estructura |

### Tipo de cambio

| Valor | Moneda |
|-------|--------|
| `Pesos Arg.` | Pesos argentinos |
| `Dólar Oficial` | USD tipo oficial |
| `Dólar MEP` | USD tipo MEP/bolsa |

### Variable activa

| Valor | Efecto |
|-------|--------|
| `Sí` | Variante activa, se incluye en el presupuesto |
| `No` | Variante desactivada |

---

## Notas de implementación para Claude Code

1. **Relación Sistema → Producto es de uno-a-muchos**: cada sistema habilita un subconjunto específico de productos. No todos los productos son válidos para todos los sistemas.

2. **Relación Producto → Diseño es de uno-a-muchos**: cada producto tiene diseños propios. Algunos diseños se repiten entre productos del mismo sistema (ej. `Smooth` en casi todos los MultiSlim).

3. **Relación Producto+Diseño → Material es de uno-a-muchos**: la selección de material depende tanto del producto como del diseño elegido. La clave de acceso en la hoja es el nombre compuesto (ej. `SheetStandardFlat`, `SkinStandard`, `FullCustomA_Tipe`).

4. **Terminaciones son independientes del diseño**: se aplican sobre el material seleccionado. Cada familia de material (Steel, Galv, Alum, etc.) tiene su propio catálogo de colores/acabados.

5. **Inox es exclusivo de FullCustom**: ningún otro sistema tiene opciones en Inox.

6. **MDF/Melamina aparece en**: Sheet (CladPlyWood), SkyCap (SkyPlyWood), Organic (todos) y FullCustom.

7. **MultiSlim es transversal**: aparece como producto en Sheet, Skin.Rail, Clad y Organic, pero con materiales específicos por contexto.

8. **Bond 4mm** puede ser tanto material base (Composite de Skin) como diseño (MultiSlim).

---

*Velum Studio SAS — Documento generado desde HULL Presupuestador v3.1*
