// 렌더링 후 DOM 기준 SEO 회귀 검증.
//
// verify-seo.mjs 는 SSR HTML 과 대표 경로 몇 개의 렌더링 결과를 본다. 이 스크립트는 그 뒤를 잇는다 —
// 구글은 JS 를 실행한 뒤의 DOM 으로 색인하므로, SSR 이 아무리 정확해도 SPA 가 하이드레이션 때
// 신호를 덮어쓰면 검색 결과는 달라진다. 실제로 이 계열에서 반복해서 결함이 나왔다.
//   · SPA 가 robots 를 index 로 되돌려 SSR 의 noindex 를 무효화
//   · canonical 이 로케일 없는 상대경로로 바뀌어 308 되는 주소를 정본으로 선언
//   · hreflang·description 이 통째로 사라짐
//   · 페이지네이션이 <button> 이라 렌더링 후 크롤 가능한 링크가 0개
//   · GNB 드롭다운이 열렸을 때만 마운트돼 섹션 링크가 DOM 에 없음
//
// 검증 세 갈래:
//   A. SSR ↔ 렌더링 후 색인 신호가 같은가
//   B. 직접 로드와 링크 이동(SPA 내비게이션)의 신호가 같은가
//   C. 모바일 뷰포트에서도 같은가 (구글은 모바일 우선 색인)
//
// 실행: 서버를 띄운 뒤 `npm run seo:verify-rendered`
//   SEO_VERIFY_BASE_URL          검사 대상 (기본 http://localhost:3000)
//   SEO_VERIFY_CANONICAL_ORIGIN  canonical 에 기대하는 오리진
//   SEO_VERIFY_BROWSER_NO_SANDBOX=true  컨테이너에서 실행할 때
import puppeteer from 'puppeteer'

const baseUrl = (process.env.SEO_VERIFY_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '')
const browserNoSandbox = process.env.SEO_VERIFY_BROWSER_NO_SANDBOX === 'true'
const HYDRATION_SETTLE_MS = Number(process.env.SEO_VERIFY_SETTLE_MS || 1500)

const failures = []
function fail(scope, target, detail) {
  failures.push(`[${scope}] ${target}\n    · ${detail}`)
}

// ── 픽스처: 실제 데이터에서 찾아 쓴다 ────────────────────────────
// id 를 상수로 박아두면 환경이 바뀔 때마다 스크립트가 먼저 깨진다.
async function api(path) {
  try {
    const res = await fetch(`${baseUrl}${path}`, { headers: { 'User-Agent': 'seo-verify' } })
    if (!res.ok) return null
    return (await res.json())?.data ?? null
  } catch {
    return null
  }
}

async function discoverFixtures() {
  const [spirits, freePosts, photoPosts, notices] = await Promise.all([
    api('/api/spirits?page=0&size=1'),
    api('/api/posts?page=0&size=1&sort=LATEST'),
    api('/api/posts?page=0&size=1&boardType=PHOTO&sort=LATEST'),
    api('/api/notices?page=0&size=1'),
  ])
  const spiritId = spirits?.content?.[0]?.id ?? null
  const seo = spiritId ? await api(`/api/seo/spirits/${spiritId}`) : null
  return {
    spiritPath: seo?.canonicalPathKo ?? (spiritId ? `/ko/spirits/${spiritId}` : null),
    spiritTotalPages: spirits?.totalPages ?? 0,
    freePostId: freePosts?.content?.[0]?.id ?? null,
    photoPostId: photoPosts?.content?.[0]?.id ?? null,
    noticeId: notices?.content?.[0]?.id ?? null,
  }
}

