import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'

function escapeCsv(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ''
  const s = String(value)
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function row(cells: (string | number | null | undefined)[]): string {
  return cells.map(escapeCsv).join(',')
}

function formatFecha(iso: string | null | undefined): string {
  if (!iso) return ''
  return new Date(iso).toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

async function exportarTrazabilidad(supabase: any): Promise<string> {
  const { data } = await supabase
    .from('RegistroProgreso')
    .select(`
      timestamp,
      cantidadRegistrada,
      porcentajeRegistrado,
      fueOverride,
      motivoOverride,
      notas,
      usuario:Usuario ( nombre ),
      ejecucionEtapa:EjecucionEtapa (
        etapaRuta:EtapaRuta ( nombreEtapa ),
        orden:OrdenProduccion (
          sistema,
          producto,
          unidad,
          cantidad,
          proyecto:Proyecto ( nombre )
        )
      )
    `)
    .order('timestamp', { ascending: false })
    .limit(5000)

  const headers = row(['Fecha', 'Orden', 'Proyecto', 'Etapa', 'Operario', 'Cantidad', 'Unidad', '% Registrado', 'Override', 'Motivo', 'Notas'])
  const filas = ((data ?? []) as any[]).map(r => {
    const orden = r.ejecucionEtapa?.orden
    return row([
      formatFecha(r.timestamp),
      orden ? `${orden.sistema} / ${orden.producto}` : '',
      orden?.proyecto?.nombre ?? '',
      r.ejecucionEtapa?.etapaRuta?.nombreEtapa ?? '',
      r.usuario?.nombre ?? '',
      r.cantidadRegistrada,
      orden?.unidad ?? '',
      r.porcentajeRegistrado?.toFixed(1) ?? '',
      r.fueOverride ? 'Sí' : 'No',
      r.motivoOverride ?? '',
      r.notas ?? '',
    ])
  })

  return [headers, ...filas].join('\n')
}

async function exportarOverrides(supabase: any): Promise<string> {
  const { data } = await supabase
    .from('RegistroProgreso')
    .select(`
      timestamp,
      porcentajeRegistrado,
      motivoOverride,
      usuario:Usuario ( nombre ),
      ejecucionEtapa:EjecucionEtapa (
        etapaRuta:EtapaRuta ( nombreEtapa ),
        orden:OrdenProduccion (
          sistema,
          producto,
          proyecto:Proyecto ( nombre )
        )
      )
    `)
    .eq('fueOverride', true)
    .order('timestamp', { ascending: false })
    .limit(1000)

  const headers = row(['Fecha', 'Orden', 'Proyecto', 'Etapa', 'Supervisor', '% Al Momento', 'Motivo'])
  const filas = ((data ?? []) as any[]).map(r => {
    const orden = r.ejecucionEtapa?.orden
    return row([
      formatFecha(r.timestamp),
      orden ? `${orden.sistema} / ${orden.producto}` : '',
      orden?.proyecto?.nombre ?? '',
      r.ejecucionEtapa?.etapaRuta?.nombreEtapa ?? '',
      r.usuario?.nombre ?? '',
      r.porcentajeRegistrado?.toFixed(1) ?? '',
      r.motivoOverride ?? '',
    ])
  })

  return [headers, ...filas].join('\n')
}

async function exportarAlertas(supabase: any): Promise<string> {
  const { data } = await supabase
    .from('AlertaLog')
    .select('ordenNombre, etapaNombre, tipo, severidad, disparadaEn, resueltaEn')
    .order('disparadaEn', { ascending: false })
    .limit(2000)

  const headers = row(['Disparada', 'Resuelta', 'Orden', 'Etapa', 'Tipo', 'Severidad'])
  const filas = ((data ?? []) as any[]).map(r =>
    row([
      formatFecha(r.disparadaEn),
      r.resueltaEn ? formatFecha(r.resueltaEn) : 'Activa',
      r.ordenNombre,
      r.etapaNombre,
      r.tipo,
      r.severidad,
    ])
  )

  return [headers, ...filas].join('\n')
}

const TIPOS = ['trazabilidad', 'overrides', 'alertas'] as const
type Tipo = typeof TIPOS[number]

const NOMBRES: Record<Tipo, string> = {
  trazabilidad: 'velum-trazabilidad',
  overrides: 'velum-overrides',
  alertas: 'velum-alertas',
}

export async function GET(req: NextRequest) {
  const supabaseAuth = createSupabaseServerClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const tipo = req.nextUrl.searchParams.get('tipo') as Tipo | null
  if (!tipo || !TIPOS.includes(tipo)) {
    return NextResponse.json({ error: 'tipo debe ser: trazabilidad, overrides o alertas' }, { status: 400 })
  }

  const supabase = createSupabaseAdminClient() as any

  let csv: string
  if (tipo === 'trazabilidad') csv = await exportarTrazabilidad(supabase)
  else if (tipo === 'overrides') csv = await exportarOverrides(supabase)
  else csv = await exportarAlertas(supabase)

  const fecha = new Date().toISOString().slice(0, 10)
  const filename = `${NOMBRES[tipo]}-${fecha}.csv`

  return new NextResponse('﻿' + csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
