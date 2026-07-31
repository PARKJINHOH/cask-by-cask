/**
 * preview.html 렌더링 검증 (일회성 확인 스크립트).
 * 방식 A/B × 시나리오 FR/US 를 실제 브라우저에서 렌더하고
 * 콘솔 오류 / SVG 요소 생성 / 계측값을 확인한 뒤 스크린샷을 남긴다.
 *
 * 실행: node docs/prototypes/wine-region-map/verify.mjs
 */
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
// puppeteer 는 caskbycask-web 의 devDependency — 해당 패키지 기준으로 해석한다
const requireFromWeb = createRequire(join(here, '..', '..', '..', 'caskbycask-web', 'package.json'))
const puppeteer = requireFromWeb('puppeteer')

const pageUrl = pathToFileURL(join(here, 'preview.html')).href

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] })
const page = await browser.newPage()
await page.setViewport({ width: 1280, height: 1200, deviceScaleFactor: 1 })

const errors = []
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`) })

await page.goto(pageUrl, { waitUntil: 'load' })

async function snapshot(label) {
  return page.evaluate(() => {
    const q = (sel) => document.querySelectorAll(sel).length
    const txt = (id) => document.getElementById(id)?.textContent?.trim() ?? ''
    const target = document.querySelector('#stage svg .zone.target')
    const pin = document.querySelector('#stage svg .pin')
    const cs = (n) => (n ? getComputedStyle(n) : null)
    return {
      p1Svg: q('#p1 svg'), p2Svg: q('#p2 svg'),
      p1Empty: q('#p1 .empty'), p2Empty: q('#p2 .empty'),
      zones: q('#stage svg .zone'),
      targets: q('#stage svg .zone.target'),
      pins: q('#stage svg .pin'),
      labels: q('#stage svg text.label'),
      targetLabels: q('#stage svg text.label.target-label'),
      playing: q('#stage svg.playing'),
      // 애니메이션 종료(또는 reduced-motion) 후 최종 시각 상태
      targetFill: cs(target)?.fill ?? '',
      targetAnim: cs(target)?.animationName ?? '',
      pinOpacity: cs(pin)?.opacity ?? '',
      pinAnim: cs(pin)?.animationName ?? '',
      mode: txt('m-mode'), bytes: txt('m-bytes'),
      fetchMs: txt('m-fetch'), renderMs: txt('m-render'), dep: txt('m-dep'),
      p1Sub: txt('p1-sub'), p2Sub: txt('p2-sub'),
    }
  })
}

const results = []

async function run(label, { mode, scenario, lang = 'ko', reduce = false, waitMs = 400 }) {
  await page.click(`#tab-${mode}`)
  await page.select('#scenario', scenario)
  await page.select('#lang', lang)
  await page.evaluate((on) => {
    const cb = document.getElementById('reduce')
    if (cb.checked !== on) cb.click()
  }, reduce)
  await new Promise((r) => setTimeout(r, waitMs))
  const snap = await snapshot(label)
  results.push({ label, ...snap })
  await page.screenshot({ path: join(here, `shot-${label}.png`), fullPage: false })
  return snap
}

// 방식 A — 네트워크 불필요
await run('a-fr-ko', { mode: 'a', scenario: 'fr', waitMs: 1600 })
await run('a-us-ko', { mode: 'a', scenario: 'us', waitMs: 1600 })
await run('a-fr-reduce', { mode: 'a', scenario: 'fr', reduce: true, waitMs: 600 })

// 방식 A′ — 원본 fetch + 오프라인 가공 시연
await run('a2-fr-ko', { mode: 'a2', scenario: 'fr', waitMs: 10000 })
await run('a2-us-ko', { mode: 'a2', scenario: 'us', waitMs: 10000 })
await run('a2-fr-en', { mode: 'a2', scenario: 'fr', lang: 'en', waitMs: 4000 })

// 방식 B — CDN fetch 대기 시간 확보
await run('b-fr-ko', { mode: 'b', scenario: 'fr', waitMs: 6000 })
await run('b-us-ko', { mode: 'b', scenario: 'us', waitMs: 6000 })

console.log('\n=== 렌더링 검증 결과 ===')
for (const r of results) {
  console.log(
    `\n[${r.label}] ${r.mode}` +
    `\n  패널: p1 svg=${r.p1Svg} p2 svg=${r.p2Svg} (empty p1=${r.p1Empty} p2=${r.p2Empty})` +
    `\n  요소: zone=${r.zones} target=${r.targets} pin=${r.pins} label=${r.labels} targetLabel=${r.targetLabels} playing=${r.playing}` +
    `\n  최종상태: targetFill=${r.targetFill} anim=${r.targetAnim} / pinOpacity=${r.pinOpacity} anim=${r.pinAnim}` +
    `\n  계측: bytes=${r.bytes} fetch=${r.fetchMs} render=${r.renderMs} dep=${r.dep}` +
    `\n  라벨: ${r.p1Sub} / ${r.p2Sub}`
  )
}

console.log('\n=== 콘솔/페이지 오류 ===')
console.log(errors.length === 0 ? '없음' : errors.join('\n'))

await browser.close()

// ── 판정 ────────────────────────────────────────────────────
const AMBER = 'rgb(245, 158, 11)'   // --amber-500
const problems = []
for (const r of results) {
  if (r.p1Svg !== 1 || r.p2Svg !== 1) problems.push(`${r.label}: 2단 패널 미완성`)
  if (r.targets < 2) problems.push(`${r.label}: 대상 구역이 두 패널에 없음`)
  if (r.pins < 2) problems.push(`${r.label}: 핀이 두 패널에 없음`)
  if (r.targetLabels < 2) problems.push(`${r.label}: 대상 라벨이 두 패널에 없음`)
  // 애니메이션 종료 후에는 대상 구역이 amber 로 확정되어야 한다
  if (r.targetFill !== AMBER) problems.push(`${r.label}: 대상 구역 최종 색상 불일치 (${r.targetFill})`)
  if (r.pinOpacity !== '1') problems.push(`${r.label}: 핀 최종 opacity 불일치 (${r.pinOpacity})`)
  // reduced-motion 케이스는 애니메이션이 비활성이어야 한다
  if (r.label.includes('reduce') && (r.targetAnim !== 'none' || r.pinAnim !== 'none')) {
    problems.push(`${r.label}: reduced-motion 인데 애니메이션이 살아있음 (${r.targetAnim}/${r.pinAnim})`)
  }
}
if (problems.length || errors.length) {
  console.error('\nFAIL\n  ' + [...problems, ...errors].join('\n  '))
  process.exit(1)
}
console.log('\nPASS — 모든 케이스에서 2단 지도 + 대상 구역(amber 확정) + 핀 + 라벨 렌더, reduced-motion 정상')
