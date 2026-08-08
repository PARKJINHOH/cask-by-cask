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
/** 상세 목록의 값 자리에 놓이는 칩 — 글자 크기는 옆 행(di)의 값과 같아야 한다 */
const badge = (text, tone = 'plain') => tone === 'plain'
  ? `<span class="inline-block px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-600 text-[14px] font-medium mr-1 mb-1">${text}</span>`
  : `<span class="group relative inline-block mr-1 mb-1"><button type="button" class="px-2.5 py-1 rounded-full border text-[14px] font-medium ${
      tone === 'neutral'
        ? 'border-neutral-200 bg-neutral-100 text-neutral-600'
        : 'border-amber-200 bg-amber-50/60 text-amber-700'
    }">${text}</button></span>`

/** 뱃지가 아닌 일반 텍스트 값 — 옆 행(di)의 값과 같은 글자 */
const rowText = (text) => `<span class="text-[14px] font-semibold text-neutral-900 text-right">${text}</span>`

/** prose=true 면 문단형 값 — 행 골격은 같고 글줄만 좌측정렬·보통 굵기 */
const di = (label, value, prose = false) => value == null ? '' : `
  <div class="flex justify-between gap-4 py-3 border-b border-neutral-200 ${prose ? 'items-start' : 'items-center'}">
    <dt class="text-[13px] text-neutral-400 flex-shrink-0 ${prose ? 'pt-0.5' : ''}">${label}</dt>
    <dd class="${prose
      ? 'text-[14px] text-neutral-600 leading-relaxed text-left'
      : 'text-[14px] font-semibold text-neutral-900 text-right'}">${value}</dd>
  </div>`

/** stack=true 면 한 항목당 한 줄 (SpiritDetailPage 의 DIChips stack 모드와 같아야 한다) */
const diChips = (label, chips, stack = false) => !chips ? '' : `
  <div class="flex items-start justify-between gap-4 py-3 border-b border-neutral-200">
    <dt class="text-[13px] text-neutral-400 flex-shrink-0 pt-1">${label}</dt>
    <dd class="flex min-w-0 ${stack
      ? 'flex-col items-end gap-1.5 [&>*]:mr-0 [&>*]:mb-0'
      : 'flex-wrap justify-end gap-2 items-center'}">${chips}</dd>
  </div>`

/** 공통 정보 — 카테고리 상세와 얼마나 붙는지 보려면 위에 실제로 있어야 한다 */
const commonSection = () => `
  <p class="text-[11px] font-bold text-neutral-400 uppercase tracking-widest mb-2">공통</p>
  <dl class="grid grid-cols-1 sm:grid-cols-2 sm:gap-x-12">
    ${di('숙성 연수', 'NAS')}${di('용량', '700ml')}${di('도수', '40%')}${di('병입 연월', '2023-05')}
  </dl>`

function cognacSection(c) {
  const crus = c.cruComposition ?? []
  // 등급도 다른 값과 같은 한 행. 색을 넣지 않고, 미표기는 흐리게.
  const gradeValue = !c.grade ? null : c.grade === 'NO_STATEMENT'
    ? `<span class="text-neutral-400">${t('spirit.cognacGrade.NO_STATEMENT')}</span>`
    : t(`spirit.cognacGrade.${c.grade}`)

  const cruChips = crus.length === 0 ? null
    : badge(t(crus.length === 1 ? 'spirit.cognacBlend.singleCru' : 'spirit.cognacBlend.multiCru'), 'amber')
      + crus.map((x) => badge(`${t(`spirit.cognacCru.${x.cru}`)}${x.percentage != null ? ` ${x.percentage}%` : ''}`)).join('')

  // 오크 산지는 툴팁도 세부 항목도 없는 단순 값이라 뱃지를 두르지 않는다
  const oakText = !c.oakTypes?.length ? null
    : c.oakTypes.map((o) => rowText(t(`spirit.cognacOak.${o}`))).join('')

  // 공통 정보와 카테고리 상세 사이 간격은 space-y-2 — 끊긴 블록이 아니라 이어지는 목록으로 읽혀야 한다.
  // 카테고리 상세는 공통과 달리 1열이다.
  return `
  <div class="bg-white rounded-3xl ring-1 ring-neutral-100 p-6 lg:p-8">
    <div class="space-y-2">
      ${commonSection()}
      <div>
        <p class="text-[11px] font-bold text-neutral-400 uppercase tracking-widest mb-2">Cognac</p>
        <div class="mt-1">
          <dl class="grid grid-cols-1">
            ${di('등급', gradeValue)}
            ${diChips('특성', c.isFineChampagne
              ? rowText(`Fine Champagne (${t('spirit.cognacFineChampagneNote')})`) : null, true)}
            ${diChips('포도 산지 (크뤼)', cruChips, true)}
            ${diChips('오크통 산지', oakText, true)}
            ${di('빈티지', c.vintageYear)}
            ${di('숙성연수', c.ageYears != null ? `${c.ageYears}년` : null)}
            ${di('캐스크 피니시', c.caskFinish)}
            ${di('블렌드', c.blendDetail, true)}
          </dl>
        </div>
      </div>
    </div>
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
  // 서술형 값의 상한(blendDetail @Size(max=300))에서도 읽히는지 — 길이는 실제로 들어올 수 있는 값이다
  'long-blend': {
    title: '블렌드 설명 300자 — 서술형 값의 상한',
    data: {
      grade: 'XO',
      cruComposition: [{ cru: 'GRANDE_CHAMPAGNE', percentage: 60 }, { cru: 'BORDERIES', percentage: 40 }],
      isFineChampagne: false, oakTypes: ['LIMOUSIN'],
      blendDetail: '그랑드 샹파뉴와 보르드리의 오드비를 중심으로 블렌딩했다. '
        + '백악질 토양에서 자란 위니 블랑을 전통 샤랑트식 단식 증류기로 두 번 증류한 뒤 '
        + '리무쟁 오크통에서 장기 숙성했으며, 셀러 마스터가 매년 관능 평가를 거쳐 '
        + '숙성이 정점에 이른 원액만 골라 조합한다. 최고령 원액은 30년을 넘고, '
        + '가장 어린 원액도 법정 기준을 크게 웃도는 기간 동안 숙성을 거친다.',
    },
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
