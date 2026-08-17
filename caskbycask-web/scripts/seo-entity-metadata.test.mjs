// 엔티티별 metadata 회귀 테스트.
//
// 배경: `DEFAULT_ROUTE_METADATA` 는 라우트 키 단위이므로 그대로 쓰면 생산자·리뷰·사용자
// 페이지 수백 개가 동일한 title/description 을 갖는다. 검색엔진은 이를 중복으로 판단해
// 대표 1개만 남기고, 노출돼도 제목이 내용을 설명하지 못해 클릭률이 떨어진다.
//
// 검증 대상:
//   · 같은 라우트의 서로 다른 엔티티가 서로 다른 title 을 갖는지
//   · 어떤 엔티티 페이지도 홈과 title 이 같지 않은지
//   · 리뷰는 한국어 원문으로 canonical 을 통합하고 hreflang 을 내보내지 않는지
//   · 생산자·사용자·취향 트리는 언어별 self-canonical 과 양방향 hreflang 을 갖는지
//   · 주류 가격 페이지는 주류 상세로 canonical 을 통합하는지
//
// 실행: npm run build 후 `npm run test:seo-entity`
import { spawn } from 'node:child_process'
import { createServer } from 'node:http'
import { rm } from 'node:fs/promises'
import test from 'node:test'
import assert from 'node:assert/strict'

const API_PORT = Number(process.env.SEO_ENTITY_TEST_API_PORT || 8095)
const WEB_PORT = Number(process.env.SEO_ENTITY_TEST_PORT || 3129)
const BASE = `http://127.0.0.1:${WEB_PORT}`
const SITE = 'https://www.caskbycask.net'

const SPIRIT_CANONICAL_KO = '/ko/spirits/244-kavalan-solist-px-sherry'
const SPIRIT_CANONICAL_EN = '/en/spirits/244-kavalan-solist-px-sherry'

const FIXTURES = {
  '/api/public/reviews/11': {
    id: 11,
    spiritId: 244,
    displayNameKo: '카발란 솔리스트 PX 셰리',
    displayNameEn: 'Kavalan Solist PX Sherry',
    canonicalPathKo: SPIRIT_CANONICAL_KO,
    canonicalPathEn: SPIRIT_CANONICAL_EN,
    imageUrl: null,
    nickname: '인피튜드',
    totalScore: 92,
    noseNote: '건포도와 다크 초콜릿',
    tasteNote: '진한 셰리와 오크',
    finishNote: '길고 달콤한 여운',
    comment: '카발란 PX 중에서도 손꼽히는 캐스크입니다.',
    createdAt: '2026-07-01T12:00:00',
  },
  '/api/public/reviews/12': {
    id: 12,
    spiritId: 300,
    displayNameKo: '글렌알라키 15년',
    displayNameEn: 'GlenAllachie 15',
    canonicalPathKo: '/ko/spirits/300-glenallachie-15',
    canonicalPathEn: '/en/spirits/300-glenallachie-15',
    imageUrl: null,
    nickname: 'YeosupSh',
    totalScore: 88.5,
    noseNote: null,
    tasteNote: null,
    finishNote: null,
    comment: '가성비 좋은 셰리 위스키.',
    createdAt: '2026-07-02T12:00:00',
  },
  '/api/producers/7': {
    id: 7,
    type: 'DISTILLERY',
    nameKo: '글렌알라키',
    nameEn: 'GlenAllachie',
    country: '스코틀랜드',
    region: '스페이사이드',
    foundedYear: 1967,
    descriptionKo: null,
    descriptionEn: null,
  },
  '/api/producers/8': {
    id: 8,
    type: 'WINERY',
    nameKo: '샤토 마고',
    nameEn: 'Chateau Margaux',
    country: '프랑스',
    region: '보르도',
    foundedYear: 1815,
    descriptionKo: null,
    descriptionEn: null,
  },
  '/api/seo/spirits/244': {
    canonicalId: 244,
    canonicalPathKo: SPIRIT_CANONICAL_KO,
    canonicalPathEn: SPIRIT_CANONICAL_EN,
    canonicalUrlKo: `${SITE}${SPIRIT_CANONICAL_KO}`,
    canonicalUrlEn: `${SITE}${SPIRIT_CANONICAL_EN}`,
    titleKo: '카발란 솔리스트 PX 셰리 주류 정보 & 리뷰 | CaskByCask',
    titleEn: 'Kavalan Solist PX Sherry Specs & Reviews | CaskByCask',
    descriptionKo: '카발란 솔리스트 PX 셰리 정보.',
    descriptionEn: 'Kavalan Solist PX Sherry specs.',
    primaryImageUrl: `${SITE}/og-image.png`,
    updatedAt: null,
    relationType: 'STANDALONE',
  },
  '/api/spirits/244': {
    id: 244,
    nameKo: '카발란 솔리스트 PX 셰리',
    nameEn: 'Kavalan Solist PX Sherry',
    category: 'WHISKY',
    variantType: 'NONE',
    country: '대만',
    avgScore: 92,
    reviewCount: 3,
  },
  '/api/users/5/bottles': { totalElements: 12, ownerNickname: '인피튜드' },
  '/api/taste-trees/share/abc123': {
    shareKey: 'abc123',
    ownerNickname: '인피튜드',
    title: '입문자용 위스키 고르기',
    description: null,
  },

  // ── 방어 가드 확인용: 이름/canonical 이 비어 있는 비정상 응답 ──────────────
  '/api/public/reviews/13': {
    id: 13, spiritId: 999,
    displayNameKo: '  ', displayNameEn: '',
    canonicalPathKo: null, canonicalPathEn: null,
    imageUrl: null, nickname: '익명', totalScore: 70,
    noseNote: null, tasteNote: null, finishNote: null, comment: null,
    createdAt: '2026-07-03T12:00:00',
  },
  '/api/producers/9': {
    id: 9, type: null, nameKo: null, nameEn: null,
    country: null, region: null, foundedYear: null,
    descriptionKo: null, descriptionEn: null,
  },
  '/api/seo/spirits/245': {
    canonicalId: 245,
    canonicalPathKo: null, canonicalPathEn: null,
    canonicalUrlKo: null, canonicalUrlEn: null,
    titleKo: null, titleEn: null,
    descriptionKo: null, descriptionEn: null,
    primaryImageUrl: null, updatedAt: null, relationType: 'STANDALONE',
  },
  '/api/spirits/245': {
    id: 245, nameKo: '이름 있는 주류', nameEn: 'Named Spirit',
    category: 'WHISKY', variantType: 'NONE', country: '대만',
    avgScore: 80, reviewCount: 1,
  },
}

