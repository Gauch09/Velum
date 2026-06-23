'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { actualizarParametro } from '@/lib/cotizador/calibracion-repo'
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
