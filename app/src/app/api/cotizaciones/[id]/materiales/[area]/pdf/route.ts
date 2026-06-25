import React from 'react'
import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { leerCotizacion } from '@/lib/cotizador/repo-cotizaciones'
import { leerLista } from '@/lib/cotizador/repo-materiales'
import { MaterialesPDF, type MaterialesPDFData } from '@/lib/cotizador/pdf/MaterialesPDF'

type Params = { params: { id: string; area: string } }
export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: Params) {
  const areaUpper = params.area.toUpperCase()
  if (areaUpper !== 'COMPRAS' && areaUpper !== 'PRODUCCION') {
    return new NextResponse('Área inválida', { status: 400 })
  }
  let cot: any, lista: any
  try {
    cot = await leerCotizacion(params.id)
    lista = await leerLista(params.id)
  } catch (err: any) {
    return new NextResponse(`Error: ${err?.message ?? err}`, { status: 500 })
  }
  if (!lista) return new NextResponse('No hay lista de materiales', { status: 404 })

  const data: MaterialesPDFData = {
    numero: cot.numero,
    cliente: cot.cliente?.razonSocial ?? '—',
    obra: cot.ubicacionObra ?? null,
    area: areaUpper as 'COMPRAS' | 'PRODUCCION',
    liberada: lista.estado === 'LIBERADA',
    lineas: lista.lineas
      .filter((l: any) => l.area === areaUpper)
      .map((l: any) => ({ cara: l.cara, insumo: l.insumo, unidad: l.unidad, cantidad: l.cantidad })),
  }

  try {
    const buffer = await renderToBuffer(React.createElement(MaterialesPDF, { data }) as any)
    return new NextResponse(buffer as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${cot.numero}-${params.area}.pdf"`,
      },
    })
  } catch (err: any) {
    console.error('[PDF materiales]', err)
    return new NextResponse(`Error generando PDF: ${err?.message ?? err}`, { status: 500 })
  }
}
