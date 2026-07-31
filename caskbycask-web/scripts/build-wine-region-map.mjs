/**
 * 와인 산지 지도 기하 데이터 생성 — 개발 전용 (런타임에는 실행되지 않는다).
 *
 * 공개 산지/행정 경계 데이터를 내려받아
 *   ① 산지별로 구성 행정단위를 폴리곤 합집합(dissolve)
 *   ② 국가별 투영으로 viewBox 좌표로 변환
 *   ③ Douglas-Peucker 단순화
 *   ④ SVG path 문자열로 TS 파일에 베이킹
 * 한다. 산출물만 커밋되므로 사용자 브라우저는 지리 라이브러리·원본 데이터를 받지 않는다.
 *
 * 실행: npm run map:build            (전체)
 *       npm run map:build -- FR US   (일부 국가만)
 *
 * 원본 데이터는 .cache/wine-region-map/ 에 캐싱된다(gitignore 대상).
 */
import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as d3 from 'd3-geo'
import * as topojson from 'topojson-client'
import polygonClipping from 'polygon-clipping'

const HERE = dirname(fileURLToPath(import.meta.url))
const WEB_ROOT = join(HERE, '..')
const CACHE_DIR = join(WEB_ROOT, '.cache', 'wine-region-map')
const OUT_DIR = join(WEB_ROOT, 'src', 'domain', 'location', 'data', 'wineRegionMap')

const VB_W = 460
const VB_H = 400
const PAD_COUNTRY = 14
const PAD_ZOOM = 20
/**
 * viewBox px 기준 단순화 허용 오차 — **정밀도 우선** 설정.
 *
 * 지도는 최대 460 viewBox 폭으로 표시되고 고DPI 화면에서는 2배로 확대되므로,
 * 0.12~0.2 는 사실상 서브픽셀이다. 지도 데이터는 지연 로딩되므로 용량보다 형상을 우선한다.
 * 확대 지도의 배경 실루엣만 문맥용이라 조금 느슨하게 둔다.
 */
const TOL_COUNTRY = 0.15
const TOL_ZOOM = 0.1
const TOL_ZOOM_OUTLINE = 0.35
/** 이보다 작은 조각(px²)은 제거 — 렌더해도 보이지 않는 미세 슬리버만 걸러낸다 */
const MIN_AREA_COUNTRY = 0.35
const MIN_AREA_ZOOM = 0.12
const MIN_AREA_ZOOM_OUTLINE = 0.8
/** 좌표 소수점 자리수 — 0.01 viewBox 단위까지 보존 */
const COORD_PRECISION = 2
/**
 * 국가 파일 용량 상한(KB).
 *
 * 정밀도를 최대한 살리되 이 선은 넘지 않는다. 초과하면 해당 국가 설정의
 * `tolZoomOutline`·`minAreaCountry` 처럼 **배경 문맥 도형**부터 완화한다
 * (대상 산지 도형의 정밀도를 깎는 것은 마지막 수단).
 */
const MAX_FILE_KB = 300

// ═══════════════════════════════════════════════════════════════
//  캐시 다운로드
// ═══════════════════════════════════════════════════════════════
mkdirSync(CACHE_DIR, { recursive: true })

async function download(name, url, { binary = false } = {}) {
  const path = join(CACHE_DIR, name)
  if (!existsSync(path)) {
    process.stdout.write(`  ↓ ${name} ... `)
    const res = await fetch(url)
    if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`)
    const buf = Buffer.from(await res.arrayBuffer())
    // jsDelivr 은 20MB 초과 파일을 본문 대신 오류 문구로 응답한다 — 조용히 깨지지 않게 검출
    if (buf.length < 4096 && /File size exceeded/i.test(buf.toString('utf8'))) {
      throw new Error(`${url} → CDN 용량 제한. raw.githubusercontent.com 등 다른 경로를 쓰세요.`)
    }
    writeFileSync(path, buf)
    console.log(`${(buf.length / 1024 / 1024).toFixed(2)} MB`)
  }
  return binary ? readFileSync(path) : readFileSync(path, 'utf8')
}

const loadJson = async (name, url) => JSON.parse(await download(name, url))

// ═══════════════════════════════════════════════════════════════
//  기하 유틸
// ═══════════════════════════════════════════════════════════════

/** GeoJSON geometry → polygon-clipping 이 쓰는 다중 폴리곤 좌표 배열 */
function toMultiPolygonCoords(geometry) {
  if (!geometry) return []
  if (geometry.type === 'Polygon') return [geometry.coordinates]
  if (geometry.type === 'MultiPolygon') return geometry.coordinates
  if (geometry.type === 'GeometryCollection') {
    return geometry.geometries.flatMap(toMultiPolygonCoords)
  }
  return []
}

/**
 * 여러 feature 를 하나의 MultiPolygon 으로 합집합한다.
 * 인접 행정단위 사이의 내부 경계선을 없애 산지 하나의 깔끔한 외곽선을 얻는 것이 목적.
 */
function dissolve(features, label) {
  const polys = features.flatMap((f) => toMultiPolygonCoords(f.geometry))
  if (polys.length === 0) return null
  // 단일 행정단위(주·AVA 등)는 자기 폴리곤끼리 겹치지 않으므로 합집합이 불필요하다
  if (features.length <= 1 || polys.length === 1) return { type: 'MultiPolygon', coordinates: polys }
  try {
    const united = polygonClipping.union(polys[0], ...polys.slice(1))
    return { type: 'MultiPolygon', coordinates: united }
  } catch (e) {
    // 합집합이 실패하면 원본 폴리곤을 그대로 사용한다(내부 경계선이 남지만 형상은 정확)
    console.warn(`    ! dissolve 실패 (${label}) — 원본 폴리곤 유지: ${e.message}`)
    return { type: 'MultiPolygon', coordinates: polys }
  }
}

/** 합집합 없이 폴리곤만 이어붙인다 — 내부 경계선을 의도적으로 남길 때(예: 미국 주 경계) */
const concat = (features) => ({
  type: 'MultiPolygon',
  coordinates: features.flatMap((f) => toMultiPolygonCoords(f.geometry)),
})

/** 여러 geometry 를 하나의 FeatureCollection 으로 (fitExtent 용) */
const asCollection = (geometries) => ({
  type: 'FeatureCollection',
  features: geometries.filter(Boolean).map((geometry) => ({ type: 'Feature', geometry, properties: {} })),
})

/**
 * 투영 범위를 geometry 집합에 맞춘다.
 *
 * 폴리곤으로 fitExtent 하면 안 된다 — d3-geo 는 구면 폴리곤의 내부/외부를 링 winding 으로
 * 판별하는데, polygon-clipping 합집합 결과의 winding 은 그 규약과 달라 경계가 전 지구
 * ([[-180,-90],[180,90]])로 계산된다. 좌표를 MultiPoint 로 넘기면 winding 이 개입하지 않아
 * 항상 올바른 경계가 나온다.
 */
function fitProjection(projection, extent, geometries) {
  const coordinates = []
  for (const geometry of geometries) {
    if (!geometry) continue
    for (const poly of toMultiPolygonCoords(geometry)) {
      for (const ring of poly) {
        for (const coord of ring) coordinates.push(coord)
      }
    }
  }
  if (coordinates.length === 0) {
    throw new Error('fitProjection: 좌표가 없습니다')
  }
  return projection.fitExtent(extent, { type: 'MultiPoint', coordinates })
}

// ── Douglas-Peucker ────────────────────────────────────────────
function sqSegDist(p, a, b) {
  let x = a[0]
  let y = a[1]
  let dx = b[0] - x
  let dy = b[1] - y
  if (dx !== 0 || dy !== 0) {
    const t = ((p[0] - x) * dx + (p[1] - y) * dy) / (dx * dx + dy * dy)
    if (t > 1) { x = b[0]; y = b[1] } else if (t > 0) { x += dx * t; y += dy * t }
  }
  dx = p[0] - x
  dy = p[1] - y
  return dx * dx + dy * dy
}

function simplifyRing(points, tol) {
  if (points.length < 5) return points
  const sqTol = tol * tol
  const keep = new Uint8Array(points.length)
  keep[0] = 1
  keep[points.length - 1] = 1
  const stack = [[0, points.length - 1]]
  while (stack.length) {
    const [first, last] = stack.pop()
    let maxSq = 0
    let idx = -1
    for (let i = first + 1; i < last; i++) {
      const sq = sqSegDist(points[i], points[first], points[last])
      if (sq > maxSq) { maxSq = sq; idx = i }
    }
    if (maxSq > sqTol && idx > 0) {
      keep[idx] = 1
      stack.push([first, idx], [idx, last])
    }
  }
  return points.filter((_, i) => keep[i])
}

const ringArea = (pts) => {
  let a = 0
  for (let i = 0, n = pts.length, j = n - 1; i < n; j = i++) {
    a += pts[j][0] * pts[i][1] - pts[i][0] * pts[j][1]
  }
  return a / 2
}

/**
 * geometry(경위도) → 투영·단순화된 SVG path 문자열 + 투영된 링 목록.
 *
 * @param clip 있으면 이 사각형 [x0,y0,x1,y1] 과 겹치지 않는 링은 버린다.
 *             확대 지도의 상위 산지 외곽선처럼 대부분이 화면 밖인 경우 용량을 크게 줄인다.
 */
function bake(geometry, projection, tol, minArea, clip = null) {
  const parts = []
  const projectedRings = []
  for (const poly of toMultiPolygonCoords(geometry)) {
    for (const ring of poly) {
      const projected = []
      for (const coord of ring) {
        const p = projection(coord)
        if (p && Number.isFinite(p[0]) && Number.isFinite(p[1])) projected.push(p)
      }
      if (projected.length < 4) continue
      if (clip) {
        const [bx0, by0, bx1, by1] = bboxOf([projected])
        if (bx1 < clip[0] || bx0 > clip[2] || by1 < clip[1] || by0 > clip[3]) continue
      }
      const simp = simplifyRing(projected, tol)
      if (simp.length < 4) continue
      if (Math.abs(ringArea(simp)) < minArea) continue
      projectedRings.push(simp)
      parts.push(
        simp
          .map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(COORD_PRECISION)},${p[1].toFixed(COORD_PRECISION)}`)
          .join('') + 'Z',
      )
    }
  }
  return { path: parts.join(''), rings: projectedRings }
}

/** 투영된 링 목록의 경계 상자 [minX, minY, maxX, maxY] */
function bboxOf(rings) {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const ring of rings) {
    for (const [x, y] of ring) {
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }
  }
  if (!Number.isFinite(minX)) return [0, 0, VB_W, VB_H]
  return [minX, minY, maxX, maxY].map((v) => +v.toFixed(1))
}

// ── 라벨/핀 위치 ───────────────────────────────────────────────
function pointInRing(pt, ring) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if ((yi > pt[1]) !== (yj > pt[1])
      && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
  }
  return inside
}

/**
 * 핀을 놓을 지점을 정한다.
 * 오목한 산지(예: 메독처럼 긴 띠)에서 중심점이 도형 밖으로 나가지 않도록,
 * 면적이 가장 큰 링 안에서 격자 탐색으로 경계에서 가장 먼 점을 고른다.
 */
function pickMarker(rings) {
  if (rings.length === 0) return [VB_W / 2, VB_H / 2]
  const main = rings.reduce((a, b) => (Math.abs(ringArea(b)) > Math.abs(ringArea(a)) ? b : a))
  const xs = main.map((p) => p[0])
  const ys = main.map((p) => p[1])
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)

  const STEPS = 24
  let best = null
  let bestScore = -1
  for (let i = 1; i < STEPS; i++) {
    for (let j = 1; j < STEPS; j++) {
      const pt = [minX + ((maxX - minX) * i) / STEPS, minY + ((maxY - minY) * j) / STEPS]
      if (!pointInRing(pt, main)) continue
      // 경계에서 가장 먼 점 = 라벨이 도형 안에 안정적으로 들어가는 위치
      let minDist = Infinity
      for (let k = 0, m = main.length - 1; k < main.length; m = k++) {
        minDist = Math.min(minDist, sqSegDist(pt, main[m], main[k]))
      }
      if (minDist > bestScore) { bestScore = minDist; best = pt }
    }
  }
  if (best) return [+best[0].toFixed(1), +best[1].toFixed(1)]
  return [+((minX + maxX) / 2).toFixed(1), +((minY + maxY) / 2).toFixed(1)]
}

// ═══════════════════════════════════════════════════════════════
//  소스 어댑터
// ═══════════════════════════════════════════════════════════════

