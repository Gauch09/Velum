# VELUM · Esquema de datos para el backend

> Documento para entregar a Claude Code. Describe **todos los datos** que hoy guarda la app
> en `localStorage` del navegador, para migrarlos a una base de datos compartida en el
> **servidor de la fábrica (Windows)**, con sincronización en vivo entre dispositivos.

---

## 0. Objetivo

Hoy cada dispositivo (PC de oficina, tablet de cada máquina) guarda su propia copia en
`localStorage`. Queremos que **todos lean y escriban en una sola base de datos** en el
servidor local, y que cuando alguien cambia algo, **los demás se actualicen solos** (tiempo real).

- **Servidor:** Windows, siempre encendido, en la red local de la fábrica.
- **Debe funcionar SIN internet** (todo por red local / WiFi interna).
- Los dispositivos abren la app apuntando a `http://<IP-del-servidor>:<puerto>`.

### Stack sugerido (self-hosted en Windows)
- **Node.js** (servidor de la API) + **PostgreSQL** (o SQLite si se quiere lo más simple).
- **WebSockets** (o Socket.IO) para el "en vivo".
- Alternativa todo-en-uno: **Supabase self-hosted** (Postgres + realtime + API ya hechos).

### Regla de oro para migrar sin romper nada
En cada archivo `.dc.html` hay funciones tipo `_load()`, `_save()`, `_read*()`. **Solo hay que
cambiar esas funciones** para que lean/escriban contra la API en vez de `localStorage`.
Toda la lógica (lotes, paquetes, %, procesos, tiempos) **queda igual**.

---

## 1. Claves de localStorage (= tablas de la base)

| Clave | Tipo | Qué guarda | Pantalla que la escribe |
|---|---|---|---|
| `velum_proyectos_custom` | array | Proyectos (datos generales) | Panel de oficina |
| `velum_estacion_full` | array | Proyectos con sus **piezas** y avance de marcas | Estación / Panel oficina |
| `velum_obras` | objeto | % de avance por proyecto | Estación (publica) |
| `velum_historial` | array | Cada **marca** de operario con fecha/hora | Estación (al marcar) |
| `velum_capacidades` | array | Ritmos por máquina (u/h) y dimensiones de pieza | Capacidad ⚠ YA TIENE DATOS |
| `velum_tareas` | array | Tareas de oficina | Tareas |
| `velum_stock` | array | Materia prima (chapas) | Insumos |
| `velum_consumibles` | array | Consumibles (tornillos, pintura…) | Insumos |
| `velum_avisos` | array | Avisos para el TV de planta | Panel de oficina |
| `velum_faltantes_taller` | array | "Faltan discos", etc. cargado por planta | Estación |
| `velum_archivados` | array | IDs de proyectos cerrados/terminados | Panel de oficina |

> **Importante:** `velum_capacidades` es la **única que NO se borra** — ya tiene cargados los
> ritmos reales. El resto arranca vacío y se llena con el uso real.

---

## 2. Estructura de cada tabla

### `velum_proyectos_custom` — Proyectos (datos generales)
Array de objetos. Un objeto por proyecto:
```js
{
  id: "cust1781803923267",   // id único (texto)
  createdTs: 1781803923267,  // fecha de creación (timestamp)
  name: "CASINO TORRES",     // nombre del proyecto
  producto: "Fachada ventilada", // producto vendido
  contacto: "Martín Gómez",  // persona del proyecto
  tel: "341 555 2210",       // teléfono / contacto
  lugar: "Rosario",          // destino (para flete)
  deadlineDays: 7,           // días hasta la fecha límite (se recalcula)
  urgencia: "ALTA",          // ALTA | MEDIA | NORMAL
  pago: "SEÑA",              // IMPAGO | SEÑA | PAGADO
  montaje: true,             // si lleva montaje
  pintado: true,             // pintado (true) o crudo (false)
  colorName: "RAL 7016",     // código de pintura (si pintado)
  material: "Acero",         // material principal
  basePct: 0                 // (interno)
}
```

### `velum_estacion_full` — Proyectos con piezas (EL CORAZÓN)
Array de proyectos; cada proyecto tiene un array `files` con sus **piezas**:
```js
{
  id: "cust1781803923267",   // MISMO id que en velum_proyectos_custom (relación)
  name: "CASINO TORRES",
  files: [                   // las piezas del proyecto
    {
      id: "n1781803923300",  // id único de la pieza
      pieza: "COSTILLA 1500",// nombre (coincide con Capacidad → tiempos)
      archivo: "COSTILLA 1500", // nombre del archivo de corte
      material: "Acero 1,6 mm",
      matName: "Acero",      // material sin espesor
      esp: "1.6",            // espesor (mm)
      ppc: 13,               // piezas por chapa
      objChapas: 8,          // chapas objetivo (acepta media: 7.5)
      objUni: 100,           // unidades necesarias (lo que pide la obra)
      lote: 20,              // piezas por lote
      paquete: 5,            // piezas por paquete (subdivisión de la plegadora)
      procesos: ["laser","plegadora","pintura"], // procesos asignados, EN ORDEN
      prog: { laser: 60, plegadora: 40, pintura: 0 }, // avance por proceso (en piezas/unidad del proceso)
      chapas: 6,             // chapas cortadas (láser)
      retazo: 0,             // de retazo
      fallas: 1,             // fallas marcadas
      pintado: true
    }
  ]
}
```
**Relaciones clave:**
- `prog[proceso]` avanza por las marcas de los operarios en la estación.
- El proceso siguiente solo se habilita cuando el anterior completó lotes (lógica ya en la app).
- `pieza` debe coincidir con `nombre` en `velum_capacidades` para calcular tiempos.

