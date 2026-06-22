import { makeTableRoute } from '@/lib/velum-bridge'

// velum_obras — % de avance en vivo por proyecto { projectId: pct }
const route = makeTableRoute({ table: 'velum_obras', pk: 'projectId' })
export const GET = route.GET
export const POST = route.POST
export const DELETE = route.DELETE
