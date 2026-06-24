import Link from 'next/link'
import { listarParametros, listarMediosElevacion } from '@/lib/cotizador/calibracion-repo'
import CalibracionManager from '@/components/supervisor/CalibracionManager'

export const dynamic = 'force-dynamic'

export default async function CalibracionPage() {
  const [parametros, medios] = await Promise.all([
    listarParametros(),
    listarMediosElevacion(),
  ])
  return (
    <main className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-3xl mx-auto">
        <Link href="/dashboard" className="text-gray-600 hover:text-gray-400 text-xs mb-1 block">
          ← Volver a planta
        </Link>
        <h1 className="text-white text-2xl font-bold mb-8">Calibración del cotizador</h1>
        <CalibracionManager parametros={parametros} medios={medios} />
      </div>
    </main>
  )
}
