# Boceto — Dashboard de Producción (datos de HULL)

**Pregunta que responde:** ¿Qué diseño querés para el dashboard de Producción de VELUM?

Prototipo descartable. Datos 100% de ejemplo (mock), no toca Supabase ni la base de HULL.
Ruta pública temporal (excepción en `src/middleware.ts`).

URL: http://localhost:3000/prototipo-produccion · cambiar con la barra inferior o `?variant=A|B|C`

## Variantes

- **A — Centro de Control:** KPIs grandes + tabla de proyectos + carga por proceso + atrasadas. Para monitor de pared.
- **B — Kanban por proceso:** columnas por equipo (Corte Láser, Plegado, Pintura, Armado) con las OT fluyendo. Operativo/planta.
- **C — Foco en proyectos:** tarjetas grandes por proyecto con anillo de avance y desglose. Centrado en el proyecto.

## Veredicto

**GANADOR: Variante C — "Foco en proyectos"** (elegido por el usuario, jun 2026).
Tarjetas grandes por proyecto, anillo de % de avance, desglose listas/pendientes/entrega, barras por proceso.
Próximo: promover C a la ruta real del dashboard conectada a datos de HULL (vía Supabase + sync).

## Al terminar

Cuando se elija el diseño: plegar la variante ganadora en la ruta real del dashboard,
borrar este prototipo (carpeta `prototipo-produccion/`) y QUITAR la excepción del middleware.
