# Cotizador VELUM — Lista de Materiales (BOM) por obra

**Fecha:** 2026-06-25
**Estado:** Diseño aprobado, pendiente plan de implementación
**Repo:** Gauch09/Velum (`app/`)
**Contexto previo:** extiende el cotizador nativo (ver `2026-06-21-cotizador-plataforma-design.md`). Corresponde a las fases F5 (output) / F6 (loop a producción) del roadmap, acotado a su primer alcance.

---

## 1. Problema

El motor de cotización ya calcula, por cada vano, dos despieces que hoy **se muestran un instante en el `VanoBuilder` y se descartan**:

- `geometria` → lo que necesita **Producción**: paneles, PIC150, costillas, empalmes, brocas, autoperforantes, parantes.
- `compras` → lo que necesita **Compras**: chapas ACM, galvanizado 1.6/2.5mm y kg de cada uno.

Al emitir, `crearCotizacion` guarda solo `sistema, material, colorACM, terminacion, ancho, alto, costoFab, costoMaterial, precio` — **descarta el despiece y hasta la `cara`** de cada vano.

La cotización debe ser el **origen de datos para toda la operación**: una lista de materiales (BOM) consolidada por obra, revisable y editable, que después toman Compras, Producción y demás áreas. Hoy eso no existe.

## 2. Decisiones de diseño (cerradas con el usuario)

| Tema | Decisión |
|------|----------|
| Momento | **(c) liviano**: despiece **preliminar** siempre visible (derivado de los vanos) + **snapshot congelado** al aceptar la cotización. |
| Reparto a áreas | **(a)**: pantalla de BOM revisable + export PDF por área. **Desacoplado** del módulo OPP existente. |
| Edición | **(b)**: editable. Estado **EN_REVISION** (editable) → **LIBERADA** (fija). |
| Consolidación | **(b)**: desglose **por cara** + **consolidado** de obra al pie. |
| Edición de líneas | **(b)**: ajustar cantidades calculadas **y** agregar líneas manuales (selladores, fletes, fijaciones…), marcadas por `origen`. |
| Redondeo de compra | **Siempre hacia arriba (`ceil`)** — nunca se compra de menos. Se redondea **una sola vez sobre el total** de obra, no por cara. |
| Disparo del snapshot | **Automático** al pasar la cotización a ACEPTADA (reusa `CambiarEstadoButtons`). Genera la lista en estado EN_REVISION. |

## 3. Ciclo de vida

```
COTIZAR (wizard)
  └─ al EMITIR: se guarda cada vano CON su despiece (geometría + compras) y su cara
        │
        ▼
COTIZACIÓN EMITIDA  ──►  [Despiece preliminar]  (siempre visible, solo-lectura)
  │                       Deriva de los vanos guardados. Refleja el cálculo tal cual.
  │
  └─ al ACEPTAR:
        se genera el SNAPSHOT → Lista de Materiales (BOM)
        │
        ▼
LISTA DE MATERIALES  estado: EN_REVISION  (editable)
  ├─ Sección COMPRAS     (materias primas: chapas, kg, + líneas manuales)
  ├─ Sección PRODUCCIÓN  (piezas: paneles, costillas, PIC, brocas…)
  ├─ desglose por cara + consolidado al pie
  └─ se ajustan cantidades / se agregan líneas manuales
        │
        └─ al LIBERAR → estado: LIBERADA  (fija)
              cada área la consulta y baja su PDF
```

Dos objetos distintos a propósito:

- **Despiece preliminar** — derivado de los vanos, refleja siempre el cálculo actual. No editable, no se "libera". Sirve para mirar antes de ganar la obra.
- **Lista de Materiales (BOM)** — snapshot congelado al aceptar, editable, con estado. Es lo que se revisa y se reparte.

## 4. Modelo de datos

> **Restricción de infra:** aplicar **por SQL Editor de Supabase, nunca `prisma migrate`** (red local solo IPv4; el pooler en :6543 funciona). El `schema.prisma` se actualiza en paralelo solo para mantener los tipos. Ver constraints del proyecto.

### 4.1 `CotizacionVano` — extender

