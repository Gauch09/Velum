import { redirect } from 'next/navigation'
import OrdenCard from '@/components/operario/OrdenCard'

// OrdenCard import forces page_client-reference-manifest.js generation on Vercel
export default function OperarioRoot() {
  void (OrdenCard as unknown)
  redirect('/operario')
}
