// 주류 canonical 리다이렉트(proxy.ts)의 SEO 계약 회귀 테스트.
//
// 검증 대상:
//   1. 백엔드 정상  — 비정규 URL 은 최종 canonical 로 301 (홉 1회)
//   2. 백엔드 정상  — 정규 URL 은 리다이렉트 없이 200
//   3. 백엔드 장애  — 캐시가 있으면 오래된 canonical 로 계속 301 (stale-while-error)
//   4. 백엔드 장애  — slug 있는 URL(sitemap 등재 형태)은 5xx 가 아니라 200 으로 렌더링
//   5. 백엔드 장애  — slug 없는 URL 만 503 + Retry-After (색인 제거 신호 없음)
//   6. locale 없는 경로는 /ko 로 308
//   7. 비공개 경로는 X-Robots-Tag: noindex, nofollow
//
// 실행: npm run build 후 `npm run test:proxy-seo`
import { spawn } from 'node:child_process'
import { createServer } from 'node:http'
import { rm } from 'node:fs/promises'
import test from 'node:test'
import assert from 'node:assert/strict'

const BACKEND_PORT = Number(process.env.PROXY_TEST_BACKEND_PORT || 8099)
const WEB_PORT = Number(process.env.PROXY_TEST_WEB_PORT || 3124)
const BASE = `http://127.0.0.1:${WEB_PORT}`

const CACHED_ID = '244'
const CACHED_SLUG_PATH = `/ko/spirits/${CACHED_ID}-kavalan-solist-px-sherry`
const CACHED_SLUG_PATH_EN = `/en/spirits/${CACHED_ID}-kavalan-solist-px-sherry`
const SITE = 'https://www.caskbycask.net'
const CANONICAL_URL_KO = `${SITE}${CACHED_SLUG_PATH}`
const CANONICAL_URL_EN = `${SITE}${CACHED_SLUG_PATH_EN}`
const UNCACHED_ID = '999'
const GONE_ID = '555'
const BROKEN_CANONICAL_ID = '666'

const SPIRIT_SEO_PAYLOAD = {
  canonicalId: Number(CACHED_ID),
  canonicalPathKo: CACHED_SLUG_PATH,
  canonicalPathEn: CACHED_SLUG_PATH_EN,
  canonicalUrlKo: CANONICAL_URL_KO,
  canonicalUrlEn: CANONICAL_URL_EN,
  titleKo: '카발란 솔리스트 PX 셰리 — CaskByCask',
  titleEn: 'Kavalan Solist PX Sherry — CaskByCask',
  descriptionKo: '카발란 솔리스트 PX 셰리 주류 정보와 리뷰.',
  descriptionEn: 'Specs and reviews for Kavalan Solist PX Sherry.',
  primaryImageUrl: `${SITE}/og-image.png`,
  updatedAt: null,
  relationType: 'STANDALONE',
}

function startFakeBackend() {
  const server = createServer((req, res) => {
    if (req.url === `/api/seo/spirits/${CACHED_ID}`) {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ success: true, data: SPIRIT_SEO_PAYLOAD }))
      return
    }
    // 삭제된 리소스: 확정적 부재이므로 404 와 동일하게 취급되어야 한다.
    if (req.url === `/api/seo/spirits/${GONE_ID}`) {
      res.writeHead(410, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ success: false, data: null }))
      return
    }
    // canonical 경로가 비어 있는 비정상 응답: 깨진 목적지로 리다이렉트하면 안 된다.
    if (req.url === `/api/seo/spirits/${BROKEN_CANONICAL_ID}`) {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({
        success: true,
        data: { ...SPIRIT_SEO_PAYLOAD, canonicalPathKo: null, canonicalPathEn: '' },
      }))
      return
    }
    res.writeHead(404, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ success: false, data: null }))
  })
  return new Promise((resolve) => {
    server.listen(BACKEND_PORT, '127.0.0.1', () => resolve(server))
  })
}

function closeServer(server) {
  return new Promise((resolve) => {
    server.closeAllConnections?.()
    server.close(() => resolve())
  })
}

function startWebServer() {
  return spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', String(WEB_PORT)], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      INTERNAL_API_URL: `http://127.0.0.1:${BACKEND_PORT}`,
      NEXT_PUBLIC_API_URL: `http://127.0.0.1:${BACKEND_PORT}`,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
}

