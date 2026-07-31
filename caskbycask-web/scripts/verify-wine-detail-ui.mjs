/**
 * 와인 상세 UI(2분할 + 맛 5단계 바 + 인터랙티브 지도) 시각 검증.
 * 컴포넌트와 동일한 마크업/CSS 를 재현해 국가 지도 → 확대 전환과 뒤로가기를 확인한다.
 *
 * 실행: npm run map:verify-ui
 */
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const HERE = dirname(fileURLToPath(import.meta.url))
const WEB_ROOT = join(HERE, '..')
const MAP_DIR = join(WEB_ROOT, 'src', 'domain', 'location', 'data', 'wineRegionMap')
const OUT_DIR = join(WEB_ROOT, '.cache', 'wine-region-map', 'detail-ui')

const require = createRequire(join(WEB_ROOT, 'package.json'))
const puppeteer = require('puppeteer')

function loadMap(file) {
  const src = readFileSync(join(MAP_DIR, file), 'utf8')
  const start = src.indexOf('{', src.indexOf('_MAP'))
  return Function(`"use strict"; return (${src.slice(start).replace(/;?\s*$/, '')})`)()
}
const MAPS = {}
for (const f of readdirSync(MAP_DIR).filter((x) => x.endsWith('.ts') && !['types.ts', 'index.ts'].includes(x))) {
  const m = loadMap(f)
  MAPS[m.countryCode] = m
}

const indexCss = readFileSync(join(WEB_ROOT, 'src', 'index.css'), 'utf8')
const END = '.wom-ring { opacity: 0; }'
const womCss = indexCss.slice(indexCss.indexOf('@keyframes womZoneFill'), indexCss.indexOf(END) + END.length)

const CSS = `
  :root { --color-neutral-200:#e5e5e5; --color-amber-500:#f59e0b;
          --color-amber-600:#d97706; --color-amber-700:#b45309; --color-amber-800:#92400e; }
  body { margin:0; background:#f8fafc; font-family:'Malgun Gothic',sans-serif; }
  .wine { padding:16px; }
  .split { display:grid; grid-template-columns:1fr 1fr; gap:12px; align-items:start; }
  @media (max-width:1023px) { .split { grid-template-columns:1fr; } }
  .single { max-width:448px; }
  .card { background:#fff; border:1px solid #f5f5f5; border-radius:16px; padding:18px; }
  .h3 { font-size:14px; font-weight:700; margin:0 0 12px; }
  .axis { margin-bottom:12px; }
  .axis-head { display:flex; justify-content:space-between; align-items:baseline; margin-bottom:4px; }
  .axis-label { font-size:12px; font-weight:600; color:#525252; }
  .axis-value { font-size:12px; font-weight:700; color:#b45309; }
  .axis-value.unset { color:#d4d4d4; }
  .bar { display:flex; gap:4px; }
  .step { height:10px; flex:1; border-radius:9999px; background:#e5e5e5; }
  .step.on { background:#f59e0b; }
  .ends { display:flex; justify-content:space-between; margin-top:4px; }
  .ends span { font-size:10.5px; color:#a3a3a3; }
  .origin { display:flex; gap:6px; align-items:center; margin-bottom:12px; flex-wrap:wrap; }
  .origin span { font-size:13px; }
  .origin .mid { color:#737373; font-weight:500; }
  .origin .last { color:#b45309; font-weight:700; }
  .origin .sep { color:#d4d4d4; }
  figcaption { display:flex; justify-content:space-between; font-size:11px; font-weight:600; color:#737373; margin-bottom:4px; }
  figcaption .hint { color:#b45309; }
  .box { border-radius:12px; overflow:hidden; background:#f0f9ff99; border:1px solid #f5f5f5; position:relative; }
  svg { display:block; width:100%; height:auto; }
  .back { position:absolute; top:28px; left:8px; background:rgba(255,255,255,.95); border:1px solid #e5e5e5;
          border-radius:9999px; padding:4px 10px; font-size:11px; font-weight:600; cursor:pointer; }
  .src { margin-top:10px; font-size:10.5px; color:#a3a3a3; }
`