Para no perder el despiece ni la cara al emitir:

```
+ cara        text          -- nombre de la cara/lado ("Lado Norte")
+ cantidad    int   default 1
+ geometria   jsonb         -- { paneles, mensulasTotal, piezas3000, empalmesJ, brocas, autoperf, parantes, ... }
+ compras     jsonb         -- { chapasACM, chapasGalv16, chapasGalv25, kgGalv16, kgGalv25, ... }
```

Alimenta el **despiece preliminar** directamente, sin recalcular. `crearCotizacion` debe persistir estos campos (hoy los descarta aunque llegan en el payload).

### 4.2 `ListaMateriales` — nueva (el BOM / snapshot)

```
id            uuid         pk
cotizacionId  uuid         fk → Cotizacion   (UNIQUE: una por cotización)
estado        text         -- EN_REVISION | LIBERADA
createdAt     timestamptz  default now()
liberadaAt    timestamptz  null
```

### 4.3 `LineaMateriales` — nueva (las líneas, editables)

```
id            uuid     pk
listaId       uuid     fk → ListaMateriales
area          text     -- COMPRAS | PRODUCCION
cara          text     null   -- nombre de cara, o NULL = línea consolidada de obra
insumo        text     -- "Chapa ACM 5000×1500", "Panel", "PIC150"...
unidad        text     -- un | kg | m2 | chapa
cantidad      numeric  -- cantidad vigente (editable)
cantidadCalc  numeric  null   -- cantidad original del motor; NULL en líneas MANUAL
origen        text     -- CALCULADA | MANUAL
nota          text     null
orden         int      -- orden de despliegue dentro de la sección
```

Una línea CALCULADA está **ajustada** (la UI la marca) cuando `cantidad <> cantidadCalc`. Esto da trazabilidad sin un flag aparte y permite "restaurar al valor calculado".

Semántica del desglose + redondeo:

- Líneas **por cara** (`cara` con nombre) = **consumo**. Compras en `kg`/`m2` (sin redondear); Producción en `un` (piezas, ya enteras).
- Líneas **consolidadas** (`cara = NULL`) en Compras = **unidades a comprar**, con redondeo `ceil` una sola vez sobre el total de obra.
- `origen = MANUAL` = agregadas por quien revisa; siempre como consolidadas de obra.

Una sola `ListaMateriales` por cotización (UNIQUE). Regenerable; **borrar y regenerar pierde las ediciones manuales** → la UI avisa antes de regenerar.

## 5. Generación del snapshot (al aceptar)

1. Lee todos los vanos de la cotización con `cara`, `cantidad`, `geometria`, `compras`.
2. **Producción** — suma piezas por cara (paneles, PIC150, costillas, empalmes, brocas, autoperforantes, parantes) × `cantidad`. Líneas por cara + consolidado. Piezas enteras → suma directa.
3. **Compras** — por cara, el **consumo crudo** (kg de galvanizado, m² de ACM, sin redondear). El **consolidado** convierte el consumo total a unidad de compra y redondea **hacia arriba** (`ceil`), una sola vez:
   `chapas = ceil(consumo_total / rendimiento_por_chapa)`.
4. Crea `ListaMateriales` (EN_REVISION) + sus líneas, todas `origen = CALCULADA`.

> **Punto abierto para la implementación:** la consolidación de Compras necesita el **consumo crudo por insumo**. Para galvanizado ya está (`compras.kgGalv16/25`). Para **ACM** el motor hoy expone chapas-por-vano pero no m² crudo; al implementar hay que tomar el área del vano o exponer el m² de ACM en el motor, para **no sumar chapas ya redondeadas por vano** (eso sobre-compraría). Resolver en el plan.

## 6. Pantallas

### 6.1 Despiece preliminar
Sección nueva dentro de `/cotizaciones/[id]`, debajo de la provisión. Agrupado por cara, leyendo `geometria`/`compras` de los vanos. Solo lectura. Dos sub-bloques: "A comprar (estimado)" y "A producir". Visible apenas la cotización está emitida.

### 6.2 Lista de Materiales (BOM revisable)
Pantalla nueva `/cotizaciones/[id]/materiales`. Solo existe cuando la cotización fue aceptada (snapshot generado).