function startFakeBackend() {
  const server = createServer((req, res) => {
    const url = (req.url ?? '').split('?')[0]
    const data = FIXTURES[url]
    if (data) {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ success: true, data }))
      return
    }
    res.writeHead(404, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ success: false, data: null }))
  })
  return new Promise((resolve) => server.listen(API_PORT, '127.0.0.1', () => resolve(server)))
}

function startWebServer() {
  return spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', String(WEB_PORT)], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      INTERNAL_API_URL: `http://127.0.0.1:${API_PORT}`,
      NEXT_PUBLIC_API_URL: `http://127.0.0.1:${API_PORT}`,
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
    xRobots: res.headers.get('x-robots-tag'),
    title: html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? null,
    description: tags
      .filter((tag) => tag.toLowerCase().startsWith('<meta') && attr(tag, 'name')?.toLowerCase() === 'description')
      .map((tag) => attr(tag, 'content'))[0] ?? null,
    robots: tags
      .filter((tag) => tag.toLowerCase().startsWith('<meta') && attr(tag, 'name')?.toLowerCase() === 'robots')
      .map((tag) => attr(tag, 'content')),
    canonical: links('canonical'),
    hreflangKo: links('alternate', 'ko'),
    hreflangEn: links('alternate', 'en'),
  }
}

