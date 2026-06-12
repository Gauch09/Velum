import { NextRequest, NextResponse } from 'next/server'
import React from 'react'
import { renderToBuffer } from '@react-pdf/renderer'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { barcodeBase64 } from '@/lib/pdfHelpers'
import { OppTemplate } from '@/lib/pdf/OppTemplate'
import { OpsTemplate } from '@/lib/pdf/OpsTemplate'
import { OpbTemplate } from '@/lib/pdf/OpbTemplate'

type Params = { params: { id: string } }

export async function GET(_req: NextRequest, { params }: Params) {
  const supabase = createSupabaseAdminClient() as any

  const { data: orden, error } = await supabase
    .from('OrdenPrimaria')
    .select('*, proyecto:Proyecto(id,nombre,cliente), items:ItemProduccion(*, batches:BatchProceso(*)), lotes:LoteChapa(*)')
    .eq('id', params.id)
    .single()
  if (error || !orden) return new NextResponse('No encontrado', { status: 404 })

  const codesNeeded = new Set<string>()
  codesNeeded.add(String(orden.numero))
  orden.lotes?.forEach((l: any) => codesNeeded.add(l.codigo))
  orden.items?.forEach((item: any) => {
    codesNeeded.add(String(item.codigo))
    item.batches?.forEach((b: any) => {
      codesNeeded.add(`${orden.numero}|${item.codigo}|${b.numero}`)
    })
  })

  const barcodeMap: Record<string, string> = {}
  await Promise.all(
    Array.from(codesNeeded).map(async (code) => {
      barcodeMap[code] = await barcodeBase64(code)
    })
  )

  const barcodesFn = (text: string) => barcodeMap[text] ?? ''
  const barcodeOp = barcodeMap[String(orden.numero)]

  let element: React.ReactElement
  if (orden.tipo === 'OPP') {
    element = React.createElement(OppTemplate, { orden, barcodeOp, barcodesFn, baseUrl: process.env.NEXT_PUBLIC_BASE_URL ?? '' })
  } else if (orden.tipo === 'OPS') {
    element = React.createElement(OpsTemplate, { orden, barcodeOp, barcodesFn })
  } else {
    const proceso = orden.equipo === 'LAVADO' ? 'LAVADO' : 'HORNO'
    element = React.createElement(OpbTemplate, { orden, proceso, barcodeOp, barcodesFn })
  }

  const buffer = await renderToBuffer(element as any)
  return new NextResponse(buffer as any, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="OP${orden.numero}-${orden.tipo}.pdf"`,
    },
  })
}
