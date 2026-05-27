import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// ---------------------------------------------------------------------------
// Rate limiter — in-memory sliding-window (resets on cold start / redeploy)
// ---------------------------------------------------------------------------
const RATE_LIMIT_WINDOW_MS = 60_000  // 1 minute
const RATE_LIMIT_MAX_API   = 30      // max 30 API calls per IP per minute
const RATE_LIMIT_MAX_PAGE  = 200     // max 200 page loads per IP per minute

interface Window { count: number; resetAt: number }
const rateLimitStore = new Map<string, Window>()

function getRateLimitKey(req: NextRequest, prefix: string): string {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  return `${prefix}:${ip}`
}

function isRateLimited(key: string, max: number): boolean {
  const now = Date.now()
  const entry = rateLimitStore.get(key)

  if (!entry || now >= entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return false
  }

  entry.count += 1
  if (entry.count > max) return true

  return false
}

// Prune stale entries every ~500 requests to avoid unbounded memory growth
let pruneCounter = 0
function maybePrune() {
  if (++pruneCounter < 500) return
  pruneCounter = 0
  const now = Date.now()
  for (const [key, win] of rateLimitStore) {
    if (now >= win.resetAt) rateLimitStore.delete(key)
  }
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  maybePrune()

  // Rate-limit API routes more aggressively
  if (pathname.startsWith('/api/')) {
    const key = getRateLimitKey(request, 'api')
    if (isRateLimited(key, RATE_LIMIT_MAX_API)) {
      return new NextResponse(
        JSON.stringify({ error: 'Too many requests. Please slow down.' }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': '60',
          },
        }
      )
    }
  } else {
    // Light rate limit on page loads to blunt scraping / brute-force
    const key = getRateLimitKey(request, 'page')
    if (isRateLimited(key, RATE_LIMIT_MAX_PAGE)) {
      return new NextResponse('Too many requests', { status: 429 })
    }
  }

  // ---------------------------------------------------------------------------
  // Supabase auth session refresh
  // ---------------------------------------------------------------------------
  let supabaseResponse = NextResponse.next({ request })

  const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Skip auth middleware if Supabase isn't configured (local dev without .env)
  if (supabaseUrl && supabaseKey) {
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options as Parameters<typeof supabaseResponse.cookies.set>[2])
          )
        },
      },
    })

    let user = null
    try {
      const { data } = await supabase.auth.getUser()
      user = data.user
    } catch {
      // Supabase unreachable (project paused, offline, etc.) — treat as unauthenticated
      // and let the request through so the UI can show a meaningful error instead of crashing.
    }

    const isRealUser = !!user?.email

    const isPublicPath =
      pathname === '/' ||
      pathname === '/login' ||
      pathname === '/onboarding' ||
      pathname.startsWith('/api/') ||
      pathname.startsWith('/_next/') ||
      pathname.startsWith('/favicon')

    if (!isRealUser && !isPublicPath) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    if (isRealUser && (pathname === '/login' || pathname === '/onboarding')) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }

    // ── Layer 1: Admin route guard ────────────────────────────────────────────
    // Block /admin for anyone who isn't an admin before the page even loads.
    if (pathname.startsWith('/admin') && isRealUser && user) {
      try {
        const { data: profile } = await supabase
          .from('student_profiles')
          .select('is_admin')
          .eq('id', user.id)
          .single()

        if (!profile?.is_admin) {
          const url = request.nextUrl.clone()
          url.pathname = '/dashboard'
          return NextResponse.redirect(url)
        }
      } catch {
        // DB unreachable — deny access to be safe
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard'
        return NextResponse.redirect(url)
      }
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
