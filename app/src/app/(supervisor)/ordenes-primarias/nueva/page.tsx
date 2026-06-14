import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import NuevaOrdenPrimariaWizard from '@/components/supervisor/NuevaOrdenPrimariaWizard'

export const dynamic = 'force-dynamic'

export default async function NuevaOrdenPage() {
  const supabase = createSupabaseAdminClient() as any
  const [{ data: proyectos }, { data: configs }] = await Promise.all([
    supabase.from('Proyecto').select('id,nombre,cliente').eq('estado', 'ACTIVO').order('nombre'),
    supabase.from('ConfiguracionEquipo').select('*'),
  ])
  const capLavado = configs?.find((c: any) => c.tipo === 'LAVADO')?.capacidadM2 ?? 2.0
  const capHorno = configs?.find((c: any) => c.tipo === 'HORNO')?.capacidadM2 ?? 6.0

  return (
    <NuevaOrdenPrimariaWizard
      proyectos={proyectos ?? []}
      capLavado={capLavado}
      capHorno={capHorno}
    />
  )
}
