'use client'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    const { error } = await supabaseBrowser.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); return }
    router.push('/')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <form onSubmit={handleLogin} className="bg-gray-900 p-8 rounded-xl w-80 flex flex-col gap-4">
        <h1 className="text-white text-2xl font-bold">VELUM</h1>
        <input
          type="email" placeholder="Email" value={email}
          onChange={e => setEmail(e.target.value)}
          className="bg-gray-800 text-white px-4 py-2 rounded-lg"
        />
        <input
          type="password" placeholder="Contraseña" value={password}
          onChange={e => setPassword(e.target.value)}
          className="bg-gray-800 text-white px-4 py-2 rounded-lg"
        />
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button type="submit" className="bg-green-600 text-white py-2 rounded-lg font-semibold">
          Ingresar
        </button>
      </form>
    </div>
  )
}
