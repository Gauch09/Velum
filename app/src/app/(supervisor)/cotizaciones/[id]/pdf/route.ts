import React from 'react'
import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { leerCotizacion } from '@/lib/cotizador/repo-cotizaciones'
import { CotizacionPDF } from '@/lib/cotizador/pdf/CotizacionPDF'

type Params = { params: { id: string } }

export async function GET(_req: NextRequest, { params }: Params) {
  let cot: any
  try {
    cot = await leerCotizacion(params.id)
  } catch {
    return new NextResponse('Cotización no encontrada', { status: 404 })
  }

  const element = React.createElement(CotizacionPDF, { cot })
  const buffer = await renderToBuffer(element as any)

  return new NextResponse(buffer as any, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${cot.numero}.pdf"`,
    },
  })
}
