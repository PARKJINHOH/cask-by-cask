/**
 * WineOriginMap 렌더 검증 — Next.js 프로덕션 빌드를 띄우지 않고,
 * 컴포넌트가 실제로 쓰는 기하 데이터·분기 규칙이 올바른지 확인한다.
 *
 * 컴포넌트의 JSX 자체는 단순 매핑이라, 버그가 생기는 지점은 다음 세 가지다.
 *   ① 산지 코드 → L1/L2 도출 (백엔드 wineRegion 응답 해석)
 *   ② 기하 데이터 조회 실패 시 폴백 (지도 미표시)
 *   ③ 국가 → 산지 → 세부 산지 단계별 진입 가능 여부 판정
 * 그 규칙을 컴포넌트와 동일한 식으로 재현해 고정한다.
 *
 * 실행: npm run test:wine-origin-map
 */
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const WEB_ROOT = join(HERE, '..')
const MAP_DIR = join(WEB_ROOT, 'src', 'domain', 'location', 'data', 'wineRegionMap')
const COMPONENT = join(WEB_ROOT, 'src', 'domain', 'location', 'components', 'WineOriginMap.tsx')

function loadMap(file) {
  const src = readFileSync(join(MAP_DIR, file), 'utf8')
  const start = src.indexOf('{', src.indexOf('_MAP'))
  return Function(`"use strict"; return (${src.slice(start).replace(/;?\s*$/, '')})`)()
}

const MAPS = {}
for (const file of readdirSync(MAP_DIR).filter((f) => f.endsWith('.ts') && !['types.ts', 'index.ts'].includes(f))) {
  const map = loadMap(file)
  MAPS[map.countryCode] = map
}

/** WineOriginMap 의 분기 규칙을 그대로 재현 */
function resolve(wineRegion) {
  const map = MAPS[wineRegion.countryCode]
  if (!map) return { rendered: false, reason: 'country-not-built' }

  const l1Code = wineRegion.parentCode ?? wineRegion.code
  const l2Code = wineRegion.parentCode ? wineRegion.code : null
  const l1Shape = map.regions[l1Code]
  if (!l1Shape) return { rendered: false, reason: 'l1-not-built' }

  const zoom = map.zooms[l1Code]
  const zoomShape = l2Code && zoom ? zoom.regions[l2Code] : undefined
  return {
    rendered: true,
    l1Code,
    l2Code,
    canShowRegion: true,
    canShowSubregion: !!zoomShape,
    attribution: map.attribution,
  }
}

const region = (code, countryCode, parentCode = null) => ({
  code, countryCode, parentCode, nameKo: 'x', nameEn: 'x', parentNameKo: 'y', parentNameEn: 'y',
})

describe('기하 데이터 로딩', () => {
  test('레지스트리에 등록된 국가가 있다', () => {
    assert.ok(Object.keys(MAPS).length > 0)
  })

  test('index.ts 가 생성된 모든 국가 파일을 로더로 등록한다', () => {
    const index = readFileSync(join(MAP_DIR, 'index.ts'), 'utf8')
    for (const code of Object.keys(MAPS)) {
      // 'GB-SCT' 처럼 하이픈이 있는 코드는 따옴표로 감싼 키가 되고,
      // export 이름도 하이픈을 언더스코어로 바꾼 식별자가 된다
      const ident = code.replace(/-/g, '_')
      assert.match(
        index,
        new RegExp(`'?${code}'?:\\s*\\(\\)\\s*=>\\s*import\\('\\./${code.toLowerCase()}'\\)`),
        `index.ts 에 ${code} 로더 등록 누락 — 지도가 조용히 표시되지 않는다`,
      )
      assert.match(index, new RegExp(`${ident}_MAP`), `${ident}_MAP 참조 누락`)
    }
  })

  test('로더는 국가별 동적 import 라 초기 번들에 들어가지 않는다', () => {
    const index = readFileSync(join(MAP_DIR, 'index.ts'), 'utf8')
    // 정적 import 로 기하 데이터를 끌어오면 코드 분할이 깨진다
    assert.doesNotMatch(
      index,
      /^import\s+\{[^}]*_MAP/m,
      '기하 데이터를 정적 import 하면 지연 로딩이 무효가 된다',
    )
    assert.match(index, /hasWineRegionMap/, '동기 지원 여부 판정 함수가 필요하다')
  })
})

describe('L1 만 선택된 경우', () => {
  test('확대 데이터가 없는 L1 도 국가 도형 안에서 산지 단계로 확대할 수 있다', () => {
    const r = resolve(region('FR_CHAMPAGNE', 'FR'))
    assert.equal(r.rendered, true)
    assert.equal(r.l1Code, 'FR_CHAMPAGNE')
    assert.equal(r.l2Code, null)
    assert.equal(r.canShowRegion, true)
    assert.equal(r.canShowSubregion, false)
  })

  test('확대 지도가 있는 L1 은 L2 미선택이어도 산지 지도로 들어갈 수 있다', () => {
    const r = resolve(region('FR_BORDEAUX', 'FR'))
    assert.equal(r.rendered, true)
    assert.equal(r.canShowRegion, true)
    assert.equal(r.canShowSubregion, false)
  })
})