/** INAO AOC 아이레(코뮌 목록) + IGN 코뮌 경계 — 프랑스 */
async function loadFranceSource() {
  const csv = await download(
    'inao-aoc-communes.csv',
    'https://static.data.gouv.fr/resources/aires-geographiques-des-aoc-aop/20251009-122320/2025-10-09-comagri-communes-aires-ao.csv',
    { binary: true },
  )
  const text = new TextDecoder('windows-1252').decode(csv)

  // CI;Département;Commune;Art;"Aire géographique";IDA
  const aocToInsee = new Map()
  for (const line of text.split(/\r?\n/).slice(1)) {
    if (!line) continue
    const cells = []
    let cur = ''
    let inQuotes = false
    for (const ch of line) {
      if (ch === '"') { inQuotes = !inQuotes; continue }
      if (ch === ';' && !inQuotes) { cells.push(cur); cur = ''; continue }
      cur += ch
    }
    cells.push(cur)
    const insee = cells[0]
    const aoc = cells[4]
    if (!insee || !aoc) continue
    if (!aocToInsee.has(aoc)) aocToInsee.set(aoc, new Set())
    aocToInsee.get(aoc).add(insee)
  }

  // 정밀도 우선 — 사전 단순화된 'version-simplifiee' 대신 원해상도 코뮌 경계를 쓴다(45MB)
  const communes = await loadJson(
    'fr-communes-full.geojson',
    'https://raw.githubusercontent.com/gregoiredavid/france-geojson/master/communes.geojson',
  )
  const communeByInsee = new Map(communes.features.map((f) => [f.properties.code, f]))

  // 국토 실루엣도 원해상도 (609KB — 단순화판은 79KB 로 해안선이 뭉개진다)
  const outline = await loadJson(
    'fr-metropole-full.geojson',
    'https://cdn.jsdelivr.net/gh/gregoiredavid/france-geojson@master/metropole.geojson',
  )

  return {
    outlineGeometry: outline.features
      ? dissolve(outline.features, 'FR outline')
      : outline.geometry,
    /** 이름 오타·표기 차이를 한 번에 잡기 위해 미스는 모아서 보고한다 */
    misses: [],
    /**
     * 산지 선택자 → 구성 feature 목록.
     * `{ aoc: ['Bordeaux', ...] }`        — INAO 아이레 이름(정확 일치)
     * `{ departement: ['22', '29'] }`     — 데파르트망 번호(코뮌 INSEE 코드 앞 2자리).
     *   공식 산지 경계가 없는 경우(브르타뉴 위스키 등) 실제 행정구역으로 근사할 때 쓴다.
     */
    select(selector, label) {
      const insee = new Set()
      for (const name of selector.aoc ?? []) {
        const set = aocToInsee.get(name)
        if (!set) {
          const needle = name.toLowerCase().slice(0, 7)
          const near = [...aocToInsee.keys()]
            .filter((k) => k.toLowerCase().includes(needle))
            .slice(0, 4)
          this.misses.push({ label, name, near })
          continue
        }
        for (const code of set) insee.add(code)
      }
      for (const dep of selector.departement ?? []) {
        let hit = 0
        for (const code of communeByInsee.keys()) {
          if (String(code).startsWith(dep)) { insee.add(code); hit++ }
        }
        if (hit === 0) this.misses.push({ label, name: `departement ${dep}`, near: [] })
      }
      return [...insee].map((code) => communeByInsee.get(code)).filter(Boolean)
    },
  }
}

/**
 * 미국 — TTB AVA 경계(UC Davis, CC0) + Census 주·카운티 경계(us-atlas, 퍼블릭 도메인).
 *
 * 카탈로그 항목이 실제 AVA 면 AVA 경계를, "…카운티" 항목(소노마·산타바바라·멘도시노)은
 * 카운티 경계를 쓴다 — 둘 다 실제 공개 경계 데이터다.
 */
async function loadUsSource() {
  const atlas = await loadJson(
    'us-counties-10m.json',
    'https://cdn.jsdelivr.net/npm/us-atlas@3/counties-10m.json',
  )
  const states = topojson.feature(atlas, atlas.objects.states).features
  const counties = topojson.feature(atlas, atlas.objects.counties).features
  const stateByFips = new Map(states.map((f) => [String(f.id).padStart(2, '0'), f]))
  const countyByFips = new Map(counties.map((f) => [String(f.id).padStart(5, '0'), f]))

  // 본토(CONUS)만 — 알래스카·하와이·해외령을 포함하면 본토가 작아진다
  const NON_CONUS = new Set(['02', '15', '60', '66', '69', '72', '78'])
  const conus = states.filter((f) => !NON_CONUS.has(String(f.id).padStart(2, '0')))

  const avaCache = new Map()
  const loadAva = async (name) => {
    if (!avaCache.has(name)) {
      const geo = await loadJson(
        `ava-${name}.geojson`,
        `https://cdn.jsdelivr.net/gh/UCDavisLibrary/ava@master/avas/${name}.geojson`,
      )
      avaCache.set(name, geo.features ?? [geo])
    }
    return avaCache.get(name)
  }

  // 설정에 등장하는 AVA 를 미리 받아둔다 (select 가 동기 함수이므로)
  const prefetch = async (configs) => {
    for (const selectors of configs) {
      for (const selector of Object.values(selectors)) {
        for (const name of selector.ava ?? []) await loadAva(name)
      }
    }
  }

  return {
    // 주 경계선을 일부러 남긴다 — 미국 지도는 주 경계가 있어야 위치를 알아보기 쉽다
    outlineGeometry: concat(conus),
    misses: [],
    prefetch,
    select(selector, label) {
      const features = []
      for (const fips of selector.stateFips ?? []) {
        const f = stateByFips.get(fips)
        if (f) features.push(f)
        else this.misses.push({ label, name: `state ${fips}`, near: [] })
      }
      for (const fips of selector.countyFips ?? []) {
        const f = countyByFips.get(fips)
        if (f) features.push(f)
        else this.misses.push({ label, name: `county ${fips}`, near: [] })
      }
      for (const name of selector.ava ?? []) {
        const feats = avaCache.get(name)
        if (feats) features.push(...feats)
        else this.misses.push({ label, name: `ava ${name}`, near: [] })
      }
      return features
    },
  }
}

/**
 * 이탈리아 — ISTAT 행정경계 (openpolis/geojson-italy, CC-BY-4.0).
 *
 * L1 = 레조네(주), L2 = DOCG/DOC 를 구성하는 코무네 집합.
 * 코무네 목록이 곧 산지의 법적 범위이므로 합집합이 실제 산지 경계가 된다.
 */
async function loadItalySource() {
  const BASE = 'https://cdn.jsdelivr.net/gh/openpolis/geojson-italy@master/geojson'
  const regions = await loadJson('it-regions.geojson', `${BASE}/limits_IT_regions.geojson`)
  const provinces = await loadJson('it-provinces.geojson', `${BASE}/limits_IT_provinces.geojson`)
  // 38MB — jsDelivr 용량 제한을 넘어 raw 경로를 사용한다
  const comuni = await loadJson(
    'it-municipalities.geojson',
    'https://raw.githubusercontent.com/openpolis/geojson-italy/master/geojson/limits_IT_municipalities.geojson',
  )

  const regionByName = new Map(regions.features.map((f) => [f.properties.reg_name, f]))
  const provinceByName = new Map(provinces.features.map((f) => [f.properties.prov_name, f]))
  const comuneByName = new Map(comuni.features.map((f) => [f.properties.name, f]))

  return {
    outlineGeometry: concat(regions.features),
    misses: [],
    /** `{ region: [...] } | { province: [...] } | { comune: [...] }` */
    select(selector, label) {
      const features = []
      const pick = (map, names, kind) => {
        for (const name of names ?? []) {
          const f = map.get(name)
          if (f) { features.push(f); continue }
          const needle = name.toLowerCase().slice(0, 6)
          const near = [...map.keys()].filter((k) => k.toLowerCase().includes(needle)).slice(0, 4)
          this.misses.push({ label, name: `${kind} ${name}`, near })
        }
      }
      pick(regionByName, selector.region, 'region')
      pick(provinceByName, selector.province, 'province')
      pick(comuneByName, selector.comune, 'comune')
      return features
    },
  }
}

/**
 * 스페인 — IGN/INE 행정경계 (es-atlas, 데이터 출처 IGN·INE).
 *
 * L1 = 자치공동체(autonomous_regions), L2 = DO 를 구성하는 프로빈시아·무니시피오 집합.
 */
async function loadSpainSource() {
  const provTopo = await loadJson('es-provinces.json', 'https://cdn.jsdelivr.net/npm/es-atlas@0/es/provinces.json')
  const muniTopo = await loadJson(
    'es-municipalities.json',
    'https://cdn.jsdelivr.net/npm/es-atlas@0/es/municipalities.json',
  )
  const autonomous = topojson.feature(provTopo, provTopo.objects.autonomous_regions).features
  const provinces = topojson.feature(provTopo, provTopo.objects.provinces).features
  const municipalities = topojson.feature(muniTopo, muniTopo.objects[Object.keys(muniTopo.objects)[0]]).features

  const autoByName = new Map(autonomous.map((f) => [f.properties.name, f]))
  const provByName = new Map(provinces.map((f) => [f.properties.name, f]))
  // 무니시피오 이름은 중복될 수 있어 배열로 모은다 (예: 여러 주의 동명 마을)
  const muniByName = new Map()
  for (const f of municipalities) {
    const key = f.properties.name
    if (!muniByName.has(key)) muniByName.set(key, [])
    muniByName.get(key).push(f)
  }

  return {
    // 자치공동체 경계선을 남긴다 — 스페인은 자치공동체 구획이 위치 파악에 도움
    outlineGeometry: concat(autonomous),
    misses: [],
    /** `{ autonomous: [...] } | { province: [...] } | { municipality: [...] }` */
    select(selector, label) {
      const features = []
      const pickOne = (map, names, kind) => {
        for (const name of names ?? []) {
          const f = map.get(name)
          if (f) { features.push(f); continue }
          const needle = name.toLowerCase().slice(0, 5)
          const near = [...map.keys()].filter((k) => k.toLowerCase().includes(needle)).slice(0, 4)
          this.misses.push({ label, name: `${kind} ${name}`, near })
        }
      }
      pickOne(autoByName, selector.autonomous, 'autonomous')
      pickOne(provByName, selector.province, 'province')
      for (const name of selector.municipality ?? []) {
        const list = muniByName.get(name)
        if (list) { features.push(...list); continue }
        const needle = name.toLowerCase().slice(0, 5)
        const near = [...muniByName.keys()].filter((k) => k.toLowerCase().includes(needle)).slice(0, 4)
        this.misses.push({ label, name: `municipality ${name}`, near })
      }
      return features
    },
  }
}

/**
 * 칠레 — geoBoundaries ADM1(레히온)·ADM3(코무나), CC BY.
 *
 * 칠레 원산지 명칭(DO)은 법령상 코무나 목록으로 정의되므로 코무나 합집합이 실제 산지 경계다.
 * L1 권역은 소속 밸리(L2)들의 합집합으로 만든다 — 별도 행정 단위가 아니기 때문.
 */
async function loadChileSource() {
  const meta = await loadJson(
    'cl-adm3-meta.json',
    'https://www.geoboundaries.org/api/current/gbOpen/CHL/ADM3/',
  )
  // 정밀도 우선 — simplified(10MB) 대신 원해상도(172MB)를 쓴다. 확대 지도에서 차이가 크다
  const comunas = await loadJson('cl-comunas-full.geojson', meta.gjDownloadURL)
  const adm1Meta = await loadJson(
    'cl-adm1-meta.json',
    'https://www.geoboundaries.org/api/current/gbOpen/CHL/ADM1/',
  )
  // 국토 실루엣은 국가 지도 배경으로만 쓰여 simplified 로 충분하다(원본 141MB)
  const regions = await loadJson('cl-regions.geojson', adm1Meta.simplifiedGeometryGeoJSON)

  const byName = new Map(comunas.features.map((f) => [f.properties.shapeName, f]))

  return {
    outlineGeometry: concat(regions.features),
    misses: [],
    /** `{ comuna: [...] }` */
    select(selector, label) {
      const features = []
      for (const name of selector.comuna ?? []) {
        const f = byName.get(name)
        if (f) { features.push(f); continue }
        const needle = name.toLowerCase().slice(0, 5)
        const near = [...byName.keys()].filter((k) => k.toLowerCase().includes(needle)).slice(0, 4)
        this.misses.push({ label, name: `comuna ${name}`, near })
      }
      return features
    },
  }
}

/**
 * 호주 — Wine Australia 공식 GI(Geographical Indication) 경계 + geoBoundaries 주 경계.
 *
 * GI 는 호주 와인법이 정한 산지 경계 그 자체이므로 근사가 아니다.
 * Wine Australia Open Data Hub 가 GeoJSON 으로 공개한다.
 */
async function loadAustraliaSource() {
  const HUB = 'https://wineaustralia-opendata-wineaustralia.hub.arcgis.com/api/download/v1/items'
  const ITEM = '2dd4c385f0ed4d109c2e18ae99e819e2'
  const giRegions = await loadJson('au-gi-regions.geojson', `${HUB}/${ITEM}/geojson?layers=1`)

  const stateMeta = await loadJson(
    'au-adm1-meta.json',
    'https://www.geoboundaries.org/api/current/gbOpen/AUS/ADM1/',
  )
  const states = await loadJson('au-states.geojson', stateMeta.simplifiedGeometryGeoJSON)

  const giByName = new Map(giRegions.features.map((f) => [f.properties.GI_NAME, f]))
  const stateByName = new Map(states.features.map((f) => [f.properties.shapeName, f]))

  return {
    outlineGeometry: concat(states.features),
    misses: [],
    /** `{ state: [...] } | { gi: [...] }` */
    select(selector, label) {
      const features = []
      const pick = (map, names, kind) => {
        for (const name of names ?? []) {
          const f = map.get(name)
          if (f) { features.push(f); continue }
          const needle = name.toLowerCase().slice(0, 5)
          const near = [...map.keys()].filter((k) => k.toLowerCase().includes(needle)).slice(0, 4)
          this.misses.push({ label, name: `${kind} ${name}`, near })
        }
      }
      pick(stateByName, selector.state, 'state')
      pick(giByName, selector.gi, 'gi')
      return features
    },
  }
}

/**
 * 유럽 — Eurostat GISCO NUTS3 (© EuroGeographics, 출처 표기 조건으로 재사용 허용).
 *
 * 포르투갈·독일·오스트리아의 와인 재배지역은 주(州)보다 작아 NUTS3(현·군) 조합으로 만든다.
 * geoBoundaries 의 해당 국가 데이터는 ODbL/CC BY-SA 라 share-alike 부담이 있어 NUTS 를 택했다.
 *
 * @param cntrCode 대상 국가의 NUTS 국가 코드 (PT/DE/AT ...)
 */
