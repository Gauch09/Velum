import { makeTableRoute } from '@/lib/velum-bridge'

// velum_avisos — avisos del TV de planta
const route = makeTableRoute({ table: 'velum_avisos', orderBy: 'ts', ascending: false })
export const GET = route.GET
export const POST = route.POST
export const DELETE = route.DELETE