const SWEET = ['DRY', 'OFF_DRY', 'MEDIUM', 'MEDIUM_SWEET', 'SWEET']
const BODY = ['LIGHT', 'LIGHT_MEDIUM', 'MEDIUM', 'MEDIUM_FULL', 'FULL']
const INTENSITY = ['LOW', 'LOW_MEDIUM', 'MEDIUM', 'MEDIUM_HIGH', 'HIGH']
const KO = {
  DRY: '드라이', OFF_DRY: '오프드라이', MEDIUM: '미디엄', MEDIUM_SWEET: '미디엄 스위트', SWEET: '스위트',
  LIGHT: '라이트', LIGHT_MEDIUM: '라이트 미디엄', MEDIUM_FULL: '미디엄 풀', FULL: '풀바디',
  LOW: '낮음', LOW_MEDIUM: '약간 낮음', MEDIUM_HIGH: '약간 높음', HIGH: '높음',
}

function bars(values) {
  const axes = [
    ['당도', SWEET, values.sweetness], ['바디', BODY, values.body],
    ['산도', INTENSITY, values.acidity], ['타닌', INTENSITY, values.tannin],
  ]
  return axes.map(([label, scale, value]) => {
    const level = value ? scale.indexOf(value) + 1 : 0
    const steps = Array.from({ length: 5 }, (_, i) =>
      `<span class="step${level >= i + 1 ? ' on' : ''}"></span>`).join('')
    const valueLabel = value ? (KO[value] ?? value) : '미지정'
    // 양 끝 특징 — 컴포넌트와 동일하게 척도의 처음/마지막 값 라벨을 표시한다
    const ends = `<div class="ends"><span>${KO[scale[0]] ?? scale[0]}</span>`
      + `<span>${KO[scale[scale.length - 1]] ?? scale[scale.length - 1]}</span></div>`
    return `<div class="axis"><div class="axis-head"><span class="axis-label">${label}</span>
      <span class="axis-value${value ? '' : ' unset'}">${valueLabel}</span></div>
      <div class="bar">${steps}</div>${ends}</div>`
  }).join('')
}

function focusViewBox(base, bbox) {
  const [, , w, h] = base.split(' ').map(Number)
  const [x0, y0, x1, y1] = bbox
  const tw = Math.max(x1 - x0, 1); const th = Math.max(y1 - y0, 1)
  if (tw / w > 0.45 || th / h > 0.45) return base
  const aspect = w / h
  let vw = Math.min(Math.max(tw / 0.55, (th / 0.55) * aspect), w)
  const vh = Math.min(vw / aspect, h)
  const vx = Math.min(Math.max((x0 + x1) / 2 - vw / 2, 0), w - vw)
  const vy = Math.min(Math.max((y0 + y1) / 2 - vh / 2, 0), h - vh)
  return `${vx.toFixed(1)} ${vy.toFixed(1)} ${vw.toFixed(1)} ${vh.toFixed(1)}`
}

function panel(caption, map, outlinePath, shapes, targetCode, targetLabel, { focus = false, hint = null, back = false } = {}) {
  const target = shapes[targetCode]
  const [mx, my] = target.marker
  const vb = focus ? focusViewBox(map.viewBox, target.bbox) : map.viewBox
  const s = Number(vb.split(' ')[2]) / Number(map.viewBox.split(' ')[2])
  const others = Object.entries(shapes).filter(([c]) => c !== targetCode)
    .map(([, sh]) => `<path d="${sh.path}" fill="#e7e5e4" stroke="#d6d3d1" stroke-width="${0.5 * s}"/>`).join('')
  return `<figure style="margin:0"><figcaption><span>${caption}</span>
      ${hint ? `<span class="hint">🔍 ${hint}</span>` : ''}</figcaption>
    <div class="box">
      <svg viewBox="${vb}" role="img" aria-label="${caption} ${targetLabel}" class="wom-animate">
        <path d="${outlinePath}" fill="#fff" stroke="#e5e5e5" stroke-width="${0.8 * s}"/>
        ${others}
        <g${hint ? ' role="button" tabindex="0" style="cursor:pointer"' : ''}>
          <path class="wom-zone--target" d="${target.path}" fill="var(--color-amber-500)"
                stroke="var(--color-amber-700)" stroke-width="${(hint ? 1.6 : 1) * s}"/>
          <g class="wom-pin" style="transform-origin:${mx}px ${my}px">
            <line x1="${mx}" y1="${my}" x2="${mx}" y2="${my - 13 * s}" stroke="var(--color-amber-800)" stroke-width="${1.6 * s}"/>
            <circle cx="${mx}" cy="${my - 16 * s}" r="${4.5 * s}" fill="var(--color-amber-600)" stroke="#fff" stroke-width="${2 * s}"/>
          </g>
          <circle class="wom-ring" cx="${mx}" cy="${my}" r="${5 * s}" fill="none" stroke="var(--color-amber-500)" stroke-width="${2 * s}"/>
          <text class="wom-label" x="${mx}" y="${my + 19 * s}" text-anchor="middle" font-size="${12 * s}" font-weight="700"
                fill="#171717" paint-order="stroke" stroke="#fff" stroke-width="${3.5 * s}" stroke-linejoin="round">${targetLabel}</text>
        </g>
      </svg>
      ${back ? '<button class="back">‹ 국가 지도로</button>' : ''}
    </div></figure>`
}