function makeNutsSource(cntrCode) {
  return async () => {
    const nuts3 = await loadJson(
      'eu-nuts3.geojson',
      'https://gisco-services.ec.europa.eu/distribution/v2/nuts/geojson/NUTS_RG_01M_2024_4326_LEVL_3.geojson',
    )
    const own = nuts3.features.filter((f) => f.properties.CNTR_CODE === cntrCode)
    const byName = new Map(own.map((f) => [f.properties.NAME_LATN, f]))
    const byId = new Map(own.map((f) => [f.properties.NUTS_ID, f]))

    return {
      // 국토 실루엣은 해당 국가 NUTS3 전체 (내부 경계선을 남겨 위치 파악을 돕는다)
      outlineGeometry: concat(own),
      misses: [],
      /**
       * `{ nuts: ['Bernkastel-Wittlich', ...] }` — NAME_LATN 또는 NUTS_ID
       * `{ nutsPrefix: ['DE2'] }` — NUTS_ID 접두사(= 상위 NUTS 권역 전체).
       *   바이에른처럼 NUTS1 단위를 통째로 쓸 때 NUTS3 을 모두 나열하지 않게 한다.
       */
      select(selector, label) {
        const features = []
        for (const name of selector.nuts ?? []) {
          const f = byName.get(name) ?? byId.get(name)
          if (f) { features.push(f); continue }
          const needle = name.toLowerCase().slice(0, 5)
          const near = [...byName.keys()].filter((k) => k.toLowerCase().includes(needle)).slice(0, 4)
          this.misses.push({ label, name: `nuts ${name}`, near })
        }
        for (const prefix of selector.nutsPrefix ?? []) {
          const hit = own.filter((f) => f.properties.NUTS_ID.startsWith(prefix))
          if (hit.length === 0) {
            this.misses.push({ label, name: `nutsPrefix ${prefix}`, near: [] })
            continue
          }
          features.push(...hit)
        }
        return features
      },
    }
  }
}

/**
 * 평면 좌표 기준 다각형 내부 판정 (even-odd ray casting).
 *
 * d3 의 `geoContains` 는 구면 기하라서 링의 감김 방향(winding)에 결과가 뒤집힌다.
 * 소스 데이터의 방향은 제공자마다 달라 신뢰할 수 없으므로 — `fitProjection` 에서
 * MultiPoint 를 쓴 것과 같은 이유 — 여기서는 방향에 무관한 평면 판정을 쓴다.
 * 행정구역은 날짜변경선을 걸치지 않으므로 평면 계산으로 충분하다.
 */
function containsPlanar(feature, [x, y]) {
  const polygons = feature.geometry.type === 'MultiPolygon'
    ? feature.geometry.coordinates
    : [feature.geometry.coordinates]
  let inside = false
  for (const rings of polygons) {
    for (const ring of rings) {
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const [xi, yi] = ring[i]
        const [xj, yj] = ring[j]
        if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
      }
    }
  }
  return inside
}

/** 가장 큰 링의 정점 평균 — 대략적인 대표점. 감김 방향에 영향받지 않는다. */
function representativePoint(feature) {
  const polygons = feature.geometry.type === 'MultiPolygon'
    ? feature.geometry.coordinates
    : [feature.geometry.coordinates]
  let biggest = null
  for (const rings of polygons) {
    if (!biggest || rings[0].length > biggest.length) biggest = rings[0]
  }
  let sx = 0
  let sy = 0
  for (const [x, y] of biggest) { sx += x; sy += y }
  return [sx / biggest.length, sy / biggest.length]
}

/**
 * 스코틀랜드 소스 — 스카치 위스키 규정(SWR 2009 제10조)의 법정 지리적 표시를 구성한다.
 *
 * 세 가지 공개 데이터를 합친다.
 *   1. geoBoundaries GBR ADM1 — 스코틀랜드 실루엣 (CC BY 4.0)
 *   2. geoBoundaries GBR ADM2 — 의회구역(council area) 216개 중 스코틀랜드 32개 (OGL v3)
 *   3. ONS Open Geography Portal — 선거구(ward) 경계 (OGL v3)
 *      스페이사이드·캠벨타운이 법령상 ward 로 정의되므로 반드시 필요하다.
 *
 * 아일라 섬은 별도 데이터 없이 Argyll and Bute 멀티폴리곤 안에서
 * 섬 위의 한 점(보모어)을 포함하는 폴리곤만 골라 쓴다.
 */
async function loadScotlandSource() {
  const meta1 = await loadJson(
    'gbr-adm1-meta.json',
    'https://www.geoboundaries.org/api/current/gbOpen/GBR/ADM1/',
  )
  const outlineAll = await loadJson('gbr-adm1.geojson', pickMeta(meta1).simplifiedGeometryGeoJSON)
  const meta2 = await loadJson(
    'gbr-adm2-meta.json',
    'https://www.geoboundaries.org/api/current/gbOpen/GBR/ADM2/',
  )
  const councilsAll = await loadJson('gbr-adm2.geojson', pickMeta(meta2).simplifiedGeometryGeoJSON)

  const scotland = outlineAll.features.find((f) => f.properties.shapeName === 'Scotland')
  if (!scotland) throw new Error('GBR ADM1 에서 Scotland 를 찾지 못했다')

  // ADM2 는 영국 전역 216개 지방자치구다. 대표점 포함 판정으로 걸러내면
  // 단순화된 스코틀랜드 외곽선 밖으로 밀려나는 섬 자치구(오크니)가 누락되므로
  // 이름으로 색인만 해 두고 설정에 적은 이름으로 고른다(스코틀랜드 의회구역 이름은 영국 내에서 고유하다).
  const councils = new Map()
  for (const f of councilsAll.features) {
    councils.set(f.properties.shapeName, f)
  }

  // ONS ward 경계 — 필요한 ward 만 질의한다 (전국 ward 파일은 매우 크다)
  const WARDS = ['South Kintyre', 'Badenoch and Strathspey']
  const wardWhere = WARDS.map((w) => `WD24NM='${w}'`).join(' OR ')
  const wardUrl =
    'https://services1.arcgis.com/ESMARspQHYMw9BZ9/arcgis/rest/services'
    + '/Wards_December_2024_Boundaries_UK_BGC/FeatureServer/0/query'
    + `?where=${encodeURIComponent(wardWhere)}&outFields=WD24NM&outSR=4326&f=geojson`
  const wardGeo = await loadJson('gbr-scotch-wards.geojson', wardUrl)
  const wards = new Map(wardGeo.features.map((f) => [f.properties.WD24NM, f]))

  /**
   * 멀티폴리곤 안에서 지정한 점에 해당하는 섬 폴리곤만 떼어낸다.
   *
   * 정확한 내부 판정을 먼저 시도하고, 실패하면 <b>점을 감싸는 bbox 중 가장 작은</b>
   * 폴리곤을 고른다. 원본이 단순화되어 있어 해안 마을 좌표가 폴리곤 밖으로
   * 밀려나는 경우가 있기 때문이다(예: 로크 인달 안쪽의 보모어).
   */
  const islandOf = (feature, point, label) => {
    const polygons = feature.geometry.type === 'MultiPolygon'
      ? feature.geometry.coordinates
      : [feature.geometry.coordinates]
    const asFeature = (rings) => ({
      type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: rings },
    })

    for (const rings of polygons) {
      const probe = asFeature(rings)
      if (containsPlanar(probe, point)) return probe
    }

    let best = null
    for (const rings of polygons) {
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
      for (const [x, y] of rings[0]) {
        if (x < x0) x0 = x
        if (x > x1) x1 = x
        if (y < y0) y0 = y
        if (y > y1) y1 = y
      }
      if (point[0] < x0 || point[0] > x1 || point[1] < y0 || point[1] > y1) continue
      const area = (x1 - x0) * (y1 - y0)
      if (!best || area < best.area) best = { area, rings }
    }
    if (best) return asFeature(best.rings)
    throw new Error(`${label}: 지정한 점을 포함하는 섬 폴리곤을 찾지 못했다`)
  }

  return {
    outlineGeometry: scotland.geometry,
    misses: [],
    /**
     * `{ council: [...] }`  의회구역 이름
     * `{ ward: [...] }`     ONS ward 이름
     * `{ island: [{ council, at, name }] }`  의회구역 안의 섬을 점으로 지정
     */
    select(selector, label) {
      const features = []
      for (const name of selector.council ?? []) {
        const f = councils.get(name)
        if (f) { features.push(f); continue }
        const needle = name.toLowerCase().slice(0, 5)
        const near = [...councils.keys()].filter((k) => k.toLowerCase().includes(needle)).slice(0, 5)
        this.misses.push({ label, name: `council ${name}`, near })
      }
      for (const name of selector.ward ?? []) {
        const f = wards.get(name)
        if (f) { features.push(f); continue }
        this.misses.push({ label, name: `ward ${name}`, near: [...wards.keys()] })
      }
      for (const spec of selector.island ?? []) {
        const parent = councils.get(spec.council)
        if (!parent) {
          this.misses.push({ label, name: `island parent ${spec.council}`, near: [] })
          continue
        }
        try {
          features.push(islandOf(parent, spec.at, `${label} ${spec.name}`))
        } catch (e) {
          this.misses.push({ label, name: `island ${spec.name} — ${e.message}`, near: [] })
        }
      }
      return features
    },
  }
}

/**
 * 영국(잉글랜드·웨일스·북아일랜드) 소스 — 위스키·와인.
 * 스코틀랜드와 같은 geoBoundaries GBR ADM2(지방자치구, OGL v3)를 쓰되
 * 구성국별로 파일을 나눈다(국가 코드가 다르므로).
 *
 * @param country ISO 3166-2 코드 (GB-ENG / GB-WLS / GB-NIR)
 * @param adm1Name GBR ADM1 의 구성국 이름
 */
function makeUkSource(adm1Name) {
  return async () => {
    const meta1 = await loadJson(
      'gbr-adm1-meta.json',
      'https://www.geoboundaries.org/api/current/gbOpen/GBR/ADM1/',
    )
    const outlineAll = await loadJson('gbr-adm1.geojson', pickMeta(meta1).simplifiedGeometryGeoJSON)
    const meta2 = await loadJson(
      'gbr-adm2-meta.json',
      'https://www.geoboundaries.org/api/current/gbOpen/GBR/ADM2/',
    )
    const councilsAll = await loadJson('gbr-adm2.geojson', pickMeta(meta2).simplifiedGeometryGeoJSON)

    const outline = outlineAll.features.find((f) => f.properties.shapeName === adm1Name)
    if (!outline) throw new Error(`GBR ADM1 에서 ${adm1Name} 을 찾지 못했다`)

    // 이름은 영국 전역에서 고유하므로 전체를 색인해 두고 설정에 적은 이름으로 고른다
    const byName = new Map(councilsAll.features.map((f) => [f.properties.shapeName, f]))

    return {
      outlineGeometry: outline.geometry,
      misses: [],
      /** `{ council: ['Norfolk', ...] }` — 지방자치구 이름 */
      select(selector, label) {
        const features = []
        for (const name of selector.council ?? []) {
          const f = byName.get(name)
          if (f) { features.push(f); continue }
          const needle = name.toLowerCase().slice(0, 5)
          const near = [...byName.keys()].filter((k) => k.toLowerCase().includes(needle)).slice(0, 5)
          this.misses.push({ label, name: `council ${name}`, near })
        }
        return features
      },
    }
  }
}

/** geoBoundaries API 응답이 배열/객체 두 형태로 오므로 통일한다 */
function pickMeta(meta) {
  return Array.isArray(meta) ? meta[0] : meta
}

/**
 * 아일랜드 소스 — 카운티 경계.
 *
 * geoBoundaries IRL 은 ADM1 이 4개 프로빈스, ADM2 가 선거구(LEA)라 카운티가 없다.
 * 아이리시 위스키는 카운티(더블린·코크·라우스 등)로 산지를 말하므로
 * 아일랜드 측량청(OSi) 법정 카운티 경계(CC BY 4.0)를 쓴다.
 */
async function loadIrelandSource() {
  const meta1 = await loadJson(
    'irl-adm1-meta.json',
    'https://www.geoboundaries.org/api/current/gbOpen/IRL/ADM1/',
  )
  const outline = await loadJson('irl-adm1.geojson', pickMeta(meta1).simplifiedGeometryGeoJSON)

  const url = 'https://services6.arcgis.com/Vx9miIJ7oMVDgH95/arcgis/rest/services'
    + '/OSi_Counties/FeatureServer/0/query'
    + '?where=1%3D1&outFields=COUNTY&outSR=4326&f=geojson'
  const counties = await loadJson('irl-osi-counties.geojson', url)

  // 원본 표기는 대문자다 (DUBLIN) — 설정에서는 일반 표기를 쓰도록 대문자로 정규화해 색인한다
  const byName = new Map(counties.features.map((f) => [String(f.properties.COUNTY).toUpperCase(), f]))

  return {
    outlineGeometry: concat(outline.features),
    misses: [],
    /** `{ county: ['Dublin', ...] }` */
    select(selector, label) {
      const features = []
      for (const name of selector.county ?? []) {
        const f = byName.get(name.toUpperCase())
        if (f) { features.push(f); continue }
        const needle = name.toUpperCase().slice(0, 4)
        const near = [...byName.keys()].filter((k) => k.includes(needle)).slice(0, 5)
        this.misses.push({ label, name: `county ${name}`, near })
      }
      return features
    },
  }
}

/**
 * geoBoundaries 범용 어댑터 — 뉴질랜드·아르헨티나·남아공·헝가리.
 *
 * @param iso        ISO3 코드
 * @param outlineLvl 국토 실루엣에 쓸 레벨
 * @param unitLvl    L1 산지 구성에 쓸 레벨 (`{ unit: [...] }`)
 * @param subUnitLvl L2 세부산지 구성에 쓸 더 세밀한 레벨 (`{ subUnit: [...] }`) — 없으면 미사용
 */
