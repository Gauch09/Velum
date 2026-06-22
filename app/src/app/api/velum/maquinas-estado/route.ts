import { makeTableRoute } from '@/lib/velum-bridge'

// velum_maquinas_estado — unidades fuera de servicio (key = machineId|UNIDAD)
const route = makeTableRoute({ table: 'velum_maquinas_estado', pk: 'key' })
export const GET = route.GET
export const POST = route.POST
export const DELETE = route.DELETE
