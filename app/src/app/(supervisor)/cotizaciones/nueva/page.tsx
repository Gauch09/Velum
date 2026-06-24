import {
  actionCrearCliente,
  actionCotizarVano,
  actionCalcularMontaje,
  actionCrearCotizacion,
  actionListarListas,
  actionListarRetencionesPct,
} from './actions'
import { listarClientes } from '@/lib/cotizador/repo-clientes'
import WizardCotizacion from '@/components/supervisor/WizardCotizacion'

export default async function NuevaCotizacionPage() {
  const [listas, retenciones, clientes] = await Promise.all([
    actionListarListas(),
    actionListarRetencionesPct(),
    listarClientes(),
  ])

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-2xl mx-auto mb-8">
        <h1 className="text-2xl font-semibold text-white">Nueva cotización</h1>
        <p className="text-gray-500 text-sm mt-1">Completá los cuatro pasos para emitir la cotización.</p>
      </div>
      <WizardCotizacion
        clientes={clientes}
        materialesSkin={listas.materialesSkin}
        materialesLama={listas.materialesLama}
        materialesACM={listas.materialesACM}
        materialesLuxsteel={listas.materialesLuxsteel}
        disenos={listas.disenos}
        tcDefault={listas.tcDefault}
        retencionesPct={retenciones}
        mediosElevacion={listas.mediosElevacion}
        accionCrearCliente={actionCrearCliente}
        accionCotizarVano={actionCotizarVano}
        accionCalcularMontaje={actionCalcularMontaje}
        accionCrearCotizacion={actionCrearCotizacion}
      />
    </div>
  )
}