function makeGeoBoundariesSource(iso, outlineLvl, unitLvl, subUnitLvl = null) {
  return async () => {
    const cache = new Map()
    const load = async (lvl) => {
      if (cache.has(lvl)) return cache.get(lvl)
      const meta = await loadJson(
        `${iso.toLowerCase()}-${lvl.toLowerCase()}-meta.json`,
        `https://www.geoboundaries.org/api/current/gbOpen/${iso}/${lvl}/`,
      )
      const geo = await loadJson(
        `${iso.toLowerCase()}-${lvl.toLowerCase()}.geojson`,
        meta.simplifiedGeometryGeoJSON,
      )
      cache.set(lvl, geo)
      return geo
    }
    const outline = await load(outlineLvl)
    const units = await load(unitLvl)
    const subUnits = subUnitLvl ? await load(subUnitLvl) : null

    const byName = new Map(units.features.map((f) => [f.properties.shapeName, f]))
    // 하위 레벨은 이름이 주(州) 경계를 넘어 중복된다 (예: 'San Rafael' 은 여러 주에 존재).
    // 따라서 이름만으로 고르지 않고 같은 이름 후보를 모두 모아 두고,
    // 상위 산지 도형 안에 들어오는 것만 선택한다.
    const subByName = new Map()
    for (const f of subUnits?.features ?? []) {
      const key = f.properties.shapeName
      if (!subByName.has(key)) subByName.set(key, [])
      subByName.get(key).push(f)
    }

    return {
      outlineGeometry: concat(outline.features),
      misses: [],
      /**
       * `{ unit: [...] }` = L1 레벨 이름들
       * `{ subUnit: [...], within: '상위 unit 이름' }` = 더 세밀한 레벨.
       * `within` 을 주면 그 상위 도형 안에 있는 후보만 채택해 동명이지역 오선택을 막는다.
       */
      select(selector, label) {
        const features = []
        for (const name of selector.unit ?? []) {
          const f = byName.get(name)
          if (f) { features.push(f); continue }
          const needle = name.toLowerCase().slice(0, 5)
          const near = [...byName.keys()].filter((k) => k.toLowerCase().includes(needle)).slice(0, 5)
          this.misses.push({ label, name: `${unitLvl} ${name}`, near })
        }

        const parent = selector.within ? byName.get(selector.within) : null
        if (selector.within && !parent) {
          this.misses.push({ label, name: `within ${selector.within}`, near: [] })
        }
        for (const name of selector.subUnit ?? []) {
          let candidates = subByName.get(name) ?? []
          if (parent && candidates.length > 1) {
            candidates = candidates.filter((f) => containsPlanar(parent, representativePoint(f)))
          }
          if (candidates.length === 1) { features.push(candidates[0]); continue }
          const needle = name.toLowerCase().slice(0, 5)
          const near = [...subByName.keys()].filter((k) => k.toLowerCase().includes(needle)).slice(0, 5)
          this.misses.push({
            label,
            name: `${subUnitLvl ?? 'subUnit'} ${name}${candidates.length > 1 ? ' (동명 후보 다수)' : ''}`,
            near,
          })
        }
        return features
      },
    }
  }
}

// ═══════════════════════════════════════════════════════════════
//  국가별 매핑 설정
//  ※ 산지 경계는 실제 공개 데이터에서만 만든다 — 수작업 도형 금지.
// ═══════════════════════════════════════════════════════════════
const FR = {
  countryCode: 'FR',
  attribution: 'INAO · IGN (Licence Ouverte 2.0)',
  projection: () => d3.geoConicConformal().rotate([-3, 0]).parallels([44, 49]),
  load: loadFranceSource,
  /**
   * 산지별 단순화 완화 — 칼바도스(노르망디 전역)·브르타뉴는 **법정 산지 경계가 아닌
   * 행정구역 근사**이고 해안선이 매우 복잡해 그대로 두면 국가 파일이 300KB 를 넘는다.
   * 정밀도가 중요한 와인 AOC·꼬냑 크뤼는 건드리지 않는다.
   */
  tolRegion: {
    FR_CALVADOS: 1.4,
    FR_BRETAGNE: 1.2,
  },
  minAreaRegion: {
    FR_CALVADOS: 2,
    FR_BRETAGNE: 2,
  },
  /**
   * 꼬냑 크뤼는 각각 수백 개 코뮌 규모의 대면적이라 확대 화면을 가득 채운다 —
   * 단순화 강도를 올려도 시각적 차이가 없고, 작은 와인 AOC 의 정밀도는 그대로 유지된다.
   */
  tolZoomRegion: {
    FR_COGNAC: 0.6,
  },
  // 확대 지도의 배경 실루엣은 순수 문맥 도형이다 — 꼬냑 추가로 늘어난 용량을 여기서 먼저 흡수한다
  tolZoomOutline: 1.0,
  /**
   * L1 = 지역 단위 AOC 아이레. 해당 지역을 대표하는 광역 AOC 를 사용한다.
   * 광역 AOC 가 없는 지역(쉬드우에스트·루아르 등)은 소속 AOC 들의 합집합으로 만든다.
   */
  l1: {
    FR_BORDEAUX: { aoc: ['Bordeaux'] },
    FR_BOURGOGNE: { aoc: ['Bourgogne'] },
    FR_CHAMPAGNE: { aoc: ['Champagne'] },
    // 알자스 AOC 단독 아이레가 데이터셋에 없어 같은 포도밭 구역을 쓰는 Crémant d'Alsace 로 대체
    FR_ALSACE: { aoc: ["Crémant d'Alsace"] },
    FR_LOIRE: { aoc: ['Muscadet', 'Anjou', 'Saumur (vins tranquilles blancs et rosés)',
      'Saumur (vins tranquilles rouges)', 'Touraine', 'Sancerre',
      'Pouilly-Fumé ou Blanc Fumé de Pouilly et Pouilly-sur-Loire', 'Vouvray',
      'Chinon', 'Bourgueil', 'Menetou-Salon', 'Quincy', 'Reuilly', 'Coteaux du Layon'] },
    FR_RHONE: { aoc: ['Côtes du Rhône'] },
    FR_BEAUJOLAIS: { aoc: ['Beaujolais'] },
    FR_PROVENCE: { aoc: ['Côtes de Provence', "Coteaux d'Aix-en-Provence", 'Bandol', 'Cassis',
      'Bellet', 'Coteaux Varois en Provence', 'Palette'] },
    FR_LANGUEDOC: { aoc: ['Languedoc'] },
    FR_SUD_OUEST: { aoc: ['Cahors', 'Madiran', 'Jurançon', 'Gaillac', 'Bergerac', 'Fronton',
      'Marcillac', 'Irouléguy', 'Béarn', 'Buzet', 'Côtes de Duras', 'Monbazillac',
      'Pacherenc du Vic-Bilh'] },
    FR_JURA: { aoc: ['Côtes du Jura'] },
    FR_SAVOIE: { aoc: ['Vin de Savoie'] },
    FR_CORSE: { aoc: ['Vin de Corse ou Corse'] },

    // ── 꼬냑 — INAO 가 코뮌 목록으로 정한 법정 구역 ──────────────
    FR_COGNAC: { aoc: ['Cognac ou Eau-de-vie de Cognac ou Eau-de-vie des Charentes'] },
    // ── 그 밖의 브랜디 산지 ─────────────────────────────────────
    FR_ARMAGNAC: { aoc: ['Armagnac'] },
    FR_CALVADOS: { aoc: ['Calvados'] },
    // 브르타뉴에는 법정 위스키 산지가 없어 4개 데파르트망으로 근사한다
    // (22 코트다르모르 · 29 피니스테르 · 35 일에빌렌 · 56 모르비앙)
    FR_BRETAGNE: { departement: ['22', '29', '35', '56'] },
  },
  /** L2 = 세부 AOC 아이레 */
  l2: {
    FR_BORDEAUX_MEDOC: { aoc: ['Médoc', 'Haut-Médoc'] },
    FR_BORDEAUX_SAINT_EMILION: { aoc: ['Saint-Emilion', 'Saint-Emilion grand cru'] },
    FR_BORDEAUX_POMEROL: { aoc: ['Pomerol'] },
    FR_BORDEAUX_GRAVES: { aoc: ['Graves'] },
    FR_BORDEAUX_SAUTERNES: { aoc: ['Sauternes'] },
    FR_BORDEAUX_ENTRE_DEUX_MERS: { aoc: ['Entre-deux-Mers'] },

    FR_BOURGOGNE_CHABLIS: { aoc: ['Chablis'] },
    FR_BOURGOGNE_COTE_DE_NUITS: { aoc: ['Côte de Nuits-Villages', 'Gevrey-Chambertin',
      'Vosne-Romanée', 'Nuits-Saint-Georges', 'Chambolle-Musigny', 'Morey-Saint-Denis',
      'Fixin', 'Marsannay'] },
    FR_BOURGOGNE_COTE_DE_BEAUNE: { aoc: ['Côte de Beaune', 'Beaune', 'Pommard', 'Volnay',
      'Meursault', 'Puligny-Montrachet', 'Chassagne-Montrachet', 'Aloxe-Corton',
      'Savigny-lès-Beaune'] },
    FR_BOURGOGNE_COTE_CHALONNAISE: { aoc: ['Mercurey', 'Rully', 'Givry', 'Montagny', 'Bouzeron'] },
    FR_BOURGOGNE_MACONNAIS: { aoc: ['Mâcon', 'Pouilly-Fuissé', 'Saint-Véran', 'Viré-Clessé'] },

    FR_LOIRE_MUSCADET: { aoc: ['Muscadet'] },
    FR_LOIRE_ANJOU: { aoc: ['Anjou'] },
    FR_LOIRE_VOUVRAY: { aoc: ['Vouvray'] },
    FR_LOIRE_SANCERRE: { aoc: ['Sancerre'] },

    FR_RHONE_NORTHERN: { aoc: ['Côte Rôtie', 'Condrieu', 'Hermitage', 'Crozes-Hermitage',
      'Cornas', 'Saint-Joseph', 'Saint-Péray'] },
    FR_RHONE_SOUTHERN: { aoc: ['Châteauneuf-du-Pape', 'Gigondas', 'Vacqueyras', 'Tavel',
      'Lirac', 'Beaumes de Venise', 'Rasteau'] },

    // ── 꼬냑 6개 크뤼 (INAO 법정 구역) ──────────────────────────
    FR_COGNAC_GRANDE_CHAMPAGNE: { aoc: ['Cognac Grande Champagne ou Grande Fine Champagne'] },
    FR_COGNAC_PETITE_CHAMPAGNE: { aoc: ['Cognac Petite Champagne ou Petite Fine Champagne'] },
    FR_COGNAC_BORDERIES: { aoc: ['Cognac Borderies'] },
    FR_COGNAC_FINS_BOIS: { aoc: ['Cognac Fins Bois'] },
    FR_COGNAC_BONS_BOIS: { aoc: ['Cognac Bons Bois'] },
    FR_COGNAC_BOIS_ORDINAIRES: { aoc: ['Cognac Bois ordinaires ou Bois à terroirs'] },
  },
}

const US = {
  countryCode: 'US',
  attribution: 'TTB/UC Davis AVA (CC0) · U.S. Census Bureau',
  // 미국 본토 표준 투영 (Albers Equal Area Conic)
  projection: () => d3.geoAlbers().rotate([96, 0]).parallels([29.5, 45.5]),
  load: loadUsSource,
  // 해안의 미세 섬들은 배경 문맥일 뿐이라 걸러낸다 (AVA 도형 정밀도는 건드리지 않는다)
  minAreaCountry: 4,
  tolCountry: 0.22,
  /** L1 = 주 (Census FIPS) — 와인 주와 위스키 주가 같은 소스를 공유한다 */
  l1: {
    US_CALIFORNIA: { stateFips: ['06'] },
    US_OREGON: { stateFips: ['41'] },
    US_WASHINGTON: { stateFips: ['53'] },
    US_NEW_YORK: { stateFips: ['36'] },

    // 위스키(버번·라이·테네시) — 기존 주 경계 재사용
    US_KENTUCKY: { stateFips: ['21'] },
    US_TENNESSEE: { stateFips: ['47'] },
    US_INDIANA: { stateFips: ['18'] },
    US_TEXAS: { stateFips: ['48'] },
    US_PENNSYLVANIA: { stateFips: ['42'] },
    US_COLORADO: { stateFips: ['08'] },
    US_VIRGINIA: { stateFips: ['51'] },
    US_VERMONT: { stateFips: ['50'] },
    US_UTAH: { stateFips: ['49'] },
    US_MARYLAND: { stateFips: ['24'] },
  },
  /**
   * L2 = 실제 AVA 경계. 단 카탈로그 이름이 "…카운티"인 항목은 카운티 경계를 쓴다
   * (소노마 카운티·산타바바라 카운티·멘도시노 카운티는 AVA 가 아니라 행정 카운티다).
   */
  l2: {
    US_CALIFORNIA_NAPA_VALLEY: { ava: ['napa_valley'] },
    US_CALIFORNIA_SONOMA: { countyFips: ['06097'] },
    US_CALIFORNIA_MENDOCINO: { countyFips: ['06045'] },
    US_CALIFORNIA_LODI: { ava: ['lodi'] },
    US_CALIFORNIA_PASO_ROBLES: { ava: ['paso_robles'] },
    US_CALIFORNIA_SANTA_BARBARA: { countyFips: ['06083'] },

    US_OREGON_WILLAMETTE_VALLEY: { ava: ['willamette_valley'] },

    US_WASHINGTON_COLUMBIA_VALLEY: { ava: ['columbia_valley'] },
    US_WASHINGTON_WALLA_WALLA: { ava: ['walla_walla_valley'] },

    US_NEW_YORK_FINGER_LAKES: { ava: ['finger_lakes'] },
    US_NEW_YORK_LONG_ISLAND: { ava: ['long_island'] },
  },
}

