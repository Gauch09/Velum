import { makeTableRoute } from '@/lib/velum-bridge'

// velum_archivados — proyectos cerrados (1 fila por projectId)
const route = makeTableRoute({ table: 'velum_archivados', pk: 'projectId' })
export const GET = route.GET
export const POST = route.POST
export const DELETE = route.DELETE
