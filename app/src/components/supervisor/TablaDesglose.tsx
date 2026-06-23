import type { DesglosePorComponente } from '@/app/(supervisor)/cotizador/actions'

const fmt = (n: number) => n.toLocaleString('es-AR', { maximumFractionDigits: 2 })

export default function TablaDesglose({ filas }: { filas: DesglosePorComponente }) {
  const row = 'grid grid-cols-4 text-sm py-1 border-b border-gray-800'
  const hd  = 'text-gray-500 text-xs uppercase tracking-wide'
  return (
    <div className="bg-gray-900 rounded p-3">
      <h2 className="text-white text-sm font-semibold mb-3">Costo por componente</h2>
      <div className={`${row} mb-1`}>
        <span className={hd}>Componente</span>
        <span className={`${hd} text-right`}>Material</span>
        <span className={`${hd} text-right`}>Fabricación</span>
        <span className={`${hd} text-right`}>Subtotal</span>
      </div>
      {filas.map(f => (
        <div key={f.componente} className={row}>
          <span className="text-gray-300">{f.componente}</span>
          <span className="text-gray-400 text-right">{fmt(f.material)}</span>
          <span className="text-gray-400 text-right">{fmt(f.fab)}</span>
          <span className="text-white text-right font-medium">{fmt(f.material + f.fab)}</span>
        </div>
      ))}
    </div>
  )
}
