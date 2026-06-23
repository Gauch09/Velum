'use server'

import { ProbadorInputSchema, construirSkinInput } from '@/lib/cotizador/skin/probador-input'
import { cargarSkinParams, cargarFamilia, cargarKp } from '@/lib/cotizador/skin/params-repo'
import { cotizarSkin } from '@/lib/cotizador/skin/cotizarSkin'
import { desgloseMateria, desgloseFab } from '@/lib/cotizador/skin/costos'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import type { SkinResultado } from '@/lib/cotizador/skin/tipos'
import type { DesgloseComponentesSkin } from '@/lib/cotizador/skin/costos'

export interface FilaDesglose { componente: string; material: number; fab: number }
export type DesglosePorComponente = FilaDesglose[]

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
  | { ok: true; resultado: SkinResultado; resumen: ResumenVano; desglose: DesglosePorComponente }
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
    const mat = desgloseMateria(input, params, resultado.geometria)
    const fab = desgloseFab(input, params, resultado.geometria)
    const desglose: DesglosePorComponente = [
      { componente: 'Panel',        material: mat.panel,    fab: fab.panel    },
      { componente: 'Costilla',     material: mat.costilla, fab: fab.costilla },
      { componente: 'PIC 150',      material: mat.mensula,  fab: fab.mensula  },
      { componente: 'Empalme J',    material: mat.empalme,  fab: fab.empalme  },
    ]
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
      desglose,
    }
  } catch (e) {
    // TODO: normalizar a mensaje genérico antes de exponer esta action a roles más amplios o al cliente final (e.message puede incluir nombres de tablas/variantes).
    return { ok: false, error: e instanceof Error ? e.message : 'Error al cotizar' }
  }
}
