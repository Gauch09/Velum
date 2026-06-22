import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'

// ────────────────────────────────────────────────────────────────────────
// Puente VELUM · velum_historial (marcas de operarios) — APPEND-ONLY.
// No usa el helper genérico porque el id es BIGSERIAL (no se upsertea) y el
// GET acepta filtros que usan Ocupación/Gestión (dateKey, projectId, machineId).
// Reemplaza al localStorage `velum_historial`: _pushHist(rec) → POST acá.
// ────────────────────────────────────────────────────────────────────────

const TABLE = 'velum_historial'

// GET /api/velum/historial?dateKey=&projectId=&machineId=  (filtros opcionales)
export async function GET(req: Request): Promise<Response> {
  const supabase = createSupabaseAdminClient() as any
  const p = new URL(req.url).searchParams

  let query = supabase.from(TABLE).select('*')
  const dateKey = p.get('dateKey')
  const projectId = p.get('projectId')
  const machineId = p.get('machineId')
  if (dateKey) query = query.eq('dateKey', dateKey)
  if (projectId) query = query.eq('projectId', projectId)
  if (machineId) query = query.eq('machineId', machineId)
  query = query.order('ts', { ascending: true })

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/velum/historial  → agrega una marca (insert, sin id del cliente)
export async function POST(req: Request): Promise<Response> {
  const supabase = createSupabaseAdminClient() as any

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }
  if (body == null || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'El body debe ser un objeto' }, { status: 400 })
  }
  // el id lo genera la base (BIGSERIAL); ignoramos cualquier id del cliente
  const { id: _ignored, ...rec } = body

  const { data, error } = await supabase.from(TABLE).insert(rec).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// DELETE /api/velum/historial?dateKey=<v>  ó  ?all=true  (limpiar)
// Exige un criterio para no borrar todo por accidente.
export async function DELETE(req: Request): Promise<Response> {
  const supabase = createSupabaseAdminClient() as any
  const p = new URL(req.url).searchParams
  const dateKey = p.get('dateKey')
  const all = p.get('all')

  if (!dateKey && all !== 'true') {
    return NextResponse.json({ error: 'Falta criterio: dateKey o all=true' }, { status: 400 })
  }

  let query = supabase.from(TABLE).delete()
  query = dateKey ? query.eq('dateKey', dateKey) : query.neq('id', 0) // all=true → borra todo
  const { error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
