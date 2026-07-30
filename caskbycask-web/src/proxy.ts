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
const SOCIAL_SHORT_LINK_PATH = /^\/(?:(?:ko|en)\/)?s\/[A-Za-z0-9]+\/?$/i
const LOCALE_REDIRECT_EXEMPT = new Set(['/oauth/callback', '/healthz'])

// 주류 canonical 조회 캐시.
//   · 검색봇과 사용자가 같은 주류를 반복 요청하므로 짧은 TTL 로 백엔드 왕복을 줄인다.
//   · 백엔드 재시작·순간 장애 중에는 TTL 이 지난 값이라도 계속 사용한다(stale-while-error).
//     canonical 리다이렉트가 5xx 로 무너지면 검색엔진이 주류 URL 전체에서 오류를 보게 되므로,
//     오래된 canonical 로 리다이렉트하는 편이 항상 더 안전하다.
//   · 주류 canonical 은 이름/에디션 변경 시에만 바뀌고 sitemap·ISR 도 3600초 주기이므로
//     이 TTL 로 인한 지연은 기존 색인 갱신 주기 안에 들어온다.
const SEO_CACHE_TTL_MS = 5 * 60 * 1000
// 존재하지 않음 판정은 더 짧게 유지한다. 주류가 비활성→활성으로 전환되면 IndexNow 가 즉시
// 검색엔진에 통지하므로, 그때 크롤러가 오래된 404 를 받으면 색인 복귀가 늦어진다.
const SEO_CACHE_NOT_FOUND_TTL_MS = 60 * 1000
const SEO_CACHE_MAX_ENTRIES = 2000

type SpiritSeoLookup =
  | { kind: 'found'; seo: SpiritSeoResponse }
  | { kind: 'not-found' }

const spiritSeoCache = new Map<string, { lookup: SpiritSeoLookup; storedAt: number }>()

type SpiritSeoResult =
  | { status: 'found'; seo: SpiritSeoResponse }
  | { status: 'not-found' }
  | { status: 'no-canonical' }
  | { status: 'unavailable' }

function readSpiritSeoCache(id: string, allowStale: boolean): SpiritSeoLookup | null {
  const entry = spiritSeoCache.get(id)
  if (!entry) return null
  // 업스트림을 확인할 수 없을 때는 만료 여부와 무관하게 마지막으로 알던 값을 쓴다.
  if (allowStale) return entry.lookup
  const ttl = entry.lookup.kind === 'not-found' ? SEO_CACHE_NOT_FOUND_TTL_MS : SEO_CACHE_TTL_MS
  if (Date.now() - entry.storedAt > ttl) return null
  return entry.lookup
}

function writeSpiritSeoCache(id: string, lookup: SpiritSeoLookup): void {
  // Map 은 삽입 순서를 유지하므로 delete 후 set 으로 최근 사용 항목을 뒤로 보낸다.
  spiritSeoCache.delete(id)
  spiritSeoCache.set(id, { lookup, storedAt: Date.now() })
  while (spiritSeoCache.size > SEO_CACHE_MAX_ENTRIES) {
    const oldestKey = spiritSeoCache.keys().next().value
    if (oldestKey === undefined) break
    spiritSeoCache.delete(oldestKey)
  }
}

function toResult(lookup: SpiritSeoLookup): SpiritSeoResult {
  return lookup.kind === 'found'
    ? { status: 'found', seo: lookup.seo }
    : { status: 'not-found' }
}

/** 업스트림을 확인할 수 없을 때 오래된 캐시라도 사용한다. 없으면 unavailable. */
function staleOrUnavailable(id: string): SpiritSeoResult {
  const stale = readSpiritSeoCache(id, true)
  return stale ? toResult(stale) : { status: 'unavailable' }
}

async function lookupSpiritSeo(id: string): Promise<SpiritSeoResult> {
  const fresh = readSpiritSeoCache(id, false)
  if (fresh) return toResult(fresh)

  try {
    const res = await fetch(`${API_URL}/api/seo/spirits/${id}`, {
      cache: 'no-store',
    })
    // 404 와 410 은 "확정적으로 없음". seoHelpers 의 isApiResourceNotFound 와 판정을 맞춘다.
    // (제한된 콘텐츠 401/403 이나 일시 장애 5xx 를 영구 부재로 바꾸지 않는다)
    if (res.status === 404 || res.status === 410) {
      writeSpiritSeoCache(id, { kind: 'not-found' })
      return { status: 'not-found' }
    }
    if (!res.ok) return staleOrUnavailable(id)

    const body = await res.json() as ApiResponse<SpiritSeoResponse>
    const seo = body.data
    if (!seo) return { status: 'no-canonical' }

    writeSpiritSeoCache(id, { kind: 'found', seo })
    return { status: 'found', seo }
  } catch {
    return staleOrUnavailable(id)
  }
}

