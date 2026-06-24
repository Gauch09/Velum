import { createSupabaseAdminClient } from '@/lib/supabase-admin'

export interface ClienteRow {
  id: string
  razonSocial: string
  cuit: string
  condicionIva: 'RESPONSABLE_INSCRIPTO' | 'MONOTRIBUTO' | 'EXENTO'
  domicilioFiscal: string | null
  jurisdiccionIibb: string | null
  esAgenteRetencion: boolean
}

export interface ContactoInput {
  nombre: string
  cargo?: string
  email: string
  telefono?: string
}

export type ClienteInput = Omit<ClienteRow, 'id'>

export async function listarClientes(): Promise<ClienteRow[]> {
  const sb = createSupabaseAdminClient() as any
  const { data, error } = await sb.from('Cliente').select('*').order('razonSocial')
  if (error) throw new Error(`listarClientes: ${error.message}`)
  return data ?? []
}

export async function crearCliente(
  cliente: ClienteInput,
  contacto: ContactoInput
): Promise<ClienteRow> {
  const sb = createSupabaseAdminClient() as any
  const clienteId = crypto.randomUUID()
  const { data: cl, error: e1 } = await sb
    .from('Cliente').insert([{ id: clienteId, ...cliente }]).select().single()
  if (e1) throw new Error(`crearCliente: ${e1.message}`)
  const { error: e2 } = await sb
    .from('Contacto').insert([{ id: crypto.randomUUID(), ...contacto, clienteId: cl.id }])
  if (e2) throw new Error(`crearContacto: ${e2.message}`)
  return cl
}
