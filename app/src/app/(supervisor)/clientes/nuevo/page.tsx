'use client'

import { useRouter } from 'next/navigation'
import ClienteForm from '@/components/supervisor/ClienteForm'
import { actionCrearCliente } from '../../cotizaciones/nueva/actions'

export default function NuevoClientePage() {
  const router = useRouter()
  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold">Nuevo cliente</h1>
          <p className="text-gray-500 text-sm mt-1">Completá los datos fiscales y el contacto principal.</p>
        </div>
        <div className="bg-gray-900 rounded-lg p-6">
          <ClienteForm
            accion={actionCrearCliente}
            onCreado={() => router.push('/clientes')}
            onCancel={() => router.back()}
          />
        </div>
      </div>
    </div>
  )
}
