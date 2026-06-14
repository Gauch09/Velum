# Punto de Guardado — Cotizador de Costeo (modelo nuevo)

**Fecha:** 2026-06-12 (para retomar esta misma noche)
**Estado:** Modelo de costeo diseñado, aprobado conceptualmente y materializado en una **planilla de validación funcionando**. Falta cargar datos reales.

---

## Cómo retomar (decíselo a Claude tal cual)

> "Retomá el cotizador de costeo de VELUM. Leé el punto de guardado
> `Velum/docs/superpowers/specs/2026-06-12-cotizador-costeo-PUNTO-GUARDADO.md`
> y seguimos."

Con eso reconstruyo todo el contexto. La memoria persistente ([[cotizador-costeo-velum]]) también lo apunta.

---

## Qué se hizo hoy

1. **Análisis a fondo de las dos planillas** (en `C:\Users\Nissei\Desktop\`):
   - `HULL - Presupuestador 3.1.xlsm` → hoja `Costos Productos` = motor de costo viejo. Resto = motor comercial (precio venta por m²).
   - `Control de Produccion dinamico.xlsx` → hoja `datos` = tiempos y capacidades reales por máquina de 55 productos.
2. **Se detectaron y documentaron errores del modelo viejo** (pintura ×11 en vez de ÷, MP sin merma, densidad/precio fijos al acero, costo único por minuto, margen+impuestos mezclados).
3. **Spec del modelo nuevo** (5 capas): `2026-06-12-cotizador-costeo-design.md`.
4. **Planilla de validación creada y verificada**:
   `C:\Users\Nissei\Desktop\Cotizador VELUM - Validacion Modelo v1.xlsx`
   - Hojas: `LEEME`, `Parametros`, `Costeo` (55 productos), `Comparacion`.
   - Fórmulas vivas (Excel recalcula al abrir). Verificadas en Python: corren sin error.
   - Script regenerador: `C:\Users\Nissei\Desktop\build_cotizador.py`

## El modelo en una línea

`Costo fab/u = MP(chapa consumida) + Σ(operaciones por ruta = tarifa_centro / capacidad) + pintura(polvo÷cobertura + horno) + depto técnico + consumibles`. Margen e impuestos van en capas separadas (fuera de esta etapa).

## Hallazgo clave de la validación

Con placeholders, el costo nuevo da −44% a −75% vs. el viejo. Razón: las capacidades provisionales son **velocidad pico de máquina** (~760 pz/h), no el **tiempo real con setup** (~70 pz/h). El costo de operaciones depende ~10× de ese dato → **es lo primero a relevar**.

## Qué falta (próxima sesión) — datos a cargar en celdas naranjas

1. **Capacidad instalada máxima real por equipo × tipo de pieza** (con setup/carga, no pico) → hoja `Costeo`, columnas Cap*.
2. **Costo fijo mensual real por centro de trabajo** (el real es menor a 50k; va desagregado) → hoja `Parametros`.
3. Densidad/precio por material no-acero; consumibles desagregados.

## Decisión de criterio pendiente

¿Costear a **plena carga** (capacidad máx → costo piso, optimista) o a **producción real esperada** (con ociosidad → costo más alto, conservador)? El spec fijó "capacidad instalada máxima"; reconfirmar al cargar datos.

## Destino final

Cuando el modelo valide con datos reales → implementar como **módulo en VELUM** (Supabase + UI), integrado con [[velum-sistema-de-gesti-n-de-producci-n]] y el catálogo de piezas ([[catalogo-piezas]]).
