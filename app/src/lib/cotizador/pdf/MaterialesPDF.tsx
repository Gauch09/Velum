import React from 'react'
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'

const DARK = '#111111', GOLD = '#C5A860', GRAY = '#555555', LIGHT = '#F4F4F4', BORDER = '#E0E0E0'
const s = StyleSheet.create({
  page: { padding: 0, fontSize: 9, fontFamily: 'Helvetica', color: DARK },
  headerBand: { backgroundColor: DARK, padding: '24 32', flexDirection: 'row', justifyContent: 'space-between' },
  brand: { fontSize: 24, fontFamily: 'Helvetica-Bold', color: '#FFF', letterSpacing: 6 },
  sub: { fontSize: 8, color: '#AAA', marginTop: 2, letterSpacing: 2 },
  areaLabel: { fontSize: 10, color: GOLD, textAlign: 'right', fontFamily: 'Helvetica-Bold', letterSpacing: 1 },
  meta: { fontSize: 8, color: '#AAA', textAlign: 'right', marginTop: 2 },
  goldLine: { height: 3, backgroundColor: GOLD },
  body: { padding: '20 32' },
  provisional: { fontSize: 8, color: '#B00', fontFamily: 'Helvetica-Bold', marginBottom: 8 },
  caraTitle: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: GOLD, letterSpacing: 1, marginTop: 12, marginBottom: 4 },
  row: { flexDirection: 'row', padding: '4 8', borderBottomWidth: 1, borderBottomColor: BORDER },
  rowAlt: { flexDirection: 'row', padding: '4 8', backgroundColor: LIGHT, borderBottomWidth: 1, borderBottomColor: BORDER },
  insumo: { flex: 1, fontSize: 8 },
  cant: { width: 80, fontSize: 8, textAlign: 'right', fontFamily: 'Helvetica-Bold' },
  unidad: { width: 40, fontSize: 8, color: GRAY, textAlign: 'right' },
  footer: { borderTopWidth: 1, borderTopColor: BORDER, marginTop: 16, paddingTop: 8 },
  footerText: { fontSize: 7, color: GRAY },
})
const fmt = (n: number) => n.toLocaleString('es-AR', { maximumFractionDigits: 2 })

export interface MaterialesPDFData {
  numero: string
  cliente: string
  obra: string | null
  area: 'COMPRAS' | 'PRODUCCION'
  liberada: boolean
  lineas: Array<{ cara: string | null; insumo: string; unidad: string; cantidad: number }>
}

export function MaterialesPDF({ data }: { data: MaterialesPDFData }) {
  const caras = Array.from(new Map(data.lineas.map(l => [l.cara, true])).keys())
  const titulo = data.area === 'COMPRAS' ? 'COMPRAS — MATERIAS PRIMAS' : 'PRODUCCIÓN — PIEZAS'
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.headerBand}>
          <View><Text style={s.brand}>VELUM</Text><Text style={s.sub}>LISTA DE MATERIALES</Text></View>
          <View>
            <Text style={s.areaLabel}>{titulo}</Text>
            <Text style={s.meta}>{data.numero} · {data.cliente}</Text>
            {data.obra && <Text style={s.meta}>{data.obra}</Text>}
          </View>
        </View>
        <View style={s.goldLine} />
        <View style={s.body}>
          {!data.liberada && <Text style={s.provisional}>PROVISORIO — lista en revisión, no comprar/producir sobre esta versión</Text>}
          {caras.map((cara, ci) => {
            const ls = data.lineas.filter(l => l.cara === cara)
            return (
              <View key={ci} wrap={false}>
                <Text style={s.caraTitle}>{cara ?? 'CONSOLIDADO DE OBRA'}</Text>
                {ls.map((l, i) => (
                  <View key={i} style={i % 2 === 0 ? s.row : s.rowAlt}>
                    <Text style={s.insumo}>{l.insumo}</Text>
                    <Text style={s.cant}>{fmt(l.cantidad)}</Text>
                    <Text style={s.unidad}>{l.unidad}</Text>
                  </View>
                ))}
              </View>
            )
          })}
          <View style={s.footer}>
            <Text style={s.footerText}>VELUM S.R.L. — Planta Industrial Los Polígonos del Norte, Santa Fe.</Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}
