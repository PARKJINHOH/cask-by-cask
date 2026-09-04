// 사용자 GNB 메뉴 노출 관리 회귀 방지.
//
// 카탈로그(gnbMenu.ts) / MainLayout / 번역 파일이 서로 어긋나면 증상이 화면을 열어 보기
// 전에는 드러나지 않는다. 소스를 텍스트로 읽어 검사한다 (admin-menu.test.mjs 와 같은 방식).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (relativePath) => readFileSync(join(root, relativePath), 'utf8')

const catalog = read('src/domain/gnb-menu/constants/gnbMenu.ts')
const mainLayout = read('src/layouts/MainLayout.tsx')
const ko = JSON.parse(read('src/locales/ko.json'))
const en = JSON.parse(read('src/locales/en.json'))

const { GNB_MENUS, GNB_MENU_KEYS, filterVisibleGnbMenus, isGnbGroup } =
  await import('../src/domain/gnb-menu/constants/gnbMenu.ts')

/** 필터 결과에서 실제로 화면에 남는 키(부모 + 자식)를 평면으로 뽑는다. */
function visibleKeys(hidden) {
  return filterVisibleGnbMenus(GNB_MENUS, new Set(hidden)).flatMap((menu) =>
    isGnbGroup(menu) ? [menu.key, ...menu.children.map((c) => c.key)] : [menu.key],
  )
}

