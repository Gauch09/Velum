import Link from 'next/link'
import { listarMaterialesSkin, listarDisenos } from '@/lib/cotizador/skin/listas-repo'
import ProbadorCotizador from '@/components/supervisor/ProbadorCotizador'
import ProbadorRailClad from '@/components/supervisor/ProbadorRailClad'
import ProbadorSkinRail from '@/components/supervisor/ProbadorSkinRail'
import SistemasTabs from '@/components/supervisor/SistemasTabs'

export const dynamic = 'force-dynamic'

export default async function CotizadorPage() {
  const [materiales, disenos] = await Promise.all([
    listarMaterialesSkin(),
    listarDisenos(),
  ])

  return (
    <main className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-3xl mx-auto">
        <Link href="/dashboard" className="text-gray-600 hover:text-gray-400 text-xs mb-1 block">
          ← Volver a planta
        </Link>
        <h1 className="text-white text-2xl font-bold mb-1">VELUM · Probador de cotización</h1>
        <p className="text-gray-500 text-xs mb-6">Un vano · uso interno</p>

        <SistemasTabs
          skin={<ProbadorCotizador materiales={materiales} disenos={disenos} />}
          rail={<ProbadorRailClad sistema="Rail" />}
          clad={<ProbadorRailClad sistema="Clad" />}
          skinRail={<ProbadorSkinRail materiales={materiales} disenos={disenos} />}
        />
      </div>
    </main>
  )
}
