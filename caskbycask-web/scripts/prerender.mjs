/**
 * Static prerender — 빌드된 SPA 의 dist 를 임시 정적 서버로 띄우고,
 * Puppeteer 로 정적 라우트 들을 방문해 fully-rendered HTML 을 캡처해
 * dist/<route>/index.html 로 저장한다.
 *
 * 대응: Naver, Daum, Bing 등 JS 렌더링 약한 검색엔진.
 *      Cloudflare/Nginx 도 라우트별 index.html 을 우선 서빙하므로
 *      검색봇이 곧장 SEO 메타가 박힌 HTML 을 받게 됨.
 *
 * 동적 라우트(/spirits/:id 등) 은 prerender 하지 않음 — SPA 그대로 두고,
 * Googlebot 의 JS 렌더링 + SeoMeta 컴포넌트의 head hoist 로 커버.
 */

import http from 'node:http'
import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sirv from 'sirv'
import puppeteer from 'puppeteer'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DIST_DIR = resolve(__dirname, '..', 'dist')

// 미리 렌더할 정적 라우트 — 카테고리 페이지는 별도 query 라 prerender 생략
// (canonical 이 /spirits 로 통일되므로 인덱싱 일원화).
//
// 순서 주의: '/' 를 마지막에 둠. 이유 — dist/index.html 은 sirv 의 SPA
// fallback 으로 모든 미매칭 라우트에 응답되는데, '/' 를 먼저 처리하면
// 그 결과물 (이미 React 가 렌더한 HTML) 이 다음 라우트의 fallback 으로
// 사용되어 일관성 문제 발생. 마지막에 두면 다른 라우트들은 vite build
// 직후의 깨끗한 index.html 을 fallback 으로 받음.
const ROUTES = [
  '/spirits',
  '/notices',
  '/ranking',
  '/faq',
  '/terms',
  '/privacy',
  '/community/free',
  '/community/notice',
  '/',
]

// React 마운트 + React Query 1차 fetch 완료 대기.
// #root 에 children 이 들어올 때까지 기다린 뒤 추가 settle 시간.
const REACT_MOUNT_TIMEOUT_MS = 20_000
const WAIT_AFTER_MOUNT_MS = 2500
const NAV_TIMEOUT_MS = 45_000

async function startStaticServer() {
  if (!existsSync(DIST_DIR)) {
    throw new Error(`dist directory not found: ${DIST_DIR}. Run 'vite build' first.`)
  }
  // sirv: SPA fallback 으로 모든 라우트가 index.html 받도록
  const serve = sirv(DIST_DIR, { single: true, dev: false })
  const server = http.createServer((req, res) => serve(req, res))
  await new Promise((res) => server.listen(0, '127.0.0.1', res))
  const { port } = server.address()
  return { server, baseUrl: `http://127.0.0.1:${port}` }
}