const IT = {
  countryCode: 'IT',
  attribution: 'ISTAT · Openpolis (CC BY 4.0)',
  projection: () => d3.geoConicConformal().rotate([-12, 0]).parallels([38, 44]),
  load: loadItalySource,
  /** L1 = 레조네(주) — ISTAT 정식 표기를 사용한다 */
  l1: {
    IT_PIEMONTE: { region: ['Piemonte'] },
    IT_TOSCANA: { region: ['Toscana'] },
    IT_VENETO: { region: ['Veneto'] },
    IT_LOMBARDIA: { region: ['Lombardia'] },
    IT_TRENTINO_ALTO_ADIGE: { region: ['Trentino-Alto Adige/Südtirol'] },
    IT_FRIULI: { region: ['Friuli-Venezia Giulia'] },
    IT_EMILIA_ROMAGNA: { region: ['Emilia-Romagna'] },
    IT_MARCHE: { region: ['Marche'] },
    IT_UMBRIA: { region: ['Umbria'] },
    IT_ABRUZZO: { region: ['Abruzzo'] },
    IT_CAMPANIA: { region: ['Campania'] },
    IT_PUGLIA: { region: ['Puglia'] },
    IT_SICILIA: { region: ['Sicilia'] },
    IT_SARDEGNA: { region: ['Sardegna'] },
  },
  /**
   * L2 = DOCG/DOC 를 구성하는 코무네 집합 (법령상 생산 구역).
   * 아스티 DOCG 는 3개 주(州)에 걸친 광역 산지라 아스티 현(縣) 경계로 근사한다.
   */
  l2: {
    IT_PIEMONTE_BAROLO: { comune: ['Barolo', 'La Morra', "Monforte d'Alba", "Serralunga d'Alba",
      'Castiglione Falletto', 'Novello', 'Verduno', 'Grinzane Cavour', "Diano d'Alba",
      'Cherasco', 'Roddi'] },
    IT_PIEMONTE_BARBARESCO: { comune: ['Barbaresco', 'Neive', 'Treiso'] },
    IT_PIEMONTE_ASTI: { province: ['Asti'] },

    IT_TOSCANA_CHIANTI_CLASSICO: { comune: ['Greve in Chianti', 'Radda in Chianti',
      'Gaiole in Chianti', 'Castellina in Chianti', 'Castelnuovo Berardenga',
      'San Casciano in Val di Pesa', 'Barberino Tavarnelle', 'Poggibonsi'] },
    IT_TOSCANA_MONTALCINO: { comune: ['Montalcino'] },
    IT_TOSCANA_MONTEPULCIANO: { comune: ['Montepulciano'] },
    IT_TOSCANA_BOLGHERI: { comune: ['Castagneto Carducci'] },

    IT_VENETO_VALPOLICELLA: { comune: ['Marano di Valpolicella', 'Fumane',
      'Negrar di Valpolicella', 'San Pietro in Cariano', "Sant'Ambrogio di Valpolicella",
      "Sant'Anna d'Alfaedo", 'Dolcè', 'Grezzana', 'Pescantina', 'Cerro Veronese',
      'Tregnago', 'Illasi', 'Mezzane di Sotto', 'Lavagno', 'San Martino Buon Albergo'] },
    IT_VENETO_SOAVE: { comune: ['Soave', "Monteforte d'Alpone", 'Caldiero',
      'Colognola ai Colli', 'Cazzano di Tramigna', 'Montecchia di Crosara', 'Roncà',
      'San Giovanni Ilarione', 'Vestenanova'] },
    IT_VENETO_PROSECCO: { comune: ['Conegliano', 'San Vendemiano', 'Colle Umberto',
      'Vittorio Veneto', 'Tarzo', 'Cison di Valmarino', 'San Pietro di Feletto',
      'Refrontolo', 'Pieve di Soligo', 'Farra di Soligo', 'Follina', 'Miane', 'Vidor',
      'Valdobbiadene', 'Segusino', 'Susegana', 'Santa Lucia di Piave'] },
  },
}

const ES = {
  countryCode: 'ES',
  attribution: 'IGN · INE (es-atlas)',
  projection: () => d3.geoConicConformal().rotate([3, 0]).parallels([38, 42]),
  load: loadSpainSource,
  /** L1 = 자치공동체 (es-atlas autonomous_regions 표기) */
  l1: {
    ES_RIOJA: { autonomous: ['La Rioja'] },
    ES_CASTILLA_Y_LEON: { autonomous: ['Castilla y León'] },
    ES_CATALUNYA: { autonomous: ['Cataluña/Catalunya'] },
    ES_GALICIA: { autonomous: ['Galicia'] },
    ES_ANDALUCIA: { autonomous: ['Andalucía'] },
    ES_NAVARRA: { autonomous: ['Comunidad Foral de Navarra'] },
    ES_ARAGON: { autonomous: ['Aragón'] },
    ES_VALENCIA: { autonomous: ['Comunitat Valenciana'] },
    ES_CASTILLA_LA_MANCHA: { autonomous: ['Castilla-La Mancha'] },
    ES_MURCIA: { autonomous: ['Región de Murcia'] },
  },
  /**
   * L2 = DO 구성 무니시피오.
   * DO 마다 수십~백여 개 무니시피오가 법령으로 지정돼 있어, 목록이 짧고 확실한 DO 만 구축한다.
   * 나머지는 국가 지도만 표시되고(그레이스풀 폴백) 추후 목록을 채우면 확대 지도가 붙는다.
   */
  l2: {
    // 프리오라트 DOQ — 11개 무니시피오
    ES_CATALUNYA_PRIORAT: { municipality: ['Bellmunt del Priorat', 'Gratallops', 'El Lloar',
      'La Morera de Montsant', 'Poboleda', 'Porrera', 'Torroja del Priorat', 'La Vilella Alta',
      'La Vilella Baixa', 'Falset', 'El Molar'] },
    // 마르코 데 헤레스 — 9개 무니시피오
    ES_ANDALUCIA_JEREZ: { municipality: ['Jerez de la Frontera', 'El Puerto de Santa María',
      'Sanlúcar de Barrameda', 'Trebujena', 'Chipiona', 'Rota', 'Puerto Real',
      'Chiclana de la Frontera', 'Lebrija'] },
  },
}

const CL = {
  countryCode: 'CL',
  attribution: 'geoBoundaries (CC BY 3.0 IGO)',
  // 칠레는 남부 피오르드·섬이 수천 개다. 와인 산지와 무관한 배경이라 국토 실루엣만 완화한다
  // (밸리 DO 도형은 전역 정밀 설정을 그대로 유지)
  tolCountry: 0.45,
  minAreaCountry: 4,
  projection: () => d3.geoTransverseMercator().rotate([71, 35]),
  load: loadChileSource,
  /** L1 권역 = 소속 밸리(L2) 코무나 전체의 합집합 */
  l1: {
    CL_COQUIMBO: { comuna: ['Vicuña', 'La Serena', 'Paihuano', 'Andacollo',
      'Ovalle', 'Monte Patria', 'Punitaqui', 'Río Hurtado', 'Combarbalá',
      'Salamanca', 'Illapel', 'Los Vilos', 'Canela'] },
    CL_ACONCAGUA: { comuna: ['San Felipe', 'Panquehue', 'Catemu', 'Santa María', 'Llaillay',
      'Putaendo', 'Calle Larga', 'San Esteban', 'Rinconada',
      'Casablanca',
      'Cartagena', 'San Antonio', 'Santo Domingo', 'Algarrobo', 'El Quisco', 'El Tabo'] },
    CL_CENTRAL_VALLEY: { comuna: ['Maipú', 'Buin', 'Isla de Maipo', 'Talagante', 'Peñaflor',
      'Pirque', 'Puente Alto', 'Calera de Tango', 'Padre Hurtado', 'Melipilla', 'María Pinto',
      'Rancagua', 'Requínoa', 'Rengo', 'Machalí', 'Graneros', 'Codegua', 'Mostazal', 'Coltauco',
      'Doñihue', 'Olivar', 'Quinta de Tilcoco', 'Malloa', 'Coinco', 'Las Cabras', 'Peumo',
      'Pichidegua', 'San Vicente',
      'Santa Cruz', 'Chimbarongo', 'Nancagua', 'Palmilla', 'Peralillo', 'Placilla',
      'San Fernando', 'Lolol', 'Pumanque', 'Marchigüe', 'Paredones', 'Litueche', 'La Estrella',
      'Navidad',
      'Curicó', 'Teno', 'Romeral', 'Molina', 'Sagrada Familia', 'Rauco', 'Hualañé', 'Licantén',
      'Vichuquén',
      'Talca', 'San Clemente', 'Pencahue', 'Maule', 'San Rafael', 'Curepto', 'Constitución',
      'Empedrado', 'Río Claro', 'Pelarco', 'Linares', 'San Javier', 'Villa Alegre',
      'Yerbas Buenas', 'Colbún', 'Longaví', 'Retiro', 'Parral', 'Cauquenes', 'Chanco',
      'Pelluhue'] },
    CL_SOUTHERN: { comuna: ['Chillán', 'Bulnes', 'Quillón', 'Portezuelo', 'Coelemu', 'Ranquil',
      'Ñiquén', 'San Carlos', 'Quirihue', 'Treguaco', 'Ninhue',
      'Yumbel', 'Mulchén', 'Nacimiento', 'Negrete', 'Laja', 'San Rosendo', 'Los Angeles',
      'Traiguén', 'Angol', 'Collipulli', 'Renaico', 'Purén', 'Los Sauces', 'Lumaco'] },
  },
  /** L2 = 밸리 DO — 법령상 코무나 목록 */
  l2: {
    CL_COQUIMBO_ELQUI: { comuna: ['Vicuña', 'La Serena', 'Paihuano', 'Andacollo'] },
    CL_COQUIMBO_LIMARI: { comuna: ['Ovalle', 'Monte Patria', 'Punitaqui', 'Río Hurtado', 'Combarbalá'] },
    CL_COQUIMBO_CHOAPA: { comuna: ['Salamanca', 'Illapel', 'Los Vilos', 'Canela'] },

    CL_ACONCAGUA_VALLEY: { comuna: ['San Felipe', 'Panquehue', 'Catemu', 'Santa María',
      'Llaillay', 'Putaendo', 'Calle Larga', 'San Esteban', 'Rinconada'] },
    CL_ACONCAGUA_CASABLANCA: { comuna: ['Casablanca'] },
    CL_ACONCAGUA_SAN_ANTONIO: { comuna: ['Cartagena', 'San Antonio', 'Santo Domingo',
      'Algarrobo', 'El Quisco', 'El Tabo'] },

    CL_CENTRAL_VALLEY_MAIPO: { comuna: ['Maipú', 'Buin', 'Isla de Maipo', 'Talagante',
      'Peñaflor', 'Pirque', 'Puente Alto', 'Calera de Tango', 'Padre Hurtado', 'Melipilla',
      'María Pinto'] },
    CL_CENTRAL_VALLEY_CACHAPOAL: { comuna: ['Rancagua', 'Requínoa', 'Rengo', 'Machalí',
      'Graneros', 'Codegua', 'Mostazal', 'Coltauco', 'Doñihue', 'Olivar', 'Quinta de Tilcoco',
      'Malloa', 'Coinco', 'Las Cabras', 'Peumo', 'Pichidegua', 'San Vicente'] },
    CL_CENTRAL_VALLEY_COLCHAGUA: { comuna: ['Santa Cruz', 'Chimbarongo', 'Nancagua', 'Palmilla',
      'Peralillo', 'Placilla', 'San Fernando', 'Lolol', 'Pumanque', 'Marchigüe', 'Paredones',
      'Litueche', 'La Estrella', 'Navidad'] },
    CL_CENTRAL_VALLEY_CURICO: { comuna: ['Curicó', 'Teno', 'Romeral', 'Molina',
      'Sagrada Familia', 'Rauco', 'Hualañé', 'Licantén', 'Vichuquén'] },
    CL_CENTRAL_VALLEY_MAULE: { comuna: ['Talca', 'San Clemente', 'Pencahue', 'Maule',
      'San Rafael', 'Curepto', 'Constitución', 'Empedrado', 'Río Claro', 'Pelarco', 'Linares',
      'San Javier', 'Villa Alegre', 'Yerbas Buenas', 'Colbún', 'Longaví', 'Retiro', 'Parral',
      'Cauquenes', 'Chanco', 'Pelluhue'] },

    CL_SOUTHERN_ITATA: { comuna: ['Chillán', 'Bulnes', 'Quillón', 'Portezuelo', 'Coelemu',
      'Ranquil', 'Ñiquén', 'San Carlos', 'Quirihue', 'Treguaco', 'Ninhue'] },
    CL_SOUTHERN_BIO_BIO: { comuna: ['Yumbel', 'Mulchén', 'Nacimiento', 'Negrete', 'Laja',
      'San Rosendo', 'Los Angeles'] },
    CL_SOUTHERN_MALLECO: { comuna: ['Traiguén', 'Angol', 'Collipulli', 'Renaico', 'Purén',
      'Los Sauces', 'Lumaco'] },
  },
}

const AU = {
  countryCode: 'AU',
  attribution: 'Wine Australia GI · geoBoundaries (CC BY 4.0)',
  projection: () => d3.geoConicConformal().rotate([-134, 0]).parallels([-18, -36]),
  load: loadAustraliaSource,
  // 호주 해안선에는 아주 작은 섬이 수천 개다. 확대 지도의 주(州) 실루엣은 배경 문맥이므로
  // 그쪽만 크게 완화한다 — GI 산지 도형 정밀도는 전역 설정을 그대로 유지한다
  minAreaCountry: 2,
  tolZoomOutline: 1.6,
  minAreaZoomOutline: 8,
  /** L1 = 주 (geoBoundaries ADM1) */
  l1: {
    AU_SOUTH_AUSTRALIA: { state: ['South Australia'] },
    AU_VICTORIA: { state: ['Victoria'] },
    AU_NEW_SOUTH_WALES: { state: ['New South Wales'] },
    AU_WESTERN_AUSTRALIA: { state: ['Western Australia'] },
    AU_TASMANIA: { state: ['Tasmania'] },
  },
  /**
   * L2 = Wine Australia 공식 GI 리전 (와인법상 산지 경계).
   * 태즈메이니아의 태머밸리·코얼리버는 공식 GI 서브리전으로 등록되어 있지 않아
   * 기하 데이터를 만들 수 없다 — 확대 지도 없이 국가 지도만 표시된다(그레이스풀 폴백).
   */
  l2: {
    AU_SOUTH_AUSTRALIA_BAROSSA_VALLEY: { gi: ['Barossa Valley'] },
    AU_SOUTH_AUSTRALIA_EDEN_VALLEY: { gi: ['Eden Valley'] },
    AU_SOUTH_AUSTRALIA_CLARE_VALLEY: { gi: ['Clare Valley'] },
    AU_SOUTH_AUSTRALIA_MCLAREN_VALE: { gi: ['Mclaren Vale'] },
    AU_SOUTH_AUSTRALIA_ADELAIDE_HILLS: { gi: ['Adelaide Hills'] },
    AU_SOUTH_AUSTRALIA_COONAWARRA: { gi: ['Coonawarra'] },

    AU_VICTORIA_YARRA_VALLEY: { gi: ['Yarra Valley'] },
    AU_VICTORIA_MORNINGTON_PENINSULA: { gi: ['Mornington Peninsula'] },
    AU_VICTORIA_GEELONG: { gi: ['Geelong'] },
    AU_VICTORIA_HEATHCOTE: { gi: ['Heathcote'] },
    AU_VICTORIA_RUTHERGLEN: { gi: ['Rutherglen'] },

    // 공식 GI 리전 이름은 'Hunter' (Hunter Valley 는 상위 존)
    AU_NEW_SOUTH_WALES_HUNTER_VALLEY: { gi: ['Hunter'] },
    AU_NEW_SOUTH_WALES_MUDGEE: { gi: ['Mudgee'] },
    AU_NEW_SOUTH_WALES_ORANGE: { gi: ['Orange'] },
    AU_NEW_SOUTH_WALES_CANBERRA_DISTRICT: { gi: ['Canberra District'] },

    AU_WESTERN_AUSTRALIA_MARGARET_RIVER: { gi: ['Margaret River'] },
    AU_WESTERN_AUSTRALIA_GREAT_SOUTHERN: { gi: ['Great Southern'] },
    AU_WESTERN_AUSTRALIA_SWAN_DISTRICT: { gi: ['Swan District'] },
  },
}

