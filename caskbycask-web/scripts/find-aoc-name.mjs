/**
 * 산지 소스 데이터에서 AOC/산지 이름을 검색한다 (개발 보조 도구).
 * 매핑 설정에 넣을 정확한 표기를 찾을 때 사용한다.
 *
 * 실행: npm run map:find -- Emilion Entre-deux Rotie
 */
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const CSV = join(HERE, '..', '.cache', 'wine-region-map', 'inao-aoc-communes.csv')

if (!existsSync(CSV)) {
  console.error('원본 캐시가 없습니다. 먼저 npm run map:build 를 한 번 실행하세요.')
  process.exit(1)
}

const text = new TextDecoder('windows-1252').decode(readFileSync(CSV))
const lines = text.split(/\r?\n/).filter(Boolean)

function parseRow(line) {
  const cells = []
  let cur = ''
  let inQuotes = false
  for (const ch of line) {
    if (ch === '"') { inQuotes = !inQuotes; continue }
    if (ch === ';' && !inQuotes) { cells.push(cur); cur = ''; continue }
    cur += ch
  }
  cells.push(cur)
  return { insee: cells[0], aoc: cells[4] }
}

const byAoc = new Map()
for (const r of lines.slice(1).map(parseRow)) {
  if (!r.aoc) continue
  if (!byAoc.has(r.aoc)) byAoc.set(r.aoc, new Set())
  byAoc.get(r.aoc).add(r.insee)
}

const queries = process.argv.slice(2).filter((a) => !a.startsWith('-'))
if (queries.length === 0) {
  console.log(`AOC 총 ${byAoc.size}개. 검색어를 인자로 주세요.`)
  process.exit(0)
}

for (const q of queries) {
  console.log(`\n=== "${q}" ===`)
  const hits = [...byAoc.entries()]
    .filter(([name]) => name.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => b[1].size - a[1].size)
    .slice(0, 20)
  if (hits.length === 0) { console.log('  없음'); continue }
  for (const [name, set] of hits) console.log(`  ${String(set.size).padStart(5)} communes  ${name}`)
}
