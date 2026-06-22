import { makeTableRoute } from '@/lib/velum-bridge'

// velum_consumibles — consumibles (Insumos)
const route = makeTableRoute({ table: 'velum_consumibles' })
export const GET = route.GET
export const POST = route.POST
export const DELETE = route.DELETE
