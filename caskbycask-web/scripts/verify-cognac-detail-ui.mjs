/**
 * 사용자 주류 상세 — 꼬냑 섹션 시각 검증.
 *
 * <p>빌드된 **실제 Tailwind 번들**(.next/static/chunks/*.css)을 물려 렌더하므로
 * 클래스 이름을 흉내 낸 목업이 아니라 화면에 나오는 그대로를 본다.
 * 마크업은 `SpiritDetailPage` 의 꼬냑 블록과 같은 구조로 유지할 것 — 한쪽만 바꾸면 검증이 무의미해진다.
 *
 * 실행: npm run verify:cognac-ui   (먼저 npm run build 로 CSS 번들이 있어야 한다)
 */
import { mkdirSync, readFileSync, readdirSync, writeFileSync, existsSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const HERE = dirname(fileURLToPath(import.meta.url))
const WEB_ROOT = join(HERE, '..')
const OUT_DIR = join(WEB_ROOT, '.cache', 'cognac-detail-ui')
const CSS_DIR = join(WEB_ROOT, '.next', 'static', 'chunks')

const require = createRequire(join(WEB_ROOT, 'package.json'))
const puppeteer = require('puppeteer')

// ── 실제 빌드 산출 CSS 확보 ──────────────────────────────
if (!existsSync(CSS_DIR)) {
  console.error('FAIL — .next/static/chunks 가 없다. 먼저 `npm run build` 를 실행할 것.')
  process.exit(1)
}
const cssFile = readdirSync(CSS_DIR)
  .filter((f) => f.endsWith('.css'))
  .map((f) => ({ f, size: statSync(join(CSS_DIR, f)).size }))
  .sort((a, b) => b.size - a.size)[0]
if (!cssFile) {
  console.error('FAIL — 빌드된 CSS 번들을 찾지 못했다. `npm run build` 후 다시 실행할 것.')
  process.exit(1)
}
const CSS = readFileSync(join(CSS_DIR, cssFile.f), 'utf8')

const ko = JSON.parse(readFileSync(join(WEB_ROOT, 'src', 'locales', 'ko.json'), 'utf8'))
const t = (path) => path.split('.').reduce((o, k) => o?.[k], ko) ?? `!${path}`

// ── SpiritDetailPage 의 꼬냑 블록과 같은 마크업 ──────────
const badge = (text, amber = false) => amber
  ? `<span class="group relative inline-block mr-1 mb-1"><button type="button" class="px-2 py-0.5 rounded-full border border-amber-200 bg-amber-50/60 text-amber-700 text-xs font-medium">${text}</button></span>`
  : `<span class="inline-block px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 text-xs font-medium mr-1 mb-1">${text}</span>`

const di = (label, value) => value == null ? '' : `
  <div class="flex items-center justify-between gap-4 py-3 border-b border-neutral-100">
    <dt class="text-[13px] text-neutral-400 flex-shrink-0">${label}</dt>
    <dd class="text-[14px] font-semibold text-neutral-900 text-right">${value}</dd>
  </div>`

const diChips = (label, chips) => !chips ? '' : `
  <div class="flex items-start justify-start gap-4 py-3 border-b border-neutral-100 sm:col-span-2">
    <dt class="text-[13px] text-neutral-400 flex-shrink-0 pt-1">${label}</dt>
    <dd class="flex flex-wrap justify-start gap-2 items-center">${chips}</dd>
  </div>`

function cognacSection(c) {
  const crus = c.cruComposition ?? []
  const gradeBadge = !c.grade ? '' : c.grade === 'NO_STATEMENT'
    ? `<span class="px-3 py-1.5 rounded-lg bg-neutral-100 border border-neutral-200 text-neutral-500 text-xs font-medium">${t('spirit.cognacGrade.NO_STATEMENT')}</span>`
    : `<span class="px-4 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-lg font-bold">${t(`spirit.cognacGrade.${c.grade}`)}</span>`

  const cruChips = crus.length === 0 ? null
    : badge(t(crus.length === 1 ? 'spirit.cognacBlend.singleCru' : 'spirit.cognacBlend.multiCru'), true)
      + crus.map((x) => badge(`${t(`spirit.cognacCru.${x.cru}`)}${x.percentage != null ? ` ${x.percentage}%` : ''}`)).join('')

  const oakChips = !c.oakTypes?.length ? null
    : c.oakTypes.map((o) => badge(t(`spirit.cognacOak.${o}`))).join('')

  return `
  <div class="bg-white rounded-3xl ring-1 ring-neutral-100 p-6 lg:p-8">
    <p class="text-[11px] font-bold text-neutral-400 uppercase tracking-widest mb-2">Cognac</p>
    <div class="flex items-center gap-2.5 flex-wrap">
      ${gradeBadge}
      ${c.isFineChampagne ? badge('Fine Champagne', true) : ''}
    </div>
    <div class="mt-3">
      <dl class="grid grid-cols-1 sm:grid-cols-2 sm:gap-x-12">
        ${diChips('크뤼', cruChips)}
        ${diChips('오크 산지', oakChips)}
        ${di('빈티지', c.vintageYear)}
        ${di('숙성연수', c.ageYears != null ? `${c.ageYears}년` : null)}
        ${di('캐스크 피니시', c.caskFinish)}
      </dl>
    </div>
    ${c.blendDetail ? `
    <div class="mt-4">
      <p class="text-[11px] text-neutral-400 mb-1.5">블렌드</p>
      <p class="text-sm text-neutral-600 leading-relaxed">${c.blendDetail}</p>
    </div>` : ''}
  </div>`
}

// ── 실제로 등록될 법한 조합들 ────────────────────────────
const CASES = {
  'hennessy-xo': {
    title: '헤네시 XO — 멀티 크뤼(비율 비공개) · 오크 2종',
    data: {
      grade: 'XO',
      cruComposition: [
        { cru: 'GRANDE_CHAMPAGNE', percentage: null }, { cru: 'PETITE_CHAMPAGNE', percentage: null },
        { cru: 'BORDERIES', percentage: null }, { cru: 'FINS_BOIS', percentage: null },
      ],
      isFineChampagne: false, oakTypes: ['LIMOUSIN', 'TRONCAIS'],
      blendDetail: '약 100종의 오드비를 블렌딩. 최고령 원액 30년.',
    },
  },
  'remy-1738': {
    title: '레미 마르탱 1738 — 등급 표기 없음 · Fine Champagne',
    data: {
      grade: 'NO_STATEMENT',
      cruComposition: [{ cru: 'GRANDE_CHAMPAGNE', percentage: null }, { cru: 'PETITE_CHAMPAGNE', percentage: null }],
      isFineChampagne: true, oakTypes: ['LIMOUSIN'],
      blendDetail: 'VSOP와 XO 사이에 놓인 큐베로, 등급 표기 없이 큐베 이름으로 판다.',
    },
  },
  'frapin-single-cru': {
    title: '프라팽 — 싱글 크뤼 100% · 빈티지 · 숙성연수',
    data: {
      grade: 'EXTRA',
      cruComposition: [{ cru: 'GRANDE_CHAMPAGNE', percentage: 100 }],
      isFineChampagne: false, oakTypes: ['LIMOUSIN', 'TRONCAIS', 'ALLIER'],
      vintageYear: 1990, ageYears: 25, caskFinish: '포트 캐스크 피니시',
      blendDetail: '싱글 에스테이트에서 재배한 위니 블랑만 사용한다.',
    },
  },
  minimal: {
    title: '최소 입력 — 등급만',
    data: { grade: 'VSOP', cruComposition: [], oakTypes: [] },
  },
}

mkdirSync(OUT_DIR, { recursive: true })
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] })
const problems = []

