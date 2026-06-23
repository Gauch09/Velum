import dotenv from 'dotenv'
dotenv.config({ path: '.env' })
dotenv.config({ path: '.env.local', override: true })
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const { count: capCount, error: e1 } = await sb
  .from('CapacidadTeorica').select('*', { count: 'exact', head: true })
const { count: tramoCount, error: e2 } = await sb
  .from('TramoTrabajo').select('*', { count: 'exact', head: true })

if (e1 || e2) {
  console.error('ERROR:', e1?.message ?? e2?.message)
  process.exit(1)
}

// Sanity check del seed: PIC/PEC - 150 en LASER debe dar ~95 piezas/hora (759.86/8)
const { data: pic } = await sb
  .from('CapacidadTeorica')
  .select('piezasPorHora')
  .eq('producto', 'PIC/PEC - 150')
  .eq('tipoMaquina', 'LASER')
  .single()

console.log('CapacidadTeorica filas:', capCount)
console.log('TramoTrabajo filas:', tramoCount, '(esperado 0)')
console.log('PIC/PEC-150 LASER piezas/hora:', pic?.piezasPorHora, '(esperado ~94.98)')
if (!pic || Math.abs(pic.piezasPorHora - 94.98) > 1) {
  console.error('FALLO sanity check del seed')
  process.exit(1)
}
console.log('OK')
