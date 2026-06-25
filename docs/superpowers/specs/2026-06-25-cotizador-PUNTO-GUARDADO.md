# PUNTO GUARDADO — Cotizador VELUM (2026-06-25)

Resumen para retomar el trabajo desde este punto. Todo lo de hoy está **mergeado en `main`** y verificado en browser.

## Qué se completó hoy

### 1. Fix del montaje en la cotización
- **Bug resuelto:** `actionCrearCotizacion` descartaba el campo `montaje` (Zod no lo declaraba) → no se guardaba. Ahora se persiste.
- Wizard: el montaje arranca activado (95% de las obras lo llevan), el Paso 3 muestra **Provisión + Montaje = Total obra** en vivo, y se invalida el cálculo al cambiar parámetros.
- Commit clave: `4d0ebfa`.

### 2. Lista de Materiales (BOM) por obra — feature nueva completa
- Diseño: `docs/superpowers/specs/2026-06-25-cotizador-lista-materiales-design.md`
- Plan: `docs/superpowers/plans/2026-06-25-cotizador-lista-materiales.md`
- Despiece (geometría + compras) ahora **se persiste** por vano (antes se descartaba).
- **Despiece preliminar** visible en la pantalla de cotización (recalculado, solo lectura).
- Al **aceptar** la cotización se genera un **snapshot editable** = Lista de Materiales, estados `EN_REVISION → LIBERADA`.
- Pantalla `/cotizaciones/[id]/materiales`: secciones **Compras** y **Producción**, desglose por cara + consolidado, editar cantidades, agregar líneas manuales, liberar.
- **PDF por área** (Compras / Producción) con marca "PROVISORIO" hasta liberar.
- Núcleo testeado: `app/src/lib/cotizador/generar-bom.ts` (+ `.test.ts`). Redondeo de compra: **galvanizado al total (`ceil`)**, **ACM suma de chapas por paño**.
- SQL aplicado en Supabase: `app/prisma/sql/2026-06-25-lista-materiales.sql` (ids son `text`/cuid, NO uuid).

### 3. Montaje por costo mensual
- Los medios de elevación se **alquilan por mes**: `costo/día = costo_mensual ÷ 26` (días laborables lun-sáb), **+20%** al costo diario si la obra dura **menos de un mes** (<26 días). Aplica a todos los medios.
- Editable en `/calibracion` ("Costo/mes (u$d)").
- Motor: `app/src/lib/cotizador/montaje/calcularMontaje.ts` (constantes `DIAS_LABORABLES_MES=26`, `RECARGO_OBRA_CORTA=0.20`) + test (4 casos).
- SQL aplicado: `app/prisma/sql/2026-06-25-medios-costo-mensual.sql`. Catálogo de 5 medios (netos sin IVA): Tijera 10m=800, 12m=1500, 16m=1700, Brazo 16m=2400, Brazo 20m=3000.

## Estado

- **Branch:** todo en `main`. Suite: **139 tests verde** (29 archivos).
- **DB Supabase:** los dos SQL ya aplicados (restricción: schema solo por SQL Editor, NUNCA `prisma migrate` — red IPv4).
- Verificado en browser: flujo BOM completo + cálculo de montaje.

## Cómo arrancar la próxima sesión

```
cd C:\Users\Nissei\Velum\app
npm run dev
```
Luego: `http://localhost:3000/cotizaciones/nueva`

## Próximo paso inmediato

**Emitir la primera cotización REAL a un cliente con el sistema Skin.** Antes de emitir en serio:
- Verificar el **tipo de cambio** del día (Paso 1) — fija los precios en pesos.
- Confirmar el **margen** (default 150%) para el cliente.
- Si lleva montaje, el medio de elevación se cobra mensual prorrateado (+20% si es obra corta).

## Pendientes / mejoras futuras (no bloquean)

Minors diferidos (ver ledger del proyecto): cotización inexistente → 500 en vez de 404 en ruta PDF; helpers de edición no propagan el error exacto de DB (mensaje genérico); filename de PDF en minúscula; obras 100% Rail/Clad generan lista vacía (ya con aviso en UI); `Float` vs `Decimal` en cantidades.

Fases futuras del BOM: generación automática de OPP/OPS/OPB desde el BOM (loop a producción, mapeo pieza→ruta); acceso por rol de cada área (login Compras/Producción); descuento de stock real.

## Referencias

- Memorias: `project_velum_lista_materiales`, `project_velum_montaje_mensual`, `project_cotizador_plataforma`, `project_velum_cotizador_decisiones`, `project_velum_constraints`.
