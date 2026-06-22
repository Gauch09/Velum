import { makeTableRoute } from '@/lib/velum-bridge'

// velum_capacidades — ritmos por producto (pantallas Capacidad/Tiempos/Ocupación)
const route = makeTableRoute({ table: 'velum_capacidades', orderBy: 'nombre' })
export const GET = route.GET
export const POST = route.POST
export const DELETE = route.DELETE
