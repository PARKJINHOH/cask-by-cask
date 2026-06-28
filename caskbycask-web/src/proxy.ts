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

const SPIRIT_PATH = /^\/(?:(ko|en)\/)?spirits\/([^/]+)(?:\/.*)?$/i

export async function proxy(request: NextRequest) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return NextResponse.next()
  }

  const pathname = request.nextUrl.pathname
  const match = pathname.match(SPIRIT_PATH)
  if (!match) {
    return NextResponse.next()
  }

  const lang = match[1] === 'en' ? 'en' : 'ko'
  const id = extractLeadingId(match[2])
  if (!id) {
    return NextResponse.next()
  }

  try {
    const res = await fetch(`${API_URL}/api/seo/spirits/${id}`, {
      cache: 'no-store',
    })
    if (!res.ok) {
      return NextResponse.next()
    }

    const body = await res.json() as ApiResponse<SpiritSeoResponse>
    const seo = body.data
    if (!seo) {
      return NextResponse.next()
    }

    const canonicalPath = lang === 'en' ? seo.canonicalPathEn : seo.canonicalPathKo
    if (normalizePath(pathname) === normalizePath(canonicalPath)) {
      return NextResponse.next()
    }

    const url = request.nextUrl.clone()
    url.pathname = canonicalPath
    return NextResponse.redirect(url, 301)
  } catch {
    return NextResponse.next()
  }
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
    '/((?!api|_next|uploads|favicon.ico|robots.txt|sitemap.xml|og-image.png|logo.png|site.webmanifest).*)',
  ],
}
