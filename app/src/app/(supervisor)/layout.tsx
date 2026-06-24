import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { redirect } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/dashboard',         label: 'Dashboard' },
  { href: '/clientes',          label: 'Clientes' },
  { href: '/cotizaciones',      label: 'Cotizaciones' },
  { href: '/cotizador',         label: 'Cotizador' },
  { href: '/ordenes-primarias', label: 'Órdenes' },
  { href: '/produccion',        label: 'Producción' },
  { href: '/calibracion',       label: 'Calibración' },
]

export default async function SupervisorLayout({ children }: { children: React.ReactNode }) {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createSupabaseAdminClient()
  const { data: usuario } = await admin
    .from('Usuario')
    .select('id, rol')
    .eq('email', user.email!)
    .single() as { data: { id: string; rol: string } | null; error: unknown }

  if (!usuario || usuario.rol === 'OPERARIO') redirect('/')

  return (
    <div className="flex min-h-screen bg-gray-950">
      <nav className="w-44 shrink-0 border-r border-gray-800 flex flex-col py-6 px-3 gap-1">
        <span className="text-gray-600 text-xs uppercase tracking-widest mb-4 px-2">VELUM</span>
        {NAV_ITEMS.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className="text-gray-400 hover:text-white text-sm px-2 py-1.5 rounded hover:bg-gray-800 transition-colors"
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
