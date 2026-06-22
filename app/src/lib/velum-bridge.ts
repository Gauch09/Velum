import 'server-only'
import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'

// ────────────────────────────────────────────────────────────────────────
// Helper del puente VELUM.
// Genera handlers GET/POST/DELETE para una tabla espejo del localStorage de
// las pantallas .dc.html. La forma de los datos es la misma que devolvía
// localStorage, así la migración solo cambia _load/_save por fetch().
//   GET    /api/velum/<x>          → array completo
//   POST   /api/velum/<x>          → upsert de UN registro (por PK)
//   DELETE /api/velum/<x>?id=<v>   → borra por PK (el valor va en ?id=)
// ────────────────────────────────────────────────────────────────────────

interface TableRouteConfig {
  table: string
  pk?: string        // columna clave primaria (default 'id')
  orderBy?: string   // columna de orden opcional
  ascending?: boolean
}

export interface TableRoute {
  GET: () => Promise<Response>
  POST: (req: Request) => Promise<Response>
  DELETE: (req: Request) => Promise<Response>
}

export function makeTableRoute(cfg: TableRouteConfig): TableRoute {
  const pk = cfg.pk ?? 'id'

  async function GET(): Promise<Response> {
    const supabase = createSupabaseAdminClient() as any
    let query = supabase.from(cfg.table).select('*')
    if (cfg.orderBy) query = query.order(cfg.orderBy, { ascending: cfg.ascending ?? true })
    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  async function POST(req: Request): Promise<Response> {
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
    if (body[pk] === undefined || body[pk] === null || body[pk] === '') {
      return NextResponse.json({ error: `Falta ${pk}` }, { status: 400 })
    }
    const { data, error } = await supabase
      .from(cfg.table)
      .upsert(body, { onConflict: pk })
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  async function DELETE(req: Request): Promise<Response> {
    const supabase = createSupabaseAdminClient() as any
    const id = new URL(req.url).searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 })
    const { error } = await supabase.from(cfg.table).delete().eq(pk, id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  return { GET, POST, DELETE }
}
