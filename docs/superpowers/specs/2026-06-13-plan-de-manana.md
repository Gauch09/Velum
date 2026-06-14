# Plan para mañana (2026-06-13)

Contexto: ayer se implementó el módulo de **Medición de Tiempos Reales**. Ver `2026-06-12-medicion-tiempos-reales-PUNTO-GUARDADO.md`.

---

## Recomendación sobre la arquitectura

**No refactorizar el código.** Está limpio, 69 tests verdes, responsabilidades separadas. Refactor = trabajo sin retorno hoy (YAGNI).

**Sí hacer un repaso de MODELO, corto y enfocado en una sola pregunta:** dónde entra el factor de utilización en la ecuación de costo del cotizador, **exactamente una vez**. Es diseño, no código.

## La pregunta de modelo que hay que cerrar

El cotizador calcula: `Costo_paso/u = tarifa_centro / Capacidad_instalada_máx`, con `tarifa_centro = costo_fijo_mensual / horas`.

El módulo de medición produce DOS factores:
- **Velocidad real** (piezas/hora reales) → candidato a reemplazar `Capacidad_instalada_máx`.
- **Disponibilidad** (fracción de jornada que la máquina corre) → candidato a reducir las `horas` de `tarifa_centro`.

**Riesgo:** si el factor entra en los dos lados, se castiga el costo dos veces. Hay que elegir un único punto de entrada (o una composición explícita que no duplique). Esta es la misma decisión anotada en el cotizador como *"plena carga vs. producción real esperada"*.

Tres encuadres posibles a discutir mañana:
1. **Costo a capacidad real:** `Capacidad_instalada_máx` se reemplaza por velocidad real; `tarifa_centro` usa horas nominales. El factor vive en el numerador de piezas. Simple, costo "realista".
2. **Costo a plena carga (piso):** capacidad y horas ambas nominales/teóricas; el factor NO entra al costo unitario, se reporta aparte como "pérdida de utilización". Da el costo mínimo alcanzable.
3. **Híbrido explícito:** disponibilidad ajusta `tarifa_centro` (el costo fijo se reparte sobre horas reales), velocidad real ajusta capacidad — pero con la cuenta hecha para demostrar que NO se duplica. Más fiel, más delicado.

Decisión depende del uso: ¿el cotizador cotiza el costo que TENÉS hoy, o el que TENDRÍAS con la planta bien cargada? Eso lo definís vos; el modelo se ajusta a esa respuesta.

## Segundo punto débil del modelo (anotar, no urgente)

`disponibilidad = horas fichadas / (días con actividad × 8h)`. El denominador "días con actividad" es ruidoso: un día con poco fichaje cuenta como jornada completa disponible. Para costeo, el denominador correcto serían **horas-turno pagas** (qué máquina está dotada qué turno), que hoy no modelamos. Con datos reales se va a ver si el número es usable o si hace falta modelar turnos/dotación. No tocar hasta tener datos.

---

## Secuencia de mañana

### Fase 0 — Probar que funciona (bloqueante, ~30 min)
Correr el checklist E2E del PUNTO-GUARDADO (sección 6): fichar como operario (Preparar/Producir/Pausar/Terminar, selector Huaxia/Datech), verificar que el % avanza igual que "Registrar" y que `/rendimiento` muestra las 3 tablas. Si algo falla, arreglarlo antes de seguir. **No se puede construir sobre UI no verificada.**

### Fase 1 — Cerrar la decisión de modelo (~30 min)
Conversación de diseño sobre los tres encuadres de arriba. Elegir uno, documentarlo en el spec del cotizador. No requiere datos reales (es estructura); la magnitud viene después.

### Fase 2 — Arrancar la recolección de datos reales (la pieza larga)
- Elegir 1-2 operarios piloto y 1 semana.
- Capacitarlos: solo Preparar / Producir / Pausar / Terminar. 5 minutos.
- Dejar que los tramos se acumulen. El factor necesita `n` alto para ser confiable — esto son semanas, no horas. Cuanto antes arranque, antes sirve.

### Fase 3 — Endurecer calidad de dato (opcional, solo si Fase 0 lo pide)
Guard de outliers: marcar `dudoso` automáticamente los tramos cuya velocidad real supere ampliamente la teórica (dedazo de cantidad). Barato. YAGNI hasta ver dato sucio.

---

## Pendientes administrativos
- **Rama:** `feat/ordenes-produccion` está pusheada con este módulo arriba del trabajo de órdenes. Decidir: ¿PR a master o seguir acumulando en la rama?
- **Sin trackear:** `.agents/` y `docs/marketing/` (stream de marca). En disco, no pusheados. Committear aparte si se quieren respaldar.

## Proyectos aparte (anotados, NO hacer mañana)
- Motor de rutas a "máquina libre del tipo" (planificación de planta con las 2 plegadoras/lásers).
- Capacidad teórica por instancia de máquina (cuando el real revele diferencias Leapion/Bodor, Huaxia/Datech grandes).
- Cron de barrido de huérfanos (hoy cierre lazy, suficiente).