describe('L2 까지 선택된 경우', () => {
  test('국가 → 산지 → 세부 산지 3단을 렌더한다', () => {
    const r = resolve(region('FR_BORDEAUX_MEDOC', 'FR', 'FR_BORDEAUX'))
    assert.equal(r.rendered, true)
    assert.equal(r.l1Code, 'FR_BORDEAUX')
    assert.equal(r.l2Code, 'FR_BORDEAUX_MEDOC')
    assert.equal(r.canShowRegion, true)
    assert.equal(r.canShowSubregion, true)
  })

  test('미국 AVA 도 3단으로 렌더된다', () => {
    const r = resolve(region('US_CALIFORNIA_NAPA_VALLEY', 'US', 'US_CALIFORNIA'))
    assert.equal(r.canShowRegion, true)
    assert.equal(r.canShowSubregion, true)
    assert.equal(r.l1Code, 'US_CALIFORNIA')
  })
})

describe('그레이스풀 폴백', () => {
  test('기하 데이터가 없는 국가는 지도를 렌더하지 않는다', () => {
    // 산지가 계속 추가되므로 실제 국가 코드를 예시로 쓰면 테스트가 곧 깨진다.
    // ISO 3166-1 이 사용자 지정용으로 영구 예약한 코드(AA·QM~QZ·XA~XZ·ZZ)를 쓴다.
    const unsupported = ['ZZ', 'XA', 'QM', 'AA'].find((cc) => !MAPS[cc])
    assert.ok(unsupported, '지도 미등록 국가 코드를 찾지 못했다 — 테스트를 갱신하세요')
    const r = resolve(region(`${unsupported}_SOMEWHERE`, unsupported))
    assert.equal(r.rendered, false)
    assert.equal(r.reason, 'country-not-built')
  })

  test('와인 13개국은 모두 지도를 갖는다 (커버리지 회귀 방지)', () => {
    const expected = ['FR', 'IT', 'ES', 'PT', 'DE', 'AT', 'HU', 'US', 'CL', 'AR', 'AU', 'NZ', 'ZA']
    const missing = expected.filter((cc) => !MAPS[cc])
    assert.deepEqual(missing, [], `지도가 빠진 국가: ${missing.join(', ')}`)
  })

  test('위스키·꼬냑 산지 국가도 모두 지도를 갖는다', () => {
    const expected = [
      'GB-SCT', 'GB-ENG', 'GB-WLS', 'GB-NIR', 'IE', 'JP', 'TW', 'KR', 'IN', 'CA',
      'SE', 'NL', 'DK', 'FI', 'IL',
      'CN', 'GR', 'GE', 'LB', 'UY',
    ]
    const missing = expected.filter((cc) => !MAPS[cc])
    assert.deepEqual(missing, [], `지도가 빠진 국가: ${missing.join(', ')}`)
  })

  test('꼬냑 크뤼가 프랑스 확대 지도에 들어 있다', () => {
    const zoom = MAPS.FR?.zooms?.FR_COGNAC
    assert.ok(zoom, 'FR_COGNAC 확대 지도 누락')
    assert.ok(zoom.regions.FR_COGNAC_GRANDE_CHAMPAGNE, '그랑드 샹파뉴 도형 누락')
    assert.equal(Object.keys(zoom.regions).length, 6, '꼬냑 크뤼는 6개다')
  })

  test('국가는 있지만 L1 기하가 없으면 렌더하지 않는다', () => {
    const r = resolve(region('FR_NOT_BUILT', 'FR'))
    assert.equal(r.rendered, false)
    assert.equal(r.reason, 'l1-not-built')
  })

  test('L2 기하가 아직 없어도 산지 단계까지는 렌더한다', () => {
    const r = resolve(region('FR_LANGUEDOC_FAKE', 'FR', 'FR_LANGUEDOC'))
    assert.equal(r.rendered, true)
    assert.equal(r.canShowRegion, true)
    assert.equal(r.canShowSubregion, false, 'L2 기하가 없으면 세부 산지 단계만 생략해야 한다')
  })
})

