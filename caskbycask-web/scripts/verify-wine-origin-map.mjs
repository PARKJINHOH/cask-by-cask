/**
 * WineOriginMap 실제 브라우저 렌더 확인 (개발 전용 시각 검증).
 * 컴포넌트와 동일한 SVG 구조·CSS 를 재현해 최종 모습과 애니메이션 상태를 캡처한다.
 *
 * 실행: npm run map:verify
 */
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const HERE = dirname(fileURLToPath(import.meta.url))
const WEB_ROOT = join(HERE, '..')
const MAP_DIR = join(WEB_ROOT, 'src', 'domain', 'location', 'data', 'wineRegionMap')
const OUT_DIR = join(WEB_ROOT, '.cache', 'wine-region-map', 'component')

const require = createRequire(join(WEB_ROOT, 'package.json'))
const puppeteer = require('puppeteer')

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

/** index.css 에서 산지 지도 관련 규칙만 추출 (컴포넌트와 동일한 CSS 를 쓰기 위해) */
const indexCss = readFileSync(join(WEB_ROOT, 'src', 'index.css'), 'utf8')
const WOM_END_MARKER = '.wom-ring { opacity: 0; }'
const womEnd = indexCss.indexOf(WOM_END_MARKER)
if (womEnd < 0) throw new Error('index.css 에서 산지 지도 CSS 를 찾지 못했습니다')
// 마커 바로 뒤에서 끊는다 — 여유를 두면 다음 줄의 /* 주석 시작을 삼켜 이후 규칙이 통째로 무효화된다
const womCss = indexCss.slice(indexCss.indexOf('@keyframes womZoneFill'), womEnd + WOM_END_MARKER.length)
/**
 * 전역 모션 축소 규칙도 함께 가져온다 — 산지 지도의 reduced-motion 대응은
 * 이 전역 미디어쿼리에 의존하므로 하네스에서도 동일하게 적용해야 검증이 유효하다.
 */
const rmStart = indexCss.indexOf('@media (prefers-reduced-motion: reduce)')
const reducedMotionCss = indexCss.slice(rmStart, indexCss.indexOf('\n}', indexCss.indexOf('\n  }', rmStart)) + 2)
if (rmStart < 0 || !reducedMotionCss.includes('animation-duration')) {
  throw new Error('index.css 에서 prefers-reduced-motion 규칙을 찾지 못했습니다')
}

const TOKENS = `
  :root {
    --color-neutral-200:#e5e5e5; --color-amber-500:#f59e0b;
    --color-amber-600:#d97706; --color-amber-700:#b45309; --color-amber-800:#92400e;
  }
  body { margin:0; background:#f8fafc; font-family:'Malgun Gothic',sans-serif; }
  .card { background:#fff; border:1px solid #f5f5f5; border-radius:16px; padding:18px; margin:14px; }
  .head { display:flex; justify-content:space-between; align-items:baseline; margin-bottom:12px; }
  .title { font-size:14px; font-weight:700; }
  .origin { font-size:12px; color:#737373; }
  .panels { display:grid; gap:12px; }
  /* 컴포넌트의 grid-cols-1 sm:grid-cols-2 와 동일 — Tailwind sm 브레이크포인트는 640px */
  @media (min-width: 640px) { .panels.two { grid-template-columns:1fr 1fr; } }
  /* 확대 패널이 없을 때 국가 지도가 과도하게 커지지 않게 제한 (컴포넌트의 max-w-[380px]) */
  .single { max-width:380px; margin:0 auto; width:100%; }
  figcaption { font-size:11px; font-weight:600; color:#737373; margin-bottom:4px; }
  .box { border-radius:12px; overflow:hidden; background:#f0f9ff99; border:1px solid #f5f5f5; }
  svg { display:block; width:100%; height:auto; }
  .src { margin-top:10px; font-size:10.5px; color:#a3a3a3; }
`

/** 컴포넌트의 focusViewBox 와 동일한 계산 */
function focusViewBox(baseViewBox, bbox) {
  const [, , w, h] = baseViewBox.split(' ').map(Number)
  const [x0, y0, x1, y1] = bbox
  const tw = Math.max(x1 - x0, 1)
  const th = Math.max(y1 - y0, 1)
  if (tw / w > 0.45 || th / h > 0.45) return baseViewBox
  const aspect = w / h
  let vw = Math.max(tw / 0.55, (th / 0.55) * aspect)
  let vh = vw / aspect
  vw = Math.min(vw, w)
  vh = Math.min(vh, h)
  const cx = (x0 + x1) / 2
  const cy = (y0 + y1) / 2
  const vx = Math.min(Math.max(cx - vw / 2, 0), w - vw)
  const vy = Math.min(Math.max(cy - vh / 2, 0), h - vh)
  return `${vx.toFixed(1)} ${vy.toFixed(1)} ${vw.toFixed(1)} ${vh.toFixed(1)}`
}