const PT = {
  countryCode: 'PT',
  attribution: 'Eurostat GISCO · © EuroGeographics',
  projection: () => d3.geoConicConformal().rotate([8, 0]).parallels([38, 42]),
  load: makeNutsSource('PT'),
  /** L1 = DOC 권역을 구성하는 NUTS3 */
  l1: {
    PT_DOURO: { nuts: ['Douro', 'Alto Tâmega e Barroso'] },
    PT_VINHO_VERDE: { nuts: ['Alto Minho', 'Cávado', 'Ave', 'Área Metropolitana do Porto', 'Tâmega e Sousa'] },
    PT_DAO: { nuts: ['Viseu Dão Lafões'] },
    PT_BAIRRADA: { nuts: ['Região de Aveiro', 'Região de Coimbra'] },
    PT_LISBOA: { nuts: ['Oeste', 'Grande Lisboa', 'Lezíria do Tejo'] },
    PT_ALENTEJO: { nuts: ['Alentejo Central', 'Alto Alentejo', 'Baixo Alentejo', 'Alentejo Litoral'] },
    PT_SETUBAL: { nuts: ['Península de Setúbal'] },
    PT_MADEIRA: { nuts: ['Região Autónoma da Madeira'] },
    PT_ACORES: { nuts: ['Região Autónoma dos Açores'] },
  },
}

const DE = {
  countryCode: 'DE',
  attribution: 'Eurostat GISCO · © EuroGeographics',
  projection: () => d3.geoConicConformal().rotate([-10, 0]).parallels([48, 53]),
  load: makeNutsSource('DE'),
  // NUTS3 가 400개(Kreis)라 국토 실루엣의 내부 경계선이 매우 많다. 배경이므로 완화한다
  tolCountry: 0.9,
  minAreaCountry: 6,
  /** L1 = 13개 재배지역(Anbaugebiet)을 구성하는 NUTS3(Kreis) */
  l1: {
    DE_MOSEL: { nuts: ['Bernkastel-Wittlich', 'Cochem-Zell', 'Trier-Saarburg', 'Trier, Kreisfreie Stadt'] },
    DE_RHEINGAU: { nuts: ['Rheingau-Taunus-Kreis', 'Wiesbaden, Kreisfreie Stadt'] },
    DE_RHEINHESSEN: { nuts: ['Alzey-Worms', 'Mainz-Bingen', 'Mainz, Kreisfreie Stadt', 'Worms, Kreisfreie Stadt'] },
    DE_PFALZ: { nuts: ['Bad Dürkheim', 'Südliche Weinstraße', 'Landau in der Pfalz, Kreisfreie Stadt',
      'Neustadt an der Weinstraße, Kreisfreie Stadt', 'Germersheim', 'Rhein-Pfalz-Kreis',
      'Speyer, Kreisfreie Stadt', 'Frankenthal (Pfalz), Kreisfreie Stadt'] },
    DE_NAHE: { nuts: ['Bad Kreuznach'] },
    DE_AHR: { nuts: ['Ahrweiler'] },
    DE_MITTELRHEIN: { nuts: ['Rhein-Hunsrück-Kreis', 'Mayen-Koblenz', 'Koblenz, Kreisfreie Stadt'] },
    DE_BADEN: { nuts: ['Ortenaukreis', 'Breisgau-Hochschwarzwald', 'Emmendingen',
      'Freiburg im Breisgau, Stadtkreis', 'Lörrach', 'Konstanz'] },
    DE_WUERTTEMBERG: { nuts: ['Heilbronn, Stadtkreis', 'Heilbronn, Landkreis', 'Ludwigsburg',
      'Rems-Murr-Kreis', 'Stuttgart, Stadtkreis'] },
    DE_FRANKEN: { nuts: ['Würzburg, Kreisfreie Stadt', 'Würzburg, Landkreis', 'Kitzingen',
      'Main-Spessart', 'Schweinfurt, Landkreis'] },
    DE_SAALE_UNSTRUT: { nuts: ['Burgenlandkreis'] },
    DE_SACHSEN: { nuts: ['Meißen'] },
    // 바이에른은 NUTS1 DE2 전체 — NUTS3 을 나열하지 않고 접두사로 고른다
    DE_BAYERN: { nutsPrefix: ['DE2'] },
  },
}

const AT = {
  countryCode: 'AT',
  attribution: 'Eurostat GISCO · © EuroGeographics',
  projection: () => d3.geoConicConformal().rotate([-13, 0]).parallels([46, 49]),
  load: makeNutsSource('AT'),
  /** L1 = 4개 재배지역(Weinbauregion) — 행정 경계와 일치한다 */
  l1: {
    AT_NIEDEROSTERREICH: { nuts: ['Sankt Pölten', 'Waldviertel', 'Weinviertel',
      'Wiener Umland/Nordteil', 'Wiener Umland/Südteil', 'Mostviertel-Eisenwurzen',
      'Niederösterreich-Süd'] },
    AT_BURGENLAND: { nuts: ['Nordburgenland', 'Mittelburgenland', 'Südburgenland'] },
    AT_STEIERMARK: { nuts: ['Graz', 'Liezen', 'Östliche Obersteiermark', 'Oststeiermark',
      'West- und Südsteiermark', 'Westliche Obersteiermark'] },
    AT_WIEN: { nuts: ['Wien'] },
  },
  /**
   * L2 — 바인피어텔은 NUTS3 와 정확히 일치한다.
   * 바하우·캄프탈·크렘스탈은 도나우 강변 소규모 산지로 공개 경계 데이터가 없어 만들지 않는다
   * (선택은 가능하고, 확대 지도만 생략된다).
   */
  l2: {
    AT_NIEDEROSTERREICH_WEINVIERTEL: { nuts: ['Weinviertel'] },
  },
}

const HU = {
  countryCode: 'HU',
  attribution: 'geoBoundaries (ODbL 1.0)',
  projection: () => d3.geoConicConformal().rotate([-19, 0]).parallels([46, 48]),
  load: makeGeoBoundariesSource('HUN', 'ADM2', 'ADM2'),
  /** L1 = 보르비데크를 구성하는 járás(군) */
  l1: {
    HU_TOKAJ: { unit: ['Tokaj', 'Sárospatak', 'Sátoraljaújhely', 'Szerencs', 'Gönc', 'Cigánd'] },
    HU_EGER: { unit: ['Eger', 'Füzesabony', 'Pétervására'] },
    HU_VILLANY: { unit: ['Siklós', 'Bóly'] },
    HU_SZEKSZARD: { unit: ['Szekszárd'] },
    HU_BADACSONY: { unit: ['Tapolca', 'Balatonfüred'] },
    HU_SOMLO: { unit: ['Devecser', 'Sümeg'] },
    HU_MATRA: { unit: ['Gyöngyös', 'Pásztó'] },
  },
}

const NZ = {
  countryCode: 'NZ',
  attribution: 'geoBoundaries (CC BY 4.0)',
  projection: () => d3.geoTransverseMercator().rotate([-173, 41]),
  load: makeGeoBoundariesSource('NZL', 'ADM1', 'ADM1', 'ADM2'),
  /** L1 = 뉴질랜드 지방(region) — 와인 산지 구분과 일치한다 */
  l1: {
    NZ_MARLBOROUGH: { unit: ['Marlborough Region'] },
    NZ_HAWKES_BAY: { unit: ["Hawke's Bay Region"] },
    NZ_OTAGO: { unit: ['Otago Region'] },
    NZ_NELSON: { unit: ['Nelson Region', 'Tasman Region'] },
    NZ_CANTERBURY: { unit: ['Canterbury Region'] },
    NZ_GISBORNE: { unit: ['Gisborne Region'] },
    NZ_WAIRARAPA: { unit: ['Wellington Region'] },
    NZ_AUCKLAND: { unit: ['Auckland Region'] },
  },
  /** L2 = 기초자치단체(territorial authority) */
  l2: {
    NZ_OTAGO_CENTRAL_OTAGO: { subUnit: ['Central Otago District'], within: 'Otago Region' },
  },
}

const AR = {
  countryCode: 'AR',
  attribution: 'geoBoundaries (CC BY 2.5)',
  projection: () => d3.geoTransverseMercator().rotate([65, 35]),
  load: makeGeoBoundariesSource('ARG', 'ADM1', 'ADM1', 'ADM2'),
  /** L1 = 주(provincia)가 곧 산지 */
  l1: {
    AR_MENDOZA: { unit: ['Mendoza'] },
    AR_SALTA: { unit: ['Salta'] },
    AR_SAN_JUAN: { unit: ['San Juan'] },
    AR_RIO_NEGRO: { unit: ['Río Negro'] },
    // geoBoundaries 원본 표기가 'La Roja' 다 (La Rioja 의 오타) — 소스 표기를 그대로 써야 매칭된다
    AR_LA_RIOJA: { unit: ['La Roja'] },
    AR_NEUQUEN: { unit: ['Neuquén'] },
    AR_CATAMARCA: { unit: ['Catamarca'] },
  },
  /**
   * L2 = 멘도사의 데파르타멘토(departamento).
   * 발레 데 우코(Uco Valley)는 단일 행정구역이 아니라
   * 투누얀·투풍가토·산 카를로스 3개 데파르타멘토로 구성된다.
   */
  l2: {
    AR_MENDOZA_LUJAN_DE_CUYO: { subUnit: ['Luján de Cuyo'], within: 'Mendoza' },
    AR_MENDOZA_MAIPU: { subUnit: ['Maipú'], within: 'Mendoza' },
    AR_MENDOZA_VALLE_DE_UCO: { subUnit: ['Tunuyán', 'Tupungato', 'San Carlos'], within: 'Mendoza' },
    AR_MENDOZA_SAN_RAFAEL: { subUnit: ['San Rafael'], within: 'Mendoza' },
  },
}

const ZA = {
  countryCode: 'ZA',
  attribution: 'geoBoundaries (CC BY 3.0 IGO)',
  projection: () => d3.geoConicConformal().rotate([-24, 0]).parallels([-24, -33]),
  load: makeGeoBoundariesSource('ZAF', 'ADM1', 'ADM2', 'ADM3'),
  /** L1 = 와인 오브 오리진 권역에 대응하는 지구 자치구(district municipality) */
  l1: {
    ZA_CAPE_WINELANDS: { unit: ['Cape Winelands'] },
    ZA_CAPE_TOWN: { unit: ['City of Cape Town'] },
    ZA_OVERBERG: { unit: ['Overberg'] },
    ZA_WEST_COAST: { unit: ['West Coast'] },
    // 가든 루트 지구는 원본에서 이전 명칭 'Eden' 으로 되어 있다
    ZA_GARDEN_ROUTE: { unit: ['Eden'] },
  },
  /**
   * L2 = 기초 자치구(local municipality).
   * 스텔렌보스는 동명 자치구가 그대로 있고, 파를·로버트슨은 해당 와인 지구를
   * 품고 있는 자치구(드라켄스타인·랑에베르흐)로 근사한다 — 미국 카운티 사례와 같은 방식.
   * 프란슈크는 스텔렌보스 자치구 안에 있어 독립 경계가 없으므로 지도를 만들지 않는다.
   */
  l2: {
    ZA_CAPE_WINELANDS_STELLENBOSCH: { subUnit: ['Stellenbosch'], within: 'Cape Winelands' },
    ZA_CAPE_WINELANDS_PAARL: { subUnit: ['Drakenstein'], within: 'Cape Winelands' },
    ZA_CAPE_WINELANDS_ROBERTSON: { subUnit: ['Langeberg'], within: 'Cape Winelands' },
  },
}

/**
 * 스코틀랜드 (GB-SCT) — 위스키.
 *
 * 하이랜드/로우랜드의 법정 분할선은 도로·강 기반이라 행정경계와 일치하지 않는다
 * (그리녹 → 카드로스역 → 얼즈 시트 → 월리스 기념탑 → B998·A91 → M90 → 언 강 → 테이 강).
 * 따라서 각 의회구역을 그 선의 북/남 중 어디에 대부분이 놓이는지로 배정해 근사한다.
 * 선이 관통하는 스털링·퍼스 앤 킨로스·웨스트 던바턴셔는 다수 면적 기준으로 정했고
 * 이 판단 근거를 여기 남긴다. 법정으로 정확한 것은 스페이사이드·캠벨타운·아일라다.
 *
 * 하이랜드가 스페이사이드를 지리적으로 포함하는 것은 규정 그대로다(중복 정상).
 */