### `velum_obras` — % de avance por proyecto
Objeto (mapa) `{ idProyecto: porcentaje }`:
```js
{ "cust1781803923267": 36, "cust1781797612973": 96 }
```

### `velum_historial` — Marcas de operarios (para Ocupación y tiempos reales)
Array. Una fila por cada marca que hace un operario:
```js
{
  ts: 1781803923267,        // fecha+hora exacta (timestamp)
  dateKey: "2026-06-22",    // fecha (para agrupar por día)
  hour: 14,                 // hora del día (0-23)
  dow: 1,                   // día de semana (0=dom)
  projectId: "cust1781803923267",
  project: "CASINO TORRES",
  machineId: "laser",       // laser|plegadora|punzon|fresa|expansora|pintura|embalado
  unit: "LEAPION",          // máquina específica: LEAPION/BODOR (láser), DERATECH/MUAXIA (plegadora)
  fileId: "n1781803923300",
  pieza: "COSTILLA 1500",
  field: "chapas",          // qué se marcó
  kind: "chapa",            // chapa | retazo | falla
  delta: 5,                 // cantidad marcada
  pieces: 65                // equivalente en piezas
}
```
> Esta tabla es **append-only** (solo se agrega). Es la base para Ocupación y para afinar
> tiempos reales de fabricación.

### `velum_capacidades` — Ritmos por máquina ⚠ NO BORRAR
Array. Un objeto por producto:
```js
{
  id: "cost1500",
  nombre: "Costilla 1500",  // debe coincidir con pieza.pieza
  enChapa: 13,              // unidades por chapa
  lote: 20, paquete: 5,
  laser: 13,               // u/h en láser
  plegado: 103,            // u/h en plegadora
  fresado: 0,              // u/h en punzonadora (campo histórico llamado "fresado")
  pintura: 12,             // unidades por percha (10 perchas = 3 h)
  embalado: 100,           // u/h en embalado
  material: "Acero", ancho: 174, alto: 1500, esp: "1.6" // dimensiones (para peso)
}
```
**Mapeo máquina → campo de ritmo:** laser→`laser`, plegadora→`plegado`,
punzon→`fresado`, pintura→`pintura` (especial: u/percha, 10 perchas en 3 h), embalado→`embalado`.
Fresa y Expansora no tienen ritmo cargado.

### `velum_tareas` — Tareas de oficina
```js
{
  id: "t1", proyecto: "CASINO TORRES", tarea: "Memoria de cálculo",
  resp: ["lucho","juani"],   // ids de responsables
  prioridad: "Urgente",      // Urgente | Alta | Media | Baja
  estado: "En curso",        // Sin iniciar | En curso | Hecho
  obs: "..."                 // observaciones
}
```
Personas (hoy fijas en el código, futura tabla `usuarios`):
`lucho` (Jefe de planta), `juani` (Diseño), `joa` (Ingeniería), y otros.

### `velum_stock` — Materia prima (chapas)
```js
{ id:"m...", material:"Acero", espesor:"1,5 mm", dimension:"3x1,2", terminacion:"crudo", chapas:8 }
```
El "faltante" se calcula: demanda de los proyectos − stock. (Lógica ya en la app.)

### `velum_consumibles` — Consumibles
```js
{ id:"c1", nombre:'Autoperforante 1/4 x 1"', categoria:"Fijaciones", stock:1200, unidad:"unidades" }
```
Categorías: Fijaciones, Pintura, etc.

### `velum_avisos` — Avisos del TV
```js
{ id:"a...", text:"Llega chapa 1,5 — 19/6 12 hs", ts: 1781803923267 }
```

### `velum_faltantes_taller` — Faltantes cargados por planta
```js
{ id:"...", text:"Faltan discos de corte", maquina:"Láser CNC", ts: 1781803923267 }
```

### `velum_archivados` — Proyectos cerrados
Array de ids: `["cust1781803923267"]`.

---

## 3. Endpoints de API sugeridos

Para cada tabla, lo mínimo:
- `GET /api/<tabla>` → trae todo.
- `POST /api/<tabla>` → crea/actualiza.
- `DELETE /api/<tabla>/:id` → borra.
- Canal de **tiempo real** (WebSocket): cuando una tabla cambia, el servidor avisa a todos
  los dispositivos conectados para que recarguen esa tabla.

`<tabla>` = proyectos, piezas, obras, historial, capacidades, tareas, stock, consumibles, avisos, faltantes, archivados.

---

## 4. Plan de migración sugerido

1. Instalar Node.js + base de datos en el servidor Windows. Crear las tablas según este doc.
2. Levantar la API en un puerto fijo (ej. `:4000`).
3. En los `.dc.html`, reemplazar las funciones `_load/_save/_read*` por `fetch()` a la API
   + suscripción al canal en vivo. **Empezar por Capacidad** (es la más chica) para probar.
4. Probar con 2 dispositivos a la vez (que un cambio en uno aparezca en el otro).
5. Migrar el resto de las pantallas.
6. Dejar la app apuntando a `http://<IP-servidor>:4000` en cada tablet/PC.

---

## 5. Notas finales
- **Sin internet:** todo corre en la red local; el servidor Windows es el único punto central.
- **Backups:** programar una copia diaria de la base (la fábrica no puede perder los proyectos).
- **Arranque automático:** que la API arranque sola cuando se enciende el servidor (servicio de Windows).
- Los `id` actuales son texto (`cust...`, `n...`, `t...`) — sirven como clave primaria tal cual.
