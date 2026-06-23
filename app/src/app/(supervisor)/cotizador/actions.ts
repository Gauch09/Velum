'use server'

import { ProbadorInputSchema, construirSkinInput } from '@/lib/cotizador/skin/probador-input'
import { cargarSkinParams, cargarFamilia, cargarKp } from '@/lib/cotizador/skin/params-repo'
import { cotizarSkin } from '@/lib/cotizador/skin/cotizarSkin'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import type { SkinResultado } from '@/lib/cotizador/skin/tipos'

export interface ResumenVano {
  ancho: number
  alto: number
  material: string
  familia: string
  espesorMm: number
  diseno: string
  kp: number
  alcance: string
  margenPct: number
}

export type CotizarVanoResult =
  | { ok: true; resultado: SkinResultado; resumen: ResumenVano }
  | { ok: false; error: string }

export async function cotizarVanoAction(datos: unknown): Promise<CotizarVanoResult> {
  // Autorización (defensa en profundidad; la ruta ya está gateada por el layout).
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Sin autorización' }

  const admin = createSupabaseAdminClient()
  const { data: usuario } = await admin
    .from('Usuario')
    .select('rol')
    .eq('email', user.email!)
    .single() as { data: { rol: string } | null; error: unknown }
  if (!usuario || usuario.rol === 'OPERARIO') return { ok: false, error: 'Sin autorización' }

  const parsed = ProbadorInputSchema.safeParse(datos)
  if (!parsed.success) return { ok: false, error: 'Datos inválidos' }

  try {
    const [params, familia, kp] = await Promise.all([
      cargarSkinParams(),
      cargarFamilia(parsed.data.material),
      cargarKp(parsed.data.diseno),
    ])
    const input = construirSkinInput(parsed.data, familia, kp)
    const resultado = cotizarSkin(input, params)
    return {
      ok: true,
      resultado,
      resumen: {
        ancho: parsed.data.ancho,
        alto: parsed.data.alto,
        material: parsed.data.material,
        familia: familia.nombre,
        espesorMm: familia.espesorMm,
        diseno: parsed.data.diseno,
        kp,
        alcance: parsed.data.alcance,
        margenPct: parsed.data.margenPct,
      },
    }
  } catch (e) {
    // TODO: normalizar a mensaje genérico antes de exponer esta action a roles más amplios o al cliente final (e.message puede incluir nombres de tablas/variantes).
    return { ok: false, error: e instanceof Error ? e.message : 'Error al cotizar' }
  }
}