// ── head 신호 읽기 ────────────────────────────────────────────
// head 안의 태그만 센다 — body 의 <svg><title> 은 접근성 요소지 문서 제목이 아니다.
const READ_HEAD = () => ({
  robots: document.head.querySelector('meta[name="robots"]')?.getAttribute('content') || null,
  canonical: document.head.querySelector('link[rel="canonical"]')?.getAttribute('href') || null,
  title: document.head.querySelector('title')?.textContent || null,
  description: document.head.querySelector('meta[name="description"]')?.getAttribute('content') || null,
  nTitle: document.head.querySelectorAll('title').length,
  nDescription: document.head.querySelectorAll('meta[name="description"]').length,
  nCanonical: document.head.querySelectorAll('link[rel="canonical"]').length,
  nRobots: document.head.querySelectorAll('meta[name="robots"]').length,
  // 작성자가 에디터로 넣은 헤딩은 코드가 통제하지 못하므로 문서 구조 검사에서 제외한다.
  // (본문 영역 표시: SSR 은 data-cbc-user-content, SPA 는 RichContent 의 notice-content)
  nH1: [...document.body.querySelectorAll('h1')]
    .filter((h) => !h.closest('[data-cbc-user-content], .notice-content')).length,
  hreflang: [...document.head.querySelectorAll('link[rel="alternate"][hreflang]')]
    .map((l) => `${l.getAttribute('hreflang')}=${decodeURIComponent(l.getAttribute('href'))}`)
    .sort().join('|') || null,
  hrefs: [...new Set([...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')))],
})

function decodeEntities(value) {
  return value == null ? null : value
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'").replace(/&amp;/g, '&')
}

function parseSsrHead(html) {
  const one = (re) => decodeEntities(html.match(re)?.[1] ?? null)
  return {
    robots: one(/<meta name="robots" content="([^"]*)"/),
    canonical: one(/<link rel="canonical" href="([^"]*)"/),
    hreflang: [...html.matchAll(/<link[^>]*rel="alternate"[^>]*>/gi)]
      .map((m) => {
        const lang = m[0].match(/hreflang="([^"]*)"/i)?.[1]
        const href = m[0].match(/href="([^"]*)"/i)?.[1]
        return lang && href ? `${lang}=${decodeURIComponent(decodeEntities(href))}` : null
      }).filter(Boolean).sort().join('|') || null,
    nCanonical: (html.match(/<link rel="canonical"/g) || []).length,
    pageAnchors: new Set([...html.matchAll(/href="([^"]*page=\d+[^"]*)"/g)]
      .map((m) => decodeEntities(m[1]))).size,
  }
}

const sameUrl = (a, b) => {
  if (a == null || b == null) return a === b
  try {
    return decodeURIComponent(a) === decodeURIComponent(b)
  } catch {
    return a === b
  }
}

/** 하이드레이션이 끝나 head 가 더는 바뀌지 않을 때까지 기다렸다가 읽는다. */
async function readSettled(page) {
  await new Promise((r) => setTimeout(r, HYDRATION_SETTLE_MS))
  const first = await page.evaluate(READ_HEAD)
  await new Promise((r) => setTimeout(r, 800))
  const second = await page.evaluate(READ_HEAD)
  return { state: second, stable: JSON.stringify(first) === JSON.stringify(second) }
}

function checkSingular(scope, target, state, { expectCanonical = true } = {}) {
  const counts = [['nTitle', 'title'], ['nDescription', 'description'], ['nRobots', 'robots'], ['nH1', 'h1']]
  if (expectCanonical) counts.push(['nCanonical', 'canonical'])
  for (const [key, label] of counts) {
    if (state[key] !== 1) fail(scope, target, `${label} 태그가 ${state[key]}개 (렌더링 후 정확히 1개여야 함)`)
  }
}

// ── A. SSR ↔ 렌더링 후 ────────────────────────────────────────
async function verifyHydrationParity(page, routes) {
  for (const { path, noindex } of routes) {
    const ssrHtml = await (await fetch(baseUrl + path, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)' },
    })).text()
    const ssr = parseSsrHead(ssrHtml)

    await page.goto(baseUrl + path, { waitUntil: 'networkidle0', timeout: 60_000 })
    const { state, stable } = await readSettled(page)

    if (!stable) fail('하이드레이션', path, 'head 가 계속 바뀐다(안정되지 않음)')
    if (ssr.robots !== state.robots) {
      fail('하이드레이션', path, `robots 가 뒤집힘: SSR="${ssr.robots}" → 렌더="${state.robots}"`)
    }
    if (!sameUrl(ssr.canonical, state.canonical)) {
      fail('하이드레이션', path, `canonical 이 달라짐: SSR="${ssr.canonical}" → 렌더="${state.canonical}"`)
    }
    if (ssr.hreflang !== state.hreflang) {
      fail('하이드레이션', path, `hreflang 이 달라짐: SSR="${ssr.hreflang}" → 렌더="${state.hreflang}"`)
    }
    checkSingular('하이드레이션', path, state, { expectCanonical: ssr.nCanonical > 0 })

    const isNoindex = (state.robots || '').includes('noindex')
    if (noindex !== isNoindex) {
      fail('하이드레이션', path, `색인 정책 불일치: 기대=${noindex ? 'noindex' : 'index'} 실제="${state.robots}"`)
    }

    // 페이지네이션은 렌더링 후에도 앵커로 남아야 한다. 버튼이면 크롤러가 뒤 페이지를 못 본다.
    if (ssr.pageAnchors > 0) {
      const rendered = state.hrefs.filter((h) => /[?&]page=\d+/.test(h)).length
      if (rendered === 0) {
        fail('하이드레이션', path,
          `SSR 에 페이지 앵커가 ${ssr.pageAnchors}개인데 렌더링 후 0개 — 뒤 페이지로 가는 크롤 경로가 사라진다`)
      }
    }
    process.stdout.write('.')
  }
}