/** 요청 경로에 slug 가 붙어 있는지. sitemap 에 등재된 정규 주류 URL 은 항상 slug 를 포함한다. */
function hasSpiritSlug(segment: string): boolean {
  return !/^\d+$/.test(safeDecodeURIComponent(segment))
}

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
  // 아래 두 패턴은 공개 경로(/taste-trees, /taste-trees/t/{key}, /price-tracker,
  // /price-tracker/spirits/{id})를 건드리지 않도록 하위 경로만 정확히 지정한다.
  /^\/taste-trees\/(?:new|mine|\d+\/edit)(?:\/|$)/,
  /^\/price-tracker\/register(?:\/|$)/,
  // 참고: 사용자 공개 목록(/users/{id}/bottles|reviews)은 여기에 넣지 않는다.
  // 이 헤더는 `noindex, nofollow` 를 보내지만 해당 경로는 링크 추적(`follow`)을 유지해야 하므로,
  // HTML meta 의 `noindex, follow` 단독으로 처리한다(신호 충돌 방지).
]

export async function proxy(request: NextRequest) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return nextWithSeoContext(request)
  }

  const pathname = request.nextUrl.pathname
  if (SOCIAL_SHORT_LINK_PATH.test(pathname)) {
    return nextWithSeoContext(request)
  }
  const match = pathname.match(SPIRIT_PATH)
  if (!match) {
    return redirectToDefaultLocale(request) ?? nextWithSeoContext(request)
  }

  const lang = match[1] === 'en' ? 'en' : 'ko'
  const spiritSegment = match[2]
  const id = extractLeadingId(spiritSegment)
  if (!id) {
    return redirectToDefaultLocale(request) ?? nextWithSeoContext(request)
  }

  const result = await lookupSpiritSeo(id)

  if (result.status === 'not-found') {
    return nextWithSeoContext(request, true)
  }
  if (result.status === 'no-canonical') {
    return redirectToDefaultLocale(request) ?? nextWithSeoContext(request)
  }
  if (result.status === 'unavailable') {
    // 백엔드 SEO API 를 확인할 수 없고 캐시도 없는 상태.
    //   · slug 가 있는 요청은 sitemap 에 등재된 정규 형태이므로 그대로 렌더링을 진행한다.
    //     페이지의 generateMetadata 는 별도 ISR 캐시(3600초)를 쓰므로 정상 canonical 을 낼 가능성이 높고,
    //     이때 검색엔진은 오류 대신 정상 200 응답을 받는다.
    //   · slug 가 없는 요청은 목적지를 알 수 없다. 이 경우에만 503 으로 재시도를 유도한다.
    //     일시 장애에 noindex 로 응답하면 색인이 제거될 수 있어 5xx 가 더 안전하다.
    return hasSpiritSlug(spiritSegment)
      ? nextWithSeoContext(request)
      : serviceUnavailable()
  }

  const canonicalPath = lang === 'en' ? result.seo.canonicalPathEn : result.seo.canonicalPathKo
  // 응답에 canonical 경로가 없거나 형식이 어긋나면 리다이렉트하지 않는다.
  // (`url.pathname = undefined` 는 `/undefined` 같은 깨진 목적지로 이어진다)
  if (typeof canonicalPath !== 'string' || !canonicalPath.startsWith('/')) {
    return nextWithSeoContext(request)
  }
  if (normalizePath(pathname) === normalizePath(canonicalPath)) {
    return nextWithSeoContext(request)
  }

  const url = request.nextUrl.clone()
  url.pathname = canonicalPath
  return NextResponse.redirect(url, 301)
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
  // 일시적 업스트림 장애를 알리는 응답이다. 검색엔진은 5xx 를 "나중에 다시 시도"로 처리하며
  // 5xx 본문을 색인하지 않으므로 noindex 를 함께 보내지 않는다.
  // (noindex 는 색인 제거 신호라서 일시 장애에 섞으면 복구가 느려진다)
  return new NextResponse('Service temporarily unavailable', {
    status: 503,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Retry-After': '60',
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
