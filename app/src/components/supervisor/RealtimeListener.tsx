'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'

export default function RealtimeListener() {
  const router = useRouter()

  useEffect(() => {
    const channel = supabaseBrowser
      .channel('ordenes')
      .on('broadcast', { event: 'progreso' }, () => {
        router.refresh()
      })
      .subscribe()

    return () => { supabaseBrowser.removeChannel(channel) }
  }, [router])

  return null
}
