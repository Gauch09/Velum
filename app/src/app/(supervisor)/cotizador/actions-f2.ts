'use server'

import { z } from 'zod'
import { cargarRailParams, cargarFamilia, cargarKp } from '@/lib/cotizador/rail/params-repo'
import { cargarCladParams } from '@/lib/cotizador/clad/params-repo'
import { cargarSkinRailParams } from '@/lib/cotizador/skin-rail/params-repo'
import { cotizarRail } from '@/lib/cotizador/rail/cotizarRail'
import { cotizarClad } from '@/lib/cotizador/clad/cotizarClad'
import { cotizarSkinRail } from '@/lib/cotizador/skin-rail/cotizarSkinRail'
import { desgloseMateria as desgloseMatRail, desgloseFab as desgloseFabRail } from '@/lib/cotizador/rail/costos'
import { desgloseMateria as desgloseMatClad, desgloseFab as desgloseFabClad } from '@/lib/cotizador/clad/costos'
import { desgloseMateria as desgloseMatSR, desgloseFab as desgloseFabSR } from '@/lib/cotizador/skin-rail/costos'
import type { DesglosePorComponente } from './actions'
import { construirSkinInput, ProbadorInputSchema } from '@/lib/cotizador/skin/probador-input'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import type { RailResultado } from '@/lib/cotizador/rail/tipos'
import type { CladResultado } from '@/lib/cotizador/clad/tipos'
import type { SkinRailResultado } from '@/lib/cotizador/skin-rail/tipos'

const RailInputSchema = z.object({
  ancho:     z.number().positive(),
  alto:      z.number().positive(),
  margenPct: z.number().min(0),
  variante:  z.enum(['MultiSlim Standard', 'MultiSlim.A']),
})

const CladInputSchema = RailInputSchema.extend({
  alcance: z.enum(['Pintado', 'Crudo (sin pintura)']),
})

async function autorizarUsuario() {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const admin = createSupabaseAdminClient()
  const { data: usuario } = await admin
    .from('Usuario').select('rol').eq('email', user.email!).single() as { data: { rol: string } | null; error: unknown }
  if (!usuario || usuario.rol === 'OPERARIO') return null
  return usuario
}

export type RailResult =
  | { ok: true; resultado: RailResultado; resumen: { ancho: number; alto: number; variante: string; kp: number; margenPct: number }; desglose: DesglosePorComponente }
  | { ok: false; error: string }

export async function cotizarRailAction(datos: unknown): Promise<RailResult> {
  if (!await autorizarUsuario()) return { ok: false, error: 'Sin autorización' }
  const parsed = RailInputSchema.safeParse(datos)
  if (!parsed.success) return { ok: false, error: 'Datos inválidos' }
  try {
    const [params, familia, kp] = await Promise.all([
      cargarRailParams(),
      cargarFamilia(parsed.data.variante),
      cargarKp(parsed.data.variante),
    ])
    const input = {
      ancho: parsed.data.ancho,
      alto: parsed.data.alto,
      margenPct: parsed.data.margenPct / 100,
      kp,
      espesorMm: familia.espesorMm,
      familia: { nombre: familia.nombre, densidad: familia.densidad, precioTon: familia.precioTon, precioM2: 0 },
    }
    const resultado = cotizarRail(input, params)
    const mat = desgloseMatRail(input, params, resultado.geometria)
    const fab = desgloseFabRail(params, resultado.geometria)
    const desglose: DesglosePorComponente = [
      { componente: 'Lama MultiSlim', material: mat.lama,     fab: fab.lama     },
      { componente: 'Omega',          material: mat.omega,    fab: fab.omega    },
      { componente: 'PIC 150',        material: mat.pic,      fab: fab.pic      },
      { componente: 'Empalme C',      material: mat.empalleC, fab: fab.empalleC },
    ]
    return { ok: true, resultado, resumen: { ancho: parsed.data.ancho, alto: parsed.data.alto, variante: parsed.data.variante, kp, margenPct: parsed.data.margenPct }, desglose }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Error al cotizar Rail' }
  }
}

