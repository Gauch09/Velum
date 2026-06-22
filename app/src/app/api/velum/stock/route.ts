import { makeTableRoute } from '@/lib/velum-bridge'

// velum_stock — materia prima (chapas)
const route = makeTableRoute({ table: 'velum_stock' })
export const GET = route.GET
export const POST = route.POST
export const DELETE = route.DELETE