for (const [width, tag] of [[1280, 'pc'], [420, 'mobile']]) {
  for (const [key, { title, data }] of Object.entries(CASES)) {
    const page = await browser.newPage()
    const errors = []
    page.on('pageerror', (e) => errors.push(e.message))
    await page.setViewport({ width, height: 900 })

    const html = `<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8">
      <style>${CSS}</style>
      <style>body{background:#f8fafc;padding:16px;font-family:'Malgun Gothic',sans-serif}</style>
      </head><body><h2 class="text-xs text-neutral-500 mb-2">${title}</h2>${cognacSection(data)}</body></html>`
    const file = join(OUT_DIR, `${key}-${tag}.html`)
    writeFileSync(file, html, 'utf8')
    await page.goto(`file://${file.replace(/\\/g, '/')}`, { waitUntil: 'load' })

    // 가로 스크롤이 생기면 칩이나 라벨이 넘친 것이다
    const overflow = await page.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth)
    if (overflow > 1) problems.push(`${key}/${tag}: 가로 넘침 ${overflow}px`)
    if (errors.length) problems.push(`${key}/${tag}: JS 오류 ${errors.join(' / ')}`)

    await page.screenshot({ path: join(OUT_DIR, `${key}-${tag}.png`), fullPage: true })
    await page.close()
    console.log(`[${tag}] ${key.padEnd(18)} 넘침=${overflow}px`)
  }
}
await browser.close()

console.log()
if (problems.length === 0) {
  console.log('PASS — 모든 조합이 넘침 없이 렌더됨')
  console.log(`스크린샷: ${OUT_DIR}`)
} else {
  console.log(`FAIL — ${problems.length}건`)
  for (const p of problems) console.log('  · ' + p)
  process.exitCode = 1
}