const GB_SCT = {
  countryCode: 'GB-SCT',
  attribution: 'geoBoundaries · ONS/OS 선거구 경계 (OGL v3)',
  projection: () => d3.geoTransverseMercator().rotate([4, -57]),
  load: loadScotlandSource,
  // 섬이 매우 많아(헤브리디스·오크니·셰틀랜드) 배경 문맥 도형은 과감히 줄인다
  minAreaCountry: 0.5,
  tolCountry: 0.2,
  l1: {
    // 법정 정의: Moray 의회 8개 ward = Moray 전역 + Highland 의회 Badenoch and Strathspey ward
    GB_SCT_SPEYSIDE: { council: ['Moray'], ward: ['Badenoch and Strathspey'] },

    // 분할선 북쪽 의회구역 (Moray 포함 — 규정상 스페이사이드는 하이랜드 안에 있다)
    GB_SCT_HIGHLAND: {
      council: [
        'Highland', 'Moray', 'Aberdeenshire', 'Aberdeen City', 'Angus', 'Dundee City',
        'Perth and Kinross', 'Argyll and Bute', 'Stirling',
        'Na h-Eileanan Siar', 'Orkney Islands', 'Shetland Islands',
      ],
    },

    // 분할선 남쪽 의회구역
    GB_SCT_LOWLAND: {
      council: [
        'Clackmannanshire', 'Fife', 'Falkirk', 'West Lothian', 'City of Edinburgh',
        'Midlothian', 'East Lothian', 'Scottish Borders', 'Dumfries and Galloway',
        'South Ayrshire', 'East Ayrshire', 'North Ayrshire', 'Inverclyde',
        'Renfrewshire', 'East Renfrewshire', 'Glasgow City',
        'North Lanarkshire', 'South Lanarkshire',
        'West Dunbartonshire', 'East Dunbartonshire',
      ],
    },

    // 법정 정의: 아일라 섬 전체 (보모어 좌표로 섬 폴리곤을 특정)
    GB_SCT_ISLAY: {
      island: [{ council: 'Argyll and Bute', at: [-6.28, 55.76], name: 'Islay' }],
    },

    // 법정 정의: Argyll and Bute 의회의 South Kintyre ward
    GB_SCT_CAMPBELTOWN: { ward: ['South Kintyre'] },

    /*
     * '아일랜드(섬)' 은 법정 표시가 아니라 업계 통용 구분이다.
     * 실제 섬 경계만 사용하고, 각 섬은 대표 지점 좌표로 특정한다.
     *   스카이(포트리) · 멀(토버모리) · 주라(크레이그하우스) · 아란(로크란자)
     * 오크니·셰틀랜드·헤브리디스는 의회구역이 곧 섬 묶음이라 그대로 쓴다.
     */
    GB_SCT_ISLANDS: {
      council: ['Orkney Islands', 'Shetland Islands', 'Na h-Eileanan Siar'],
      island: [
        { council: 'Highland', at: [-6.19, 57.41], name: 'Skye' },
        { council: 'Argyll and Bute', at: [-6.07, 56.62], name: 'Mull' },
        { council: 'Argyll and Bute', at: [-5.94, 55.84], name: 'Jura' },
        { council: 'North Ayrshire', at: [-5.24, 55.62], name: 'Arran' },
      ],
    },
  },
}

/**
 * 아일랜드 (IE) — 위스키. L1 = 법정 카운티 (OSi).
 */
const IE = {
  countryCode: 'IE',
  attribution: 'geoBoundaries · OSi 법정 카운티 경계 (CC BY 4.0)',
  projection: () => d3.geoTransverseMercator().rotate([8, -53.5]),
  load: loadIrelandSource,
  l1: {
    IE_DUBLIN: { county: ['Dublin'] },
    IE_CORK: { county: ['Cork'] },
    IE_LOUTH: { county: ['Louth'] },
    IE_WESTMEATH: { county: ['Westmeath'] },
    IE_OFFALY: { county: ['Offaly'] },
    IE_TIPPERARY: { county: ['Tipperary'] },
    IE_WATERFORD: { county: ['Waterford'] },
    IE_CARLOW: { county: ['Carlow'] },
    IE_GALWAY: { county: ['Galway'] },
    IE_KERRY: { county: ['Kerry'] },
    IE_WICKLOW: { county: ['Wicklow'] },
    IE_MEATH: { county: ['Meath'] },
    IE_CLARE: { county: ['Clare'] },
  },
}

/**
 * 일본 (JP) — 위스키. L1 = 도도부현.
 * 원본 표기가 일부만 ' Prefecture' 접미사를 갖는다 — 소스 표기를 그대로 써야 매칭된다.
 */
const JP = {
  countryCode: 'JP',
  attribution: 'geoBoundaries (ODbL 1.0)',
  projection: () => d3.geoConicConformal().rotate([-138, 0]).parallels([33, 43]),
  load: makeGeoBoundariesSource('JPN', 'ADM1', 'ADM1'),
  minAreaCountry: 0.5,
  l1: {
    JP_HOKKAIDO: { unit: ['Hokkaido'] },
    JP_IWATE: { unit: ['Iwate'] },
    JP_MIYAGI: { unit: ['Miyagi'] },
    JP_FUKUSHIMA: { unit: ['Fukushima'] },
    JP_TOCHIGI: { unit: ['Tochigi'] },
    JP_SAITAMA: { unit: ['Saitama'] },
    JP_YAMANASHI: { unit: ['Yamanashi'] },
    JP_NAGANO: { unit: ['Nagano'] },
    JP_TOYAMA: { unit: ['Toyama'] },
    JP_SHIZUOKA: { unit: ['Shizuoka'] },
    JP_AICHI: { unit: ['Aichi Prefecture'] },
    JP_SHIGA: { unit: ['Shiga'] },
    JP_OSAKA: { unit: ['Osaka Prefecture'] },
    JP_HYOGO: { unit: ['Hyogo Prefecture'] },
    JP_HIROSHIMA: { unit: ['Hiroshima'] },
    JP_KAGOSHIMA: { unit: ['Kagoshima Prefecture'] },
    JP_OITA: { unit: ['Oita'] },
    JP_WAKAYAMA: { unit: ['Wakayama Prefecture'] },
  },
}

/** 대만 (TW) — 위스키. L1 = 현·시 (원본은 현에 ' County' 접미사가 붙는다) */
const TW = {
  countryCode: 'TW',
  attribution: 'geoBoundaries (ODbL 1.0)',
  projection: () => d3.geoTransverseMercator().rotate([-121, -23.7]),
  load: makeGeoBoundariesSource('TWN', 'ADM1', 'ADM1'),
  l1: {
    TW_YILAN: { unit: ['Yilan County'] },
    TW_NANTOU: { unit: ['Nantou County'] },
    TW_TAICHUNG: { unit: ['Taichung'] },
    TW_TAIPEI: { unit: ['Taipei'] },
    TW_KAOHSIUNG: { unit: ['Kaohsiung'] },
  },
}

/** 대한민국 (KR) — 위스키·전통주. L1 = 시도 (원본은 영문 방위 표기: North Jeolla 등) */
const KR = {
  countryCode: 'KR',
  attribution: 'geoBoundaries (Public Domain)',
  projection: () => d3.geoTransverseMercator().rotate([-127.5, -36]),
  load: makeGeoBoundariesSource('KOR', 'ADM1', 'ADM1'),
  l1: {
    KR_GYEONGGI: { unit: ['Gyeonggi'] },
    KR_GANGWON: { unit: ['Gangwon'] },
    KR_CHUNGBUK: { unit: ['North Chungcheong'] },
    KR_CHUNGNAM: { unit: ['South Chungcheong'] },
    KR_JEONBUK: { unit: ['North Jeolla'] },
    KR_JEONNAM: { unit: ['South Jeolla'] },
    KR_GYEONGBUK: { unit: ['North Gyeongsang'] },
    KR_GYEONGNAM: { unit: ['South Gyeongsang'] },
    KR_JEJU: { unit: ['Jeju'] },
    KR_SEOUL: { unit: ['Seoul'] },
    KR_INCHEON: { unit: ['Incheon'] },
    KR_BUSAN: { unit: ['Busan'] },
    KR_DAEGU: { unit: ['Daegu'] },
    KR_DAEJEON: { unit: ['Daejeon'] },
    KR_GWANGJU: { unit: ['Gwangju'] },
    KR_ULSAN: { unit: ['Ulsan'] },
    KR_SEJONG: { unit: ['Sejong'] },
  },
}

/** 인도 (IN) — 위스키. L1 = 주 (원본 표기에 장음 부호가 있다: Karnātaka) */
const IN = {
  countryCode: 'IN',
  attribution: 'geoBoundaries (CC BY 2.5 IN)',
  projection: () => d3.geoConicConformal().rotate([-80, 0]).parallels([12, 30]),
  minAreaCountry: 0.5,
  load: makeGeoBoundariesSource('IND', 'ADM1', 'ADM1'),
  l1: {
    IN_GOA: { unit: ['Goa'] },
    IN_KARNATAKA: { unit: ['Karnātaka'] },
    IN_UTTAR_PRADESH: { unit: ['Uttar Pradesh'] },
    IN_MAHARASHTRA: { unit: ['Mahārāshtra'] },
    IN_HIMACHAL_PRADESH: { unit: ['Himāchal Pradesh'] },
    IN_PUNJAB: { unit: ['Punjab'] },
    IN_HARYANA: { unit: ['Haryāna'] },
  },
}

/** 캐나다 (CA) — 위스키. L1 = 주·준주 */
const CA = {
  countryCode: 'CA',
  attribution: 'geoBoundaries (Open Government Licence – Canada 2.0)',
  projection: () => d3.geoConicConformal().rotate([96, 0]).parallels([49, 77]),
  // 북극 군도의 섬이 매우 많다 — 배경 문맥이라 과감히 줄인다
  minAreaCountry: 2,
  tolCountry: 0.3,
  tolZoomOutline: 0.6,
  load: makeGeoBoundariesSource('CAN', 'ADM1', 'ADM1'),
  l1: {
    CA_ONTARIO: { unit: ['Ontario'] },
    CA_QUEBEC: { unit: ['Quebec'] },
    CA_ALBERTA: { unit: ['Alberta'] },
    CA_BRITISH_COLUMBIA: { unit: ['British Columbia'] },
    CA_MANITOBA: { unit: ['Manitoba'] },
    CA_NOVA_SCOTIA: { unit: ['Nova Scotia'] },
  },
}

/**
 * 잉글랜드 (GB-ENG) — 위스키·와인. L1 = 의례주·통합자치구.
 * 런던은 ADM2 에 'Greater London' 이 없어 32개 자치구 + 시티로 구성한다.
 */
const GB_ENG = {
  countryCode: 'GB-ENG',
  attribution: 'geoBoundaries · ONS/OS (OGL v3)',
  projection: () => d3.geoTransverseMercator().rotate([2, -52.6]),
  load: makeUkSource('England'),
  minAreaCountry: 0.4,
  l1: {
    GB_ENG_LONDON: {
      council: [
        'City of London', 'Barking and Dagenham', 'Barnet', 'Bexley', 'Brent', 'Bromley',
        'Camden', 'Croydon', 'Ealing', 'Enfield', 'Greenwich', 'Hackney',
        'Hammersmith and Fulham', 'Haringey', 'Harrow', 'Havering', 'Hillingdon', 'Hounslow',
        'Islington', 'Kensington and Chelsea', 'Kingston upon Thames', 'Lambeth', 'Lewisham',
        'Merton', 'Newham', 'Redbridge', 'Richmond upon Thames', 'Southwark', 'Sutton',
        'Tower Hamlets', 'Waltham Forest', 'Wandsworth', 'Westminster',
      ],
    },
    GB_ENG_YORKSHIRE: { council: ['North Yorkshire', 'East Riding of Yorkshire'] },
    GB_ENG_NORFOLK: { council: ['Norfolk'] },
    GB_ENG_CUMBRIA: { council: ['Cumbria'] },
    GB_ENG_DERBYSHIRE: { council: ['Derbyshire'] },
    // 코츠월드는 여러 주에 걸친 자연경관구역 — 중심 주인 글로스터셔로 근사
    GB_ENG_COTSWOLDS: { council: ['Gloucestershire'] },
    GB_ENG_CORNWALL: { council: ['Cornwall'] },
    GB_ENG_KENT: { council: ['Kent'] },
    GB_ENG_SUSSEX: { council: ['East Sussex', 'West Sussex'] },
    GB_ENG_HAMPSHIRE: { council: ['Hampshire'] },
  },
}

/** 웨일스 (GB-WLS) — 위스키 */
const GB_WLS = {
  countryCode: 'GB-WLS',
  attribution: 'geoBoundaries · ONS/OS (OGL v3)',
  projection: () => d3.geoTransverseMercator().rotate([3.8, -52.3]),
  load: makeUkSource('Wales'),
  l1: {
    GB_WLS_POWYS: { council: ['Powys'] },
    GB_WLS_CARMARTHENSHIRE: { council: ['Carmarthenshire'] },
  },
}

/** 북아일랜드 (GB-NIR) — 위스키 */
const GB_NIR = {
  countryCode: 'GB-NIR',
  attribution: 'geoBoundaries · ONS/OS (OGL v3)',
  projection: () => d3.geoTransverseMercator().rotate([6.8, -54.6]),
  load: makeUkSource('Northern Ireland'),
  l1: {
    // 부시밀스가 있는 앤트림 북부는 현행 자치구 Causeway Coast and Glens 다
    GB_NIR_ANTRIM: { council: ['Causeway Coast and Glens', 'Antrim and Newtownabbey', 'Mid and East Antrim'] },
    GB_NIR_DOWN: { council: ['Newry, Mourne and Down', 'Ards and North Down'] },
  },
}

/** 스웨덴 (SE) — 위스키. L1 = 렌(län) */
const SE = {
  countryCode: 'SE',
  attribution: 'geoBoundaries (CC BY 3.0)',
  projection: () => d3.geoConicConformal().rotate([-15, 0]).parallels([57, 66]),
  load: makeGeoBoundariesSource('SWE', 'ADM1', 'ADM1'),
  minAreaCountry: 0.4,
  l1: {
    SE_GAVLEBORG: { unit: ['Gävleborgs län'] },
    SE_VASTERNORRLAND: { unit: ['Västernorrlands län'] },
  },
}

/** 네덜란드 (NL) — 위스키. L1 = 프로빈스 */
const NL = {
  countryCode: 'NL',
  attribution: 'geoBoundaries (CC0 1.0)',
  projection: () => d3.geoTransverseMercator().rotate([-5.4, -52.2]),
  load: makeGeoBoundariesSource('NLD', 'ADM1', 'ADM1'),
  l1: {
    NL_NOORD_BRABANT: { unit: ['Noord-Brabant'] },
  },
}

