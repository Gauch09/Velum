import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import UsuariosManager from '@/components/supervisor/UsuariosManager'
import type { UsuarioItem } from '@/components/supervisor/UsuarioFormModal'

export const dynamic = 'force-dynamic'

export default async function UsuariosPage() {
  const supabase = createSupabaseAdminClient() as any

  const [{ data: usuarios }, { data: maquinas }] = await Promise.all([
    supabase
      .from('Usuario')
      .select('id, nombre, email, rol, maquinaId, maquina:Maquina(id, nombre)')
      .order('rol', { ascending: true })
      .order('nombre', { ascending: true }),
    supabase
      .from('Maquina')
      .select('id, nombre')
      .order('nombre', { ascending: true }),
  ])

  return (
    <main className="min-h-screen bg-gray-950 p-6 max-w-3xl mx-auto">
      <UsuariosManager
        usuarios={(usuarios ?? []) as UsuarioItem[]}
        maquinas={maquinas ?? []}
      />
    </main>
  )
}
