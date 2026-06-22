import { makeTableRoute } from '@/lib/velum-bridge'

// velum_tareas — tareas de oficina
const route = makeTableRoute({ table: 'velum_tareas' })
export const GET = route.GET
export const POST = route.POST
export const DELETE = route.DELETE
