import React from 'react'
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'
import { calcularSugerenciaConteo } from '@/lib/calcularSugerenciaConteo'

const s = StyleSheet.create({
  page: { padding: 24, fontSize: 9, fontFamily: 'Helvetica' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  title: { fontSize: 28, fontFamily: 'Helvetica-Bold' },
  subtitle: { fontSize: 10, color: '#e53e3e' },
  label: { color: '#666' },
  section: { marginTop: 10, borderTopWidth: 1, borderTopColor: '#ddd', paddingTop: 6 },
  row: { flexDirection: 'row', gap: 8 },
  pieceBlock: { marginTop: 8, borderWidth: 1, borderColor: '#e2e8f0', padding: 8, borderRadius: 4 },
  idRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  idText: { fontSize: 14, fontFamily: 'Helvetica-Bold' },
  bubble: { width: 14, height: 14, borderWidth: 1, borderColor: '#333', borderRadius: 7 },
  bubblesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
})

type Props = {
  orden: any
  barcodeOp: string
  barcodesFn: (text: string) => string
  baseUrl: string
}

export function OppTemplate({ orden, barcodeOp, barcodesFn, baseUrl }: Props) {
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View>
            <Text style={s.title}>OPP</Text>
            <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold' }}>PRIMARIA</Text>
            <Text style={s.subtitle}>Hoja Color: {orden.colorHoja}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 12, fontFamily: 'Helvetica-Bold' }}>N/ {orden.numero}</Text>
            <Image src={barcodeOp} style={{ height: 24, width: 120 }} />
            <Text style={s.label}>FECHA: {new Date(orden.fecha).toLocaleDateString('es-AR')}</Text>
            <Text style={s.label}>PROYECTO: {orden.proyecto?.nombre ?? '-'}</Text>
            <Text style={s.label}>EQUIPO: {orden.equipo}</Text>
            <Text style={{ fontFamily: 'Helvetica-Bold' }}>RESPONSABLE: {orden.responsable}</Text>
          </View>
        </View>

        <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 11, borderBottomWidth: 1, borderBottomColor: '#333', paddingBottom: 4 }}>
          ORDEN DE PRODUCCION - PRIMARIA
        </Text>

        {orden.lotes?.map((lote: any) => (
          <View key={lote.id} style={s.section}>
            <View style={s.row}>
              <Text style={{ fontFamily: 'Helvetica-Bold' }}>OT: {lote.codigo}</Text>
              <Image src={barcodesFn(lote.codigo)} style={{ height: 20, width: 100 }} />
            </View>
            <Text style={s.label}>
              MAT: {lote.material} - COLOR: {lote.colorChapa} - MEDIDA: {lote.medidaLargo}x{lote.medidaAncho}m - ESP: {lote.espesor}mm - CANT: {lote.cantidadChapas}
            </Text>
            <View style={s.bubblesRow}>
              {Array.from({ length: lote.cantidadChapas }).map((_, i) => (
                <View key={i} style={s.bubble} />
              ))}
            </View>
          </View>
        ))}

        <Text style={{ fontFamily: 'Helvetica-Bold', marginTop: 12 }}>RESUMEN DE PIEZAS</Text>
        {orden.items?.map((item: any) => {
          const lotes = calcularSugerenciaConteo(item.cantidadTotal)
          return (
            <View key={item.id} style={s.pieceBlock}>
              <View style={s.idRow}>
                <Text style={s.idText}>ID {item.codigo}</Text>
                <Image src={barcodesFn(String(item.codigo))} style={{ height: 20, width: 90 }} />
              </View>
              <Text style={{ fontFamily: 'Helvetica-Bold' }}>PIEZA: {item.nombre}</Text>
              <Text style={s.label}>MAT: {item.material} - ESP: {item.espesor}</Text>
              <Text style={s.label}>NOTAS: {item.notas ?? '-'}</Text>
              <View style={{ ...s.row, marginTop: 4 }}>
                <Text>NECESARIOS: <Text style={{ fontFamily: 'Helvetica-Bold' }}>{item.cantidadTotal}</Text></Text>
                <Text style={s.label}>COMPLETADOS: ________________</Text>
                <Text style={s.label}>REHACER: ________________</Text>
              </View>
              <Text style={s.label}>
                SUGERENCIA DE CONTEO: {lotes.length} lotes - {lotes.join(' + ')} piezas
              </Text>
              <View style={s.bubblesRow}>
                {lotes.map((cant, i) => (
                  <View key={i} style={s.row}>
                    <View style={s.bubble} />
                    <Text style={{ fontSize: 7 }}>{cant}</Text>
                  </View>
                ))}
              </View>
              <Text style={s.label}>PROXIMO PROCESO: {item.proximoProceso}</Text>
            </View>
          )
        })}
      </Page>
    </Document>
  )
}
