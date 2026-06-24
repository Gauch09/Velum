'use client'

import { useState } from 'react'
import { guardarParametro, guardarMedioElevacion } from '@/app/(supervisor)/calibracion/actions'
import type { ParametroRow } from '@/lib/cotizador/parametros'
import type { MedioElevacionRow } from '@/lib/cotizador/calibracion-repo'

type Props = {
  parametros: ParametroRow[]
  medios: MedioElevacionRow[]
}

// Agrupación de claves por sección
const GRUPOS: { titulo: string; claves: string[] }[] = [
  {
    titulo: 'General',
    claves: ['tipo_cambio', 'tasa_planta'],
  },
  {
    titulo: 'Pintura en polvo',
    claves: ['pintura_polvo', 'pintura_cobertura', 'pintura_sobreaplic', 'pintura_horneada_costo', 'pintura_horneada_piezas'],
  },
  {
    titulo: 'Galvanizado',
    claves: ['galv_densidad', 'galv_precio_ton'],
  },
  {
    titulo: 'Fijación',
    claves: ['fijacion_broca', 'fijacion_autoperf', 'costo_t1', 'costo_taco', 'costo_tirafondo'],
  },
  {
    titulo: 'Sistema Skin — panel ACM',
    claves: ['acm_area_placa', 'acm_fab_placa', 'acm_acc_panel', 'acm_acc_costo', 'fresado_costo_m2', 'parante_base',
             'skin_costilla_area', 'skin_costilla_espesor', 'skin_mensula_area', 'skin_mensula_espesor',
             'skin_empalme_area', 'skin_empalme_espesor'],
  },
  {
    titulo: 'Sistema Rail / Clad — MultiSlim',
    claves: ['omega_area_3m', 'omega_espesor_mm', 'omega_tramo_max_m', 'sep_omega_vert_m', 'empalme_c_area_m2'],
  },
  {
    titulo: 'Montaje',
    claves: ['montaje_jornal_usd_h', 'montaje_vianda_usd_dia', 'montaje_hs_usd_h', 'montaje_rendimiento_m2_op', 'montaje_horas_dia'],
  },
  {
    titulo: 'Retenciones por defecto',
    claves: ['ret_iva_pct', 'ret_ganancias_pct', 'ret_iibb_pct', 'ret_suss_pct'],
  },
]

function ParamRow({ p, guardando, error, onSubmit }: {
  p: ParametroRow
  guardando: boolean
  error?: string
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void
}) {
  return (
    <div>
      <form onSubmit={onSubmit} className="flex items-center gap-3 bg-gray-900 rounded px-3 py-2.5">
        <input type="hidden" name="clave" value={p.clave} />
        <div className="flex-1 min-w-0">
          <div className="text-white text-sm truncate">{p.descripcion ?? p.clave}</div>
          <div className="text-gray-600 text-xs font-mono">{p.clave}{p.unidad ? ` · ${p.unidad}` : ''}</div>
        </div>
        <input
          name="valor"
          type="number"
          step="any"
          defaultValue={p.valor}
          className="w-28 bg-gray-800 border border-gray-700 text-white rounded px-2 py-1 text-sm text-right focus:outline-none focus:border-gray-500"
        />
        <button
          type="submit"
          disabled={guardando}
          className="text-xs border border-gray-700 text-gray-400 hover:border-gray-500 hover:text-white rounded px-3 py-1 disabled:opacity-40 w-20"
        >
          {guardando ? '…' : 'Guardar'}
        </button>
      </form>
      {error && <p className="text-red-400 text-xs px-3 pt-1">{error}</p>}
    </div>
  )
}