/** 컴포넌트의 MapPanel 과 동일한 SVG 마크업 */
function panel(caption, viewBox, outlinePath, shapes, targetCode, targetLabel, animate, focus = false) {
  const target = shapes[targetCode]
  const [mx, my] = target.marker
  const vb = focus ? focusViewBox(viewBox, target.bbox) : viewBox
  const s = Number(vb.split(' ')[2]) / Number(viewBox.split(' ')[2])
  const others = Object.entries(shapes)
    .filter(([code]) => code !== targetCode)
    .map(([, sh]) => `<path d="${sh.path}" fill="#e7e5e4" stroke="#d6d3d1" stroke-width="${0.5 * s}"/>`)
    .join('')
  return `<figure style="margin:0"><figcaption>${caption}</figcaption><div class="box">
    <svg viewBox="${vb}" role="img" aria-label="${caption} ${targetLabel}" class="${animate ? 'wom-animate' : ''}">
      <title>${caption} ${targetLabel}</title>
      <path d="${outlinePath}" fill="#fff" stroke="#e5e5e5" stroke-width="${0.8 * s}"/>
      ${others}
      <path class="wom-zone--target" d="${target.path}" fill="var(--color-amber-500)"
            stroke="var(--color-amber-700)" stroke-width="${1 * s}"/>
      <g class="wom-pin" style="transform-origin:${mx}px ${my}px">
        <line x1="${mx}" y1="${my}" x2="${mx}" y2="${my - 13 * s}" stroke="var(--color-amber-800)" stroke-width="${1.6 * s}"/>
        <circle cx="${mx}" cy="${my - 16 * s}" r="${4.5 * s}" fill="var(--color-amber-600)" stroke="#fff" stroke-width="${2 * s}"/>
      </g>
      <circle class="wom-ring" cx="${mx}" cy="${my}" r="${5 * s}" fill="none"
              stroke="var(--color-amber-500)" stroke-width="${2 * s}"/>
      <text class="wom-label" x="${mx}" y="${my + 19 * s}" text-anchor="middle" font-size="${12 * s}" font-weight="700"
            fill="#171717" paint-order="stroke" stroke="#fff" stroke-width="${3.5 * s}" stroke-linejoin="round">${targetLabel}</text>
    </svg></div></figure>`
}

/** 검증 시나리오: [국가, L1, L2|null, 국가명, L1명, L2명|null] */
const CASES = [
  ['FR', 'FR_BORDEAUX', 'FR_BORDEAUX_MEDOC', '프랑스', '보르도', '메독'],
  ['FR', 'FR_CHAMPAGNE', null, '프랑스', '샹파뉴', null],
  ['US', 'US_CALIFORNIA', 'US_CALIFORNIA_NAPA_VALLEY', '미국', '캘리포니아', '나파밸리'],
  ['IT', 'IT_PIEMONTE', 'IT_PIEMONTE_BAROLO', '이탈리아', '피에몬테', '바롤로'],
  ['ES', 'ES_CATALUNYA', 'ES_CATALUNYA_PRIORAT', '스페인', '카탈루냐', '프리오라트'],
  ['CL', 'CL_CENTRAL_VALLEY', 'CL_CENTRAL_VALLEY_MAIPO', '칠레', '센트럴밸리', '마이포'],
  ['AU', 'AU_SOUTH_AUSTRALIA', 'AU_SOUTH_AUSTRALIA_BAROSSA_VALLEY', '호주', '사우스오스트레일리아', '바로사밸리'],
  // L2 기하가 없는 경우 — 확대 패널 생략 확인 (태즈메이니아는 공식 GI 서브리전이 없다)
  ['AU', 'AU_TASMANIA', 'AU_TASMANIA_TAMAR_VALLEY', '호주', '태즈메이니아', '태머밸리'],
]

function cardHtml([cc, l1, l2, country, l1Name, l2Name], animate) {
  const map = MAPS[cc]
  const zoom = l2 ? map.zooms[l1] : null
  const showZoom = !!(zoom && zoom.regions[l2])
  const origin = l2Name ? `${country} · ${l1Name} · ${l2Name}` : `${country} · ${l1Name}`
  return `<div class="card">
    <div class="head"><span class="title">산지 지도</span><span class="origin">${origin}</span></div>
    <div class="panels ${showZoom ? 'two' : ''}">
      <div class="${showZoom ? '' : 'single'}">
        ${panel(country, map.viewBox, map.outlinePath, map.regions, l1, l1Name, animate)}
      </div>
      ${showZoom ? panel(l1Name, map.viewBox, zoom.outlinePath, zoom.regions, l2, l2Name, animate,
    Object.keys(zoom.regions).length > 1) : ''}
    </div>
    <p class="src">경계 데이터: ${map.attribution}</p>
  </div>`
}

mkdirSync(OUT_DIR, { recursive: true })
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] })

