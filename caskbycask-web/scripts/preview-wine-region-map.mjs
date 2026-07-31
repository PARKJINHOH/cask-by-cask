/**
 * 생성된 산지 지도 기하 데이터의 시각 검증 (개발 전용).
 * 국가 지도 + 모든 확대 지도를 PNG 로 렌더해 형상·핀 위치·라벨 겹침을 눈으로 확인한다.
 *
 * 실행: npm run map:preview            (전체)
 *       npm run map:preview -- FR
 */
import { mkdirSync, readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const HERE = dirname(fileURLToPath(import.meta.url))
const WEB_ROOT = join(HERE, '..')
const MAP_DIR = join(WEB_ROOT, 'src', 'domain', 'location', 'data', 'wineRegionMap')
const OUT_DIR = join(WEB_ROOT, '.cache', 'wine-region-map', 'preview')

const require = createRequire(join(WEB_ROOT, 'package.json'))
const puppeteer = require('puppeteer')

const targets = process.argv.slice(2).filter((a) => !a.startsWith('-')).map((s) => s.toLowerCase())
const files = readdirSync(MAP_DIR)
  .filter((f) => f.endsWith('.ts') && f !== 'types.ts' && f !== 'index.ts')
  .filter((f) => targets.length === 0 || targets.includes(f.replace('.ts', '')))

if (files.length === 0) {
  console.error('렌더할 지도 파일이 없습니다. 먼저 npm run map:build 를 실행하세요.')
  process.exit(1)
}

/** 생성된 TS 에서 CountryMap 객체 리터럴만 추출해 평가 (import 타입 구문 제거) */
function loadMap(file) {
  const src = readFileSync(join(MAP_DIR, file), 'utf8')
  const start = src.indexOf('{', src.indexOf('_MAP'))
  const body = src.slice(start).replace(/\s*$/, '').replace(/;?\s*$/, '')
  // eslint-disable-next-line no-new-func
  return Function(`"use strict"; return (${body})`)()
}

mkdirSync(OUT_DIR, { recursive: true })

const CSS = `
  body { margin:0; background:#f8fafc; font-family:'Malgun Gothic',sans-serif; }
  .grid { display:grid; grid-template-columns:repeat(2,1fr); gap:14px; padding:14px; }
  figure { margin:0; background:#fff; border:1px solid #e5e5e5; border-radius:12px; padding:10px; }
  figcaption { font-size:12px; font-weight:700; color:#404040; margin-bottom:6px; }
  svg { display:block; width:100%; height:auto; background:#eff6ff; border-radius:8px; }
  .outline { fill:#fff; stroke:#d4d4d4; stroke-width:1; }
  .zone { fill:#e7e5e4; stroke:#d6d3d1; stroke-width:.6; }
  .zone.target { fill:#f59e0b; stroke:#b45309; stroke-width:1; }
  .pin { fill:#d97706; stroke:#fff; stroke-width:1.6; }
  .label { font-size:10px; font-weight:700; fill:#171717; paint-order:stroke;
           stroke:#fff; stroke-width:3; stroke-linejoin:round; text-anchor:middle; }
`

function svgFor({ viewBox, outlinePath, regions }, targetCode) {
  // 대상 구역은 반드시 마지막에 그린다 — 실제 컴포넌트와 같은 순서.
  // 스카치 하이랜드처럼 상위 구역이 다른 구역을 지리적으로 포함하는 경우
  // 선언 순서대로 그리면 강조가 가려진다.
  const entries = Object.entries(regions)
  const ordered = [
    ...entries.filter(([code]) => code !== targetCode),
    ...entries.filter(([code]) => code === targetCode),
  ]
  const zones = ordered.map(([code, r]) =>
    `<path class="zone${code === targetCode ? ' target' : ''}" d="${r.path}" />`).join('')
  const pins = Object.entries(regions).map(([code, r]) =>
    `<circle class="pin" cx="${r.marker[0]}" cy="${r.marker[1]}" r="3.2" />`
    + `<text class="label" x="${r.marker[0]}" y="${r.marker[1] - 6}">${code.split('_').slice(1).join(' ')}</text>`).join('')
  return `<svg viewBox="${viewBox}"><path class="outline" d="${outlinePath}" />${zones}${pins}</svg>`
}

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] })
const page = await browser.newPage()
await page.setViewport({ width: 1000, height: 900, deviceScaleFactor: 1 })

for (const file of files) {
  const map = loadMap(file)
  const figures = []

  // 국가 지도 — 첫 L1 을 대상으로 하이라이트
  const firstL1 = Object.keys(map.regions)[0]
  figures.push(`<figure><figcaption>${map.countryCode} 국가 지도 (대상: ${firstL1})</figcaption>
    ${svgFor(map, firstL1)}</figure>`)

  // 확대 지도
  for (const [parent, zoom] of Object.entries(map.zooms)) {
    const firstL2 = Object.keys(zoom.regions)[0]
    figures.push(`<figure><figcaption>확대: ${parent} (대상: ${firstL2})</figcaption>
      ${svgFor({ viewBox: map.viewBox, outlinePath: zoom.outlinePath, regions: zoom.regions }, firstL2)}</figure>`)
  }

  const html = `<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8">
    <style>${CSS}</style></head><body><div class="grid">${figures.join('')}</div></body></html>`

  const htmlPath = join(OUT_DIR, `${map.countryCode}.html`)
  writeFileSync(htmlPath, html, 'utf8')

  const errors = []
  page.removeAllListeners('pageerror')
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto(`file://${htmlPath.replace(/\\/g, '/')}`, { waitUntil: 'load' })
  const pngPath = join(OUT_DIR, `${map.countryCode}.png`)
  await page.screenshot({ path: pngPath, fullPage: true })

  const stats = await page.evaluate(() => ({
    svgs: document.querySelectorAll('svg').length,
    paths: document.querySelectorAll('svg path').length,
    emptyPaths: [...document.querySelectorAll('svg path')].filter((p) => !p.getAttribute('d')).length,
  }))
  console.log(`${map.countryCode}: svg=${stats.svgs} path=${stats.paths} 빈path=${stats.emptyPaths}`
    + ` 오류=${errors.length} → ${pngPath}`)
  if (errors.length) console.error('  ' + errors.join('\n  '))
}

await browser.close()