// ── B. SPA 내비게이션 ─────────────────────────────────────────
async function verifySpaNavigation(page, hops) {
  for (const [from, to] of hops) {
    await page.goto(baseUrl + to, { waitUntil: 'networkidle0', timeout: 60_000 })
    const direct = await readSettled(page)

    await page.goto(baseUrl + from, { waitUntil: 'networkidle0', timeout: 60_000 })
    const target = decodeURIComponent(to)
    const clicked = await page.evaluate((wanted) => {
      const hit = [...document.querySelectorAll('a[href]')]
        .find((a) => decodeURIComponent(a.getAttribute('href')) === wanted)
      if (!hit) return false
      hit.click()
      return true
    }, target)

    if (!clicked) {
      fail('SPA 이동', `${from} → ${to}`, '출발지 렌더링 DOM 에 도착지 앵커가 없다')
      process.stdout.write('.')
      continue
    }

    await new Promise((r) => setTimeout(r, 400))
    const viaLink = await readSettled(page)
    const url = await page.evaluate(() => location.pathname + location.search)

    if (decodeURIComponent(url) !== target) {
      fail('SPA 이동', `${from} → ${to}`, `이동 결과 URL 이 다르다: ${url}`)
      process.stdout.write('.')
      continue
    }
    if (!viaLink.stable) fail('SPA 이동', `${from} → ${to}`, '이동 후 head 가 안정되지 않는다')
    for (const key of ['robots', 'title', 'description', 'hreflang']) {
      if (direct.state[key] !== viaLink.state[key]) {
        fail('SPA 이동', `${from} → ${to}`,
          `${key} 가 진입 경로에 따라 다르다: 직접="${direct.state[key]}" 링크="${viaLink.state[key]}"`)
      }
    }
    if (!sameUrl(direct.state.canonical, viaLink.state.canonical)) {
      fail('SPA 이동', `${from} → ${to}`,
        `canonical 이 진입 경로에 따라 다르다: 직접="${direct.state.canonical}" 링크="${viaLink.state.canonical}"`)
    }
    checkSingular('SPA 이동', `${from} → ${to}`, viaLink.state,
      { expectCanonical: direct.state.nCanonical > 0 })
    process.stdout.write('.')
  }
}

// ── C. 모바일 우선 색인 ───────────────────────────────────────
async function verifyMobileParity(browser, routes, sections) {
  const mobile = await browser.newPage()
  await mobile.setViewport({ width: 412, height: 915, isMobile: true, hasTouch: true, deviceScaleFactor: 2 })
  await mobile.setUserAgent(
    'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) '
    + 'Chrome/120 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)')
  const desktop = await browser.newPage()
  await desktop.setViewport({ width: 1280, height: 900 })
  await desktop.setUserAgent('Mozilla/5.0 (compatible; Googlebot/2.1)')

  try {
    for (const { path } of routes) {
      await desktop.goto(baseUrl + path, { waitUntil: 'networkidle0', timeout: 60_000 })
      const wide = (await readSettled(desktop)).state
      await mobile.goto(baseUrl + path, { waitUntil: 'networkidle0', timeout: 60_000 })
      const small = (await readSettled(mobile)).state

      if (wide.robots !== small.robots) {
        fail('모바일', path, `robots 가 뷰포트마다 다르다: 데스크톱="${wide.robots}" 모바일="${small.robots}"`)
      }
      if (!sameUrl(wide.canonical, small.canonical)) {
        fail('모바일', path, `canonical 이 뷰포트마다 다르다: 데스크톱="${wide.canonical}" 모바일="${small.canonical}"`)
      }
      checkSingular('모바일', path, small, { expectCanonical: wide.nCanonical > 0 })

      // 구글은 모바일 렌더링 결과로 색인한다. 섹션 링크가 모바일에서만 빠지면 그쪽이 실제 크롤 그래프다.
      // 라우터 basename 이 로케일을 담당하므로 /en 문서의 링크는 /en/... 으로 나온다.
      const localePrefix = path.startsWith('/en') ? '/en' : '/ko'
      const missing = sections
        .map((s) => s.replace(/^\/(ko|en)/, localePrefix))
        .filter((s) => !small.hrefs.includes(s))
      if (missing.length) {
        fail('모바일', path, `모바일 DOM 에 섹션 링크 누락: ${missing.join(', ')}`)
      }
      process.stdout.write('.')
    }
  } finally {
    await mobile.close()
    await desktop.close()
  }
}

