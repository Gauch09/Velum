'use client'

import { useEffect } from 'react'
import type { AlertaCuello } from '@/lib/alertas'

interface Props {
  alertasRojas: AlertaCuello[]
}

function formatMinutos(minutos: number): string {
  if (minutos < 60) return `${minutos} min`
  const h = Math.floor(minutos / 60)
  const m = minutos % 60
  return m > 0 ? `${h} h ${m} min` : `${h} h`
}

export default function AlertaOverlay({ alertasRojas }: Props) {
  useEffect(() => {
    if (alertasRojas.length === 0) {
      document.title = 'VELUM'
      return
    }

    let toggle = false
    const id = setInterval(() => {
      document.title = toggle ? '🔴 ALERTA — VELUM' : 'VELUM'
      toggle = !toggle
    }, 2000)

    return () => {
      clearInterval(id)
      document.title = 'VELUM'
    }
  }, [alertasRojas.length])

  if (alertasRojas.length === 0) return null

  return (
    <div role="alert" className="velum-alert-pulse sticky top-0 z-40 rounded-xl mb-4 overflow-hidden min-h-[28vh]">
      <div className="px-6 py-5 h-full flex flex-col justify-center">
        <div className="flex items-center gap-3 mb-4">
          <span className="bg-white text-red-700 rounded-full w-9 h-9 flex items-center justify-center text-base font-black flex-shrink-0">
            {alertasRojas.length}
          </span>
          <span className="text-white text-2xl font-black tracking-widest uppercase">
            ⚠ Atención requerida
          </span>
        </div>

        <div className="flex flex-col gap-3">
          {alertasRojas.map(alerta => (
            <div
              key={alerta.ejecucionId}
              className="bg-black/30 rounded-lg px-5 py-4"
            >
              <p className="text-white text-5xl font-black leading-tight">
                {alerta.ordenNombre}
              </p>
              <p className="text-red-200 text-2xl mt-2 font-semibold">
                {alerta.etapaNombre}
                {alerta.tipo !== 'riesgo_entrega' && (
                  <span className="ml-4">
                    · Sin actividad:{' '}
                    <strong className="text-white">
                      {formatMinutos(alerta.minutosInactivo)}
                    </strong>
                  </span>
                )}
                {alerta.diasParaEntrega !== undefined && (
                  <span className="ml-4">
                    · Entrega en{' '}
                    <strong className="text-white">
                      {alerta.diasParaEntrega} días
                    </strong>
                  </span>
                )}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