async function shoot(name, { animate, reduceMotion, width }) {
  const page = await browser.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
  if (reduceMotion) await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
  await page.setViewport({ width, height: 1000 })

  const html = `<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8">
    <style>${TOKENS}${womCss}${reducedMotionCss}</style></head><body>
    ${CASES.map((c) => cardHtml(c, animate)).join('')}</body></html>`
  const htmlPath = join(OUT_DIR, `${name}.html`)
  writeFileSync(htmlPath, html, 'utf8')
  await page.goto(`file://${htmlPath.replace(/\\/g, '/')}`, { waitUntil: 'load' })
  // 애니메이션 종료 대기 (zoneFill 0.8s / pin 1.05s / label 1.2s)
  await new Promise((r) => setTimeout(r, animate ? 1800 : 200))

  const state = await page.evaluate(() => {
    const target = document.querySelector('.wom-zone--target')
    const pin = document.querySelector('.wom-pin')
    const label = document.querySelector('.wom-label')
    const cs = (n) => (n ? getComputedStyle(n) : null)
    return {
      reduceMotionMatched: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      svgs: document.querySelectorAll('svg').length,
      paths: document.querySelectorAll('svg path').length,
      emptyPaths: [...document.querySelectorAll('svg path')].filter((p) => !p.getAttribute('d')).length,
      pins: document.querySelectorAll('.wom-pin').length,
      labels: document.querySelectorAll('.wom-label').length,
      targetFill: cs(target)?.fill ?? '',
      targetAnim: cs(target)?.animationName ?? '',
      animDuration: cs(target)?.animationDuration ?? '',
      pinOpacity: cs(pin)?.opacity ?? '',
      labelOpacity: cs(label)?.opacity ?? '',
      labelText: label?.textContent ?? '',
    }
  })
  await page.screenshot({ path: join(OUT_DIR, `${name}.png`), fullPage: true })
  await page.close()
  return { state, errors }
}

const AMBER = 'rgb(245, 158, 11)'
// 시나리오별 패널 수 합계 (국가 지도 1 + 확대 지도 유무)
const EXPECTED_SVGS = CASES.reduce((n, [cc, l1, l2]) => {
  const zoom = l2 ? MAPS[cc].zooms[l1] : null
  return n + 1 + (zoom && zoom.regions[l2] ? 1 : 0)
}, 0)
const results = []
for (const [name, opts] of Object.entries({
  'final-pc': { animate: false, reduceMotion: false, width: 1000 },
  'animated-pc': { animate: true, reduceMotion: false, width: 1000 },
  'animated-reduced': { animate: true, reduceMotion: true, width: 1000 },
  'mobile-375': { animate: false, reduceMotion: false, width: 375 },
})) {
  const { state, errors } = await shoot(name, opts)
  results.push({ name, ...state, errors })
  console.log(`[${name}] svg=${state.svgs} path=${state.paths} 빈path=${state.emptyPaths}`
    + ` pin=${state.pins} label=${state.labels}`
    + ` fill=${state.targetFill} anim=${state.targetAnim}(${state.animDuration})`
    + ` pinOpacity=${state.pinOpacity} labelOpacity=${state.labelOpacity}`
    + ` rmMatched=${state.reduceMotionMatched} 오류=${errors.length}`)
  if (errors.length) console.error('  ' + errors.join('\n  '))
}

await browser.close()

// ── 판정 ──
const problems = []
for (const r of results) {
  if (r.svgs !== EXPECTED_SVGS) problems.push(`${r.name}: svg 개수 ${r.svgs} (기대 ${EXPECTED_SVGS})`)
  if (r.emptyPaths !== 0) problems.push(`${r.name}: 빈 path ${r.emptyPaths}개`)
  if (r.pins !== EXPECTED_SVGS || r.labels !== EXPECTED_SVGS) {
    problems.push(`${r.name}: 핀/라벨 누락 (pin=${r.pins} label=${r.labels}, 기대 ${EXPECTED_SVGS})`)
  }
  if (r.targetFill !== AMBER) problems.push(`${r.name}: 대상 구역 최종 색상 ${r.targetFill}`)
  if (r.pinOpacity !== '1' || r.labelOpacity !== '1') {
    problems.push(`${r.name}: 핀/라벨 최종 opacity (pin=${r.pinOpacity} label=${r.labelOpacity})`)
  }
  if (r.labelText.length === 0) problems.push(`${r.name}: 라벨 텍스트 없음`)
  if (r.errors.length) problems.push(`${r.name}: 콘솔 오류 ${r.errors.length}건`)
}
// reduced-motion 케이스는 애니메이션이 사실상 즉시 종료되어야 한다 (전역 0.01ms 규칙)
const reduced = results.find((r) => r.name === 'animated-reduced')
if (reduced) {
  if (!reduced.reduceMotionMatched) {
    problems.push('reduced-motion 에뮬레이션이 적용되지 않았다 — 검증이 무효')
  }
  // '0.7s' | '1e-05s' 같은 CSS 시간 문자열을 초 단위 수치로 파싱
  const seconds = Number.parseFloat(reduced.animDuration)
  if (!(seconds < 0.01)) {
    problems.push(`reduced-motion 인데 애니메이션 지속시간이 ${reduced.animDuration}`)
  }
}

if (problems.length) {
  console.error('\nFAIL\n  ' + problems.join('\n  '))
  process.exit(1)
}
console.log(`\nPASS — 전 케이스에서 2단 지도·핀·라벨이 최종 상태로 렌더되고 reduced-motion 이 동작함`)
console.log(`스크린샷: ${OUT_DIR}`)