// ── 실행 ─────────────────────────────────────────────────────
async function main() {
  const fx = await discoverFixtures()
  if (!fx.spiritPath) throw new Error(`${baseUrl}: 주류 데이터를 찾지 못했다 — 서버와 API 프록시를 확인할 것`)

  const routes = [
    { path: '/ko', noindex: false },
    { path: '/en', noindex: false },
    { path: '/ko/spirits', noindex: false },
    { path: '/ko/spirits?category=WHISKY', noindex: false },
    { path: fx.spiritPath, noindex: false },
    { path: '/ko/community/all', noindex: false },
    { path: '/ko/community/free', noindex: false },
    { path: '/ko/community/photo', noindex: false },
    { path: '/ko/community/byob', noindex: false },
    { path: '/ko/notices', noindex: false },
    { path: '/ko/tier-lists', noindex: false },
    // 색인에서 빼기로 한 파라미터들 — 렌더링 후에도 noindex 가 유지되어야 한다.
    { path: '/ko/spirits?page=0', noindex: true },
    { path: '/ko/community/photo?spirit=1', noindex: true },
    { path: '/ko/community/photo?q=test', noindex: true },
    { path: '/ko/community/photo?post=1', noindex: true },
    { path: '/ko/community/free?keyword=x', noindex: true },
    { path: '/ko/community/free?sort=BEST', noindex: true },
    { path: '/ko/login', noindex: true },
  ]
  if (fx.spiritTotalPages > 1) routes.push({ path: '/ko/spirits?page=1', noindex: false })
  if (fx.freePostId) routes.push({ path: `/ko/community/free/${fx.freePostId}`, noindex: false })
  if (fx.photoPostId) routes.push({ path: `/ko/community/photo/${fx.photoPostId}`, noindex: false })
  if (fx.noticeId) routes.push({ path: `/ko/notices/${fx.noticeId}`, noindex: false })

  const hops = [
    ['/ko', '/ko/spirits'],
    ['/ko/community/free', '/ko/community/photo'],
    ['/ko/community/free', '/ko/community/byob'],
    ['/ko/spirits', '/ko/community/photo'],
  ]
  if (fx.spiritTotalPages > 1) {
    hops.push(['/ko/spirits', '/ko/spirits?page=1'], ['/ko/spirits?page=1', '/ko/spirits'])
  }
  if (fx.noticeId) hops.push(['/ko/notices', `/ko/notices/${fx.noticeId}`])

  // GNB 드롭다운 안에만 있던 섹션들 — 렌더링 DOM 에 남아 있지 않으면 sitemap 외 유입 경로가 없다.
  const sections = [
    '/ko/spirits', '/ko/community/all', '/ko/community/free',
    '/ko/community/photo', '/ko/community/byob', '/ko/notices',
  ]

  const browser = await puppeteer.launch({
    headless: true,
    pipe: true,
    args: browserNoSandbox ? ['--no-sandbox', '--disable-gpu'] : [],
  })
  try {
    const page = await browser.newPage()
    await page.setUserAgent('Mozilla/5.0 (compatible; Googlebot/2.1)')
    process.stdout.write(`SSR ↔ 렌더링 (${routes.length}) `)
    await verifyHydrationParity(page, routes)
    process.stdout.write(`\nSPA 이동 (${hops.length}) `)
    await verifySpaNavigation(page, hops)
    await page.close()
    process.stdout.write(`\n모바일 우선 색인 (${routes.length}) `)
    await verifyMobileParity(browser, routes, sections)
    process.stdout.write('\n')
  } finally {
    await browser.close()
  }

  if (failures.length) {
    console.error(`\n렌더링 SEO 검증 실패 ${failures.length}건:\n`)
    for (const f of failures) console.error(f)
    process.exitCode = 1
    return
  }
  console.log(`\n렌더링 SEO 검증 통과: ${baseUrl}`)
  console.log(`  경로 ${routes.length} · SPA 이동 ${hops.length}구간 · 모바일 ${routes.length}`)
}

await main()
