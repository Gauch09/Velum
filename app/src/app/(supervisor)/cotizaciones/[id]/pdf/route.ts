import React from 'react'
import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { leerCotizacion } from '@/lib/cotizador/repo-cotizaciones'
import { CotizacionPDF } from '@/lib/cotizador/pdf/CotizacionPDF'

type Params = { params: { id: string } }

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: Params) {
  let cot: any
  try {
    cot = await leerCotizacion(params.id)
  } catch (err: any) {
    return new NextResponse(`Cotización no encontrada: ${err?.message ?? err}`, { status: 404 })
  }

  try {
    const element = React.createElement(CotizacionPDF, { cot })
    const buffer = await renderToBuffer(element as any)
    return new NextResponse(buffer as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${cot.numero}.pdf"`,
      },
    })
  } catch (err: any) {
    console.error('[PDF cotizacion]', err)
    return new NextResponse(`Error generando PDF: ${err?.message ?? err}`, { status: 500 })
  }
}
