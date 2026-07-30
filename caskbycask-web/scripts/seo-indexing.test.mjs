// 라우트별 색인 정책 회귀 테스트.
//
// 검증 목적:
//   · 공개 경로가 실수로 noindex 되지 않는지
//   · 비공개·작성·관리 경로가 실수로 색인 가능해지지 않는지
//   · canonical 과 hreflang 이 각각 정확히 1개이며 sitemap 이 내보내는 URL 과 같은지
//   · 검색·정렬·페이지 등 파라미터 URL 이 noindex + 기본 경로 canonical 인지
//
// 백엔드 API 를 의도적으로 죽은 포트로 지정한다. 따라서 이 테스트는
// "API 장애 중에도 색인 정책의 기본값이 안전한가"까지 함께 검증한다.
// (장애 시 공개 경로가 noindex 로 뒤집히면 색인이 통째로 빠지므로 회귀를 막아야 한다)
//
// 실행: npm run build 후 `npm run test:seo-indexing`
import { spawn } from 'node:child_process'
import { rm } from 'node:fs/promises'
import test from 'node:test'
import assert from 'node:assert/strict'

const WEB_PORT = Number(process.env.SEO_INDEXING_TEST_PORT || 3126)
const DEAD_API_PORT = Number(process.env.SEO_INDEXING_DEAD_API_PORT || 8098)
const BASE = `http://127.0.0.1:${WEB_PORT}`
const SITE = 'https://www.caskbycask.net'

/** 언어별 self-canonical + 양방향 hreflang 을 갖는 공개 경로. */
function multilingual(path) {
  return {
    robots: 'index, follow',
    canonical: `${SITE}${path}`,
    hreflang: {
      ko: `${SITE}${path.replace(/^\/en/, '/ko')}`,
      en: `${SITE}${path.replace(/^\/ko/, '/en')}`,
      xDefault: `${SITE}${path.replace(/^\/en/, '/ko')}`,
    },
  }
}

/** 한국어 원문으로 신호를 통합하는 경로. 영문판이 없으므로 hreflang 을 내보내지 않는다. */
function koreanOnly(canonicalPath, { noindex = false } = {}) {
  return {
    robots: noindex ? 'noindex, follow' : 'index, follow',
    canonical: `${SITE}${canonicalPath}`,
    hreflang: null,
  }
}

/** 비공개·작성·관리 경로. canonical 을 선언하지 않고 noindex 로만 응답한다. */
const PRIVATE = { robots: 'noindex, follow', canonical: null, hreflang: null }