async function waitForWeb(timeoutMs = 90_000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE}/healthz`, { redirect: 'manual' })
      if (res.status > 0) return true
    } catch {
      // 기동 대기
    }
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  return false
}

async function probe(path) {
  const res = await fetch(`${BASE}${path}`, { redirect: 'manual' })
  // 본문을 소비해 소켓을 정리한다.
  await res.arrayBuffer().catch(() => undefined)
  return {
    status: res.status,
    location: res.headers.get('location'),
    robots: res.headers.get('x-robots-tag'),
    retryAfter: res.headers.get('retry-after'),
  }
}

async function fetchHead(path) {
  const res = await fetch(`${BASE}${path}`, { redirect: 'manual' })
  const html = await res.text()
  const tags = [...html.matchAll(/<(?:link|meta)\b[^>]*>/gi)].map((match) => match[0])

  const attr = (tag, name) => tag.match(new RegExp(`\\b${name}=["']([^"']*)["']`, 'i'))?.[1] ?? null
  const linkHref = (rel, hrefLang) => tags
    .filter((tag) => tag.toLowerCase().startsWith('<link')
      && attr(tag, 'rel')?.toLowerCase() === rel
      && (hrefLang ? attr(tag, 'hreflang') === hrefLang : !/hreflang=/i.test(tag)))
    .map((tag) => attr(tag, 'href'))

  return {
    status: res.status,
    canonical: linkHref('canonical'),
    alternateKo: linkHref('alternate', 'ko'),
    alternateEn: linkHref('alternate', 'en'),
    alternateDefault: linkHref('alternate', 'x-default'),
    robots: tags
      .filter((tag) => tag.toLowerCase().startsWith('<meta') && attr(tag, 'name')?.toLowerCase() === 'robots')
      .map((tag) => attr(tag, 'content')),
  }
}

test('주류 canonical 리다이렉트 SEO 계약', async (t) => {
  // generateMetadata 의 fetch 는 revalidate 3600 으로 .next/cache/fetch-cache 에 디스크 캐싱된다.
  // 이전 실행의 응답이 남아 있으면 결과가 달라지므로 매번 비우고 시작한다.
  await rm('.next/cache/fetch-cache', { recursive: true, force: true })

  let backend = await startFakeBackend()
  const web = startWebServer()
  let webLog = ''
  web.stdout.on('data', (chunk) => { webLog += chunk.toString() })
  web.stderr.on('data', (chunk) => { webLog += chunk.toString() })

  t.after(async () => {
    web.kill('SIGTERM')
    if (backend?.listening) await closeServer(backend)
  })

  const ready = await waitForWeb()
  assert.ok(ready, `Next.js 서버 기동 실패:\n${webLog.slice(-2000)}`)

  await t.test('백엔드 정상: 비정규 URL 은 최종 canonical 로 1회 301', async () => {
    const bare = await probe(`/spirits/${CACHED_ID}`)
    assert.equal(bare.status, 301)
    assert.equal(bare.location, CACHED_SLUG_PATH)

    const withLocale = await probe(`/ko/spirits/${CACHED_ID}`)
    assert.equal(withLocale.status, 301)
    assert.equal(withLocale.location, CACHED_SLUG_PATH)

    const en = await probe(`/en/spirits/${CACHED_ID}`)
    assert.equal(en.status, 301)
    assert.equal(en.location, CACHED_SLUG_PATH_EN)
  })

  await t.test('백엔드 정상: 정규 URL 은 리다이렉트 없이 200', async () => {
    const canonical = await probe(CACHED_SLUG_PATH)
    assert.equal(canonical.status, 200)
    assert.equal(canonical.location, null)
  })

  await t.test('백엔드 정상: 정규 URL 의 색인 신호가 단일하고 정확하다', async () => {
    const head = await fetchHead(CACHED_SLUG_PATH)
    assert.equal(head.status, 200)

    // canonical 은 정확히 1개이며 sitemap 에 등재된 slug URL 과 같아야 한다.
    assert.deepEqual(head.canonical, [CANONICAL_URL_KO])
    // hreflang 은 ko/en/x-default 가 각각 1개씩.
    assert.deepEqual(head.alternateKo, [CANONICAL_URL_KO])
    assert.deepEqual(head.alternateEn, [CANONICAL_URL_EN])
    assert.deepEqual(head.alternateDefault, [CANONICAL_URL_KO])
    // 색인 허용 상태여야 한다.
    assert.equal(head.robots.length, 1)
    assert.match(head.robots[0], /^index/)
    assert.doesNotMatch(head.robots[0], /noindex/)
  })

  await t.test('백엔드 정상: 영문 정규 URL 은 self-canonical 과 양방향 hreflang', async () => {
    const head = await fetchHead(CACHED_SLUG_PATH_EN)
    assert.equal(head.status, 200)
    assert.deepEqual(head.canonical, [CANONICAL_URL_EN])
    assert.deepEqual(head.alternateKo, [CANONICAL_URL_KO])
    assert.deepEqual(head.alternateEn, [CANONICAL_URL_EN])
    assert.doesNotMatch(head.robots[0], /noindex/)
  })

  await t.test('백엔드 정상: 존재하지 않는 주류는 404', async () => {
    // 없는 주류를 200 으로 응답하면 soft 404 로 색인되고 크롤 예산이 낭비된다.
    const missing = await probe('/ko/spirits/777')
    assert.equal(missing.status, 404)
    assert.equal(missing.location, null)
  })

  await t.test('백엔드 정상: 410 Gone 도 확정적 부재로 404 처리', async () => {
    const gone = await probe(`/ko/spirits/${GONE_ID}`)
    assert.equal(gone.status, 404, '410 을 일시 장애로 오해하면 안 된다')
  })

  await t.test('백엔드 정상: canonical 이 비어 있으면 리다이렉트하지 않는다', async () => {
    // url.pathname 에 빈 값을 넣으면 `/undefined` 같은 깨진 목적지가 된다.
    const broken = await probe(`/ko/spirits/${BROKEN_CANONICAL_ID}`)
    assert.equal(broken.status, 200, '깨진 canonical 로 리다이렉트하지 않고 렌더링을 진행한다')
    assert.equal(broken.location, null)
  })

  await t.test('locale 없는 경로는 /ko 로 308', async () => {
    assert.deepEqual(await probe('/'), {
      status: 308, location: '/ko', robots: null, retryAfter: null,
    })
    const board = await probe('/community/free')
    assert.equal(board.status, 308)
    assert.equal(board.location, '/ko/community/free')
  })

  await t.test('비공개 경로는 noindex 헤더', async () => {
    const mypage = await probe('/ko/mypage')
    assert.equal(mypage.status, 200)
    assert.equal(mypage.robots, 'noindex, nofollow')
  })

  // 여기서 백엔드를 내려 장애 상황을 만든다.
  await closeServer(backend)

  await t.test('백엔드 장애: 캐시된 주류는 계속 canonical 로 301', async () => {
    const bare = await probe(`/spirits/${CACHED_ID}`)
    assert.equal(bare.status, 301, 'stale-while-error 로 리다이렉트가 유지되어야 한다')
    assert.equal(bare.location, CACHED_SLUG_PATH)
  })

  await t.test('백엔드 장애: slug 있는 URL 은 5xx 가 아니라 200', async () => {
    const slugged = await probe(`/ko/spirits/${UNCACHED_ID}-some-spirit-name`)
    assert.equal(slugged.status, 200, 'sitemap 등재 형태는 장애 중에도 렌더링되어야 한다')
    assert.equal(slugged.location, null)
  })

  await t.test('백엔드 장애: fallback 은 잘못된 canonical 대신 noindex', async () => {
    const head = await fetchHead(`/ko/spirits/${UNCACHED_ID}-some-spirit-name`)
    assert.equal(head.status, 200)
    // slug 를 알 수 없는 상태에서 canonical 을 선언하면 리다이렉트 대상 URL 을 가리키게 된다.
    assert.deepEqual(head.canonical, [], '장애 중에는 canonical 을 선언하지 않는다')
    assert.equal(head.robots.length, 1)
    assert.match(head.robots[0], /noindex/)
    assert.match(head.robots[0], /follow/, '내부 링크 추적은 유지해 복구 크롤을 돕는다')
  })

  await t.test('백엔드 장애: slug 없는 URL 만 503, 색인 제거 신호 없음', async () => {
    const bare = await probe(`/spirits/${UNCACHED_ID}`)
    assert.equal(bare.status, 503)
    assert.equal(bare.retryAfter, '60')
    assert.equal(bare.robots, null, '일시 장애 응답에 noindex 를 넣지 않는다')
  })
})
