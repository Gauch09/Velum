import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { redirect } from 'next/navigation'

export default async function OperarioLayout({ children }: { children: React.ReactNode }) {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createSupabaseAdminClient()
  const { data: usuario } = await admin
    .from('Usuario')
    .select('id, rol')
    .eq('email', user.email!)
    .single() as { data: { id: string; rol: string } | null; error: unknown }

  if (!usuario || usuario.rol === 'GERENCIA') redirect('/dashboard')

  return <>{children}</>
}
