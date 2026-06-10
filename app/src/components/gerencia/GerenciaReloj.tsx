'use client'

import { useEffect, useState } from 'react'

export default function GerenciaReloj() {
  const [texto, setTexto] = useState('')

  useEffect(() => {
    function tick() {
      setTexto(
        new Date().toLocaleString('es-AR', {
          day: '2-digit',
          month: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        })
      )
    }
    tick()
    const id = setInterval(tick, 30_000)
    return () => clearInterval(id)
  }, [])

  return <span className="text-gray-500 text-sm tabular-nums">{texto}</span>
}