test('엔티티별 metadata', async (t) => {
  await rm('.next/cache/fetch-cache', { recursive: true, force: true })

  const backend = await startFakeBackend()
  const web = startWebServer()
  let webLog = ''
  web.stdout.on('data', (chunk) => { webLog += chunk.toString() })
  web.stderr.on('data', (chunk) => { webLog += chunk.toString() })
  t.after(async () => {
    web.kill('SIGTERM')
    await new Promise((resolve) => {
      backend.closeAllConnections?.()
      backend.close(() => resolve())
    })
  })

  assert.ok(await waitForWeb(), `Next.js 서버 기동 실패:\n${webLog.slice(-2000)}`)

  // 리뷰 본문의 정본은 그 리뷰가 달린 주류 상세다. 리뷰마다 URL 을 따로 색인시키면 같은 내용이
  // 주류 페이지와 경쟁하므로 색인에서 빼고 canonical 로 주류를 가리킨다.
  // SPA(PublicReviewPage)도 하이드레이션 후 같은 신호를 내야 한다 — 어긋나면 렌더링 전후로
  // 색인 판정이 뒤집혀 SSR 만 보고는 알 수 없는 채로 결과가 달라진다.
  await t.test('공개 리뷰: 색인에서 빼고 주류 상세를 정본으로 가리킨다', async () => {
    const ko = await readHead('/ko/reviews/11')
    assert.equal(ko.status, 200)
    assert.match(ko.title, /카발란 솔리스트 PX 셰리/)
    assert.match(ko.title, /인피튜드/)
    assert.match(ko.description, /평점 92점/)
    assert.deepEqual(ko.canonical, [`${SITE}${SPIRIT_CANONICAL_KO}`])
    assert.deepEqual(ko.robots, ['noindex, follow'])
    // 리뷰 본문은 한국어이므로 영문 alternate 를 내보내면 잘못된 신호가 된다.
    assert.deepEqual(ko.hreflangKo, [])
    assert.deepEqual(ko.hreflangEn, [])

    const en = await readHead('/en/reviews/11')
    assert.equal(en.status, 200)
    assert.deepEqual(en.canonical, [`${SITE}${SPIRIT_CANONICAL_EN}`],
      '영문 진입은 영문 주류 상세를 정본으로 삼는다')
    assert.deepEqual(en.robots, ['noindex, follow'])
  })

  await t.test('공개 리뷰: 서로 다른 리뷰는 서로 다른 title', async () => {
    const first = await readHead('/ko/reviews/11')
    const second = await readHead('/ko/reviews/12')
    assert.notEqual(first.title, second.title)
    assert.match(second.title, /글렌알라키 15년/)
    assert.match(second.description, /평점 88.5점/)
  })

  await t.test('생산자: 이름과 종류를 반영하고 언어별 self-canonical', async () => {
    const ko = await readHead('/ko/producers/7')
    assert.equal(ko.status, 200)
    assert.match(ko.title, /^글렌알라키 증류소 정보/)
    assert.match(ko.description, /스페이사이드|스코틀랜드/)
    assert.match(ko.description, /1967/)
    assert.deepEqual(ko.canonical, [`${SITE}/ko/producers/7`])
    assert.deepEqual(ko.hreflangKo, [`${SITE}/ko/producers/7`])
    assert.deepEqual(ko.hreflangEn, [`${SITE}/en/producers/7`])

    const en = await readHead('/en/producers/7')
    assert.match(en.title, /^GlenAllachie Distillery/)
    assert.deepEqual(en.canonical, [`${SITE}/en/producers/7`])
  })

  await t.test('생산자: 서로 다른 생산자는 서로 다른 title (종류 라벨 포함)', async () => {
    const distillery = await readHead('/ko/producers/7')
    const winery = await readHead('/ko/producers/8')
    assert.notEqual(distillery.title, winery.title)
    assert.match(winery.title, /^샤토 마고 와이너리 정보/)
  })

  await t.test('주류 가격: 주류명을 반영하고 canonical 을 주류 상세로 통합', async () => {
    const ko = await readHead('/ko/price-tracker/spirits/244')
    assert.equal(ko.status, 200)
    assert.match(ko.title, /카발란 솔리스트 PX 셰리 가격 정보/)
    // 가격 화면은 주류 상세의 가격 탭과 내용이 겹치므로 색인 신호를 주류 상세로 모은다.
    assert.deepEqual(ko.canonical, [`${SITE}${SPIRIT_CANONICAL_KO}`])

    const en = await readHead('/en/price-tracker/spirits/244')
    assert.match(en.title, /Kavalan Solist PX Sherry price history/)
    assert.deepEqual(en.canonical, [`${SITE}${SPIRIT_CANONICAL_EN}`])
  })

  await t.test('사용자 공개 목록: 닉네임을 반영하되 색인에서 제외', async () => {
    const bottles = await readHead('/ko/users/5/bottles')
    const reviews = await readHead('/ko/users/5/reviews')
    assert.equal(bottles.status, 200)
    assert.equal(reviews.status, 200)
    assert.match(bottles.title, /인피튜드님의 보틀 컬렉션/)
    assert.match(reviews.title, /인피튜드님의 주류 리뷰/)
    assert.notEqual(bottles.title, reviews.title)

    // 본문이 주류 상세·리뷰와 중복되고 사용자 수만큼 URL 이 늘어나므로 색인하지 않는다.
    assert.deepEqual(bottles.robots, ['noindex, follow'])
    assert.deepEqual(reviews.robots, ['noindex, follow'])
    // noindex 와 canonical 을 함께 선언하면 신호가 충돌한다.
    assert.deepEqual(bottles.canonical, [])
    assert.deepEqual(bottles.hreflangKo, [])
    assert.deepEqual(bottles.hreflangEn, [])
    // 링크 추적은 유지해야 하므로 헤더로 nofollow 를 보내지 않는다.
    assert.equal(bottles.xRobots, null)
  })

  await t.test('공유 취향 트리: 트리 제목을 반영', async () => {
    const ko = await readHead('/ko/taste-trees/t/abc123')
    assert.equal(ko.status, 200)
    assert.match(ko.title, /입문자용 위스키 고르기/)
    assert.deepEqual(ko.canonical, [`${SITE}/ko/taste-trees/t/abc123`])
    assert.deepEqual(ko.hreflangEn, [`${SITE}/en/taste-trees/t/abc123`])
  })

  await t.test('어떤 엔티티 페이지도 홈과 title 이 같지 않다', async () => {
    const home = await readHead('/ko')
    const paths = [
      '/ko/reviews/11', '/ko/reviews/12',
      '/ko/producers/7', '/ko/producers/8',
      '/ko/price-tracker/spirits/244',
      '/ko/users/5/bottles', '/ko/users/5/reviews',
      '/ko/taste-trees/t/abc123',
    ]
    const titles = []
    for (const path of paths) {
      const head = await readHead(path)
      assert.notEqual(head.title, home.title, `${path}: 홈과 title 이 같으면 중복으로 취급된다`)
      titles.push(head.title)
    }
    assert.equal(new Set(titles).size, titles.length, '엔티티 페이지 title 은 서로 달라야 한다')
  })

  // 외부 API 응답은 타입 선언과 다를 수 있다. 이름이 비어 있는데 그대로 title 을 만들면
  // `null 시음 후기` 같은 문자열이 색인되므로, 라우트 기본 metadata 로 폴백해야 한다.
  await t.test('이름이 비어 있는 응답은 깨진 title 대신 기본 metadata 로 폴백', async () => {
    for (const path of [
      '/ko/producers/9',                 // nameKo/En 이 null
      '/ko/price-tracker/spirits/245',   // canonicalUrl 이 없음
    ]) {
      const head = await readHead(path)
      assert.equal(head.status, 200, `${path}: 200 이어야 한다`)
      assert.doesNotMatch(head.title, /null|undefined/, `${path}: title 에 null/undefined 노출 금지`)
      assert.doesNotMatch(
        head.description ?? '',
        /null|undefined/,
        `${path}: description 에 null/undefined 노출 금지`,
      )
      // 폴백은 라우트 기본값이므로 색인 가능 상태를 유지한다.
      assert.deepEqual(head.robots, ['index, follow'], `${path}: 폴백은 색인을 유지한다`)
      assert.ok(head.canonical.length === 1, `${path}: canonical 은 정확히 1개`)
      assert.doesNotMatch(head.canonical[0], /null|undefined/, `${path}: canonical 오염 금지`)
    }

    // 리뷰는 정책상 색인 대상이 아니므로 폴백도 noindex 다.
    // 게다가 이 응답은 주류 canonical 조차 비어 있다 — 정본을 모를 때는 잘못된 주소를 가리키느니
    // 선언하지 않는다(비공개 경로와 같은 관례).
    const brokenReview = await readHead('/ko/reviews/13')
    assert.equal(brokenReview.status, 200, '/ko/reviews/13: 200 이어야 한다')
    assert.doesNotMatch(brokenReview.title, /null|undefined/, '/ko/reviews/13: title 오염 금지')
    assert.doesNotMatch(brokenReview.description ?? '', /null|undefined/,
      '/ko/reviews/13: description 오염 금지')
    assert.deepEqual(brokenReview.robots, ['noindex, follow'], '/ko/reviews/13: 리뷰는 색인 제외')
    assert.deepEqual(brokenReview.canonical, [], '/ko/reviews/13: 정본을 모르면 canonical 을 선언하지 않는다')
  })
})
