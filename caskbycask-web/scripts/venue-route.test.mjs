// 주류 장소 라우트 배선 회귀 방지.
//
// 이 기능의 라우트에는 조용히 깨지는 함정이 셋 있다:
//
//  1) /venues/{국가코드} 와 /venues/{장소id} 는 세그먼트 수가 같다. 서버(parsePath)와
//     클라이언트(VenueBrowsePage)가 <b>같은 규칙</b>으로 갈라야 하는데, 한쪽만 고치면
//     SPA 안에서는 멀쩡하고 새로고침만 엉뚱한 화면이 뜬다.
//
//  2) /venue-map 은 색인 대상이 아니라 isKnownPrivatePath 에 있어야 한다.
//     빠뜨리면 SPA 이동은 되는데 주소를 직접 열 때만 404 가 난다(photo-card 가 겪은 함정).
//
//  3) 관리자 라우트는 App.tsx · adminMenu.ts · isKnownAdminPath 세 곳에 모두 있어야 한다.
//     (1↔3 불일치는 test:admin-menu 가 잡고, 여기서는 장소 경로가 실제로 등록됐는지만 본다.)
//
// 서버를 띄우지 않고 소스를 텍스트로 읽어 검사한다 — 배선 실수는 런타임까지 가지 않아도 잡힌다.
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (relativePath) => readFileSync(join(root, relativePath), 'utf8')

const seoHelpers = read('src/shared/utils/seoHelpers.ts')
const app = read('src/App.tsx')
const browsePage = read('src/views-spa/VenueBrowsePage.tsx')

/** parsePath 의 venues 분기 본문만 떼어 낸다. */
function venueBranch() {
  const start = seoHelpers.indexOf("if (remaining[0] === 'venues')")
  assert.ok(start > 0, 'parsePath 에 venues 분기가 없다')
  // 다음 최상위 if 까지가 이 분기다.
  const rest = seoHelpers.slice(start)
  const end = rest.indexOf('\n  if (remaining[0] ===', 1)
  return end > 0 ? rest.slice(0, end) : rest
}

describe('장소 라우트 배선', () => {
  test('/venue-map 은 색인 대상이 아니다 — 빠뜨리면 새로고침만 404 난다', () => {
    const privateSet = seoHelpers.slice(
      seoHelpers.indexOf('function isKnownPrivatePath'),
      seoHelpers.indexOf('function isKnownAdminPath'),
    )
    assert.match(privateSet, /'venue-map'/, "isKnownPrivatePath 에 'venue-map' 이 없다")
    assert.match(privateSet, /'request\/venue'/, "isKnownPrivatePath 에 'request/venue' 가 없다")
  })

  test('장소 문서 페이지는 색인 대상이라 private 집합에 있으면 안 된다', () => {
    const privateSet = seoHelpers.slice(
      seoHelpers.indexOf('function isKnownPrivatePath'),
      seoHelpers.indexOf('function isKnownAdminPath'),
    )
    // 'venues' 단독이 들어가면 검색 유입을 받는 문서가 통째로 noindex 가 된다.
    assert.doesNotMatch(privateSet, /'venues'/, "'venues' 가 noindex 집합에 잘못 들어갔다")
  })

  test('parsePath 가 국가 코드와 장소 id 를 형태로 가른다', () => {
    const branch = venueBranch()
    // 숫자 = 장소 상세
    assert.match(branch, /\/\^\\d\+\$\/\.test\(remaining\[1\]\)/,
      '장소 id(숫자) 분기가 없다')
    // 영문 2자 = 국가
    assert.match(branch, /\/\^\[a-z\]\{2\}\$\/\.test\(remaining\[1\]\)/,
      '국가 코드(영문 2자) 분기가 없다')
    // 숫자 분기가 국가 분기보다 먼저여야 한다. 순서가 뒤집혀도 지금은 결과가 같지만,
    // 국가 정규식이 느슨해지는 순간 장소 id 가 국가로 먹힌다.
    assert.ok(
      branch.indexOf('^\\d+$') < branch.indexOf('^[a-z]{2}$'),
      '장소 id 분기가 국가 분기보다 먼저여야 한다',
    )
  })

  test('SPA 분기 규칙이 서버(parsePath)와 같다', () => {
    // 한쪽만 바뀌면 SPA 이동과 새로고침이 서로 다른 화면을 그린다.
    assert.match(browsePage, /\/\^\\d\+\$\/\.test\(segment\)/, 'SPA 에 숫자 분기가 없다')
    assert.match(browsePage, /\/\^\[a-z\]\{2\}\$\/i\.test\(segment\)/, 'SPA 에 국가 분기가 없다')
    assert.ok(
      browsePage.indexOf('^\\d+$') < browsePage.indexOf('^[a-z]{2}$'),
      'SPA 도 장소 id 를 먼저 판정해야 한다',
    )
  })

  test('parsePath 의 장소 상세·도시가 404 판정용 resourcePath 를 갖는다', () => {
    const branch = venueBranch()
    assert.match(branch, /resourcePath: `\/api\/venues\/\$\{remaining\[1\]\}`/,
      '장소 상세에 resourcePath 가 없어 없는 id 도 200 이 된다')
    assert.match(branch, /\/api\/venues\/countries\/\$\{remaining\[1\]\}\/cities\//,
      '도시에 resourcePath 가 없다')
  })

  test('알 수 없는 장소 하위 경로는 404 로 떨어진다', () => {
    assert.match(venueBranch(), /return \{ type: 'not-found', lang \}/,
      'venues 분기의 마지막이 not-found 가 아니다')
  })

  test('App.tsx 에 문서·앱·제보 라우트가 모두 등록돼 있다', () => {
    for (const path of ['venues', 'venues/:countryCode/:citySlug', 'venues/:segment',
                        'venue-map', 'request/venue']) {
      assert.ok(app.includes(`path="${path}"`), `App.tsx 에 ${path} 라우트가 없다`)
    }
  })

  test('도시 라우트가 :segment 보다 먼저 선언된다 — 뒤에 있으면 절대 매칭되지 않는다', () => {
    assert.ok(
      app.indexOf('path="venues/:countryCode/:citySlug"') < app.indexOf('path="venues/:segment"'),
      '세그먼트가 더 많은 라우트를 먼저 선언해야 한다',
    )
  })

  test('지도 앱은 EditorLayout 아래에 있다 — GNB·푸터가 붙으면 100dvh 계산이 깨진다', () => {
    const editorBlock = app.slice(
      app.indexOf('<Route element={<EditorLayout />}>'),
      app.indexOf('<Route element={<AdminRoute />}>'),
    )
    assert.match(editorBlock, /path="venue-map"/, 'venue-map 이 EditorLayout 밖에 있다')
  })

  test('관리자 장소 경로가 SSR 색인 판정에 등록돼 있다', () => {
    const adminSet = seoHelpers.slice(seoHelpers.indexOf('function isKnownAdminPath'))
    for (const path of ['venues', 'venues/cities', 'venues/requests']) {
      assert.ok(adminSet.includes(`'${path}'`), `isKnownAdminPath 에 ${path} 가 없다`)
    }
  })
})
