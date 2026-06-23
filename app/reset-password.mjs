import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter(l => l.includes('='))
    .map(l => l.split('=').map((p, i) => i === 0 ? p.trim() : l.slice(l.indexOf('=') + 1).trim()))
)

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const { data, error } = await supabase.auth.admin.updateUserById(
  '69c1e94d-023d-489d-a57a-a8f9985b014d',
  { password: 'velum2026' }
)

if (error) {
  console.error('Error:', error.message)
} else {
  console.log('Contraseña actualizada para:', data.user.email)
}
