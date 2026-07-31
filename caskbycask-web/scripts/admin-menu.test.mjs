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
