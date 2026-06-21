'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { actualizarParametro } from '@/lib/cotizador/calibracion-repo'

const Input = z.object({
  clave: z.string().min(1),
  valor: z.coerce.number().finite(),
})

export async function guardarParametro(_state: unknown, formData: FormData) {
  const parsed = Input.safeParse({
    clave: formData.get('clave'),
    valor: formData.get('valor'),
  })
  if (!parsed.success) return { error: 'Datos inválidos' }
  await actualizarParametro(parsed.data.clave, parsed.data.valor)
  revalidatePath('/calibracion')
  return { ok: true }
}
