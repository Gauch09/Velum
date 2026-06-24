# VELUM Producción — cómo trabajar desde cualquier PC

El proyecto vive en GitHub: **github.com/Gauch09/velum-produccion** (rama `main`).
El código está 100% ahí. Lo único que NO se sube (por seguridad) son las claves
(`.env.local`) y las dependencias (`node_modules`) — eso se recrea en cada PC.

La base de datos es **Supabase (nube)**, así que **todas las PC trabajan contra los
mismos datos en vivo** (mientras tengan internet). No hay que instalar base en cada PC.

---

## Requisitos en la PC nueva
- **Git** (https://git-scm.com)
- **Node.js 18 o superior** (esta build se probó con Node 25.9). https://nodejs.org

## Pasos para levantarlo

```bash
# 1) Clonar el repo
git clone https://github.com/Gauch09/velum-produccion.git
cd velum-produccion/app

# 2) Instalar dependencias (recrea node_modules, no viene de GitHub)
npm install

# 3) Crear el archivo de claves .env.local (NO está en GitHub)
#    Copiá .env.local.example y completá con los valores REALES de Supabase.
#    Las claves se sacan de: Supabase → Settings → API,
#    o copiando el .env.local de una PC que ya lo tenga.
copy .env.local.example .env.local      # Windows (cmd)
#    luego editar .env.local y poner las claves reales

# 4a) Desarrollo
npm run dev                              # http://localhost:3000

# 4b) Producción (servidor de fábrica)
npm run build
npm start -- -H 0.0.0.0 -p 3001          # accesible en la LAN por IP:3001
```

Variables que van en `.env.local` (ver `.env.local.example`):
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `DIRECT_URL`.

> ⚠️ Nunca subir `.env.local` a GitHub. Las claves se pasan por canal seguro
> (no por chat ni commits).

---

## Flujo de trabajo entre varias PC

```bash
git pull origin main           # traer lo último antes de empezar
git checkout -b mi-cambio      # rama para el cambio
# ... editar ...
git add -A && git commit -m "..."
git push -u origin mi-cambio   # subir la rama
# crear Pull Request a main en GitHub y mergear
```

Siempre `git pull` antes de arrancar para no pisar cambios de otra PC.

---

## Pantallas de la app (servidas por el server)
`http://<ip-o-localhost>:<puerto>/velum-software/Inicio.dc.html` — es el lanzador.

## Nota sobre internet / offline
Hoy la app **requiere internet** porque: (a) la base es Supabase nube, y (b) la
interfaz carga React desde un CDN (unpkg). El trabajo multi-PC remoto se apoya en
esto (todos ven los mismos datos). Si en el futuro se decide correr **offline**
(base local en la PC servidor), eso ata los datos a esa PC y cambia el esquema
multi-PC — decisión pendiente.
