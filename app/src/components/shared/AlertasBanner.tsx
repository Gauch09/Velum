'use client'

import { useState } from 'react'
import type { AlertaCuello } from '@/lib/alertas'
import ConfiguracionModal from '@/components/supervisor/ConfiguracionModal'

interface Props {
  alertas: AlertaCuello[]
  readonly: boolean
  umbralHoras: number
}

function formatMinutos(minutos: number): string {
  if (minutos < 60) return `${minutos} min`
  const h = Math.floor(minutos / 60)
  const m = minutos % 60
  return m > 0 ? `${h} h ${m} min` : `${h} h`
}

function AlertaRow({
  alerta,
  isReadonly,
  umbralHoras,
}: {
  alerta: AlertaCuello
  isReadonly: boolean
  umbralHoras: number
}) {
  const esRojo = alerta.severidad === 'rojo'

  function handleOverride() {
    const el = document.getElementById(`orden-${alerta.ordenId}`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  return (
    <div
      className={`rounded-lg px-3 py-2 flex items-center justify-between gap-3 ${
        esRojo
          ? 'bg-red-950/50 border border-red-900'
          : 'bg-amber-950/40 border border-amber-900'
      }`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-sm">{esRojo ? '🔴' : '🟡'}</span>
          <span
            className={`text-xs font-bold truncate ${
              esRojo ? 'text-red-300' : 'text-amber-300'
            }`}
          >
            {alerta.ordenNombre} — {alerta.etapaNombre}
          </span>
        </div>
        <p className="text-gray-400 text-xs">
          {alerta.tipo !== 'riesgo_entrega' && (
            <>
              Sin actividad{' '}
              <strong className={esRojo ? 'text-red-300' : 'text-amber-300'}>
                {formatMinutos(alerta.minutosInactivo)}
              </strong>
              {' · '}Umbral: {umbralHoras} h
            </>
          )}
          {alerta.diasParaEntrega !== undefined && (
            <>
              {alerta.tipo !== 'riesgo_entrega' && ' · '}
              Entrega en{' '}
              <strong className={esRojo ? 'text-red-300' : 'text-amber-300'}>
                {alerta.diasParaEntrega} días
              </strong>
            </>
          )}
          {' · '}Progreso global {alerta.porcentajeGlobal.toFixed(0)}%
        </p>
      </div>

      {!isReadonly && (
        <div className="flex gap-1.5 flex-shrink-0">
          {alerta.tipo !== 'riesgo_entrega' && (
            <button
              onClick={handleOverride}
              className="bg-purple-700 hover:bg-purple-600 text-white text-xs font-bold px-2 py-1 rounded transition-colors"
            >
              ⚡ Override
            </button>
          )}
          <button
            onClick={() => console.warn('[VELUM] Asignar — Fase 3')}
            className="bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs px-2 py-1 rounded transition-colors"
          >
            👤 Asignar
          </button>
          <button
            onClick={() => console.warn('[VELUM] Urgente — Fase 3')}
            className="bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs px-2 py-1 rounded transition-colors"
          >
            ↑ Urgente
          </button>
        </div>
      )}
    </div>
  )
}

export default function AlertasBanner({ alertas, readonly, umbralHoras }: Props) {
  const [expanded, setExpanded] = useState(true)
  const [showConfig, setShowConfig] = useState(false)

  const rojasCount = alertas.filter(a => a.severidad === 'rojo').length
  const ambarCount = alertas.filter(a => a.severidad === 'ambar').length

  if (alertas.length === 0) {
    return (
      <div className="bg-green-950/50 border border-green-800 rounded-xl px-4 py-3 flex items-center gap-3 mb-4">
        <span className="text-lg">✅</span>
        <span className="text-green-300 text-sm font-semibold">
          Todo en orden — sin cuellos de botella
        </span>
      </div>
    )
  }

  return (
    <>
      {showConfig && !readonly && (
        <ConfiguracionModal
          umbralActual={umbralHoras}
          onClose={() => setShowConfig(false)}
        />
      )}

      <div className="bg-red-950/40 border border-red-800 rounded-xl mb-4 overflow-hidden">
        <div
          className="flex justify-between items-center px-4 py-2.5 cursor-pointer select-none"
          onClick={() => setExpanded(e => !e)}
        >
          <div className="flex items-center gap-2">
            <span className="bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-black flex-shrink-0">
              {alertas.length}
            </span>
            <span className="text-red-300 text-sm font-semibold">
              Cuellos de botella activos
            </span>
            {rojasCount > 0 && (
              <span className="bg-red-900/80 text-red-300 text-xs px-2 py-0.5 rounded-full">
                {rojasCount} crítico{rojasCount > 1 ? 's' : ''}
              </span>
            )}
            {ambarCount > 0 && (
              <span className="bg-amber-900/80 text-amber-300 text-xs px-2 py-0.5 rounded-full">
                {ambarCount} moderado{ambarCount > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!readonly && (
              <button
                onClick={e => {
                  e.stopPropagation()
                  setShowConfig(true)
                }}
                className="text-gray-500 hover:text-gray-300 text-base transition-colors p-1"
                title="Configurar umbral"
              >
                ⚙️
              </button>
            )}
            <span className="text-gray-500 text-xs">{expanded ? '▲' : '▾'}</span>
          </div>
        </div>

        {expanded && (
          <div className="border-t border-red-900 px-4 py-3 flex flex-col gap-2">
            {alertas.map(alerta => (
              <AlertaRow
                key={alerta.ejecucionId}
                alerta={alerta}
                isReadonly={readonly}
                umbralHoras={umbralHoras}
              />
            ))}
          </div>
        )}
      </div>
    </>
  )
}
