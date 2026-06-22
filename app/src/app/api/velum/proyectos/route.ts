import { makeTableRoute } from '@/lib/velum-bridge'

// velum_proyectos_custom — proyectos (Panel de oficina)
const route = makeTableRoute({ table: 'velum_proyectos_custom', orderBy: 'createdTs', ascending: false })
export const GET = route.GET
export const POST = route.POST
export const DELETE = route.DELETE
