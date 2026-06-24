import React from 'react'
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'

const VELUM_DARK  = '#111111'
const VELUM_GOLD  = '#C5A860'
const GRAY_TEXT   = '#555555'
const GRAY_LIGHT  = '#F4F4F4'
const BORDER_COL  = '#E0E0E0'

const s = StyleSheet.create({
  page:           { padding: 0, fontSize: 9, fontFamily: 'Helvetica', color: VELUM_DARK },

  /* Header */
  headerBand:     { backgroundColor: VELUM_DARK, padding: '24 32', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  brandName:      { fontSize: 28, fontFamily: 'Helvetica-Bold', color: '#FFFFFF', letterSpacing: 6 },
  brandSub:       { fontSize: 8, color: '#AAAAAA', marginTop: 2, letterSpacing: 2 },
  cotLabel:       { fontSize: 8, color: '#AAAAAA', textAlign: 'right', letterSpacing: 1 },
  cotNumero:      { fontSize: 18, fontFamily: 'Helvetica-Bold', color: VELUM_GOLD, textAlign: 'right', marginTop: 2 },
  cotFecha:       { fontSize: 8, color: '#AAAAAA', textAlign: 'right', marginTop: 2 },

  /* Gold line */
  goldLine:       { height: 3, backgroundColor: VELUM_GOLD },

  /* Body */
  body:           { padding: '20 32' },

  /* Section */
  sectionTitle:   { fontSize: 7, fontFamily: 'Helvetica-Bold', color: VELUM_GOLD, letterSpacing: 2, marginBottom: 6, marginTop: 14 },
  card:           { backgroundColor: GRAY_LIGHT, borderRadius: 3, padding: '10 12', marginBottom: 6 },

  /* Grid */
  row2:           { flexDirection: 'row', gap: 8 },
  col:            { flex: 1 },
  fieldLabel:     { fontSize: 7, color: GRAY_TEXT, marginBottom: 1 },
  fieldValue:     { fontSize: 9, fontFamily: 'Helvetica-Bold' },

  /* Table */
  tableHeader:    { flexDirection: 'row', backgroundColor: VELUM_DARK, padding: '5 8', borderRadius: 3, marginBottom: 1 },
  tableHeaderTxt: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#FFFFFF' },
  tableRow:       { flexDirection: 'row', padding: '5 8', borderBottomWidth: 1, borderBottomColor: BORDER_COL },
  tableRowAlt:    { flexDirection: 'row', padding: '5 8', backgroundColor: GRAY_LIGHT, borderBottomWidth: 1, borderBottomColor: BORDER_COL },
  tableCell:      { fontSize: 8 },
  tableCellBold:  { fontSize: 8, fontFamily: 'Helvetica-Bold' },

  /* Cols width */
  colSistema:     { width: 48 },
  colMaterial:    { flex: 1 },
  colTerminacion: { width: 110 },
  colDim:         { width: 60, textAlign: 'right' },
  colM2:          { width: 38, textAlign: 'right' },
  colPrecio:      { width: 70, textAlign: 'right' },

  /* Totals */
  totalRow:       { flexDirection: 'row', justifyContent: 'flex-end', paddingTop: 5, marginTop: 2 },
  totalLabel:     { fontSize: 8, color: GRAY_TEXT, width: 130, textAlign: 'right', marginRight: 8 },
  totalValue:     { fontSize: 8, fontFamily: 'Helvetica-Bold', width: 70, textAlign: 'right' },
  grandTotalRow:  { flexDirection: 'row', justifyContent: 'flex-end', paddingTop: 6, marginTop: 4, borderTopWidth: 2, borderTopColor: VELUM_GOLD },
  grandTotalLabel:{ fontSize: 10, fontFamily: 'Helvetica-Bold', width: 130, textAlign: 'right', marginRight: 8 },
  grandTotalValue:{ fontSize: 10, fontFamily: 'Helvetica-Bold', color: VELUM_GOLD, width: 70, textAlign: 'right' },

  /* Montaje cols */
  colMedio:       { flex: 1 },
  colOp:          { width: 55, textAlign: 'right' },
  colDias:        { width: 55, textAlign: 'right' },
  colHS:          { width: 55, textAlign: 'right' },
  colMontTotal:   { width: 70, textAlign: 'right' },

  /* Footer */
  footer:         { borderTopWidth: 1, borderTopColor: BORDER_COL, marginTop: 16, paddingTop: 8, flexDirection: 'row', justifyContent: 'space-between' },
  footerText:     { fontSize: 7, color: GRAY_TEXT },
})

const fmt = (n: number) => n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const usd = (n: number) => `u$d ${fmt(n)}`

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ marginBottom: 4 }}>
      <Text style={s.fieldLabel}>{label}</Text>
      <Text style={s.fieldValue}>{value || '—'}</Text>
    </View>
  )
}

