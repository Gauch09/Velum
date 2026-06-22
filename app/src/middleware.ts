import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // PROTOTIPO (boceto dashboard producción) — ruta pública temporal. QUITAR al borrar el prototipo.
  if (request.nextUrl.pathname.startsWith('/prototipo-produccion')) {
    return NextResponse.next()
  }

  // Puente VELUM (/api/velum/*) y pantallas de planta (/velum-software/*.dc.html):
  // la app de planta hoy no tiene auth (acceso por red local de la fábrica), así
  // que se dejan públicas. ⚠️ Si esto se expone a internet, restringir por red o
  // agregar un token compartido.
  const p = request.nextUrl.pathname
  if (p.startsWith('/api/velum') || p.startsWith('/velum-software')) {
    return NextResponse.next()
  }

  let response = NextResponse.next({ request: { headers: request.headers } })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request: { headers: request.headers } })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user && !request.nextUrl.pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
