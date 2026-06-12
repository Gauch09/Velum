import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import ProyectoCardHull, {
  type ProyectoHull,
  type OrdenHull,
  type EstimacionCard,
} from '@/components/supervisor/produccion/ProyectoCardHull'
import { estimarProyecto, normalizar, type Pieza, type TiempoProducto } from '@/lib/estimacion'

export const dynamic = 'force-dynamic'

function haceCuanto(iso: string | null): string {
  if (!iso) return 'sin sincronizar todavía'
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  if (mins < 1) return 'recién'
  if (mins < 60) return `hace ${mins} min`
  const hs = Math.round(mins / 60)
  if (hs < 24) return `hace ${hs} h`
  return `hace ${Math.round(hs / 24)} d`
}

export default async function ProduccionHullPage() {
  const supabase = createSupabaseAdminClient() as any

  const [{ data: proyectosRaw }, { data: ordenesRaw }, { data: piezasRaw }, { data: tiemposRaw }, { data: meta }] =
    await Promise.all([
      supabase.from('hull_proyectos').select('*').order('fecha_entrega', { ascending: true }),
      supabase.from('hull_ordenes').select('*'),
      supabase.from('hull_piezas').select('*'),
      supabase.from('hull_tiempos').select('*'),
      supabase.from('hull_sync_meta').select('ultima_sync').eq('id', 'singleton').single(),
    ])

  // Mapa de tiempos por producto (normalizado)
  const tiempos = new Map<string, TiempoProducto>()
  for (const t of (tiemposRaw ?? []) as any[]) {
    tiempos.set(normalizar(t.producto), {
      producto: t.producto,
      laserUh: t.laser_uh,
      plegadoraUh: t.plegadora_uh,
      punzonadoraUh: t.punzonadora_uh,
      fresadoraUh: t.fresadora_uh,
      pinturaUh: t.pintura_uh,
      embaladoUh: t.embalado_uh,
      horasDia: t.horas_dia ?? 8,
    })
  }

  // Despiece por proyecto
  const piezasPorProyecto = new Map<string, Pieza[]>()
  for (const p of (piezasRaw ?? []) as any[]) {
    const arr = piezasPorProyecto.get(p.proyecto_id) ?? []
    arr.push({ producto: p.producto, proceso: p.proceso, cantidad: p.cantidad, completado: p.completado })
    piezasPorProyecto.set(p.proyecto_id, arr)
  }

  // Órdenes por proyecto (barras de avance)
  const ordenesPorProyecto = new Map<string, OrdenHull[]>()
  for (const o of (ordenesRaw ?? []) as any[]) {
    const arr = ordenesPorProyecto.get(o.proyecto_id) ?? []
    arr.push({ numero: o.numero, proceso: o.proceso, operario: o.operario, avance: o.avance, estado: o.estado })
    ordenesPorProyecto.set(o.proyecto_id, arr)
  }

  const proyectos: (ProyectoHull & { estimacion: EstimacionCard | null })[] = ((proyectosRaw ?? []) as any[]).map(
    (p) => {
      const piezas = piezasPorProyecto.get(p.proyecto_id) ?? []
      let estimacion: EstimacionCard | null = null
      if (piezas.length > 0) {
        const est = estimarProyecto(piezas, tiempos)
        if (est.pendienteTotal > 0) {
          estimacion = { diasEstimados: est.diasEstimados, piezasSinTiempo: est.piezasSinTiempo }
        }
      }
      return {
        proyectoId: p.proyecto_id,
        nombre: p.nombre,
        cliente: p.cliente,
        totalPiezas: p.total_piezas,
        completadas: p.completadas,
        prioridad: p.prioridad,
        fechaEntrega: p.fecha_entrega,
        atrasado: p.atrasado,
        ordenes: ordenesPorProyecto.get(p.proyecto_id) ?? [],
        estimacion,
      }
    }
  )

  const totalPiezas = proyectos.reduce((a, p) => a + p.totalPiezas, 0)
  const completadas = proyectos.reduce((a, p) => a + p.completadas, 0)
  const avanceGlobal = totalPiezas > 0 ? Math.round((completadas / totalPiezas) * 100) : 0

  return (
    <div className="min-h-screen bg-gray-950 px-6 py-6 text-gray-100">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex items-end justify-between border-b border-gray-800 pb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Producción</h1>
            <p className="mt-1 text-sm text-gray-500">
              Datos desde HULL · actualizado {haceCuanto(meta?.ultima_sync ?? null)} · estimación según tiempos cargados
            </p>
          </div>
          <div className="text-right text-sm text-gray-400">
            <div className="text-2xl font-bold text-emerald-400">{avanceGlobal}%</div>
            <div>
              {proyectos.length} proyectos · {completadas}/{totalPiezas} piezas
            </div>
          </div>
        </header>

        {proyectos.length === 0 ? (
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-10 text-center text-gray-500">
            Todavía no hay datos de producción. Cuando corra la primera sincronización con HULL, aparecen acá.
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {proyectos.map((p) => (
              <ProyectoCardHull key={p.proyectoId} proyecto={p} estimacion={p.estimacion} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
