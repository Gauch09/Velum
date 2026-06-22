import { makeTableRoute } from '@/lib/velum-bridge'

// velum_prod_diaria — producción diaria por fecha { dateKey: {...} }
const route = makeTableRoute({ table: 'velum_prod_diaria', pk: 'dateKey', orderBy: 'dateKey', ascending: false })
export const GET = route.GET
export const POST = route.POST
export const DELETE = route.DELETE
