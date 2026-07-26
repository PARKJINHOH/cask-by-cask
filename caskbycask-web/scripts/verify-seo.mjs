const baseUrl = (process.env.SEO_VERIFY_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '')
const canonicalOrigin = (process.env.SEO_VERIFY_CANONICAL_ORIGIN
  || (baseUrl.includes('localhost') ? 'https://www.caskbycask.net' : baseUrl)).replace(/\/+$/, '')
const verifyAllSitemapUrls = process.env.SEO_VERIFY_ALL_URLS === 'true'
const verifyBrowser = process.env.SEO_VERIFY_BROWSER !== 'false'
const browserNoSandbox = process.env.SEO_VERIFY_BROWSER_NO_SANDBOX === 'true'
const sitemapRequestDelayMs = process.env.SEO_VERIFY_REQUEST_DELAY_MS === undefined
  ? (verifyAllSitemapUrls ? 1000 : 0)
  : Number(process.env.SEO_VERIFY_REQUEST_DELAY_MS)
const representativeSpiritIds = (process.env.SEO_VERIFY_SPIRIT_IDS || '295,296,309')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean)
const representativeReviewId = (process.env.SEO_VERIFY_REVIEW_ID || '11').trim()
const boardSeoCases = [
  {
    path: '/ko/community/free',
    canonical: '/ko/community/free',
    noindex: false,
    blockedClientApiPath: '/api/posts',
    requireItemList: true,
  },
  { path: '/ko/community/free?sort=BEST', canonical: '/ko/community/free', noindex: true },
  { path: '/ko/community/free?prefix=1', canonical: '/ko/community/free', noindex: true },
  { path: '/ko/notices?page=1', canonical: '/ko/notices', noindex: true },
  { path: '/ko/community/byob?page=00', canonical: '/ko/community/byob', noindex: true },
]
const tierListSeoCases = [
  {
    path: '/ko/tier-lists',
    canonical: '/ko/tier-lists',
    noindex: false,
    alternateKo: '/ko/tier-lists',
    alternateEn: '/en/tier-lists',
  },
  {
    path: '/en/tier-lists',
    canonical: '/en/tier-lists',
    noindex: false,
    alternateKo: '/ko/tier-lists',
    alternateEn: '/en/tier-lists',
  },
  {
    path: '/ko/tier-lists?id=9223372036854775807',
    canonical: '/ko/tier-lists',
    noindex: true,
    alternateKo: '/ko/tier-lists',
    alternateEn: '/en/tier-lists',
  },
]

function invariant(condition, message) {
  if (!condition) throw new Error(message)
}

invariant(Number.isFinite(sitemapRequestDelayMs) && sitemapRequestDelayMs >= 0,
  'SEO_VERIFY_REQUEST_DELAY_MS must be a non-negative number')

function delay(ms) {
  return ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve()
}

function count(html, pattern) {
  return [...html.matchAll(pattern)].length
}

function attr(tag, name) {
  return tag.match(new RegExp(`\\b${name}=["']([^"']+)["']`, 'i'))?.[1] || null
}

function canonicalOf(html) {
  const tags = [...html.matchAll(/<link\b[^>]*>/gi)].map((match) => match[0])
  const tag = tags.find((candidate) => attr(candidate, 'rel')?.toLowerCase() === 'canonical')
  return tag ? attr(tag, 'href') : null
}

function robotsOf(html) {
  const tags = [...html.matchAll(/<meta\b[^>]*>/gi)].map((match) => match[0])
  const tag = tags.find((candidate) => attr(candidate, 'name')?.toLowerCase() === 'robots')
  return tag ? attr(tag, 'content') || '' : ''
}

function alternateOf(html, hrefLang) {
  const tags = [...html.matchAll(/<link\b[^>]*>/gi)].map((match) => match[0])
  const tag = tags.find((candidate) => attr(candidate, 'rel')?.toLowerCase() === 'alternate'
    && attr(candidate, 'hreflang')?.toLowerCase() === hrefLang.toLowerCase())
  return tag ? attr(tag, 'href') : null
}

function sameUrl(actual, expected) {
  if (!actual || !expected) return false
  try {
    return new URL(decodeXml(actual), canonicalOrigin).href === new URL(expected, canonicalOrigin).href
  } catch {
    return false
  }
}

