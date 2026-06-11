# Planificación: Órdenes de Producción por Tipo de Pieza

> Creado: 2026-06-10 — Para trabajar en la próxima sesión

## Objetivo

Modelar las órdenes de producción según el tipo de pieza fabricada por VELUM:

- **Ménsulas**
- **Costillas**
- **Paneles**

Cada tipo de pieza tiene su propia ruta de producción (secuencia de etapas y máquinas), cantidades, unidades y tiempos estimados distintos.

---

## Preguntas a responder en la sesión

### 1. Rutas por tipo de pieza
- ¿Qué etapas recorre cada pieza? (ej: Láser → Plegado → Pintado → Embalaje)
- ¿Qué máquinas intervienen en cada etapa?
- ¿El orden de etapas varía entre ménsulas, costillas y paneles?

### 2. Unidades y cantidades
- ¿En qué unidad se mide cada pieza? (PIEZAS / METROS / M2)
- ¿Hay rendimientos estándar por etapa? (ej: X piezas/hora en láser)

### 3. Umbrales de cascada
- ¿A qué % de avance de una etapa se activa la siguiente automáticamente?
- ¿Varía por tipo de pieza o es global?

### 4. Planificación de carga
- ¿Se planifican las órdenes con fechas de inicio estimadas?
- ¿Hay prioridades automáticas según fecha de entrega del proyecto?

### 5. Integración con el sistema actual
- ¿Las rutas ya están cargadas en la DB o hay que crearlas?
- ¿Hay órdenes de prueba para validar el flujo completo?

---

## Ideas preliminares

```
MÉNSULA:   Corte Láser → Punzonado → Plegado → Pintado → Embalaje
COSTILLA:  Corte Láser → Fresado → Pintado → Embalaje  
PANEL:     Corte Láser → Expansión → Lavado → Pintado → Horno → Embalaje
```

*(Confirmar con Germán en la sesión)*

---

## Próximos pasos en la sesión

1. Confirmar rutas y etapas para cada tipo de pieza
2. Cargar/actualizar rutas en DB via Supabase SQL Editor
3. Crear órdenes de prueba para cada tipo
4. Validar flujo completo: creación → operario → progreso → cierre