```
LISTA DE MATERIALES — COT-2026-0042        [EN REVISIÓN]   [Liberar ▸]

╔═ COMPRAS ════════════════════════════════════════════╗
│  Lado Norte                                            │
│    Galvanizado 1.6mm        124.5 kg      [calc]       │
│    ACM (consumo)             38.2 m²      [calc]       │
│  Esquina                                               │
│    Galvanizado 1.6mm         31.0 kg      [calc]       │
│  ─────────────────────────────────────────────────    │
│  CONSOLIDADO (a comprar, ↑entero)                      │
│    Chapa ACM 5000×1500       6 chapas   [✎] [calc]     │
│    Chapa Galv 1.6 3000×1220  9 chapas   [✎] [calc]     │
│    Sellador estructural      4 un       [✎] [manual ✕] │
│    [+ agregar línea]                                   │
╚═══════════════════════════════════════════════════════╝

╔═ PRODUCCIÓN ═════════════════════════════════════════╗
│  Lado Norte                                            │
│    Paneles                   24 un       [✎] [calc]    │
│    PIC150                     48 un       [✎] [calc]    │
│  … (por cara) …                                        │
│  CONSOLIDADO                                           │
│    Paneles                   31 un …                   │
╚═══════════════════════════════════════════════════════╝
```

- Cantidades editables inline (`✎`). Las `calc` ajustadas quedan marcadas como tocadas; las `manual` se pueden borrar (`✕`).
- `[+ agregar línea]` por sección → insumo, unidad, cantidad, nota.
- **Liberar** pasa a LIBERADA y bloquea la edición.

### 6.3 Acceso
Desde la pantalla de cotización aceptada, botón "Lista de materiales ▸". Las áreas, por ahora, consultan esa misma pantalla (ya liberada) y/o bajan el PDF de su área. **Sin login por rol todavía** (mejora futura).

## 7. Export PDF por área

- Dos PDFs separados: **"PDF Compras"** y **"PDF Producción"**, cada uno con su sección (por cara + consolidado), encabezado VELUM, nº de cotización, cliente, obra y fecha. Reutiliza el estilo de `CotizacionPDF` (`app/src/lib/cotizador/pdf/`).
- Se puede bajar en cualquier estado, pero si está **EN_REVISION** el PDF lleva marca **"PROVISORIO"** para que nadie compre sobre un borrador. Al **liberar**, el PDF sale limpio.

## 8. Fuera de alcance (fases futuras)

- Generación automática de OPP/OPS/OPB + lotes de chapa desde el BOM (mapeo pieza → ruta de proceso). Es el F6 completo.
- Acceso por rol de cada área (login Compras / Producción).
- Descuento de stock real / integración con inventario.

B entrega el BOM **persistido, revisable, editable y exportable** — listo para alimentar esas fases después.

## 9. Archivos afectados (estimado, a refinar en el plan)

- `app/prisma/sql/2026-06-25-lista-materiales.sql` — DDL (extensión `CotizacionVano` + tablas nuevas).
- `app/prisma/schema.prisma` — tipos en paralelo (sin migrate).
- `app/src/lib/cotizador/repo-cotizaciones.ts` — `crearCotizacion` persiste cara/cantidad/geometria/compras.
- `app/src/lib/cotizador/repo-materiales.ts` (nuevo) — generar snapshot, leer/editar/liberar BOM.
- `app/src/lib/cotizador/generar-bom.ts` (nuevo) — consolidación + redondeo `ceil`.
- `app/src/app/(supervisor)/cotizaciones/[id]/page.tsx` — sección despiece preliminar.
- `app/src/app/(supervisor)/cotizaciones/[id]/materiales/page.tsx` (nuevo) — BOM revisable.
- `app/src/components/supervisor/ListaMateriales*.tsx` (nuevos) — UI de edición.
- `app/src/app/(supervisor)/cotizaciones/[id]/actions.ts` — disparo del snapshot al aceptar.
- `app/src/lib/cotizador/pdf/MaterialesPDF.tsx` (nuevo) + rutas de export por área.
