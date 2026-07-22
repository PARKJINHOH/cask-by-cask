import { NextRequest, NextResponse } from 'next/server'

const API_URL = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

interface ApiResponse<T> {
  success: boolean
  data: T | null
}

interface SpiritSeoResponse {
  canonicalPathKo: string
  canonicalPathEn: string
}

const SPIRIT_PATH = /^\/(?:(ko|en)\/)?spirits\/([^/]+)\/?$/i
const LOCALE_PATH = /^\/(ko|en)(?:\/|$)/i
const LOCALE_REDIRECT_EXEMPT = new Set(['/oauth/callback', '/healthz'])
const NOINDEX_PATHS = [
  /^\/admin(?:\/|$)/,
  /^\/mypage(?:\/|$)/,
  /^\/messages(?:\/|$)/,
  /^\/notifications(?:\/|$)/,
  /^\/request(?:\/|$)/,
  /^\/login(?:\/|$)/,
  /^\/signup(?:\/|$)/,
  /^\/account-recovery(?:\/|$)/,
  /^\/oauth(?:\/|$)/,
  /^\/feedback(?:\/|$)/,
  /^\/inquiry(?:\/|$)/,
  /^\/community\/(?:all|notice|free|byob)\/(?:write|\d+\/edit)(?:\/|$)/,
  /^\/spirits\/[^/]+\/review\/(?:write|[^/]+\/edit)(?:\/|$)/,
]

export async function proxy(request: NextRequest) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return nextWithSeoContext(request)
  }

  const pathname = request.nextUrl.pathname
  const match = pathname.match(SPIRIT_PATH)
  if (!match) {
    return redirectToDefaultLocale(request) ?? nextWithSeoContext(request)
  }

  const lang = match[1] === 'en' ? 'en' : 'ko'
  const id = extractLeadingId(match[2])
  if (!id) {
    return redirectToDefaultLocale(request) ?? nextWithSeoContext(request)
  }

  try {
    const res = await fetch(`${API_URL}/api/seo/spirits/${id}`, {
      cache: 'no-store',
    })
    if (res.status === 404) {
      return nextWithSeoContext(request, true)
    }
    if (!res.ok) {
      return serviceUnavailable()
    }

    const body = await res.json() as ApiResponse<SpiritSeoResponse>
    const seo = body.data
    if (!seo) {
      return redirectToDefaultLocale(request) ?? nextWithSeoContext(request)
    }

    const canonicalPath = lang === 'en' ? seo.canonicalPathEn : seo.canonicalPathKo
    if (normalizePath(pathname) === normalizePath(canonicalPath)) {
      return nextWithSeoContext(request)
    }

    const url = request.nextUrl.clone()
    url.pathname = canonicalPath
    return NextResponse.redirect(url, 301)
  } catch {
    return serviceUnavailable()
  }
}

function redirectToDefaultLocale(request: NextRequest): NextResponse | null {
  const pathname = request.nextUrl.pathname
  const lastSegment = pathname.split('/').pop() ?? ''
  if (
    LOCALE_PATH.test(pathname)
    || LOCALE_REDIRECT_EXEMPT.has(pathname)
    || lastSegment.includes('.')
  ) return null

  const url = request.nextUrl.clone()
  url.pathname = pathname === '/' ? '/ko' : `/ko${pathname}`
  return NextResponse.redirect(url, 308)
}

function nextWithSeoContext(request: NextRequest, spiritNotFound = false): NextResponse {
  const pathname = request.nextUrl.pathname
  const lang = pathname.match(LOCALE_PATH)?.[1]?.toLowerCase() === 'en' ? 'en' : 'ko'
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-caskbycask-lang', lang)
  if (spiritNotFound) requestHeaders.set('x-caskbycask-spirit-not-found', '1')

  const response = NextResponse.next({ request: { headers: requestHeaders } })
  const pathWithoutLocale = pathname.replace(LOCALE_PATH, '/')
  if (NOINDEX_PATHS.some((pattern) => pattern.test(pathWithoutLocale))) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow')
  }
  return response
}

function serviceUnavailable(): NextResponse {
  return new NextResponse('Service temporarily unavailable', {
    status: 503,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Retry-After': '60',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  })
}

function extractLeadingId(value: string): string | null {
  const decoded = safeDecodeURIComponent(value)
  const match = decoded.match(/^(\d+)/)
  return match ? match[1] : null
}

function normalizePath(value: string): string {
  const decoded = safeDecodeURI(value)
  return decoded.length > 1 ? decoded.replace(/\/+$/, '') : decoded
}

function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function safeDecodeURI(value: string): string {
  try {
    return decodeURI(value)
  } catch {
    return value
  }
}

export const config = {
  matcher: [
    '/((?!api|_next|uploads|favicon.ico|robots.txt|sitemap.xml|sitemaps|indexnow-key.txt|og-image.png|logo.png|site.webmanifest|healthz).*)',
  ],
}