function card([cc, l1, l2, country, l1Name, l2Name, taste], zoomed) {
  const map = MAPS[cc]
  const zoom = l2 ? map.zooms[l1] : null
  const canZoom = !!(zoom && zoom.regions[l2])
  const parts = [country, l1Name, l2Name].filter(Boolean)
  const origin = parts.map((p, i) =>
    `${i ? '<span class="sep">›</span>' : ''}<span class="${i === parts.length - 1 ? 'last' : 'mid'}">${p}</span>`).join('')
  const mapBody = zoomed && canZoom
    ? panel(l1Name, map, zoom.outlinePath, zoom.regions, l2, l2Name,
      { focus: Object.keys(zoom.regions).length > 1, back: true })
    : panel(country, map, map.outlinePath, map.regions, l1, l1Name,
      { hint: canZoom ? '세부 산지 보기' : null })

  const mapCard = `<div class="card"><h3 class="h3">산지 지도</h3>
        <div class="origin">${origin}</div>${mapBody}
        <p class="src">경계 데이터: ${map.attribution}</p></div>`

  // 위스키는 맛 5단계 지표가 없다 — 2분할 대신 지도만 좌측 폭으로 둔다
  if (!taste) {
    return `<div class="wine whisky"><div class="single">${mapCard}</div></div>`
  }
  return `<div class="wine"><div class="split">
      <div class="card"><h3 class="h3">맛</h3>${bars(taste)}</div>
      ${mapCard}
    </div></div>`
}

const CASES = [
  ['FR', 'FR_BORDEAUX', 'FR_BORDEAUX_MEDOC', '프랑스', '보르도', '메독',
    { sweetness: 'DRY', body: 'MEDIUM_FULL', acidity: 'MEDIUM', tannin: 'HIGH' }],
  ['DE', 'DE_MOSEL', null, '독일', '모젤', null,
    { sweetness: 'MEDIUM_SWEET', body: 'LIGHT', acidity: 'HIGH', tannin: null }],
  ['NZ', 'NZ_MARLBOROUGH', null, '뉴질랜드', '말버러', null,
    { sweetness: 'DRY', body: 'LIGHT_MEDIUM', acidity: 'MEDIUM_HIGH', tannin: 'LOW' }],
  // 위스키 — 맛 지표가 없어 지도만 렌더된다
  ['GB-SCT', 'GB_SCT_SPEYSIDE', null, '스코틀랜드', '스페이사이드', null, null],
  ['GB-SCT', 'GB_SCT_ISLAY', null, '스코틀랜드', '아일라', null, null],
  ['JP', 'JP_YAMANASHI', null, '일본', '야마나시', null, null],
  ['US', 'US_KENTUCKY', null, '미국', '켄터키', null, null],
]

mkdirSync(OUT_DIR, { recursive: true })
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] })

async function shoot(name, { zoomed, width }) {
  const page = await browser.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
  await page.setViewport({ width, height: 1200 })
  const html = `<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8">
    <style>${CSS}${womCss}</style></head><body>
    ${CASES.map((c) => card(c, zoomed)).join('')}</body></html>`
  const p = join(OUT_DIR, `${name}.html`)
  writeFileSync(p, html, 'utf8')
  await page.goto(`file://${p.replace(/\\/g, '/')}`, { waitUntil: 'load' })
  await new Promise((r) => setTimeout(r, 1800))
  const state = await page.evaluate(() => ({
    splits: document.querySelectorAll('.split').length,
    singles: document.querySelectorAll('.single').length,
    bars: document.querySelectorAll('.bar').length,
    steps: document.querySelectorAll('.step').length,
    filled: document.querySelectorAll('.step.on').length,
    svgs: document.querySelectorAll('svg').length,
    emptyPaths: [...document.querySelectorAll('svg path')].filter((x) => !x.getAttribute('d')).length,
    clickableZones: document.querySelectorAll('g[role="button"]').length,
    backButtons: document.querySelectorAll('.back').length,
    originLast: [...document.querySelectorAll('.origin .last')].map((x) => x.textContent),
    targetFill: getComputedStyle(document.querySelector('.wom-zone--target')).fill,
  }))

  // 케이스별로 잘라 저장한다 — fullPage 로 한 장에 담으면 세로가 매우 길어져
  // 이미지 뷰어(최대 2000px)에서 열 수 없다.
  const cards = await page.$$('.wine')
  for (let i = 0; i < cards.length; i++) {
    await cards[i].screenshot({ path: join(OUT_DIR, `${name}-${CASES[i][0]}.png`) })
  }
  await page.close()
  return { state, errors }
}

