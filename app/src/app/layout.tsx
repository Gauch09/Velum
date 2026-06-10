import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'VELUM — Gestión de Producción',
  description: 'Sistema de seguimiento de órdenes de producción para fachadas metálicas',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-gray-950 antialiased">{children}</body>
    </html>
  )
}