export type CladResult =
  | { ok: true; resultado: CladResultado; resumen: { ancho: number; alto: number; variante: string; kp: number; alcance: string; margenPct: number }; desglose: DesglosePorComponente }
  | { ok: false; error: string }

export async function cotizarCladAction(datos: unknown): Promise<CladResult> {
  if (!await autorizarUsuario()) return { ok: false, error: 'Sin autorización' }
  const parsed = CladInputSchema.safeParse(datos)
  if (!parsed.success) return { ok: false, error: 'Datos inválidos' }
  try {
    const [params, familia, kp] = await Promise.all([
      cargarCladParams(),
      cargarFamilia(parsed.data.variante),
      cargarKp(parsed.data.variante),
    ])
    const input = {
      ancho: parsed.data.ancho,
      alto: parsed.data.alto,
      margenPct: parsed.data.margenPct / 100,
      kp,
      espesorMm: familia.espesorMm,
      familia: { nombre: familia.nombre, densidad: familia.densidad, precioTon: familia.precioTon, precioM2: 0 },
      alcance: parsed.data.alcance as 'Pintado' | 'Crudo (sin pintura)',
    }
    const resultado = cotizarClad(input, params)
    const mat = desgloseMatClad(input, params, resultado.geometria)
    const fab = desgloseFabClad(input, params, resultado.geometria)
    const desglose: DesglosePorComponente = [
      { componente: 'Lama MultiSlim', material: mat.lama,     fab: fab.lama     },
      { componente: 'Omega',          material: mat.omega,    fab: fab.omega    },
      { componente: 'Empalme C',      material: mat.empalleC, fab: fab.empalleC },
    ]
    return { ok: true, resultado, resumen: { ancho: parsed.data.ancho, alto: parsed.data.alto, variante: parsed.data.variante, kp, alcance: parsed.data.alcance, margenPct: parsed.data.margenPct }, desglose }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Error al cotizar Clad' }
  }
}

export type SkinRailResult =
  | { ok: true; resultado: SkinRailResultado; resumen: { ancho: number; alto: number; material: string; kp: number; alcance: string; margenPct: number }; desglose: DesglosePorComponente }
  | { ok: false; error: string }

export async function cotizarSkinRailAction(datos: unknown): Promise<SkinRailResult> {
  if (!await autorizarUsuario()) return { ok: false, error: 'Sin autorización' }
  const parsed = ProbadorInputSchema.safeParse(datos)
  if (!parsed.success) return { ok: false, error: 'Datos inválidos' }
  try {
    const [params, familia, kp] = await Promise.all([
      cargarSkinRailParams(),
      cargarFamilia(parsed.data.material),
      cargarKp(parsed.data.diseno),
    ])
    const skinInput = construirSkinInput(parsed.data, familia, kp)
    const resultado = cotizarSkinRail(skinInput, params)
    const mat = desgloseMatSR(skinInput, params, resultado.geometria)
    const fab = desgloseFabSR(skinInput, params, resultado.geometria)
    const desglose: DesglosePorComponente = [
      { componente: 'Panel',      material: mat.panel,    fab: fab.panel    },
      { componente: 'Costilla',   material: mat.costilla, fab: fab.costilla },
      { componente: 'PIC 150',    material: mat.mensula,  fab: fab.mensula  },
      { componente: 'Empalme J',  material: mat.empalleJ, fab: fab.empalleJ },
      { componente: 'Omega',      material: mat.omega,    fab: fab.omega    },
      { componente: 'Empalme C',  material: mat.empalleC, fab: fab.empalleC },
    ]
    return {
      ok: true,
      resultado,
      resumen: { ancho: parsed.data.ancho, alto: parsed.data.alto, material: parsed.data.material, kp, alcance: parsed.data.alcance, margenPct: parsed.data.margenPct },
      desglose,
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Error al cotizar Skin.Rail' }
  }
}