/** 덴마크 (DK) — 위스키. L1 = 지역(region) */
const DK = {
  countryCode: 'DK',
  attribution: 'geoBoundaries (CC BY 4.0)',
  projection: () => d3.geoTransverseMercator().rotate([-10, -56]),
  load: makeGeoBoundariesSource('DNK', 'ADM1', 'ADM1'),
  minAreaCountry: 0.3,
  l1: {
    DK_MIDTJYLLAND: { unit: ['Midtjylland'] },
  },
}

/** 핀란드 (FI) — 위스키. L1 = 지역(maakunta) */
const FI = {
  countryCode: 'FI',
  attribution: 'geoBoundaries (ODbL 1.0)',
  projection: () => d3.geoConicConformal().rotate([-26, 0]).parallels([60, 68]),
  minAreaCountry: 0.4,
  load: makeGeoBoundariesSource('FIN', 'ADM1', 'ADM1'),
  l1: {
    FI_OSTROBOTHNIA: { unit: ['Ostrobothnia'] },
  },
}

/** 이스라엘 (IL) — 위스키. L1 = 행정구 */
const IL = {
  countryCode: 'IL',
  attribution: 'geoBoundaries (Public Domain)',
  projection: () => d3.geoTransverseMercator().rotate([-35, -31.5]),
  load: makeGeoBoundariesSource('ISR', 'ADM1', 'ADM1'),
  l1: {
    IL_TEL_AVIV: { unit: ['Tel Aviv'] },
  },
}

/** 중국 (CN) — 와인. L1 = 성·자치구 */
const CN = {
  countryCode: 'CN',
  attribution: 'geoBoundaries (Public Domain)',
  projection: () => d3.geoConicConformal().rotate([-105, 0]).parallels([25, 45]),
  minAreaCountry: 2,
  tolCountry: 0.3,
  load: makeGeoBoundariesSource('CHN', 'ADM1', 'ADM1'),
  l1: {
    CN_NINGXIA: { unit: ['Ningxia Ningxia Hui Autonomous Region'] },
    CN_SHANDONG: { unit: ['Shandong Province'] },
    CN_YUNNAN: { unit: ['Yunnan Province'] },
    CN_SHANXI: { unit: ['Shanxi Province'] },
    CN_XINJIANG: { unit: ['Xinjiang Uyghur Autonomous Region'] },
    CN_HEBEI: { unit: ['Hebei Province'] },
  },
}

/** 그리스 (GR) — 와인. L1 = 행정 광역권 */
const GR = {
  countryCode: 'GR',
  attribution: 'geoBoundaries (CC BY 4.0)',
  projection: () => d3.geoTransverseMercator().rotate([-23.5, -38.5]),
  minAreaCountry: 0.3,
  load: makeGeoBoundariesSource('GRC', 'ADM1', 'ADM1'),
  l1: {
    // 원본 표기가 'Egean' 이다 (Aegean 의 오기) — 소스 표기를 그대로 써야 매칭된다
    GR_AEGEAN: { unit: ['Egean'] },
    GR_MACEDONIA: { unit: ['Macedonia-Thrace', 'Epirus-Western Macedonia'] },
    GR_PELOPONNESE: { unit: ['Peloponisos-W. Greece & Ionian'] },
    GR_CRETE: { unit: ['Crete'] },
    GR_ATTICA: { unit: ['Attica'] },
  },
}

/** 조지아 (GE) — 와인. L1 = 주(mkhare) */
const GE = {
  countryCode: 'GE',
  attribution: 'geoBoundaries (CC BY 3.0)',
  projection: () => d3.geoTransverseMercator().rotate([-43.5, -42]),
  load: makeGeoBoundariesSource('GEO', 'ADM1', 'ADM1'),
  l1: {
    GE_KAKHETI: { unit: ['Kakheti'] },
    GE_KARTLI: { unit: ['Shida Kartli', 'Kvemo Kartli'] },
    GE_IMERETI: { unit: ['Imereti'] },
  },
}

/** 레바논 (LB) — 와인. L1 = 주(muhafazah) */
const LB = {
  countryCode: 'LB',
  attribution: 'geoBoundaries (Public Domain)',
  projection: () => d3.geoTransverseMercator().rotate([-35.9, -33.9]),
  load: makeGeoBoundariesSource('LBN', 'ADM1', 'ADM1'),
  l1: {
    LB_BEQAA: { unit: ['Béqaa', 'Baalbek-Hermel'] },
  },
}

/** 우루과이 (UY) — 와인. L1 = 주(departamento) */
const UY = {
  countryCode: 'UY',
  attribution: 'geoBoundaries (ODbL 1.0)',
  projection: () => d3.geoTransverseMercator().rotate([56, 33]),
  load: makeGeoBoundariesSource('URY', 'ADM1', 'ADM1'),
  l1: {
    UY_MALDONADO: { unit: ['Maldonado'] },
    UY_CANELONES: { unit: ['Canelones'] },
  },
}

const COUNTRIES = {
  FR, US, IT, ES, CL, AU, PT, DE, AT, HU, NZ, AR, ZA,
  'GB-SCT': GB_SCT, IE, JP, TW, KR, IN, CA,
  'GB-ENG': GB_ENG, 'GB-WLS': GB_WLS, 'GB-NIR': GB_NIR,
  SE, NL, DK, FI, IL, CN, GR, GE, LB, UY,
}

// ═══════════════════════════════════════════════════════════════
//  베이킹
// ═══════════════════════════════════════════════════════════════
async function buildCountry(config) {
  console.log(`\n■ ${config.countryCode}`)
  const source = await config.load()
  // 일부 소스는 산지별 파일을 개별로 내려받아야 한다 (select 는 동기 함수)
  if (source.prefetch) await source.prefetch([config.l1, config.l2 ?? {}])

  // 국가별 단순화 강도 — 섬이 매우 많은 국가(호주 등)는 더 과감히 줄여야 파일 크기가 잡힌다
  const tolCountry = config.tolCountry ?? TOL_COUNTRY
  const tolZoom = config.tolZoom ?? TOL_ZOOM
  const minAreaCountry = config.minAreaCountry ?? MIN_AREA_COUNTRY
  const minAreaZoom = config.minAreaZoom ?? MIN_AREA_ZOOM

  // ── L1 산지 합집합 ──
  const l1Geometries = {}
  for (const [code, selector] of Object.entries(config.l1)) {
    const features = source.select(selector, code)
    if (features.length === 0) {
      console.warn(`  ! ${code} — 구성 단위 없음, 건너뜀`)
      continue
    }
    l1Geometries[code] = dissolve(features, code)
    process.stdout.write(`  · ${code.padEnd(30)} ${String(features.length).padStart(4)} units\n`)
  }

  // ── 국가 지도 투영: 국토 외곽선 기준 ──
  const countryProjection = fitProjection(
    config.projection(),
    [[PAD_COUNTRY, PAD_COUNTRY], [VB_W - PAD_COUNTRY, VB_H - PAD_COUNTRY]],
    [source.outlineGeometry],
  )

  const outline = bake(source.outlineGeometry, countryProjection, tolCountry, minAreaCountry)
  const regions = {}
  for (const [code, geometry] of Object.entries(l1Geometries)) {
    // 산지별 단순화 강도 override — 법정 경계가 아닌 **행정구역 근사** 산지
    // (칼바도스·브르타뉴처럼 해안선이 복잡한 광역 근사)를 먼저 완화해 용량 상한을 지킨다.
    const tol = config.tolRegion?.[code] ?? tolCountry
    const minArea = config.minAreaRegion?.[code] ?? minAreaCountry
    const { path, rings } = bake(geometry, countryProjection, tol, minArea)
    regions[code] = { path, marker: pickMarker(rings), bbox: bboxOf(rings) }
  }

  // ── L1 별 확대 지도 ──
  const l2ByParent = {}
  for (const [code, selector] of Object.entries(config.l2 ?? {})) {
    const parent = Object.keys(config.l1).find((l1) => code.startsWith(`${l1}_`))
    if (!parent) throw new Error(`L2 의 부모 L1 을 찾을 수 없음: ${code}`)
    if (!l1Geometries[parent]) continue
    const features = source.select(selector, code)
    if (features.length === 0) {
      console.warn(`  ! ${code} — 구성 단위 없음, 건너뜀`)
      continue
    }
    ;(l2ByParent[parent] ??= {})[code] = dissolve(features, code)
  }

  const zooms = {}
  for (const [parent, children] of Object.entries(l2ByParent)) {
    // 확대 범위는 L2 합집합에 맞춘다 — L1 이 매우 크고 L2 가 작을 때 대상이 점처럼 작아지는 것을 방지
    const zoomProjection = fitProjection(
      config.projection(),
      [[PAD_ZOOM, PAD_ZOOM], [VB_W - PAD_ZOOM, VB_H - PAD_ZOOM]],
      Object.values(children),
    )
    const zoomRegions = {}
    for (const [code, geometry] of Object.entries(children)) {
      // 확대 지도도 산지별 완화를 허용한다 — 꼬냑 크뤼처럼 **대면적** 세부산지는
      // 확대 화면을 가득 채우므로 단순화 강도를 올려도 시각적 차이가 없다.
      const tol = config.tolZoomRegion?.[parent] ?? tolZoom
      const { path, rings } = bake(geometry, zoomProjection, tol, minAreaZoom)
      zoomRegions[code] = { path, marker: pickMarker(rings), bbox: bboxOf(rings) }
    }
    zooms[parent] = {
      // L1 전체 실루엣을 문맥으로 함께 그린다. 확대 범위 밖 링은 버리고, 배경이므로 과감히 단순화한다
      outlinePath: bake(
        l1Geometries[parent], zoomProjection,
        config.tolZoomOutline ?? TOL_ZOOM_OUTLINE,
        config.minAreaZoomOutline ?? MIN_AREA_ZOOM_OUTLINE,
        [0, 0, VB_W, VB_H],
      ).path,
      regions: zoomRegions,
    }
    console.log(`  · zoom ${parent.padEnd(18)} ${Object.keys(children).length} sub-regions`)
  }

  return {
    countryCode: config.countryCode,
    attribution: config.attribution,
    viewBox: `0 0 ${VB_W} ${VB_H}`,
    outlinePath: outline.path,
    regions,
    zooms,
    misses: source.misses ?? [],
  }
}

function emitTs(map) {
  const lc = map.countryCode.toLowerCase()
  // 스코틀랜드처럼 ISO 3166-2 코드(GB-SCT)는 하이픈이 있어 TS 식별자로 쓸 수 없다
  const ident = map.countryCode.replace(/-/g, '_')
  const region = (r) =>
    `{ path: '${r.path}', marker: [${r.marker[0]}, ${r.marker[1]}], bbox: [${r.bbox.join(', ')}] }`
  const lines = []
  lines.push('// ⚠ 자동 생성 파일 — 직접 수정하지 마세요.')
  lines.push('// 생성: npm run map:build')
  lines.push(`// 경계 데이터 출처: ${map.attribution}`)
  lines.push('//')
  lines.push('// 산지 경계는 공개 산지/행정 경계 데이터의 합집합이며 수작업 도형이 아니다.')
  lines.push("import type { CountryMap } from './types'")
  lines.push('')
  lines.push(`export const ${ident}_MAP: CountryMap = {`)
  lines.push(`  countryCode: '${map.countryCode}',`)
  lines.push(`  attribution: '${map.attribution}',`)
  lines.push(`  viewBox: '${map.viewBox}',`)
  lines.push(`  outlinePath: '${map.outlinePath}',`)
  lines.push('  regions: {')
  for (const [code, r] of Object.entries(map.regions)) lines.push(`    ${code}: ${region(r)},`)
  lines.push('  },')
  lines.push('  zooms: {')
  for (const [parent, zoom] of Object.entries(map.zooms)) {
    lines.push(`    ${parent}: {`)
    lines.push(`      outlinePath: '${zoom.outlinePath}',`)
    lines.push('      regions: {')
    for (const [code, r] of Object.entries(zoom.regions)) lines.push(`        ${code}: ${region(r)},`)
    lines.push('      },')
    lines.push('    },')
  }
  lines.push('  },')
  lines.push('}')
  lines.push('')

  const content = lines.join('\n')
  mkdirSync(OUT_DIR, { recursive: true })
  const outPath = join(OUT_DIR, `${lc}.ts`)
  writeFileSync(outPath, content, 'utf8')
  const kb = Buffer.byteLength(content) / 1024
  const over = kb > MAX_FILE_KB
  console.log(`  → ${lc}.ts  ${kb.toFixed(1)} KB${over ? ` ⚠ 상한 ${MAX_FILE_KB}KB 초과` : ''}`
    + `  (L1 ${Object.keys(map.regions).length} / zoom ${Object.keys(map.zooms).length})`)
  return { path: outPath, kb, over }
}

// ═══════════════════════════════════════════════════════════════
const targets = process.argv.slice(2).filter((a) => !a.startsWith('-'))
const selected = targets.length > 0
  ? targets.map((t) => COUNTRIES[t.toUpperCase()]).filter(Boolean)
  : Object.values(COUNTRIES)

if (selected.length === 0) {
  console.error(`대상 국가 없음. 사용 가능: ${Object.keys(COUNTRIES).join(', ')}`)
  process.exit(1)
}

console.log('와인 산지 지도 기하 데이터 생성')
const allMisses = []
const oversized = []
for (const config of selected) {
  const map = await buildCountry(config)
  allMisses.push(...map.misses)
  const emitted = emitTs(map)
  if (emitted.over) oversized.push(`${config.countryCode} ${emitted.kb.toFixed(1)}KB`)
}
if (allMisses.length > 0) {
  console.log(`\n⚠ 소스에서 찾지 못한 산지 이름 ${allMisses.length}건 — 설정을 고쳐야 합니다`)
  for (const m of allMisses) {
    console.log(`  ${m.label.padEnd(30)} "${m.name}"`)
    console.log(`      유사: ${m.near.length ? m.near.join(' | ') : '없음'}`)
  }
}
if (oversized.length > 0) {
  console.error(`\n✖ 파일 용량 상한(${MAX_FILE_KB}KB) 초과: ${oversized.join(', ')}`)
  console.error('   해당 국가 설정의 tolZoomOutline·minAreaCountry(배경 문맥)부터 완화하세요.')
  process.exit(1)
}
console.log('\n완료')
