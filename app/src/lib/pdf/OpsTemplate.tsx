import React from 'react'
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'
import { calcularSugerenciaConteo } from '@/lib/calcularSugerenciaConteo'

const s = StyleSheet.create({
  page: { padding: 24, fontSize: 9, fontFamily: 'Helvetica' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  title: { fontSize: 28, fontFamily: 'Helvetica-Bold' },
  subtitle: { fontSize: 10, color: '#3182ce' },
  row: { flexDirection: 'row', gap: 8 },
  label: { color: '#666' },
  pieceBlock: { marginTop: 8, borderWidth: 1, borderColor: '#e2e8f0', padding: 8, borderRadius: 4, flexDirection: 'row' },
  pieceLeft: { flex: 1 },
  pieceRight: { width: 80, height: 80, borderWidth: 1, borderColor: '#ccc', alignItems: 'center', justifyContent: 'center' },
  idText: { fontSize: 14, fontFamily: 'Helvetica-Bold' },
  bubble: { width: 14, height: 14, borderWidth: 1, borderColor: '#333', borderRadius: 7 },
  bubblesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
})

type Props = { orden: any; barcodeOp: string; barcodesFn: (text: string) => string }

export function OpsTemplate({ orden, barcodeOp, barcodesFn }: Props) {
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View>
            <Text style={s.title}>OPS</Text>
            <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold' }}>SECUNDARIA</Text>
            <Text style={s.subtitle}>Hoja: {orden.colorHoja}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 12, fontFamily: 'Helvetica-Bold' }}>N/ {orden.numero}</Text>
            <Image src={barcodeOp} style={{ height: 24, width: 120 }} />
            <Text style={s.label}>FECHA: {new Date(orden.fecha).toLocaleDateString('es-AR')}</Text>
            <Text style={s.label}>PROYECTO: {orden.proyecto?.nombre ?? '-'}</Text>
            <Text style={s.label}>PROCESO: {orden.equipo}</Text>
            <Text style={{ fontFamily: 'Helvetica-Bold' }}>RESPONSABLE: {orden.responsable}</Text>
          </View>
        </View>

        <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 11, borderBottomWidth: 1, borderBottomColor: '#333', paddingBottom: 4 }}>
          ORDEN DE PROCESO - SECUNDARIA
        </Text>
        <Text style={s.label}>RESUMEN DE PIEZAS</Text>

        {orden.items?.map((item: any) => {
          const lotes = calcularSugerenciaConteo(item.cantidadTotal)
          return (
            <View key={item.id} style={s.pieceBlock}>
              <View style={s.pieceLeft}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={s.idText}>ID {item.codigo}</Text>
                  <Image src={barcodesFn(String(item.codigo))} style={{ height: 20, width: 90 }} />
                </View>
                <Text style={{ fontFamily: 'Helvetica-Bold' }}>PIEZA: {item.nombre}</Text>
                <Text style={s.label}>MAT: {item.material} - ESP: {item.espesor}</Text>
                <Text style={s.label}>NOTAS: {item.notas ?? '-'}</Text>
                <Text style={{ marginTop: 4 }}>NECESARIOS: <Text style={{ fontFamily: 'Helvetica-Bold' }}>{item.cantidadTotal}</Text></Text>
                <Text style={s.label}>RESUMEN DE LOTES: {lotes.join(' + ')} piezas</Text>
                <Text style={s.label}>PROXIMO PROCESO: {item.proximoProceso}</Text>
                <View style={s.bubblesRow}>
                  {lotes.map((cant, i) => (
                    <View key={i} style={{ flexDirection: 'row', gap: 2 }}>
                      <View style={s.bubble} />
                      <Text style={{ fontSize: 7 }}>{cant}</Text>
                    </View>
                  ))}
                </View>
              </View>
              <View style={s.pieceRight}>
                {item.imagenUrl
                  ? <Image src={item.imagenUrl} style={{ width: 76, height: 76 }} />
                  : <Text style={{ fontSize: 7, color: '#aaa' }}>Sin imagen</Text>}
              </View>
            </View>
          )
        })}
      </Page>
    </Document>
  )
}
