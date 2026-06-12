# Punto de Guardado — Catálogo de Piezas por Producto

**Fecha:** 2026-06-11 (para retomar 2026-06-12 en fábrica con ingeniería)
**Estado del módulo base:** Órdenes de Producción (OPP/OPS/OPB) terminado y verificado en runtime (branch `feat/ordenes-produccion`, sin mergear aún). Wizard → emitir → PDF funciona.

---

## Qué estamos diseñando ahora

Convertir la carga de piezas del wizard de **texto libre** → **catálogo estructurado**.
Objetivo del usuario: al elegir un producto (ej. MultiSlim), el wizard debe ofrecer **solo las piezas de ese sistema**, nunca piezas de otro (ej. Skin). Evita errores y agiliza la carga.

## Modelo de dominio confirmado (con ingeniería + carpeta de sistemas)

Jerarquía: **Empresa → Sistema → Producto/Variante → Piezas**

- **Sistema** (9): SHEET, SKIN, FOLD, MULTISLIM, SUNSHIELD, FULLCUSTOM, ORGANIC, SkyCap (+ Buloneria/Aluco/Expanded como auxiliares).
- **Producto/Variante**: la "letra" o tipo dentro del sistema (MULTISLIM → SlimA, SlimC, SlimD, SlimE, SlimI, SlimL, SlimO, SlimV, SlimW; SKIN → Standard, Prism, Lattice, Crossbar, Expanded, Composite; etc.).
- **Regla clave confirmada por el usuario:** *"MultiSlim, sea el tipo que sea, usan el mismo sistema todas; las letras solo cambian la forma del panel."*
  → Las **piezas estándar** se asocian al **SISTEMA** (compartidas por todas las variantes).
  → Lo único propio de cada variante es el **panel/perfil** (su forma).
- El **panel crudo** es el mismo blank para todas las letras (ej. MultiSlim 400×3000×0.7mm); la forma (.O/.A/…) es el patrón que se le da en el proceso. El "Detalle" del panel en planilla = terminación (Standard / HalfTone / Pattern).
- **Cantidades NO están en el catálogo** — dependen de la obra (matriz M×N). El catálogo define el *menú* de piezas, no cuántas.

## Fuente de datos

- **Carpeta CAD:** `C:\Users\Nissei\Desktop\Velum - Sistemas`
  - Por sistema: `00 - Piezas STD` (piezas estándar .SLDPRT), `00 - Buloneria`, `00 - DWG Piezas Estandar`, y carpetas `HULL.<Sistema>.<Variante>` con el perfil DXF de cada variante.
- **Planillas Excel** (el usuario las está completando): tienen los datos técnicos por pieza.
  - Hoja maestra: `Empresa | Sistema | Producto | Detalle` (taxonomía + descripciones).
  - Hojas de piezas: `Producto(=nombre pieza) | Detalle(=medida) | Ancho | Largo | Espesor | Area | Peso | Aprovechamiento (unid./chapa 3x1.2m)`.
  - Ejemplos vistos: Placa Anclaje (PIC/PEC-150/200, PIL/PEL, esp 2.5), Parante (250/500/750/1000/3000mm, esp 1.6), Omega (40x20 esp0.7, 50x50/100x50 esp1.6), Panel MultiSlim (400×3000×0.7), Panel Skin (1100×1350×1.2).

## Modelo de datos propuesto (3 tablas nuevas, a confirmar)

1. **`Sistema`** — id, nombre, descripción.
2. **`PiezaCatalogo`** — id, sistemaId, nombre, detalle/medida, material, espesor, ancho, largo, (area/peso/aprovechamiento calculables), proceso/proximoProceso, archivoDxfUrl. Se carga una vez (idealmente importada del Excel).
3. **`ProductoVariante`** — id, sistemaId, nombre (SlimO), descripción, panelDxfUrl.

Cambio del wizard: elegís Sistema → Variante → se despliegan las piezas del sistema (tildar + cantidad por obra), pre-cargadas con material/espesor/medidas/proceso del catálogo. Resto del flujo (emitir/PDF/bach) igual.

## ⚠️ LO QUE FALTA — pedir a ingeniería mañana (2026-06-12)

En la planilla de piezas, sumar estas columnas para que la importación sea directa:
1. **SISTEMA** — a qué sistema pertenece cada pieza (es el enganche entre la hoja maestra y la de piezas; ojo: "Producto" significa cosas distintas en cada hoja).
2. **MATERIAL** — chapa galvanizada / aluminio / etc. (hoy está el espesor pero no el material).
3. **PROCESO / RUTA** — por qué máquinas pasa cada pieza (Láser → Plegadora → …). Define el OPP/OPS/OPB correcto por pieza.
4. **TIEMPOS POR ETAPA** — *(nuevo, el usuario los obtiene mañana)* cuánto tarda cada etapa según pieza y producto. Habilita estimación de capacidad/plazos y mejora el cálculo de bach/carga de máquina.

**Entregable ideal:** un único `.xlsx` con (a) hoja maestra Sistema/Producto y (b) hoja de piezas con las columnas de arriba. Pasar la **ruta del archivo** (no capturas) para importar valores exactos.

## Próximos pasos al retomar

1. Recibir el `.xlsx` completo → leerlo y validar estructura.
2. Escribir spec del catálogo (writing-plans) + script de importación (parsea Excel → siembra Sistema/PiezaCatalogo/ProductoVariante en Supabase vía SQL Editor, respetando [[project-velum-constraints]]).
3. Pantalla de catálogo (ver/editar piezas y productos).
4. Cambiar el wizard: selector Sistema→Variante + picker de piezas filtrado.
5. (Si hay tiempos) incorporar tiempos por etapa al modelo para capacidad/plazos.
6. Decidir merge de `feat/ordenes-produccion` a master.