describe('출처 표기 · 접근성 · SSR', () => {
  test('모든 국가 지도가 출처 문구를 갖는다 (라이선스 요구사항)', () => {
    for (const [code, map] of Object.entries(MAPS)) {
      assert.ok(map.attribution && map.attribution.length > 3, `${code} attribution 누락`)
    }
  })

  const src = readFileSync(COMPONENT, 'utf8')

  test('출처 문구를 실제로 렌더한다', () => {
    assert.match(src, /originMap\.source/)
    assert.match(src, /map\.attribution/)
  })

  test('색상 외 정보 전달 수단(핀·라벨)과 a11y 속성을 갖춘다', () => {
    assert.match(src, /role="img"/)
    assert.match(src, /aria-label=/)
    assert.match(src, /<title>/)
    assert.match(src, /wom-pin/)
    assert.match(src, /wom-label/)
  })

  test('애니메이션은 마운트 후에만 부여된다 (초기 렌더를 막지 않도록)', () => {
    assert.match(src, /IntersectionObserver/)
    assert.match(src, /animate \? 'wom-animate' : ''/)
  })

  test('기하 데이터는 카드가 화면에 들어올 때 국가별로 지연 로딩된다', () => {
    assert.match(src, /WINE_REGION_MAP_LOADERS/, '로더 맵을 써야 코드 분할이 유지된다')
    assert.match(src, /hasWineRegionMap/, '미지원 국가는 데이터 없이 동기 판정해야 한다')
    assert.match(src, /setInView/, '뷰 진입 후에 로딩을 시작해야 한다')
    // 로딩 중에는 레이아웃 이동을 막는 자리를 잡아야 한다
    assert.match(src, /aspectRatio/, '로딩 자리에 지도와 같은 비율을 예약해야 한다')
    assert.match(src, /originMap\.loading/, '로딩 상태에 접근성 라벨이 필요하다')
  })

  test('지도 로딩 실패는 조용히 무시한다 (보조 정보이므로 페이지를 깨지 않는다)', () => {
    assert.match(src, /\.catch\(/)
  })

  test('전역 CSS 에 애니메이션 정의와 reduced-motion 대응이 있다', () => {
    const css = readFileSync(join(WEB_ROOT, 'src', 'index.css'), 'utf8')
    for (const kf of ['womZoneFill', 'womPinDrop', 'womLabelIn', 'womRingPulse']) {
      assert.match(css, new RegExp(`@keyframes ${kf}`), `${kf} 키프레임 누락`)
    }
    assert.match(css, /@media \(prefers-reduced-motion: reduce\)/)
    assert.match(css, /\.wom-region-trigger:hover/, '확대 가능한 산지의 마우스 오버 모션이 필요하다')
    assert.match(css, /\.wom-region-trigger:focus/, '키보드 포커스 모션이 필요하다')
  })

  test('국가·산지 인디케이터를 항상 표시하고 각 지도 단계로 이동할 수 있다', () => {
    assert.match(src, /label: countryLabel, targetView: 'country'/)
    assert.match(src, /label: l1Name, targetView: canShowRegion \? 'region'/)
    assert.match(src, /label: l2Name, targetView: canShowSubregion \? 'subregion'/)
    assert.match(src, /onClick=\{\(\) => setView\(part\.targetView!\)\}/)
    assert.match(src, /aria-current=/)
    assert.match(src, /originMap\.indicatorLabel/)
  })

  test('상세 페이지 진입 시 국가 단계에서 시작하고 주류가 바뀌면 지도를 새로 마운트한다', () => {
    assert.match(src, /useState<MapView>\('country'\)/)
    const detailPage = readFileSync(join(WEB_ROOT, 'src', 'views-spa', 'SpiritDetailPage.tsx'), 'utf8')
    assert.match(detailPage, /<WineOriginMap\s+key=\{spirit\.id\}/)
  })

  test('산지는 클릭·키보드로 확대할 수 있고 확대 화면에 국가 복귀 버튼이 있다', () => {
    assert.match(src, /wom-region-trigger/)
    assert.match(src, /onTargetClick/)
    assert.match(src, /e\.key === 'Enter' \|\| e\.key === ' '/)
    assert.match(src, /setView\('country'\)/)
    assert.match(src, /originMap\.back/)
  })

  test('지도 우측 상단 확대 안내 문구는 렌더하지 않고 접근성 이름으로만 사용한다', () => {
    assert.doesNotMatch(src, /\{clickable && targetClickLabel && \(/)
    assert.match(src, /'aria-label': targetClickLabel/)
  })

  test('인디케이터 포커스 링은 키보드 탐색에서만 표시한다', () => {
    assert.match(src, /outline-none focus-visible:ring-2/)
    assert.match(src, /focus-visible:ring-2/)
  })

  test('PC에서 산지 도형을 클릭하거나 누르고 있을 때 기본 검은 외곽선이 생기지 않는다', () => {
    assert.match(src, /e\.pointerType === 'mouse'/)
    assert.match(src, /WebkitTapHighlightColor: 'transparent'/)
    const css = readFileSync(join(WEB_ROOT, 'src', 'index.css'), 'utf8')
    assert.match(css, /\.wom-region-trigger:active[\s\S]*outline: none !important/)
  })
})