const results = []
for (const [name, opts] of Object.entries({
  'country-pc': { zoomed: false, width: 1200 },
  'zoomed-pc': { zoomed: true, width: 1200 },
  'country-mobile': { zoomed: false, width: 390 },
})) {
  const { state, errors } = await shoot(name, opts)
  results.push({ name, ...state, errors })
  console.log(`[${name}] split=${state.splits} bar=${state.bars} step=${state.steps} 채움=${state.filled}`
    + ` svg=${state.svgs} 빈path=${state.emptyPaths} 클릭구역=${state.clickableZones}`
    + ` 뒤로가기=${state.backButtons} 산지끝=${state.originLast.join('/')} fill=${state.targetFill} 오류=${errors.length}`)
  if (errors.length) console.error('  ' + errors.join('\n  '))
}
await browser.close()

const problems = []
const AMBER = 'rgb(245, 158, 11)'
// 맛 지표가 있는 케이스(와인)만 2분할·맛 바를 갖는다. 위스키는 지도 단독이다.
const WINE_CASES = CASES.filter((c) => !!c[6]).length
const WHISKY_CASES = CASES.length - WINE_CASES
for (const r of results) {
  if (r.splits !== WINE_CASES) problems.push(`${r.name}: 2분할 블록 ${r.splits} (기대 ${WINE_CASES})`)
  if (r.singles !== WHISKY_CASES) problems.push(`${r.name}: 위스키 단독 블록 ${r.singles} (기대 ${WHISKY_CASES})`)
  if (r.bars !== WINE_CASES * 4) problems.push(`${r.name}: 맛 축 ${r.bars} (기대 ${WINE_CASES * 4})`)
  if (r.steps !== WINE_CASES * 4 * 5) problems.push(`${r.name}: 5단계 칸 수 ${r.steps}`)
  if (r.filled === 0) problems.push(`${r.name}: 채워진 단계가 없다`)
  if (r.svgs !== CASES.length) problems.push(`${r.name}: 지도 ${r.svgs}개 (한 번에 하나만 보여야 함)`)
  if (r.emptyPaths !== 0) problems.push(`${r.name}: 빈 path ${r.emptyPaths}`)
  if (r.targetFill !== AMBER) problems.push(`${r.name}: 대상 색상 ${r.targetFill}`)
  if (r.errors.length) problems.push(`${r.name}: 콘솔 오류 ${r.errors.length}`)
}
const country = results.find((r) => r.name === 'country-pc')
const zoomed = results.find((r) => r.name === 'zoomed-pc')
// 국가 뷰: 확대 가능한 산지(보르도)만 클릭 대상, 뒤로가기 없음
if (country.clickableZones !== 1) problems.push(`국가 뷰 클릭 구역 ${country.clickableZones} (기대 1 — 보르도만)`)
if (country.backButtons !== 0) problems.push('국가 뷰에 뒤로가기가 있다')
// 확대 뷰: 뒤로가기 1개, 산지 끝이 세부 산지(메독)
if (zoomed.backButtons !== 1) problems.push(`확대 뷰 뒤로가기 ${zoomed.backButtons} (기대 1)`)
if (!zoomed.originLast.includes('메독')) problems.push('확대 뷰 산지 계층에 메독이 없다')

if (problems.length) {
  console.error('\nFAIL\n  ' + problems.join('\n  '))
  process.exit(1)
}
console.log(`\nPASS — 2분할 레이아웃·맛 5단계 바·국가↔확대 전환·뒤로가기 정상`)
console.log(`스크린샷: ${OUT_DIR}`)
