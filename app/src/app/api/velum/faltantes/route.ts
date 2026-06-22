import { makeTableRoute } from '@/lib/velum-bridge'

// velum_faltantes_taller — faltantes cargados por planta desde la Estación
const route = makeTableRoute({ table: 'velum_faltantes_taller', orderBy: 'ts', ascending: false })
export const GET = route.GET
export const POST = route.POST
export const DELETE = route.DELETE