const CASES = [
  // ── 공개 다국어 경로 ────────────────────────────────────────
  ['/ko', multilingual('/ko')],
  ['/en', multilingual('/en')],
  ['/ko/terms', multilingual('/ko/terms')],
  ['/en/terms', multilingual('/en/terms')],
  ['/ko/faq', multilingual('/ko/faq')],
  ['/ko/ranking', multilingual('/ko/ranking')],
  ['/ko/calendar', multilingual('/ko/calendar')],
  ['/ko/taste-trees', multilingual('/ko/taste-trees')],
  ['/ko/price-tracker', multilingual('/ko/price-tracker')],
  ['/ko/spirits', multilingual('/ko/spirits')],
  ['/en/spirits', multilingual('/en/spirits')],
  ['/ko/tier-lists', multilingual('/ko/tier-lists')],
  ['/en/tier-lists', multilingual('/en/tier-lists')],

  // 카테고리는 sitemap 에 등재된 실제 facet 이므로 쿼리를 포함한 self-canonical 을 유지한다.
  ['/ko/spirits?category=WHISKY', multilingual('/ko/spirits?category=WHISKY')],

  // 티어리스트 소유자 편집 뷰는 기본 경로로 신호를 모으고 색인에서 제외한다.
  ['/ko/tier-lists?id=999', {
    robots: 'noindex, follow',
    canonical: `${SITE}/ko/tier-lists`,
    hreflang: {
      ko: `${SITE}/ko/tier-lists`,
      en: `${SITE}/en/tier-lists`,
      xDefault: `${SITE}/ko/tier-lists`,
    },
  }],

  // ── 게시판: 한국어 원문으로 통합 ─────────────────────────────
  ['/ko/community/all', koreanOnly('/ko/community/all')],
  ['/ko/community/free', koreanOnly('/ko/community/free')],
  ['/ko/community/notice', koreanOnly('/ko/community/notice')],
  ['/ko/community/byob', koreanOnly('/ko/community/byob')],
  ['/ko/notices', koreanOnly('/ko/notices')],
  // 영문 진입도 200 이지만 canonical 은 한국어 원문을 가리킨다.
  ['/en/community/free', koreanOnly('/ko/community/free')],
  ['/en/notices', koreanOnly('/ko/notices')],

  // 검색·정렬·페이지 파라미터는 색인에서 제외하고 기본 경로로 신호를 모은다.
  ['/ko/community/free?sort=BEST', koreanOnly('/ko/community/free', { noindex: true })],
  ['/ko/community/free?prefix=1', koreanOnly('/ko/community/free', { noindex: true })],
  ['/ko/community/free?keyword=test', koreanOnly('/ko/community/free', { noindex: true })],
  ['/ko/community/free?page=1', koreanOnly('/ko/community/free', { noindex: true })],
  ['/ko/notices?page=1', koreanOnly('/ko/notices', { noindex: true })],
  ['/ko/notices?category=EVENT', koreanOnly('/ko/notices', { noindex: true })],
  ['/ko/community/byob?status=OPEN', koreanOnly('/ko/community/byob', { noindex: true })],

  // ── 비공개·작성·관리 경로 ───────────────────────────────────
  ['/ko/mypage', PRIVATE],
  ['/ko/login', PRIVATE],
  ['/ko/signup', PRIVATE],
  ['/ko/account-recovery', PRIVATE],
  ['/ko/notifications', PRIVATE],
  ['/ko/inquiry', PRIVATE],
  ['/ko/taste-trees/new', PRIVATE],
  ['/ko/taste-trees/mine', PRIVATE],
  ['/ko/price-tracker/register', PRIVATE],
  ['/ko/request/spirit', PRIVATE],
  ['/ko/request/producer', PRIVATE],
  ['/ko/community/free/write', PRIVATE],
  ['/ko/admin', PRIVATE],
  ['/ko/admin/users', PRIVATE],
]

/** 존재하지 않는 경로는 soft 404 가 아니라 실제 404 여야 한다. */
const NOT_FOUND_PATHS = [
  '/ko/spirits/abc',
  '/ko/admin/no-such-page',
  '/ko/community/nope',
  '/ko/notices/abc',
]

