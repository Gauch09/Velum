import { makeTableRoute } from '@/lib/velum-bridge'

// velum_estacion_full — proyectos con sus piezas (files JSONB). El corazón.
const route = makeTableRoute({ table: 'velum_estacion_full' })
export const GET = route.GET
export const POST = route.POST
export const DELETE = route.DELETE
