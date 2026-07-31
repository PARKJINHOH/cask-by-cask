/**
 * 산지 지도 기하 데이터 무결성 검증.
 *
 * 백엔드 `WineRegion` enum 이 산지 코드의 단일 소스이므로, 프론트 기하 데이터의 키가
 * enum 과 어긋나면 지도가 조용히 렌더되지 않는다. 그 불일치를 여기서 잡는다.
 *
 * 실행: npm run test:wine-region-map
 */
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const WEB_ROOT = join(HERE, '..')
const MAP_DIR = join(WEB_ROOT, 'src', 'domain', 'location', 'data', 'wineRegionMap')
const ENUM_PATH = join(
  WEB_ROOT, '..', 'caskbycask-api', 'src', 'main', 'java', 'com', 'caskbycask',
  'domain', 'spirit', 'entity', 'enums', 'WineRegion.java',
)

/**
 * 국가당 파일 크기 상한 (KB) — 빌더의 MAX_FILE_KB 와 같은 값.
 * 지도 데이터는 국가별 동적 import 로 지연 로딩되므로 초기 번들에는 포함되지 않지만,
 * 한 국가 청크가 이 선을 넘지 않도록 고정한다.
 */
const MAX_FILE_KB = 300

// ── 백엔드 enum 파싱 ────────────────────────────────────────────
const enumSrc = readFileSync(ENUM_PATH, 'utf8')
// 국가 코드는 ISO 3166-1 alpha-2 이며 스코틀랜드처럼 ISO 3166-2 코드(GB-SCT)도 쓴다.
// 마지막 인자 뒤가 ')' 또는 ',' 인 것은 카테고리 varargs 가 붙을 수 있기 때문이다.
const ENUM_RX =
  /^ {4}([A-Z][A-Z0-9_]+)\("([A-Z]{2}(?:-[A-Z]{2,3})?)", "([^"]*)", "([^"]*)", (null|"[A-Z0-9_]+")[,)]/gm
const catalog = new Map()
let m
while ((m = ENUM_RX.exec(enumSrc)) !== null) {
  catalog.set(m[1], {
    code: m[1],
    countryCode: m[2],
    parentCode: m[5] === 'null' ? null : m[5].replaceAll('"', ''),
  })
}

const mapFiles = existsSync(MAP_DIR)
  ? readdirSync(MAP_DIR).filter((f) => f.endsWith('.ts') && f !== 'types.ts' && f !== 'index.ts')
  : []

function loadMap(file) {
  const src = readFileSync(join(MAP_DIR, file), 'utf8')
  const start = src.indexOf('{', src.indexOf('_MAP'))
  const body = src.slice(start).replace(/;?\s*$/, '')
  return Function(`"use strict"; return (${body})`)()
}

const PATH_RX = /^(M-?[\d.]+,-?[\d.]+(L-?[\d.]+,-?[\d.]+)+Z)+$/
describe('백엔드 enum 파싱', () => {
  test('산지 카탈로그를 읽었다', () => {
    assert.ok(catalog.size > 100, `카탈로그 ${catalog.size}개 — enum 파싱 실패 의심`)
  })
})

describe('기하 데이터 파일', () => {
  test('최소 1개국이 생성되어 있다', () => {
    assert.ok(mapFiles.length > 0, 'npm run map:build 로 기하 데이터를 먼저 생성하세요')
  })
})

for (const file of mapFiles) {
  const map = loadMap(file)
  describe(`${map.countryCode} (${file})`, () => {
    test('필수 메타가 채워져 있다', () => {
      assert.match(map.viewBox, /^0 0 \d+ \d+$/)
      assert.ok(map.attribution.length > 0, '경계 데이터 출처 표기가 비어 있다')
      assert.ok(map.outlinePath.length > 0, '국토 실루엣이 비어 있다')
    })

    test('파일 크기가 상한 이내다', () => {
      const kb = readFileSync(join(MAP_DIR, file)).length / 1024
      assert.ok(kb <= MAX_FILE_KB, `${kb.toFixed(1)} KB > ${MAX_FILE_KB} KB`)
    })

    test('L1 코드가 모두 백엔드 enum 에 존재하고 해당 국가의 L1 이다', () => {
      for (const code of Object.keys(map.regions)) {
        const node = catalog.get(code)
        assert.ok(node, `enum 에 없는 코드: ${code}`)
        assert.equal(node.countryCode, map.countryCode, `국가 불일치: ${code}`)
        assert.equal(node.parentCode, null, `L1 이 아님: ${code}`)
      }
    })

    test('L2 코드가 모두 enum 에 존재하고 부모가 해당 L1 이다', () => {
      for (const [parent, zoom] of Object.entries(map.zooms)) {
        assert.ok(map.regions[parent], `확대 지도의 부모 L1 이 국가 지도에 없다: ${parent}`)
        assert.ok(zoom.outlinePath.length > 0, `확대 지도 실루엣이 비어 있다: ${parent}`)
        for (const code of Object.keys(zoom.regions)) {
          const node = catalog.get(code)
          assert.ok(node, `enum 에 없는 코드: ${code}`)
          assert.equal(node.parentCode, parent, `부모 불일치: ${code}`)
        }
      }
    })

    test('모든 path 가 유효한 SVG 문법이고 비어 있지 않다', () => {
      const shapes = [
        ...Object.entries(map.regions),
        ...Object.entries(map.zooms).flatMap(([p, z]) =>
          [[`${p}:outline`, { path: z.outlinePath }], ...Object.entries(z.regions)]),
      ]
      for (const [code, shape] of shapes) {
        assert.ok(shape.path.length > 0, `path 가 비어 있다: ${code}`)
        assert.match(shape.path, PATH_RX, `path 문법 오류: ${code}`)
      }
    })

    test('모든 marker 가 viewBox 안에 있고 bbox 가 유효하다', () => {
      const [, , w, h] = map.viewBox.split(' ').map(Number)
      const check = (code, shape) => {
        const { marker, bbox } = shape
        assert.ok(Array.isArray(marker) && marker.length === 2, `marker 형식 오류: ${code}`)
        const [x, y] = marker
        assert.ok(x >= 0 && x <= w, `marker x 범위 밖: ${code} (${x})`)
        assert.ok(y >= 0 && y <= h, `marker y 범위 밖: ${code} (${y})`)

        // bbox 는 확대 지도의 대상 중심 viewBox 계산에 쓰이므로 형식·범위가 정확해야 한다
        assert.ok(Array.isArray(bbox) && bbox.length === 4, `bbox 형식 오류: ${code}`)
        const [x0, y0, x1, y1] = bbox
        assert.ok(x1 > x0 && y1 > y0, `bbox 가 뒤집혔다: ${code} (${bbox})`)
        assert.ok(x0 >= 0 && y0 >= 0 && x1 <= w && y1 <= h, `bbox 범위 밖: ${code} (${bbox})`)
        // 핀은 대상 도형의 경계 상자 안에 있어야 한다
        assert.ok(x >= x0 - 0.1 && x <= x1 + 0.1, `marker 가 bbox 밖: ${code}`)
        assert.ok(y >= y0 - 0.1 && y <= y1 + 0.1, `marker 가 bbox 밖: ${code}`)
      }
      for (const [code, r] of Object.entries(map.regions)) check(code, r)
      for (const zoom of Object.values(map.zooms)) {
        for (const [code, r] of Object.entries(zoom.regions)) check(code, r)
      }
    })

    test('해당 국가의 enum L1 중 기하 데이터가 없는 항목을 보고한다', () => {
      const missing = [...catalog.values()]
        .filter((n) => n.countryCode === map.countryCode && n.parentCode === null)
        .map((n) => n.code)
        .filter((code) => !map.regions[code])
      // 미구축 L1 은 실패가 아니다 — 컴포넌트가 그레이스풀 폴백한다. 진행 상황만 남긴다.
      if (missing.length > 0) {
        console.log(`      ℹ ${map.countryCode} 미구축 L1 ${missing.length}개: ${missing.join(', ')}`)
      }
      assert.ok(true)
    })
  })
}
