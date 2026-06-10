import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'

export async function GET() {
  const supabase = createSupabaseAdminClient() as any

  const { data, error } = await supabase
    .from('Ruta')
    .select('sistema, producto, etapas:EtapaRuta(ordenSecuencia, maquina:Maquina(tipo))')
    .order('sistema')
    .order('producto')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rutas = (data ?? []).map((r: any) => {
    const sorted = [...r.etapas].sort((a: any, b: any) => a.ordenSecuencia - b.ordenSecuencia)
    return {
      sistema: r.sistema,
      producto: r.producto,
      primeraEtapaTipo: sorted[0]?.maquina?.tipo ?? null,
    }
  })

  return NextResponse.json(rutas)
}
