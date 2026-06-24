'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { actualizarParametro, actualizarMedioElevacion, actualizarFamilia } from '@/lib/cotizador/calibracion-repo'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'

const Input = z.object({
  clave: z.string().min(1),
  valor: z.coerce.number().finite(),
})

export async function guardarParametro(_state: unknown, formData: FormData) {
  // Authorization: only SUPERVISOR or GERENCIA may mutate calibration parameters
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Sin autorización' }

  const admin = createSupabaseAdminClient()
  const { data: usuario } = await admin
    .from('Usuario')
    .select('rol')
    .eq('email', user.email!)
    .single() as { data: { rol: string } | null; error: unknown }

  if (!usuario || usuario.rol === 'OPERARIO') return { error: 'Sin autorización' }

  const parsed = Input.safeParse({
    clave: formData.get('clave'),
    valor: formData.get('valor'),
  })
  if (!parsed.success) return { error: 'Datos inválidos' }
  await actualizarParametro(parsed.data.clave, parsed.data.valor)
  revalidatePath('/calibracion')
  return { ok: true }
}

export async function guardarMedioElevacion(_state: unknown, formData: FormData) {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Sin autorización' }

  const admin = createSupabaseAdminClient()
  const { data: usuario } = await admin
    .from('Usuario')
    .select('rol')
    .eq('email', user.email!)
    .single() as { data: { rol: string } | null; error: unknown }

  if (!usuario || usuario.rol === 'OPERARIO') return { error: 'Sin autorización' }

  const schema = z.object({
    id:         z.string().min(1),
    costoDia:   z.coerce.number().positive(),
    alturaMaxM: z.coerce.number().positive(),
  })
  const parsed = schema.safeParse({
    id:         formData.get('id'),
    costoDia:   formData.get('costoDia'),
    alturaMaxM: formData.get('alturaMaxM'),
  })
  if (!parsed.success) return { error: 'Datos inválidos' }
  await actualizarMedioElevacion(parsed.data.id, parsed.data.costoDia, parsed.data.alturaMaxM)
  revalidatePath('/calibracion')
  return { ok: true }
}

export async function guardarFamilia(_state: unknown, formData: FormData) {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Sin autorización' }

  const admin = createSupabaseAdminClient()
  const { data: usuario } = await admin
    .from('Usuario')
    .select('rol')
    .eq('email', user.email!)
    .single() as { data: { rol: string } | null; error: unknown }
  if (!usuario || usuario.rol === 'OPERARIO') return { error: 'Sin autorización' }

  const schema = z.object({
    id:        z.string().min(1),
    precioTon: z.coerce.number().min(0),
    precioM2:  z.coerce.number().min(0),
    densidad:  z.coerce.number().positive(),
  })
  const parsed = schema.safeParse({
    id:        formData.get('id'),
    precioTon: formData.get('precioTon'),
    precioM2:  formData.get('precioM2'),
    densidad:  formData.get('densidad'),
  })
  if (!parsed.success) return { error: 'Datos inválidos' }
  await actualizarFamilia(parsed.data.id, parsed.data.precioTon, parsed.data.precioM2, parsed.data.densidad)
  revalidatePath('/calibracion')
  return { ok: true }
}
