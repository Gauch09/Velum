import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import {
  resumenPorMaquina,
  velocidadRealPorProductoMaquina,
  setupPromedioPorProducto,
} from '@/lib/factores'
import type { TramoParaFactor, CapacidadRow } from '@/lib/factores'
import ExportarCsvButton from '@/components/shared/ExportarCsvButton'

const HORAS_JORNADA = 8

async function cargarTramosParaFactor(desde: string | null): Promise<TramoParaFactor[]> {
  const supabase = createSupabaseAdminClient() as any
  let q = supabase
    .from('TramoTrabajo')
    .select(`
      tipo, inicio, fin, cantidadProducida, dudoso, operarioId,
      maquina:Maquina ( id, nombre, tipo ),
      ejecucionEtapa:EjecucionEtapa ( orden:OrdenProduccion ( producto ) )
    `)
    .not('fin', 'is', null)
    .limit(5000)
  if (desde) q = q.gte('inicio', desde)
  const { data } = await q

  return ((data ?? []) as any[]).map(t => ({
    tipo: t.tipo,
    inicio: t.inicio,
    fin: t.fin,
    cantidadProducida: t.cantidadProducida,
    dudoso: t.dudoso,
    maquinaId: t.maquina?.id ?? '',
    maquinaNombre: t.maquina?.nombre ?? '',
    tipoMaquina: t.maquina?.tipo ?? '',
    producto: t.ejecucionEtapa?.orden?.producto ?? '',
    operarioId: t.operarioId,
  }))
}

export default async function FactoresUtilizacion({ desde }: { desde: string | null }) {
  const supabase = createSupabaseAdminClient() as any
  const [tramos, { data: capacidades }] = await Promise.all([
    cargarTramosParaFactor(desde),
    supabase.from('CapacidadTeorica').select('producto, tipoMaquina, piezasPorHora'),
  ])

  const resumen = resumenPorMaquina(tramos, HORAS_JORNADA)
  const velocidades = velocidadRealPorProductoMaquina(tramos, (capacidades ?? []) as CapacidadRow[])
  const setups = setupPromedioPorProducto(tramos)
  const nDudosos = tramos.filter(t => t.dudoso).length

  if (tramos.length === 0) {
    return (
      <section className="mt-8">
        <h2 className="text-white text-lg font-bold mb-2">Factor de utilización</h2>
        <p className="text-gray-500 text-sm">
          Sin tramos fichados todavía. Los datos aparecen cuando los operarios usan
          Preparar / Producir en sus tareas.
        </p>
      </section>
    )
  }

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-white text-lg font-bold">Factor de utilización</h2>
        <ExportarCsvButton tipo="factores" />
      </div>
      {nDudosos > 0 && (
        <p className="text-amber-500 text-xs mb-3">
          {nDudosos} tramo(s) dudosos (cierre automático &gt;12 h) excluidos del cálculo.
        </p>
      )}

      <h3 className="text-gray-300 text-sm font-semibold mb-2">Disponibilidad por máquina</h3>
      <table className="w-full text-sm mb-6">
        <thead>
          <tr className="text-gray-500 text-xs text-left">
            <th className="py-1">Máquina</th>
            <th className="text-right">Fichadas</th>
            <th className="text-right">Setup</th>
            <th className="text-right">Producción</th>
            <th className="text-right">Disponibilidad</th>
            <th className="text-right">n</th>
          </tr>
        </thead>
        <tbody>
          {resumen.map(r => (
            <tr key={r.maquinaId} className="border-t border-gray-800 text-gray-300">
              <td className="py-1.5">{r.maquinaNombre}</td>
              <td className="text-right">{r.horasFichadas.toFixed(1)} h</td>
              <td className="text-right">{r.horasPreparacion.toFixed(1)} h</td>
              <td className="text-right">{r.horasProduccion.toFixed(1)} h</td>
              <td className="text-right font-bold text-white">{r.disponibilidadPct.toFixed(0)}%</td>
              <td className="text-right text-gray-500">{r.n}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3 className="text-gray-300 text-sm font-semibold mb-2">Velocidad real vs. teórica</h3>
      <table className="w-full text-sm mb-6">
        <thead>
          <tr className="text-gray-500 text-xs text-left">
            <th className="py-1">Producto</th>
            <th>Máquina</th>
            <th className="text-right">Real (pzs/h)</th>
            <th className="text-right">Teórico</th>
            <th className="text-right">Factor</th>
            <th className="text-right">n</th>
          </tr>
        </thead>
        <tbody>
          {velocidades.map(v => (
            <tr key={`${v.producto}-${v.maquinaId}`} className="border-t border-gray-800 text-gray-300">
              <td className="py-1.5">{v.producto}</td>
              <td>{v.maquinaNombre}</td>
              <td className="text-right">{v.piezasHoraReal.toFixed(1)}</td>
              <td className="text-right">{v.piezasHoraTeorica?.toFixed(1) ?? '—'}</td>
              <td className="text-right font-bold text-white">
                {v.factorVelocidad != null ? `${(v.factorVelocidad * 100).toFixed(0)}%` : '—'}
              </td>
              <td className="text-right text-gray-500">{v.n}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3 className="text-gray-300 text-sm font-semibold mb-2">Setup promedio por producto</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-gray-500 text-xs text-left">
            <th className="py-1">Producto</th>
            <th className="text-right">Setup promedio</th>
            <th className="text-right">n</th>
          </tr>
        </thead>
        <tbody>
          {setups.map(s => (
            <tr key={s.producto} className="border-t border-gray-800 text-gray-300">
              <td className="py-1.5">{s.producto}</td>
              <td className="text-right font-bold text-white">{s.minutosPromedio.toFixed(0)} min</td>
              <td className="text-right text-gray-500">{s.n}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
