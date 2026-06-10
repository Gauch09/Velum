'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'

export default function GerenciaRealtimeListener() {
  const router = useRouter()

  useEffect(() => {
    // Canal 'ordenes': recibe evento 'progreso' — emitido por /api/ordenes/[id]/progreso
    const ordenesChannel = supabaseBrowser
      .channel('ordenes')
      .on('broadcast', { event: 'progreso' }, () => {
        router.refresh()
      })
      .subscribe()

    // Canal 'gerencia': recibe evento 'maquinas' — emitido por /api/maquinas/[id] (Task 7)
    const gerenciaChannel = supabaseBrowser
      .channel('gerencia')
      .on('broadcast', { event: 'maquinas' }, () => {
        router.refresh()
      })
      .subscribe()

    return () => {
      supabaseBrowser.removeChannel(ordenesChannel)
      supabaseBrowser.removeChannel(gerenciaChannel)
    }
  }, [router])

  return null
}
