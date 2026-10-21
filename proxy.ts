import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { PUBLIC_PAGES, PUBLIC_API_ROUTES } from './lib/routes'

export function proxy (request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get('auth-token')?.value

  const isApiRoute = pathname.startsWith('/api')
  const isPublicPage = PUBLIC_PAGES.includes(pathname)
  const isPublicApi = PUBLIC_API_ROUTES.some(route =>
    pathname.startsWith(route)
  )

  // API Protection. : returns JSON 401 instead of redirecting
  if (isApiRoute && !token && !isPublicApi) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  //Page protection : Redirects guest to login, and logged-in users away from login
  if(!token && !isPublicPage) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Logged-in user protection
  if(token && isPublicPage) {
    return NextResponse.redirect(new URL('/client', request.url))
  }

  return NextResponse.next();
}

export const config = {
  /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/data (data cache)
     * - favicon.ico (favicon file)
  */
  matcher: [
    '/((?!api|_next/static|_next/data|favicon.ico).*)',
  ]
}