async function get(path, redirect = 'follow') {
  const response = await fetch(`${baseUrl}${path}`, {
    redirect,
    headers: { 'User-Agent': 'CaskByCask-SEO-Release-Check/1.0' },
  })
  return { response, body: await response.text() }
}

async function verifyHtml(path, {
  canonical,
  noindex = false,
  h1 = true,
  jsonLd = true,
  alternateKo,
  alternateEn,
} = {}) {
  const { response, body } = await get(path)
  invariant(response.status === 200, `${path}: expected 200, got ${response.status}`)
  invariant(count(body, /<title\b/gi) === 1, `${path}: title must appear exactly once`)
  invariant(count(body, /<meta\b[^>]*\bname=["']description["']/gi) === 1,
    `${path}: description must appear exactly once`)
  invariant(count(body, /<meta\b[^>]*\bname=["']robots["']/gi) === 1,
    `${path}: robots must appear exactly once`)
  invariant(count(body, /<link\b[^>]*\brel=["']canonical["']/gi) === 1,
    `${path}: canonical must appear exactly once`)
  if (canonical) invariant(sameUrl(canonicalOf(body), `${canonicalOrigin}${canonical}`),
    `${path}: unexpected canonical ${canonicalOf(body)}`)
  if (alternateKo) invariant(sameUrl(alternateOf(body, 'ko'), `${canonicalOrigin}${alternateKo}`),
    `${path}: unexpected ko alternate ${alternateOf(body, 'ko')}`)
  if (alternateEn) invariant(sameUrl(alternateOf(body, 'en'), `${canonicalOrigin}${alternateEn}`),
    `${path}: unexpected en alternate ${alternateOf(body, 'en')}`)
  if (alternateKo) invariant(sameUrl(alternateOf(body, 'x-default'), `${canonicalOrigin}${alternateKo}`),
    `${path}: unexpected x-default alternate ${alternateOf(body, 'x-default')}`)
  invariant(noindex === /noindex/i.test(robotsOf(body)), `${path}: unexpected robots ${robotsOf(body)}`)
  if (h1) invariant(count(body, /<h1\b/gi) === 1, `${path}: H1 must appear exactly once`)
  if (jsonLd) invariant(count(body, /<script\b[^>]*data-cbc-route-jsonld=["']true["']/gi) === 1,
    `${path}: route JSON-LD must appear exactly once`)
}

async function verifyMissingRoute(path) {
  const { response, body } = await get(path, 'manual')
  invariant(response.status === 404, `${path}: expected 404, got ${response.status}`)
  invariant(count(body, /<meta\b[^>]*\bname=["']robots["']/gi) === 1,
    `${path}: 404 response must have exactly one robots meta`)
  invariant(/noindex/i.test(robotsOf(body)), `${path}: 404 response must be noindex`)
}

async function verifyNoindexAppRoute(path) {
  const { response, body } = await get(path)
  invariant(response.status === 200, `${path}: expected app shell 200, got ${response.status}`)
  invariant(/noindex/i.test(robotsOf(body)), `${path}: app route must be noindex`)
}

function decodeXml(value) {
  return value.replaceAll('&amp;', '&').replaceAll('&lt;', '<').replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"').replaceAll('&apos;', "'")
}

function locs(xml) {
  return [...xml.matchAll(/<loc>(.*?)<\/loc>/gis)].map((match) => decodeXml(match[1].trim()))
}

function throughTarget(url) {
  const parsed = new URL(url)
  return `${baseUrl}${parsed.pathname}${parsed.search}`
}

async function verifySitemaps() {
  const { response, body } = await get('/sitemap.xml')
  invariant(response.status === 200, `/sitemap.xml: expected 200, got ${response.status}`)
  invariant(/<sitemapindex\b/i.test(body), '/sitemap.xml: root must be sitemapindex')
  invariant(response.headers.get('etag'), '/sitemap.xml: ETag is missing')
  invariant(/max-age/i.test(response.headers.get('cache-control') || ''),
    '/sitemap.xml: Cache-Control max-age is missing')
  const rootHead = await fetch(`${baseUrl}/sitemap.xml`, { method: 'HEAD', redirect: 'manual' })
  invariant(rootHead.status === 200, `/sitemap.xml: HEAD expected 200, got ${rootHead.status}`)
  invariant(rootHead.headers.get('etag'), '/sitemap.xml: HEAD ETag is missing')
  const childSitemaps = locs(body)
  invariant(childSitemaps.length > 0, '/sitemap.xml: no child sitemap found')
  invariant(new Set(childSitemaps).size === childSitemaps.length,
    '/sitemap.xml: duplicate child sitemap found')
  invariant(childSitemaps.every((url) => !/[^\x00-\x7F]/.test(url)),
    '/sitemap.xml: child sitemap URLs must be ASCII percent-encoded')

  const urls = []
  for (const child of childSitemaps) {
    invariant(child.startsWith(`${canonicalOrigin}/sitemaps/`), `unexpected child sitemap host/path: ${child}`)
    const childTarget = throughTarget(child)
    const head = await fetch(childTarget, { method: 'HEAD', redirect: 'manual' })
    invariant(head.status === 200, `${child}: HEAD expected 200, got ${head.status}`)
    invariant(head.headers.get('etag'), `${child}: ETag is missing`)
    invariant(/max-age/i.test(head.headers.get('cache-control') || ''),
      `${child}: Cache-Control max-age is missing`)
    const childResponse = await fetch(childTarget, { redirect: 'manual' })
    invariant(childResponse.status === 200, `${child}: GET expected 200, got ${childResponse.status}`)
    const childUrls = locs(await childResponse.text())
    invariant(childUrls.every((url) => !/[^\x00-\x7F]/.test(url)),
      `${child}: sitemap URLs must be ASCII percent-encoded`)
    urls.push(...childUrls)
  }
  invariant(new Set(urls).size === urls.length, 'duplicate URL found across sitemap shards')
  for (const path of ['/ko/tier-lists', '/en/tier-lists']) {
    invariant(urls.some((url) => sameUrl(url, `${canonicalOrigin}${path}`)),
      `${path}: public tier-list base URL is missing from sitemap`)
  }
  invariant(!urls.some((url) => new URL(url).pathname.endsWith('/tier-lists')
    && new URL(url).searchParams.has('id')), 'tier-list editor URL must not be included in sitemap')

  const targets = verifyAllSitemapUrls ? urls : urls.slice(0, Math.min(30, urls.length))
  if (sitemapRequestDelayMs > 0) {
    console.log(`sitemap URL checks: ${sitemapRequestDelayMs}ms interval (production-safe pacing)`)
  }
  for (const [index, url] of targets.entries()) {
    if (index > 0) await delay(sitemapRequestDelayMs)
    invariant(url.startsWith(`${canonicalOrigin}/`), `unexpected sitemap URL host: ${url}`)
    const response = await fetch(throughTarget(url), { redirect: 'manual' })
    const html = await response.text()
    invariant(response.status === 200, `${url}: sitemap URL must be final 200, got ${response.status}`)
    invariant(count(html, /<link\b[^>]*\brel=["']canonical["']/gi) === 1,
      `${url}: sitemap URL must have exactly one canonical`)
    invariant(sameUrl(canonicalOf(html), url),
      `${url}: sitemap URL must be self-canonical, got ${canonicalOf(html)}`)
    invariant(count(html, /<meta\b[^>]*\bname=["']robots["']/gi) === 1,
      `${url}: sitemap URL must have exactly one robots meta`)
    invariant(!/noindex/i.test(robotsOf(html)),
      `${url}: noindex URL must not be included in sitemap`)
  }
  console.log(`sitemap: ${childSitemaps.length} shards, ${urls.length} URLs (${targets.length} checked)`)
  return urls
}

async function verifyCategoryIndexing() {
  const states = []
  for (const category of ['WHISKY', 'WINE', 'COGNAC', 'OTHER']) {
    const response = await fetch(`${baseUrl}/api/spirits?category=${category}&page=0&size=1`)
    invariant(response.status === 200,
      `${category}: category probe expected 200, got ${response.status}`)
    const payload = await response.json()
    const page = payload?.data
    invariant(page && Array.isArray(page.content), `${category}: invalid category probe response`)
    const hasContent = (page.totalElements ?? page.content.length) > 0
    states.push({ category, hasContent })
    await verifyHtml(`/ko/spirits?category=${category}`, {
      canonical: `/ko/spirits?category=${category}`,
      noindex: !hasContent,
      jsonLd: hasContent,
    })
  }
  return states
}

async function verifySpiritRedirects(sitemapUrls) {
  for (const id of representativeSpiritIds) {
    const canonical = sitemapUrls.find((url) => {
      const pathname = new URL(url).pathname
      return new RegExp(`^/ko/spirits/${id}-`).test(pathname)
    })
    invariant(canonical, `representative spirit ${id}: KO canonical is missing from sitemap`)
    const canonicalPath = new URL(canonical).pathname
    const canonicalEn = sitemapUrls.find((url) => {
      const pathname = new URL(url).pathname
      return new RegExp(`^/en/spirits/${id}-`).test(pathname)
    })
    invariant(canonicalEn, `representative spirit ${id}: EN canonical is missing from sitemap`)

    await verifyHtml(canonicalPath, { canonical: canonicalPath })
    const canonicalPathEn = new URL(canonicalEn).pathname
    await verifyHtml(canonicalPathEn, { canonical: canonicalPathEn })

    for (const sourcePath of [`/ko/spirits/${id}`, `/ko/spirits/${id}-seo-check-wrong-slug`]) {
      const response = await fetch(`${baseUrl}${sourcePath}`, { redirect: 'manual' })
      invariant(response.status === 301,
        `${sourcePath}: expected permanent 301, got ${response.status}`)
      const location = response.headers.get('location')
      invariant(location, `${sourcePath}: redirect Location is missing`)
      invariant(new URL(location, baseUrl).pathname === canonicalPath,
        `${sourcePath}: redirect must keep ID ${id} and target ${canonicalPath}, got ${location}`)
    }
  }
}

async function verifyRenderedHtml(categoryStates = []) {
  if (!verifyBrowser) return
  const { default: puppeteer } = await import('puppeteer')
  // 파이프 전송은 검증용 브라우저가 로컬 디버깅 포트를 열지 않으며,
  // 제한된 Windows/Linux 실행 환경에서도 안정적으로 기동된다.
  const browser = await puppeteer.launch({
    headless: true,
    pipe: true,
    args: browserNoSandbox ? ['--no-sandbox', '--disable-gpu'] : [],
  })
  try {
    const page = await browser.newPage()
    let blockedClientApiPath = null
    await page.setRequestInterception(true)
    page.on('request', (request) => {
      const url = request.url()
      if (blockedClientApiPath && new URL(url).pathname === blockedClientApiPath) {
        request.abort()
        return
      }
      if (url.startsWith(`${baseUrl}/`) || url.startsWith('data:') || url.startsWith('blob:')) {
        request.continue()
      } else {
        request.abort()
      }
    })
    const representativeCategories = [
      categoryStates.find(({ hasContent }) => hasContent),
      categoryStates.find(({ hasContent }) => !hasContent),
    ].filter(Boolean).map(({ category, hasContent }) => ({
      path: `/ko/spirits?category=${category}`,
      noindex: !hasContent,
    }))
    const renderedSeoCases = [
      { path: '/ko/spirits', noindex: false },
      { path: '/ko/spirits?sort=SCORE_DESC', noindex: true },
      { path: '/ko/social', noindex: false, jsonLd: false },
      { path: `/ko/reviews/${representativeReviewId}`, noindex: true, jsonLd: false },
      ...representativeCategories,
      ...boardSeoCases.map(({ path, noindex, blockedClientApiPath: blockedApi, requireItemList }) => ({
        path,
        noindex,
        blockedApi: blockedApi ?? null,
        requireItemList: requireItemList ?? false,
      })),
      ...tierListSeoCases.map(({ path, canonical, noindex, alternateKo, alternateEn }) => ({
        path,
        noindex,
        jsonLd: false,
        canonical,
        alternateKo,
        alternateEn,
      })),
    ]
    for (const {
      path,
      noindex,
      blockedApi = null,
      requireItemList = false,
      jsonLd = true,
      canonical = null,
      alternateKo = null,
      alternateEn = null,
    } of renderedSeoCases) {
      blockedClientApiPath = blockedApi
      const expectedJsonLdCount = !noindex && jsonLd ? 1 : 0
      const expectedCanonical = canonical ? `${canonicalOrigin}${canonical}` : null
      const expectedAlternateKo = alternateKo ? `${canonicalOrigin}${alternateKo}` : null
      const expectedAlternateEn = alternateEn ? `${canonicalOrigin}${alternateEn}` : null
      let response
      try {
        response = await page.goto(`${baseUrl}${path}`, { waitUntil: 'domcontentloaded' })
      } catch (error) {
        throw new Error(`${path}: rendered navigation failed: ${error.message}`)
      }
      invariant(response?.status() === 200, `${path}: rendered request must return 200`)
      try {
        await page.waitForFunction(
          () => !document.querySelector('[data-seo-fallback]') && document.querySelectorAll('h1').length > 0,
          { timeout: 15_000 },
        )
      } catch (error) {
        throw new Error(`${path}: client did not replace the SEO fallback: ${error.message}`)
      }
      try {
        await page.waitForFunction((expected) => {
          const robots = document.querySelector('meta[name="robots"]')?.getAttribute('content') || ''
          const jsonLd = Array.from(document.querySelectorAll('script[data-cbc-route-jsonld="true"]'))
            .map((element) => element.textContent || '')
          const canonicalHref = document.querySelector('link[rel="canonical"]')?.getAttribute('href') || ''
          const alternateHref = (lang) => document
            .querySelector(`link[rel="alternate"][hreflang="${lang}"]`)?.getAttribute('href') || ''
          return document.querySelectorAll('title').length === 1
            && document.querySelectorAll('meta[name="description"]').length === 1
            && document.querySelectorAll('meta[name="robots"]').length === 1
            && document.querySelectorAll('link[rel="canonical"]').length === 1
            && document.querySelectorAll('h1').length === 1
            && document.querySelectorAll('script[data-cbc-route-jsonld="true"]').length === expected.jsonLdCount
            && /noindex/i.test(robots) === expected.noindex
            && (!expected.itemList || jsonLd.some((value) => value.includes('"@type":"ItemList"')))
            && (!expected.canonical || canonicalHref === expected.canonical)
            && (!expected.alternateKo || alternateHref('ko') === expected.alternateKo)
            && (!expected.alternateEn || alternateHref('en') === expected.alternateEn)
            && (!expected.alternateKo || alternateHref('x-default') === expected.alternateKo)
        }, { timeout: 15_000 }, {
          noindex,
          itemList: requireItemList,
          jsonLdCount: expectedJsonLdCount,
          canonical: expectedCanonical,
          alternateKo: expectedAlternateKo,
          alternateEn: expectedAlternateEn,
        })
      } catch (error) {
        const unstableState = await page.evaluate(() => ({
          title: document.querySelectorAll('title').length,
          description: document.querySelectorAll('meta[name="description"]').length,
          robots: document.querySelectorAll('meta[name="robots"]').length,
          canonical: document.querySelectorAll('link[rel="canonical"]').length,
          h1: document.querySelectorAll('h1').length,
          jsonLd: document.querySelectorAll('script[data-cbc-route-jsonld="true"]').length,
          itemList: Array.from(document.querySelectorAll('script[data-cbc-route-jsonld="true"]'))
            .some((element) => (element.textContent || '').includes('"@type":"ItemList"')),
          robotsContent: document.querySelector('meta[name="robots"]')?.getAttribute('content') || '',
          canonicalHref: document.querySelector('link[rel="canonical"]')?.getAttribute('href') || '',
          alternateKo: document.querySelector('link[rel="alternate"][hreflang="ko"]')?.getAttribute('href') || '',
          alternateEn: document.querySelector('link[rel="alternate"][hreflang="en"]')?.getAttribute('href') || '',
          alternateDefault: document.querySelector('link[rel="alternate"][hreflang="x-default"]')?.getAttribute('href') || '',
        }))
        throw new Error(`${path}: rendered SEO did not stabilize: ${JSON.stringify(unstableState)} (${error.message})`)
      }
      const state = await page.evaluate(() => ({
        title: document.querySelectorAll('title').length,
        description: document.querySelectorAll('meta[name="description"]').length,
        robots: document.querySelectorAll('meta[name="robots"]').length,
        canonical: document.querySelectorAll('link[rel="canonical"]').length,
        h1: document.querySelectorAll('h1').length,
        jsonLd: document.querySelectorAll('script[data-cbc-route-jsonld="true"]').length,
        itemList: Array.from(document.querySelectorAll('script[data-cbc-route-jsonld="true"]'))
          .some((element) => (element.textContent || '').includes('"@type":"ItemList"')),
        robotsContent: document.querySelector('meta[name="robots"]')?.getAttribute('content') || '',
        canonicalHref: document.querySelector('link[rel="canonical"]')?.getAttribute('href') || '',
        alternateKo: document.querySelector('link[rel="alternate"][hreflang="ko"]')?.getAttribute('href') || '',
        alternateEn: document.querySelector('link[rel="alternate"][hreflang="en"]')?.getAttribute('href') || '',
        alternateDefault: document.querySelector('link[rel="alternate"][hreflang="x-default"]')?.getAttribute('href') || '',
      }))
      invariant(state.title === 1, `${path}: rendered title count must be 1, got ${state.title}`)
      invariant(state.description === 1, `${path}: rendered description count must be 1, got ${state.description}`)
      invariant(state.robots === 1, `${path}: rendered robots count must be 1, got ${state.robots}`)
      invariant(state.canonical === 1, `${path}: rendered canonical count must be 1, got ${state.canonical}`)
      invariant(state.h1 === 1, `${path}: rendered H1 count must be 1, got ${state.h1}`)
      invariant(state.jsonLd === expectedJsonLdCount,
        `${path}: unexpected rendered JSON-LD count ${state.jsonLd}`)
      invariant(!requireItemList || state.itemList,
        `${path}: SSR ItemList must survive while the client list API is unavailable`)
      invariant(noindex === /noindex/i.test(state.robotsContent),
        `${path}: unexpected rendered robots ${state.robotsContent}`)
      if (expectedCanonical) invariant(state.canonicalHref === expectedCanonical,
        `${path}: unexpected rendered canonical ${state.canonicalHref}`)
      if (expectedAlternateKo) {
        invariant(state.alternateKo === expectedAlternateKo,
          `${path}: unexpected rendered ko alternate ${state.alternateKo}`)
        invariant(state.alternateDefault === expectedAlternateKo,
          `${path}: unexpected rendered x-default alternate ${state.alternateDefault}`)
      }
      if (expectedAlternateEn) invariant(state.alternateEn === expectedAlternateEn,
        `${path}: unexpected rendered en alternate ${state.alternateEn}`)
    }
    console.log('rendered HTML: metadata, H1 and JSON-LD are singular')
  } finally {
    await browser.close()
  }
}

async function main() {
  await verifyNoindexAppRoute('/ko/admin/social')
  await verifyHtml('/ko/spirits', { canonical: '/ko/spirits' })
  await verifyHtml('/ko/spirits?sort=SCORE_DESC', {
    canonical: '/ko/spirits',
    noindex: true,
    jsonLd: false,
  })
  for (const { path, canonical, noindex } of boardSeoCases) {
    await verifyHtml(path, { canonical, noindex, jsonLd: !noindex })
  }
  for (const { path, canonical, noindex, alternateKo, alternateEn } of tierListSeoCases) {
    await verifyHtml(path, {
      canonical,
      noindex,
      jsonLd: false,
      alternateKo,
      alternateEn,
    })
  }
  for (const path of [
    '/ko/__seo_release_check_missing__',
    '/ko/notices/9223372036854775807',
    '/ko/community/free/9223372036854775807',
    '/ko/community/byob/9223372036854775807',
    '/ko/spirits/9223372036854775807',
    '/ko/tier-lists/__seo_release_check_missing__',
    '/ko/taste-trees/t/__seo_release_check_missing__',
    '/ko/users/9223372036854775807/bottles',
    '/ko/users/9223372036854775807/reviews',
    '/ko/producers/9223372036854775807',
    '/ko/price-tracker/spirits/9223372036854775807',
  ]) await verifyMissingRoute(path)
  const categoryStates = await verifyCategoryIndexing()
  await verifyRenderedHtml(categoryStates)
  const sitemapUrls = await verifySitemaps()
  await verifySpiritRedirects(sitemapUrls)
  console.log(`SEO verification passed: ${baseUrl}`)
}

main().catch((error) => {
  console.error(error.stack || error.message)
  process.exitCode = 1
})