function startWebServer() {
  return spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', String(WEB_PORT)], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      // 죽은 포트를 향하게 해 API 응답에 의존하지 않는 결정적 결과를 얻는다.
      INTERNAL_API_URL: `http://127.0.0.1:${DEAD_API_PORT}`,
      NEXT_PUBLIC_API_URL: `http://127.0.0.1:${DEAD_API_PORT}`,
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

function attr(tag, name) {
  return tag.match(new RegExp(`\\b${name}=["']([^"']*)["']`, 'i'))?.[1] ?? null
}

async function readHead(path) {
  const res = await fetch(`${BASE}${path}`, { redirect: 'manual' })
  const html = await res.text()
  const tags = [...html.matchAll(/<(?:link|meta)\b[^>]*>/gi)].map((match) => match[0])

  const links = (rel, hrefLang) => tags
    .filter((tag) => tag.toLowerCase().startsWith('<link')
      && attr(tag, 'rel')?.toLowerCase() === rel
      && (hrefLang ? attr(tag, 'hreflang') === hrefLang : !/hreflang=/i.test(tag)))
    .map((tag) => attr(tag, 'href'))

  return {
    status: res.status,
    titleCount: [...html.matchAll(/<title\b/gi)].length,
    h1Count: [...html.matchAll(/<h1\b/gi)].length,
    internalHrefs: [...new Set(
      [...html.matchAll(/href="(\/(?:ko|en)[^"]*)"/gi)].map((match) => match[1]),
    )],
    descriptionCount: tags
      .filter((tag) => tag.toLowerCase().startsWith('<meta') && attr(tag, 'name')?.toLowerCase() === 'description')
      .length,
    robots: tags
      .filter((tag) => tag.toLowerCase().startsWith('<meta') && attr(tag, 'name')?.toLowerCase() === 'robots')
      .map((tag) => attr(tag, 'content')),
    canonical: links('canonical'),
    hreflangKo: links('alternate', 'ko'),
    hreflangEn: links('alternate', 'en'),
    hreflangDefault: links('alternate', 'x-default'),
  }
}

test('라우트별 색인 정책', async (t) => {
  // ISR fetch 캐시에 다른 테스트의 응답이 남아 있으면 결과가 흔들린다.
  await rm('.next/cache/fetch-cache', { recursive: true, force: true })

  const web = startWebServer()
  let webLog = ''
  web.stdout.on('data', (chunk) => { webLog += chunk.toString() })
  web.stderr.on('data', (chunk) => { webLog += chunk.toString() })
  t.after(() => web.kill('SIGTERM'))

  assert.ok(await waitForWeb(), `Next.js 서버 기동 실패:\n${webLog.slice(-2000)}`)

  for (const [path, expected] of CASES) {
    await t.test(path, async () => {
      const head = await readHead(path)
      assert.equal(head.status, 200, `${path}: 200 이어야 한다`)

      // 중복 태그는 검색엔진이 신호를 해석하지 못하게 만든다.
      assert.equal(head.titleCount, 1, `${path}: title 은 정확히 1개`)
      assert.equal(head.descriptionCount, 1, `${path}: description 은 정확히 1개`)
      assert.deepEqual(head.robots, [expected.robots], `${path}: robots 불일치`)

      assert.deepEqual(
        head.canonical,
        expected.canonical ? [expected.canonical] : [],
        `${path}: canonical 불일치`,
      )

      if (expected.hreflang) {
        assert.deepEqual(head.hreflangKo, [expected.hreflang.ko], `${path}: ko hreflang 불일치`)
        assert.deepEqual(head.hreflangEn, [expected.hreflang.en], `${path}: en hreflang 불일치`)
        assert.deepEqual(head.hreflangDefault, [expected.hreflang.xDefault], `${path}: x-default 불일치`)
      } else {
        // 영문판이 없는 경로에 hreflang 을 내보내면 상호 참조가 깨진 잘못된 신호가 된다.
        assert.deepEqual(head.hreflangKo, [], `${path}: hreflang 을 내보내지 않아야 한다`)
        assert.deepEqual(head.hreflangEn, [], `${path}: hreflang 을 내보내지 않아야 한다`)
        assert.deepEqual(head.hreflangDefault, [], `${path}: hreflang 을 내보내지 않아야 한다`)
      }
    })
  }

  await t.test('존재하지 않는 경로는 404', async () => {
    for (const path of NOT_FOUND_PATHS) {
      const res = await fetch(`${BASE}${path}`, { redirect: 'manual' })
      await res.arrayBuffer().catch(() => undefined)
      assert.equal(res.status, 404, `${path}: soft 404 가 아니라 404 여야 한다`)
    }
  })

  // SEO snapshot 을 제공하는 경로는 JS 실행 없이도 단일 H1 을 가져야 한다.
  // H1 이 0개면 크롤러가 주제를 파악할 수 없고, 2개 이상이면 주제가 흐려진다.
  await t.test('snapshot 경로는 raw HTML 에 H1 이 정확히 1개', async () => {
    for (const path of [
      '/ko', '/en',
      '/ko/spirits', '/en/spirits',
      '/ko/tier-lists', '/en/tier-lists',
      '/ko/community/all', '/ko/community/free', '/ko/community/notice', '/ko/community/byob',
      '/ko/notices',
    ]) {
      const head = await readHead(path)
      assert.equal(head.h1Count, 1, `${path}: H1 은 정확히 1개여야 한다 (실제 ${head.h1Count})`)
    }
  })

  // 홈은 링크 권위가 가장 높은 페이지다. 서버 HTML 에 주류 경로 링크가 없으면
  // JS 를 실행하지 않는 크롤러가 홈에서 주류 상세로 내려갈 경로를 찾지 못한다.
  await t.test('홈 raw HTML 은 주류 경로로 내부 링크를 제공한다', async () => {
    const home = await readHead('/ko')
    assert.ok(home.internalHrefs.includes('/ko/spirits'), '주류 전체 목록 링크가 있어야 한다')
    for (const category of ['WHISKY', 'WINE', 'COGNAC', 'OTHER']) {
      assert.ok(
        home.internalHrefs.includes(`/ko/spirits?category=${category}`),
        `${category} 카테고리 링크가 있어야 한다`,
      )
    }
    // 게시판·공지는 한국어 원문으로 신호를 통합하므로 영문 홈에서도 /ko 를 가리킨다.
    const homeEn = await readHead('/en')
    assert.ok(homeEn.internalHrefs.includes('/ko/community/all'), '커뮤니티 링크가 있어야 한다')
    assert.ok(homeEn.internalHrefs.includes('/ko/notices'), '공지 링크가 있어야 한다')
    assert.ok(homeEn.internalHrefs.includes('/en/spirits'), '영문 홈은 영문 주류 목록을 가리킨다')
  })

  // 엔티티 조회가 실패하면 라우트 기본 metadata 로 되돌아가야 한다.
  // 장애 중 noindex 로 뒤집히면 색인이 빠지고, canonical 이 사라지면 신호가 흩어진다.
  await t.test('API 장애 시 엔티티 경로는 라우트 기본값으로 폴백하고 색인을 유지한다', async () => {
    for (const [path, canonical] of [
      ['/ko/producers/7', `${SITE}/ko/producers/7`],
      ['/ko/users/5/bottles', `${SITE}/ko/users/5/bottles`],
      ['/ko/taste-trees/t/abc123', `${SITE}/ko/taste-trees/t/abc123`],
    ]) {
      const head = await readHead(path)
      assert.equal(head.status, 200, `${path}: 장애 중에도 200 이어야 한다`)
      assert.deepEqual(head.robots, ['index, follow'], `${path}: 장애로 noindex 가 되면 안 된다`)
      assert.deepEqual(head.canonical, [canonical], `${path}: self-canonical 을 유지해야 한다`)
    }
  })

  // HTML meta 와 X-Robots-Tag 헤더는 같은 판정을 내려야 한다.
  // 헤더 패턴이 과도하게 넓어지면 공개 경로가 색인에서 빠지므로 양방향으로 검증한다.
  await t.test('X-Robots-Tag 헤더가 meta noindex 와 일치한다', async () => {
    const header = async (path) => {
      const res = await fetch(`${BASE}${path}`, { redirect: 'manual' })
      await res.arrayBuffer().catch(() => undefined)
      return res.headers.get('x-robots-tag')
    }

    for (const path of [
      '/ko/mypage', '/ko/login', '/ko/signup', '/ko/notifications',
      '/ko/taste-trees/new', '/ko/taste-trees/mine', '/ko/price-tracker/register',
      '/ko/request/spirit', '/ko/community/free/write', '/ko/admin',
    ]) {
      assert.equal(await header(path), 'noindex, nofollow', `${path}: noindex 헤더가 있어야 한다`)
    }

    for (const path of [
      '/ko', '/ko/spirits', '/ko/tier-lists',
      '/ko/taste-trees', '/ko/price-tracker',
      '/ko/community/free', '/ko/notices',
    ]) {
      assert.equal(await header(path), null, `${path}: 공개 경로에 noindex 헤더가 붙으면 안 된다`)
    }
  })
})
