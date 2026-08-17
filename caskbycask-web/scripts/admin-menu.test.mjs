// 관리자 메뉴명 정합성 + 가격 동향(직접 등록) 배선 회귀 방지.
// adminMenu.ts / App.tsx / locales 를 텍스트로 읽어 검사한다 —
// 라벨은 사이드바와 페이지 제목·라우트 두 곳에 흩어져 있어 한쪽만 고치면 어긋난다.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (relativePath) => readFileSync(join(root, relativePath), 'utf8')

const adminMenu = read('src/domain/admin/constants/adminMenu.ts')
const app = read('src/App.tsx')
const ko = JSON.parse(read('src/locales/ko.json'))
const en = JSON.parse(read('src/locales/en.json'))

/** adminMenu.ts 의 `{ path: '...', label: '...' }` 목록을 뽑는다. */
function menuEntries() {
  const entries = []
  const pattern = /\{\s*path:\s*'([^']+)'\s*,\s*label:\s*'([^']+)'/g
  let match
  while ((match = pattern.exec(adminMenu)) !== null) {
    entries.push({ path: match[1], label: match[2] })
  }
  return entries
}

test('테이스팅 트리 메뉴는 전 카테고리 공통이라 위스키 전용 이름을 쓰지 않는다', () => {
  const entry = menuEntries().find((e) => e.path === '/admin/taste-trees')
  assert.ok(entry, '/admin/taste-trees 메뉴가 있어야 한다')
  assert.equal(entry.label, '주류 트리')
})

test('관리자 메뉴 라벨에 핫딜 표기가 남아 있지 않다', () => {
  const hotDeal = menuEntries().filter((e) => e.label.includes('핫딜'))
  assert.deepEqual(hotDeal, [], `핫딜 라벨 잔존: ${JSON.stringify(hotDeal)}`)
})

test('가격 동향 메뉴가 등록되어 있다', () => {
  const entry = menuEntries().find((e) => e.path === '/admin/deals')
  assert.ok(entry, '/admin/deals 메뉴가 있어야 한다')
  assert.equal(entry.label, '가격 동향')
})

test('커뮤니티 신고 메뉴는 댓글 신고까지 포함함을 이름에 드러낸다', () => {
  const entry = menuEntries().find((e) => e.path === '/admin/community/post-reports')
  assert.ok(entry)
  assert.ok(entry.label.includes('댓글'), `라벨: ${entry.label}`)
})

test('관리자 직접 가격 등록 라우트가 :id 보다 먼저 선언되어 있다', () => {
  const newIndex = app.indexOf('path="deals/new"')
  const idIndex = app.indexOf('path="deals/:id"')
  assert.notEqual(newIndex, -1, 'deals/new 라우트가 등록되어야 한다')
  assert.notEqual(idIndex, -1, 'deals/:id 라우트가 있어야 한다')
  assert.ok(newIndex < idIndex, 'deals/new 가 deals/:id 보다 먼저 선언돼야 한다')
})

test('가격 배지 문구는 하드코딩이 아니라 ko/en 양쪽 번역키로 존재한다', () => {
  for (const [lang, dict] of [['ko', ko], ['en', en]]) {
    assert.ok(dict.price?.panel?.hotDeal, `${lang}.json price.panel.hotDeal 누락`)
    assert.ok(dict.price?.panel?.hotDealReporter, `${lang}.json price.panel.hotDealReporter 누락`)
  }
})

test('사용자 가격 카드에 한글 하드코딩이 남아 있지 않다', () => {
  const card = read('src/domain/pricetracker/components/PriceReportCard.tsx')
  assert.equal(card.includes('핫딜'), false, 'PriceReportCard 에 핫딜 하드코딩 잔존')
  assert.ok(card.includes("t('price.panel.hotDeal'"), '번역키 사용이 있어야 한다')
})

// 회귀 배경: 관리자 라우트를 App.tsx 와 adminMenu.ts 에만 등록하고 seoHelpers 의
// isKnownAdminPath 화이트리스트에 빠뜨리면, SPA 안에서 이동할 때는 멀쩡한데
// 그 주소를 직접 열거나 새로고침하면 SSR 이 not-found 로 판정해 404 가 뜬다.
// 화면을 열어 보기 전에는 드러나지 않아 여기서 잡는다. (/admin/youtube 가 실제로 이랬다)
test('사이드바의 모든 관리자 메뉴 경로가 SSR 색인 판정에 등록되어 있다', () => {
  // 파일이 CRLF 라 '\n}\n' 로는 함수 끝을 찾지 못한다. 줄 단위로 훑어 여는 중괄호가
  // 다시 닫히는 지점까지를 함수 본문으로 잡는다.
  const lines = read('src/shared/utils/seoHelpers.ts').split(/\r?\n/)
  const start = lines.findIndex((line) => line.startsWith('function isKnownAdminPath'))
  assert.notEqual(start, -1, 'isKnownAdminPath 함수를 찾지 못했다')
  const end = lines.findIndex((line, index) => index > start && line === '}')
  assert.notEqual(end, -1, 'isKnownAdminPath 함수의 끝을 찾지 못했다')
  const block = lines.slice(start, end).join('\n')

  // 화이트리스트는 따옴표 문자열, 나머지는 /^…$/ 정규식으로 적혀 있다.
  const quoted = new Set([...block.matchAll(/'([^']*)'/g)].map((m) => m[1]))
  const patterns = [...block.matchAll(/\/\^(.+?)\$\//g)]
    .map((m) => new RegExp(`^${m[1]}$`))
  assert.ok(quoted.size > 10, `화이트리스트 추출 실패 (${quoted.size}건)`)

  const missing = menuEntries()
    .map((entry) => entry.path.replace(/^\/admin\/?/, ''))
    .filter((path) => !quoted.has(path) && !patterns.some((re) => re.test(path)))

  assert.deepEqual(missing, [],
    `isKnownAdminPath 에 누락된 경로: ${missing.join(', ')} — 새로고침 시 404 가 난다`)
})