export interface CotizacionData {
  numero:        string
  createdAt:     string
  alcance:       string
  tcUsado:       number
  totalProducto: number
  totalMontaje:  number
  ubicacionObra: string | null
  cliente: {
    razonSocial:    string
    cuit:           string
    condicionIva:   string
    domicilioFiscal?: string | null
    contactos?:     Array<{ nombre: string; cargo?: string | null; email: string; telefono?: string | null }>
  }
  vanos: Array<{
    sistema:    string
    material:   string
    colorACM?:  string | null
    terminacion:string
    ancho:      number
    alto:       number
    precio:     number
  }>
  montaje?: {
    nOperarios:     number
    diasObra:       number
    hsPresencial:   boolean
    costoElevacion: number
    costoOperarios: number
    costoHS:        number
    precioVenta:    number
    medio?: { nombre: string }
  } | null
  condiciones?: {
    formaPagoProducto: string
    retenciones?: Array<{ tipo: string; porcentaje: number }>
  } | null
}

export function CotizacionPDF({ cot }: { cot: CotizacionData }) {
  const contacto = cot.cliente.contactos?.[0]
  const fecha = new Date(cot.createdAt).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })
  const totalObra = (cot.totalProducto ?? 0) + (cot.totalMontaje ?? 0)
  const conMontaje = !!cot.montaje && (cot.totalMontaje ?? 0) > 0

  return (
    <Document>
      <Page size="A4" style={s.page}>

        {/* Header */}
        <View style={s.headerBand}>
          <View>
            <Text style={s.brandName}>VELUM</Text>
            <Text style={s.brandSub}>INGENIERÍA EN FACHADAS METÁLICAS</Text>
          </View>
          <View>
            <Text style={s.cotLabel}>COTIZACIÓN</Text>
            <Text style={s.cotNumero}>{cot.numero}</Text>
            <Text style={s.cotFecha}>{fecha}</Text>
          </View>
        </View>
        <View style={s.goldLine} />

        <View style={s.body}>

          {/* Cliente */}
          <Text style={s.sectionTitle}>DATOS DEL CLIENTE</Text>
          <View style={s.card}>
            <View style={s.row2}>
              <View style={s.col}>
                <Field label="RAZÓN SOCIAL" value={cot.cliente.razonSocial} />
                <Field label="CUIT" value={cot.cliente.cuit} />
              </View>
              <View style={s.col}>
                <Field label="CONDICIÓN IVA" value={cot.cliente.condicionIva.replace(/_/g, ' ')} />
                {cot.cliente.domicilioFiscal && <Field label="DOMICILIO" value={cot.cliente.domicilioFiscal} />}
              </View>
              {contacto && (
                <View style={s.col}>
                  <Field label="CONTACTO" value={contacto.nombre + (contacto.cargo ? ` — ${contacto.cargo}` : '')} />
                  <Field label="EMAIL" value={contacto.email} />
                  {contacto.telefono && <Field label="TELÉFONO" value={contacto.telefono} />}
                </View>
              )}
            </View>
            {cot.ubicacionObra && (
              <View style={{ marginTop: 4 }}>
                <Field label="OBRA / PROYECTO" value={cot.ubicacionObra} />
              </View>
            )}
          </View>

          {/* Provisión */}
          <Text style={s.sectionTitle}>PROVISIÓN DE MATERIALES</Text>

          {/* Table header */}
          <View style={s.tableHeader}>
            <Text style={[s.tableHeaderTxt, s.colSistema]}>SISTEMA</Text>
            <Text style={[s.tableHeaderTxt, s.colMaterial]}>MATERIAL</Text>
            <Text style={[s.tableHeaderTxt, s.colTerminacion]}>TERMINACIÓN</Text>
            <Text style={[s.tableHeaderTxt, s.colDim]}>DIM (m)</Text>
            <Text style={[s.tableHeaderTxt, s.colM2]}>m²</Text>
            <Text style={[s.tableHeaderTxt, s.colPrecio]}>PRECIO</Text>
          </View>

          {cot.vanos.map((v, i) => {
            const area = v.ancho * v.alto
            const rowStyle = i % 2 === 0 ? s.tableRow : s.tableRowAlt
            return (
              <View key={i} style={rowStyle}>
                <Text style={[s.tableCell, s.colSistema]}>{v.sistema}</Text>
                <Text style={[s.tableCell, s.colMaterial]}>{v.material}{v.colorACM ? ` · ${v.colorACM}` : ''}</Text>
                <Text style={[s.tableCell, s.colTerminacion]}>{v.terminacion}</Text>
                <Text style={[s.tableCell, s.colDim]}>{fmt(v.ancho)} × {fmt(v.alto)}</Text>
                <Text style={[s.tableCell, s.colM2]}>{fmt(area)}</Text>
                <Text style={[s.tableCellBold, s.colPrecio]}>{usd(v.precio)}</Text>
              </View>
            )
          })}

          <View style={s.totalRow}>
            <Text style={s.totalLabel}>Subtotal provisión</Text>
            <Text style={s.totalValue}>{usd(cot.totalProducto)}</Text>
          </View>

          {/* Montaje */}
          {conMontaje && cot.montaje && (
            <>
              <Text style={s.sectionTitle}>MONTAJE E INSTALACIÓN</Text>
              <View style={s.tableHeader}>
                <Text style={[s.tableHeaderTxt, s.colMedio]}>MEDIO DE ELEVACIÓN</Text>
                <Text style={[s.tableHeaderTxt, s.colOp]}>OPERARIOS</Text>
                <Text style={[s.tableHeaderTxt, s.colDias]}>DÍAS</Text>
                <Text style={[s.tableHeaderTxt, s.colHS]}>H&S</Text>
                <Text style={[s.tableHeaderTxt, s.colMontTotal]}>PRECIO</Text>
              </View>
              <View style={s.tableRow}>
                <Text style={[s.tableCell, s.colMedio]}>{cot.montaje.medio?.nombre ?? '—'}</Text>
                <Text style={[s.tableCell, s.colOp]}>{cot.montaje.nOperarios}</Text>
                <Text style={[s.tableCell, s.colDias]}>{cot.montaje.diasObra}</Text>
                <Text style={[s.tableCell, s.colHS]}>{cot.montaje.hsPresencial ? 'Sí' : 'No'}</Text>
                <Text style={[s.tableCellBold, s.colMontTotal]}>{usd(cot.montaje.precioVenta)}</Text>
              </View>
              <View style={s.totalRow}>
                <Text style={s.totalLabel}>Subtotal montaje</Text>
                <Text style={s.totalValue}>{usd(cot.montaje.precioVenta)}</Text>
              </View>
            </>
          )}

          {/* Total obra */}
          <View style={s.grandTotalRow}>
            <Text style={s.grandTotalLabel}>{conMontaje ? 'TOTAL OBRA (PROVISIÓN + MONTAJE)' : 'TOTAL'}</Text>
            <Text style={s.grandTotalValue}>{usd(totalObra)}</Text>
          </View>

          {/* Condiciones */}
          {cot.condiciones && (
            <>
              <Text style={s.sectionTitle}>CONDICIONES COMERCIALES</Text>
              <View style={s.card}>
                <View style={s.row2}>
                  <View style={s.col}>
                    <Field label="FORMA DE PAGO" value={cot.condiciones.formaPagoProducto} />
                  </View>
                  <View style={s.col}>
                    <Field label="TIPO DE CAMBIO REFERENCIA" value={`$ ${fmt(cot.tcUsado)} / u$d`} />
                  </View>
                </View>
                {(cot.condiciones.retenciones ?? []).length > 0 && (
                  <View style={{ marginTop: 6 }}>
                    <Text style={s.fieldLabel}>RETENCIONES APLICABLES</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 3 }}>
                      {(cot.condiciones.retenciones ?? []).map((r, i) => (
                        <Text key={i} style={{ fontSize: 8, color: GRAY_TEXT }}>
                          {r.tipo}: {r.porcentaje}%
                        </Text>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            </>
          )}

          {/* Footer */}
          <View style={s.footer}>
            <Text style={s.footerText}>
              Oferta válida por 30 días corridos desde la fecha de emisión.{'\n'}
              Los precios expresados en dólares estadounidenses (u$d) son de referencia.{'\n'}
              Sujeto a disponibilidad de material y confirmación técnica.
            </Text>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[s.footerText, { fontFamily: 'Helvetica-Bold', color: VELUM_DARK }]}>VELUM S.R.L.</Text>
              <Text style={s.footerText}>Planta Industrial Los Polígonos del Norte</Text>
              <Text style={s.footerText}>Santa Fe, Argentina</Text>
            </View>
          </View>

        </View>
      </Page>
    </Document>
  )
}