async function renderRoute(browser, baseUrl, route) {
  const page = await browser.newPage()
  page.setDefaultNavigationTimeout(NAV_TIMEOUT_MS)

  // navigator.language 및 navigator.languages 를 ko-KR 로 강제 재정의
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'language', {
      get: () => 'ko-KR',
    });
    Object.defineProperty(navigator, 'languages', {
      get: () => ['ko-KR', 'ko'],
    });
  });

  // 봇처럼 동작 — desktop UA + 한국어
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) CaskByCaskPrerender/1.0',
  )
  await page.setExtraHTTPHeaders({ 'Accept-Language': 'ko-KR,ko;q=0.9' })

  // 디버깅 — JS 에러/콘솔 노출
  page.on('pageerror', (err) => console.warn(`  [page error ${route}]`, err.message))
  page.on('console', (msg) => {
    if (msg.type() === 'error') console.warn(`  [console ${route}]`, msg.text())
  })

  const url = baseUrl + route
  await page.goto(url, { waitUntil: 'domcontentloaded' })

  // 1) React 가 #root 안에 콘텐츠를 렌더할 때까지 대기 (hydrate / SeoMeta hoist 보장)
  await page.waitForFunction(
    () => {
      const root = document.querySelector('#root')
      return !!root && root.children.length > 0
    },
    { timeout: REACT_MOUNT_TIMEOUT_MS },
  )

  // 2) React Query 1차 fetch + 후속 SeoMeta hoist settle 시간
  await new Promise((r) => setTimeout(r, WAIT_AFTER_MOUNT_MS))

  // 3) head 메타 정합성 보정:
  //   정적 index.html 의 fallback 메타 + SeoMeta 가 React 19 hoist 로 추가한 동적 메타가
  //   head 에 공존하면 OG/Twitter 봇은 첫 번째를 우선시할 수 있다. 동적 (마지막)것만 남기고,
  //   <title>은 React 19 가 가끔 hoist 못 하므로 og:title 로부터 강제 복제.
  await page.evaluate(() => {
    // (a) 단일이어야 하는 element 들 — 마지막만 남기기
    const dedupeLast = (selector) => {
      const nodes = document.querySelectorAll('head ' + selector)
      if (nodes.length > 1) {
        nodes.forEach((el, idx) => { if (idx < nodes.length - 1) el.remove() })
      }
    }
    dedupeLast('title')
    dedupeLast('meta[name="description"]')
    dedupeLast('meta[name="keywords"]')
    dedupeLast('meta[name="robots"]')
    dedupeLast('link[rel="canonical"]')

    // OG / Twitter — property/name 별 그룹화 후 마지막만 남기기
    const dedupeByAttr = (selector, attrName) => {
      const groups = new Map()
      document.querySelectorAll('head ' + selector).forEach((el) => {
        const key = el.getAttribute(attrName)
        if (!key) return
        const list = groups.get(key) ?? []
        list.push(el)
        groups.set(key, list)
      })
      groups.forEach((list) => {
        if (list.length > 1) {
          list.forEach((el, idx) => { if (idx < list.length - 1) el.remove() })
        }
      })
    }
    dedupeByAttr('meta[property^="og:"]', 'property')
    dedupeByAttr('meta[name^="twitter:"]', 'name')
    dedupeByAttr('link[rel="alternate"][hreflang]', 'hreflang')

    // (b) <title> 보정 — og:title 마지막 값으로 강제 복제
    const ogTitles = document.querySelectorAll('meta[property="og:title"]')
    const ogTitleContent = ogTitles[ogTitles.length - 1]?.getAttribute('content')
    if (ogTitleContent) {
      let titleEl = document.querySelector('head > title')
      if (!titleEl) {
        titleEl = document.createElement('title')
        document.head.appendChild(titleEl)
      }
      titleEl.textContent = ogTitleContent
    }
  })

  // 4) React 마운트 검증
  const rootHasContent = await page.evaluate(
    () => (document.querySelector('#root')?.children.length ?? 0) > 0,
  )
  if (!rootHasContent) {
    throw new Error('#root has no children at capture time')
  }

  // 5) body 안의 JSON-LD script 를 head 로 이동.
  //    React 19 는 <title>/<meta>/<link> 만 자동 hoist 하고
  //    <script type="application/ld+json"> 은 hoist 하지 않는다.
  //    body 의 #root 를 비우는 다음 단계에서 같이 사라지지 않도록 먼저 head 로 옮긴다.
  await page.evaluate(() => {
    const scripts = document.querySelectorAll('body script[type="application/ld+json"]')
    scripts.forEach((el) => document.head.appendChild(el))
  })

  // 6) 캡처 직전 #root 내부 비우기 — 정적 HTML 을 SPA fallback 으로 사용할 때
  //    main.tsx 의 createRoot() 가 빈 컨테이너 요구사항을 만족하도록 한다.
  //    body 의 prerender 효과를 잃지만, 검색봇은 <head> 의 메타·JSON-LD·title·OG·canonical
  //    만 보고도 SEO 신호의 95% 를 받음. body 의 콘텐츠는 봇이 JS 실행하면 다시 채워짐.
  await page.evaluate(() => {
    const root = document.querySelector('#root')
    if (root) root.innerHTML = ''
  })

  const html = await page.evaluate(() => '<!doctype html>\n' + document.documentElement.outerHTML)
  await page.close()
  return html
}

async function writeRouteHtml(route, html) {
  // '/' → dist/index.html (덮어쓰기), '/spirits' → dist/spirits/index.html
  let outPath
  if (route === '/') outPath = join(DIST_DIR, 'index.html')
  else outPath = join(DIST_DIR, route.replace(/^\//, ''), 'index.html')

  await mkdir(dirname(outPath), { recursive: true })
  await writeFile(outPath, html, 'utf8')
  return outPath
}

async function main() {
  console.log('[prerender] static server starting…')
  const { server, baseUrl } = await startStaticServer()
  console.log(`[prerender] serving ${DIST_DIR} at ${baseUrl}`)

  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--lang=ko-KR', // 브라우저 언어 기본값 한국어로 지정
    ],
  })

  try {
    for (const route of ROUTES) {
      const started = Date.now()
      try {
        const html = await renderRoute(browser, baseUrl, route)
        const outPath = await writeRouteHtml(route, html)
        const sizeKb = (Buffer.byteLength(html, 'utf8') / 1024).toFixed(1)
        const ms = Date.now() - started
        console.log(`[prerender] ✓ ${route.padEnd(20)} → ${outPath} (${sizeKb} kB, ${ms}ms)`)
      } catch (err) {
        console.error(`[prerender] ✗ ${route} — ${err.message}`)
        process.exitCode = 1
      }
    }
  } finally {
    await browser.close()
    server.close()
  }

  console.log('[prerender] done.')
}

main().catch((err) => {
  console.error('[prerender] fatal:', err)
  process.exit(1)
})