export default function CalibracionManager({ parametros, medios }: Props) {
  const [guardando, setGuardando] = useState<string | null>(null)
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [ok, setOk] = useState<string | null>(null)

  const byKey = Object.fromEntries(parametros.map(p => [p.clave, p]))

  async function handleParam(e: React.FormEvent<HTMLFormElement>, clave: string) {
    e.preventDefault()
    setGuardando(clave)
    setOk(null)
    setErrores(prev => { const n = { ...prev }; delete n[clave]; return n })
    try {
      const result = await guardarParametro(null, new FormData(e.currentTarget))
      if (result && 'error' in result) {
        setErrores(prev => ({ ...prev, [clave]: result.error as string }))
      } else {
        setOk(clave)
        setTimeout(() => setOk(null), 2000)
      }
    } finally {
      setGuardando(null)
    }
  }

  async function handleMedio(e: React.FormEvent<HTMLFormElement>, id: string) {
    e.preventDefault()
    setGuardando(id)
    setOk(null)
    setErrores(prev => { const n = { ...prev }; delete n[id]; return n })
    try {
      const result = await guardarMedioElevacion(null, new FormData(e.currentTarget))
      if (result && 'error' in result) {
        setErrores(prev => ({ ...prev, [id]: result.error as string }))
      } else {
        setOk(id)
        setTimeout(() => setOk(null), 2000)
      }
    } finally {
      setGuardando(null)
    }
  }

  // Claves asignadas a algún grupo
  const clavesAgrupadas = new Set(GRUPOS.flatMap(g => g.claves))
  const sinGrupo = parametros.filter(p => !clavesAgrupadas.has(p.clave))

  const sectionTitle = (t: string) => (
    <p className="text-gray-500 text-xs uppercase tracking-widest mb-2 mt-6 first:mt-0">{t}</p>
  )

  return (
    <div className="space-y-1">

      {GRUPOS.map(grupo => {
        const rows = grupo.claves.map(c => byKey[c]).filter(Boolean)
        if (rows.length === 0) return null
        return (
          <div key={grupo.titulo}>
            {sectionTitle(grupo.titulo)}
            <div className="space-y-1">
              {rows.map(p => (
                <ParamRow
                  key={p.clave}
                  p={p}
                  guardando={guardando === p.clave}
                  error={errores[p.clave]}
                  onSubmit={e => handleParam(e, p.clave)}
                />
              ))}
            </div>
            {rows.some(p => ok === p.clave) && (
              <p className="text-green-500 text-xs px-3 pt-1">Guardado ✓</p>
            )}
          </div>
        )
      })}

      {/* Medios de elevación */}
      {medios.length > 0 && (
        <div>
          {sectionTitle('Medios de elevación')}
          <div className="space-y-1">
            {medios.map(m => (
              <div key={m.id}>
                <form onSubmit={e => handleMedio(e, m.id)} className="bg-gray-900 rounded px-3 py-2.5">
                  <input type="hidden" name="id" value={m.id} />
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="text-white text-sm">{m.nombre}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 text-xs w-20 text-right">Altura máx. (m)</span>
                      <input
                        name="alturaMaxM"
                        type="number"
                        step="0.5"
                        defaultValue={m.alturaMaxM}
                        className="w-20 bg-gray-800 border border-gray-700 text-white rounded px-2 py-1 text-sm text-right focus:outline-none focus:border-gray-500"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 text-xs w-20 text-right">Costo/día (u$d)</span>
                      <input
                        name="costoDia"
                        type="number"
                        step="0.01"
                        defaultValue={m.costoDia}
                        className="w-28 bg-gray-800 border border-gray-700 text-white rounded px-2 py-1 text-sm text-right focus:outline-none focus:border-gray-500"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={guardando === m.id}
                      className="text-xs border border-gray-700 text-gray-400 hover:border-gray-500 hover:text-white rounded px-3 py-1 disabled:opacity-40 w-20"
                    >
                      {guardando === m.id ? '…' : ok === m.id ? '✓' : 'Guardar'}
                    </button>
                  </div>
                </form>
                {errores[m.id] && <p className="text-red-400 text-xs px-3 pt-1">{errores[m.id]}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Otros (no asignados a ningún grupo) */}
      {sinGrupo.length > 0 && (
        <div>
          {sectionTitle('Otros')}
          <div className="space-y-1">
            {sinGrupo.map(p => (
              <ParamRow
                key={p.clave}
                p={p}
                guardando={guardando === p.clave}
                error={errores[p.clave]}
                onSubmit={e => handleParam(e, p.clave)}
              />
            ))}
          </div>
        </div>
      )}

    </div>
  )
}