/** 카탈로그의 `key: '...'` / `labelKey: '...'` 쌍을 순서대로 뽑는다. */
function catalogEntries() {
  const entries = []
  const pattern = /key:\s*'([^']+)'\s*,\s*labelKey:\s*'([^']+)'/g
  let match
  while ((match = pattern.exec(catalog)) !== null) {
    entries.push({ key: match[1], labelKey: match[2] })
  }
  return entries
}

function lookup(dict, dottedKey) {
  return dottedKey.split('.').reduce((acc, part) => (acc == null ? undefined : acc[part]), dict)
}

// 회귀 배경: key 는 DB(gnb_menu_settings.menu_key)에 그대로 저장된다. 키를 바꾸면 이미
// 저장된 노출 설정이 끊겨 관리자가 숨겨 둔 메뉴가 조용히 되살아난다. 의도적 변경만 통과시킨다.
const EXPECTED_KEYS = [
  'spirits',
  'notice',
  'request', 'requestSpirit', 'requestProducer', 'requestVenue', 'requestFeedback',
  'community', 'communityAll', 'communityNews', 'communityBoard', 'communityByob',
  'communityPhoto', 'youtubeGallery',
  'tasteExplorer', 'tierList', 'tasteTree', 'venueMap',
]

test('카탈로그 메뉴 키가 스냅샷과 일치한다 (DB 저장 값이라 함부로 못 바꾼다)', () => {
  assert.deepEqual(catalogEntries().map((e) => e.key), EXPECTED_KEYS)
})

test('모든 메뉴 라벨이 ko/en 양쪽 번역키로 존재한다', () => {
  const entries = catalogEntries()
  assert.ok(entries.length > 0, '카탈로그 항목 추출 실패')

  for (const { key, labelKey } of entries) {
    for (const [lang, dict] of [['ko', ko], ['en', en]]) {
      const value = lookup(dict, labelKey)
      assert.equal(
        typeof value, 'string',
        `${lang}.json 에 ${labelKey} 누락 (메뉴 키: ${key})`,
      )
    }
  }
})

test('공지사항은 요청 앞에 있고 이미지·유튜브 갤러리는 한 구역으로 묶인다', () => {
  const topLevelKeys = GNB_MENUS.map((menu) => menu.key)
  assert.ok(topLevelKeys.indexOf('notice') < topLevelKeys.indexOf('request'))

  const community = GNB_MENUS.find((menu) => menu.key === 'community')
  assert.ok(community && isGnbGroup(community), '커뮤니티 그룹 누락')
  assert.deepEqual(
    community.children.filter((child) => child.section === 'gallery').map((child) => child.key),
    ['communityPhoto', 'youtubeGallery'],
  )
  assert.equal(community.children.some((child) => child.key === 'photoCard'), false)
  assert.ok(mainLayout.includes("child.section === 'gallery'"), '갤러리 구분선 렌더링 누락')
  assert.match(mainLayout, /aria-hidden="true"[^>]*w-8/)
})

// 회귀 배경: 메뉴 배열이 MainLayout 안에 되돌아오면 관리자 화면과 이중 소스가 되어
// 관리자에서 끈 메뉴가 사용자 화면에 그대로 남는다.
test('MainLayout 은 메뉴 목록을 직접 들고 있지 않고 카탈로그를 가져다 쓴다', () => {
  assert.ok(
    mainLayout.includes("from '@/domain/gnb-menu/constants/gnbMenu'"),
    'MainLayout 이 GNB 카탈로그를 import 해야 한다',
  )
  assert.equal(
    /const\s+menus\s*:\s*GNBItem\[\]\s*=\s*\[/.test(mainLayout), false,
    'MainLayout 에 하드코딩된 메뉴 배열이 남아 있다',
  )
  assert.ok(
    mainLayout.includes('filterVisibleGnbMenus(GNB_MENUS'),
    'MainLayout 이 노출 필터를 적용해야 한다',
  )
})

// 회귀 배경: sr-only 미러 내비게이션은 크롤러·스크린리더용으로 하위 메뉴 링크를 항상 DOM 에
// 남긴다. 여기가 원본 카탈로그를 쓰면 관리자가 숨긴 메뉴 링크가 문서에 그대로 남는다.
test('sr-only 미러 내비게이션도 필터 결과(menus)를 쓴다', () => {
  const marker = 'className="sr-only"'
  const start = mainLayout.indexOf(marker)
  assert.notEqual(start, -1, 'sr-only 미러 내비게이션을 찾지 못했다')
  const block = mainLayout.slice(start, start + 600)

  assert.ok(block.includes('menus.flatMap('), 'menus(필터 결과)를 순회해야 한다')
  assert.equal(
    block.includes('GNB_MENUS.flatMap('), false,
    'sr-only 내비가 원본 카탈로그를 순회하고 있다 — 숨긴 메뉴 링크가 DOM 에 남는다',
  )
})

// 회귀 배경: 노출 설정을 SPA 에서만 받아 오면 첫 프레임에는 설정을 몰라 숨긴 메뉴가
// 매 로드마다 깜빡인다. SSR 시드가 이를 없앤다.
test('SSR 이 숨김 키 시드를 심고 훅이 그것을 initialData 로 쓴다', () => {
  const layout = read('src/app/layout.tsx')
  assert.ok(layout.includes('getHiddenGnbMenuKeys'), 'layout.tsx 가 숨김 키를 조회해야 한다')
  assert.ok(layout.includes('window.__GNB_HIDDEN__'), 'layout.tsx 가 시드를 심어야 한다')
  assert.ok(
    layout.includes("replace(/</g, '\\\\u003c')"),
    '시드 직렬화에 `<` 이스케이프가 있어야 한다 (</script> 조기 종료 방지)',
  )

  const hook = read('src/domain/gnb-menu/hooks/useGnbMenus.ts')
  assert.ok(hook.includes('initialData'), '훅이 시드를 initialData 로 써야 한다')
  assert.ok(hook.includes('retry: false'), 'GNB 조회는 재시도로 렌더를 붙잡지 않는다')
})

// ── 노출 필터 규칙 ────────────────────────────────────────────
// 관리자가 무엇을 껐을 때 화면에서 무엇이 사라지는지를 못 박는다.

test('숨김 키가 없으면 카탈로그 전체가 그대로 나온다', () => {
  assert.deepEqual(visibleKeys([]), GNB_MENU_KEYS)
})

test('단일 링크 메뉴를 끄면 그 항목만 사라진다', () => {
  const keys = visibleKeys(['notice'])
  assert.equal(keys.includes('notice'), false)
  assert.deepEqual(keys, GNB_MENU_KEYS.filter((k) => k !== 'notice'))
})

test('자식을 끄면 그 자식만 사라지고 그룹은 남는다', () => {
  const keys = visibleKeys(['youtubeGallery'])
  assert.equal(keys.includes('youtubeGallery'), false)
  assert.ok(keys.includes('community'), '그룹은 남아 있어야 한다')
  assert.ok(keys.includes('communityAll'), '다른 자식은 남아 있어야 한다')
})

test('그룹을 끄면 하위까지 통째로 사라진다', () => {
  const keys = visibleKeys(['community'])
  for (const key of ['community', 'communityAll', 'communityNews', 'communityBoard',
    'communityByob', 'communityPhoto', 'youtubeGallery']) {
    assert.equal(keys.includes(key), false, `${key} 가 남아 있다`)
  }
  assert.ok(keys.includes('spirits'), '다른 메뉴는 영향받지 않는다')
})

// 회귀 배경: 자식이 0개인 그룹을 남기면 버튼은 보이는데 눌러도 빈 드롭다운만 열린다.
test('자식을 전부 끄면 그룹 버튼도 사라진다', () => {
  const keys = visibleKeys(['tierList', 'tasteTree', 'venueMap'])
  assert.equal(keys.includes('tasteExplorer'), false, '빈 그룹이 남아 있다')
})

test('전부 끄면 아무 메뉴도 남지 않는다 (레이아웃은 이벤트 달력만)', () => {
  assert.deepEqual(visibleKeys(GNB_MENU_KEYS), [])
})

test('카탈로그에 없는 옛 키가 숨김 목록에 있어도 무해하다', () => {
  assert.deepEqual(visibleKeys(['deletedMenuKey']), GNB_MENU_KEYS)
})

test('관리자 화면이 관리 대상 키를 카탈로그에서 가져온다', () => {
  const page = read('src/views-spa/admin/AdminGnbMenuPage.tsx')
  assert.ok(page.includes('GNB_MENU_KEYS'), '카탈로그 키 목록을 기준으로 삼아야 한다')
  assert.ok(page.includes('GNB_MENUS'), '카탈로그 트리를 그려야 한다')
})
