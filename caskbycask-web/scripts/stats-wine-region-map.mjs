/** 생성된 지도 데이터 통계 (개발 전용 진단) — npm run map:stats [FR US ...] */
import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const MAP_DIR = join(HERE, '..', 'src', 'domain', 'location', 'data', 'wineRegionMap')

function loadMap(file) {
  const src = readFileSync(join(MAP_DIR, file), 'utf8')
  const start = src.indexOf('{', src.indexOf('_MAP'))
  const body = src.slice(start).replace(/;?\s*$/, '')
  return Function(`"use strict"; return (${body})`)()
}

const targets = process.argv.slice(2).map((s) => s.toLowerCase())
const files = readdirSync(MAP_DIR)
  .filter((f) => f.endsWith('.ts') && f !== 'types.ts' && f !== 'index.ts')
  .filter((f) => targets.length === 0 || targets.includes(f.replace('.ts', '')))

// ── 백엔드 카탈로그 대비 구축 현황 ───────────────────────────────
const ENUM_PATH = join(
  HERE, '..', '..', 'caskbycask-api', 'src', 'main', 'java', 'com', 'caskbycask',
  'domain', 'spirit', 'entity', 'enums', 'WineRegion.java',
)
function catalogCoverage() {
  const src = readFileSync(ENUM_PATH, 'utf8')
  const rx =
    /^ {4}([A-Z][A-Z0-9_]+)\("([A-Z]{2}(?:-[A-Z]{2,3})?)", "([^"]*)", "([^"]*)", (null|"[A-Z0-9_]+")[,)]/gm
  const nodes = []
  let m
  while ((m = rx.exec(src)) !== null) {
    nodes.push({
      code: m[1], countryCode: m[2], nameKo: m[3],
      parentCode: m[5] === 'null' ? null : m[5].replaceAll('"', ''),
    })
  }
  const maps = {}
  for (const file of files) {
    const map = loadMap(file)
    maps[map.countryCode] = map
  }
  let l1Total = 0
  let l1Built = 0
  let l2Total = 0
  let l2Built = 0
  const missing = []
  for (const n of nodes) {
    const map = maps[n.countryCode]
    if (!n.parentCode) {
      l1Total++
      if (map?.regions[n.code]) l1Built++
      else missing.push(`L1 ${n.code} (${n.nameKo})`)
    } else {
      l2Total++
      if (map?.zooms[n.parentCode]?.regions[n.code]) l2Built++
      else missing.push(`L2 ${n.code} (${n.nameKo})`)
    }
  }
  console.log(`\n카탈로그 커버리지 — L1 ${l1Built}/${l1Total}, L2 ${l2Built}/${l2Total}`)
  if (missing.length > 0) {
    console.log('미구축 (산지 지도 없이 기존 텍스트 표기만 사용됨):')
    for (const s of missing) console.log(`  - ${s}`)
  }
}

let emptyTotal = 0
console.log('국가  총크기   국토외곽    L1     확대외곽    L2')
for (const file of files) {
  const map = loadMap(file)
  const bytes = readFileSync(join(MAP_DIR, file)).length
  const l1 = Object.values(map.regions).reduce((n, r) => n + r.path.length, 0)
  const zoomOutline = Object.values(map.zooms).reduce((n, z) => n + z.outlinePath.length, 0)
  const l2 = Object.values(map.zooms)
    .reduce((n, z) => n + Object.values(z.regions).reduce((k, r) => k + r.path.length, 0), 0)
  const kb = (v) => `${(v / 1024).toFixed(1)}KB`.padStart(9)
  console.log(`${map.countryCode.padEnd(4)}${kb(bytes)}${kb(map.outlinePath.length)}${kb(l1)}${kb(zoomOutline)}${kb(l2)}`)
}
console.log('')
for (const file of files) {
  const map = loadMap(file)
  console.log(`\n■ ${map.countryCode}  (outline ${map.outlinePath.length}자)`)
  console.log('  L1:')
  for (const [code, r] of Object.entries(map.regions)) {
    const flag = r.path.length === 0 ? '  ← 비어 있음' : ''
    if (!r.path.length) emptyTotal++
    console.log(`    ${code.padEnd(24)} path=${String(r.path.length).padStart(6)} marker=[${r.marker}]${flag}`)
  }
  for (const [parent, zoom] of Object.entries(map.zooms)) {
    const oFlag = zoom.outlinePath.length === 0 ? '  ← 비어 있음' : ''
    if (!zoom.outlinePath.length) emptyTotal++
    console.log(`  zoom ${parent}  outline=${zoom.outlinePath.length}${oFlag}`)
    for (const [code, r] of Object.entries(zoom.regions)) {
      const flag = r.path.length === 0 ? '  ← 비어 있음' : ''
      if (!r.path.length) emptyTotal++
      console.log(`    ${code.padEnd(34)} path=${String(r.path.length).padStart(6)} marker=[${r.marker}]${flag}`)
    }
  }
}
console.log(`\n빈 path 총 ${emptyTotal}개`)
if (targets.length === 0) catalogCoverage()
