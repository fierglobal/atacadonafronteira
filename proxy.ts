import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const SITE_OFFLINE = true

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  let response = NextResponse.next({ request: req })

  if (SITE_OFFLINE) {
    const isAdmin = pathname.startsWith('/admin') || pathname.startsWith('/api/admin')
    const isPublicApi = pathname === '/api/site-access'
    const isMaintPage = pathname === '/manutencao'
    if (!isAdmin && !isPublicApi && !isMaintPage) {
      const accessCookie = req.cookies.get('site_access')?.value
      if (accessCookie !== process.env.PREVIEW_PASSWORD) {
        return NextResponse.redirect(new URL('/manutencao', req.url))
      }
    }
  }

  if (pathname.startsWith('/admin')) {
    if (pathname === '/admin/login') return response
    const token = req.cookies.get('admin_token')?.value
    if (!token) return NextResponse.redirect(new URL('/admin/login', req.url))
    // Validação real da sessão acontece em requireAdmin() nas rotas /api/admin.
    // Aqui só barramos token com formato inválido (nem UUID de sessão, nem hash legado).
    const isSessionId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)
    const isLegacyHash = /^[0-9a-f]{64}$/i.test(token)
    if (!isSessionId && !isLegacyHash) {
      return NextResponse.redirect(new URL('/admin/login', req.url))
    }
    return response
  }

  const isProtected = pathname === '/checkout' || pathname === '/conta/minha-conta' || pathname.startsWith('/conta/minha-conta/')
  if (isProtected) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => req.cookies.getAll(),
          setAll: (cookiesToSet) => {
            cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value))
            response = NextResponse.next({ request: req })
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            )
          },
        },
      }
    )
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      const loginUrl = new URL('/conta/login', req.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|logo|.*\\.(?:png|jpg|jpeg|svg|webp|ico|woff2?|css)).*)',
  ],
}
