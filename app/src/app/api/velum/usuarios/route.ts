import { makeTableRoute } from '@/lib/velum-bridge'

// velum_usuarios — catálogo de login (Inicio.dc.html)
const route = makeTableRoute({ table: 'velum_usuarios', orderBy: 'name' })
export const GET = route.GET
export const POST = route.POST
export const DELETE = route.DELETE
