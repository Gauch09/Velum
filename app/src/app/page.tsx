import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { redirect } from 'next/navigation'

export default async function RootPage() {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const admin = createSupabaseAdminClient() as any
  const { data: usuario } = await admin
    .from('Usuario')
    .select('rol')
    .eq('email', user.email!)
    .single()

  if (!usuario) redirect('/login')

  if (usuario.rol === 'OPERARIO') redirect('/operario')
  if (usuario.rol === 'GERENCIA') redirect('/gerencia')

  redirect('/dashboard')
}
