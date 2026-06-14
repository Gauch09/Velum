import React from 'react'
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'

const s = StyleSheet.create({
  page: { padding: 24, fontSize: 9, fontFamily: 'Helvetica' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  title: { fontSize: 28, fontFamily: 'Helvetica-Bold' },
  label: { color: '#666' },
  pieceBlock: { marginTop: 8, borderWidth: 1, borderColor: '#e2e8f0', padding: 8 },
  batchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  bubble: { width: 14, height: 14, borderWidth: 1, borderColor: '#333', borderRadius: 7 },
})

type Props = { orden: any; proceso: 'LAVADO' | 'HORNO'; barcodeOp: string; barcodesFn: (text: string) => string }

export function OpbTemplate({ orden, proceso, barcodeOp, barcodesFn }: Props) {
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View>
            <Text style={s.title}>OPB</Text>
            <Text style={{ fontFamily: 'Helvetica-Bold' }}>PROCESO: {proceso}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 12, fontFamily: 'Helvetica-Bold' }}>N/ {orden.numero}</Text>
            <Image src={barcodeOp} style={{ height: 24, width: 120 }} />
            <Text style={s.label}>FECHA: {new Date(orden.fecha).toLocaleDateString('es-AR')}</Text>
            <Text style={s.label}>PROYECTO: {orden.proyecto?.nombre ?? '-'}</Text>
            <Text style={{ fontFamily: 'Helvetica-Bold' }}>RESPONSABLE: {orden.responsable}</Text>
          </View>
        </View>

        {orden.items?.map((item: any) => {
          const batches = item.batches?.filter((b: any) => b.proceso === proceso) ?? []
          if (batches.length === 0) return null
          return (
            <View key={item.id} style={s.pieceBlock}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 14, fontFamily: 'Helvetica-Bold' }}>ID {item.codigo}</Text>
                <Image src={barcodesFn(String(item.codigo))} style={{ height: 20, width: 90 }} />
              </View>
              <Text style={{ fontFamily: 'Helvetica-Bold' }}>PIEZA: {item.nombre}</Text>
              <Text style={s.label}>MAT: {item.material} - ESP: {item.espesor}</Text>
              <Text>NECESARIOS: <Text style={{ fontFamily: 'Helvetica-Bold' }}>{item.cantidadTotal}</Text></Text>

              {batches.map((b: any) => {
                const barcodeKey = `${orden.numero}|${item.codigo}|${b.numero}`
                return (
                  <View key={b.id} style={s.batchRow}>
                    <View style={s.bubble} />
                    <Image src={barcodesFn(barcodeKey)} style={{ height: 20, width: 90 }} />
                    <Text style={{ fontFamily: 'Helvetica-Bold' }}>{barcodeKey}</Text>
                    <Text>CANT: {b.cantidadPiezas}</Text>
                    <Text style={s.label}>COMPLETADOS: ___________</Text>
                    <Text style={s.label}>REHACER: ___________</Text>
                  </View>
                )
              })}
            </View>
          )
        })}
      </Page>
    </Document>
  )
}
