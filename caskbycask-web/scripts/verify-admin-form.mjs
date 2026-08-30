/**
 * 관리자 주류 등록/수정 폼 레이아웃 시각 검증.
 *
 * 실제 컴포넌트를 띄우려면 인증·API 가 필요하므로, 여기서는 폼의 **컬럼 골격**을
 * 같은 Tailwind 클래스로 재현해 카테고리별 열 구성이 의도대로 나오는지 확인한다.
 * (위스키 3열 = 기본·생산 / 상세·에디션 / 캐스크, 그 외 2열 = 2:3)
 *
 * 실행: npm run admin:verify-form
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const HERE = dirname(fileURLToPath(import.meta.url))
const WEB_ROOT = join(HERE, '..')
const OUT_DIR = join(WEB_ROOT, '.cache', 'admin-form')
const FORM_SRC = join(WEB_ROOT, 'src', 'domain', 'admin', 'components', 'SpiritFormFields.tsx')

const require = createRequire(join(WEB_ROOT, 'package.json'))
const puppeteer = require('puppeteer')

// ── 소스 정합성 검사 (렌더 전에 잡을 수 있는 회귀) ──────────────
const src = readFileSync(FORM_SRC, 'utf8')
const problems = []
const expect = (cond, msg) => { if (!cond) problems.push(msg) }

expect(/const gridCols = simple \? '' : isWhisky \? 'lg:grid-cols-3' : 'lg:grid-cols-5'/.test(src),
  '컬럼 수 분기(최소 정보 1열 / 위스키 3열 / 그 외 5분할)를 찾지 못했다')
expect(/<WhiskyCaskSection value=\{caskTarget\.value\}/.test(src),
  '캐스크 전용 컬럼이 WhiskyCaskSection 을 쓰지 않는다')
expect(/form\.isVariantSplit && form\.variants\[activeVariantIdx\]/.test(src),
  '에디션 분리 시 활성 에디션의 캐스크를 대상으로 삼는 분기가 없다')
expect(/const fullRowSpan = simple \? '' : isWhisky \? 'lg:col-span-3' : 'lg:col-span-5'/.test(src),
  '전체 폭 행(이미지·bottomSlot)의 컬럼 span 분기를 찾지 못했다')
// 이미지는 최상단 전체 폭 1줄 — 좌측 컬럼에 남아 있으면 안 된다
expect(/\{imageSlot && \(\s*\n\s*<div className=\{fullRowSpan\}>\{imageSlot\}<\/div>/.test(src),
  '이미지 슬롯이 최상단 전체 폭 행으로 배치되지 않았다')
const leftColumnStart = src.indexOf("{/* ═══ 좌측")
const centerColumnStart = src.indexOf("{/* ═══ 중앙")
expect(leftColumnStart > 0 && centerColumnStart > leftColumnStart
  && !src.slice(leftColumnStart, centerColumnStart).includes('{imageSlot}'),
  '좌측 컬럼에 이미지 슬롯이 남아 있다')
// 주류 등록/수정/요청검토 3개 화면은 PC 가로 폭을 모두 쓴다
for (const page of ['AdminSpiritFormPage', 'AdminSpiritDetailPage', 'AdminRequestDetailPage']) {
  const pageSrc = readFileSync(join(WEB_ROOT, 'src', 'views-spa', 'admin', `${page}.tsx`), 'utf8')
  expect(!/max-w-3xl lg:max-w-6xl xl:max-w-7xl/.test(pageSrc),
    `${page}: 최대 폭 제한이 남아 있어 가로 전체를 쓰지 못한다`)
}
// 캐스크 입력이 위스키 상세(중앙 컬럼)에 중복 렌더되지 않아야 한다
const caskSectionSrc = readFileSync(
  join(WEB_ROOT, 'src', 'domain', 'admin', 'components', 'WhiskyDetailSection.tsx'), 'utf8')
const detailBody = caskSectionSrc.slice(caskSectionSrc.indexOf('export default function WhiskyDetailSection'))
expect(!detailBody.includes('BROAD_CASK_CATEGORIES'),
  '위스키 상세에 캐스크 입력이 남아 있다(3열 컬럼과 중복)')

// ── 사용자 등록 요청 ↔ 관리자 등록의 계약 ────────────────────
// 이 세 가지는 눈으로 보면 멀쩡한데 특정 조합에서만 터져 회귀를 알아채기 어렵다.
const requestPageSrc = readFileSync(
  join(WEB_ROOT, 'src', 'views-spa', 'SpiritRequestPage.tsx'), 'utf8')
const adaptersSrc = readFileSync(
  join(WEB_ROOT, 'src', 'domain', 'admin', 'components', 'spiritFormAdapters.ts'), 'utf8')

// ① 최소 정보 모드는 **검증과 렌더가 한 값에서** 나와야 한다.
//    렌더만 끄면 화면에 없는 칸의 오류로 제출 버튼이 먹통이 되고, 검증만 끄면 서버가 400 을 낸다.
expect(/const simple = form\.simple/.test(src),
  'SpiritFormFields 가 훅의 simple 을 읽지 않는다 — 렌더 게이팅과 검증이 갈라진다')
expect(/if \(!simple && category === 'WINE'/.test(src) && /if \(!simple && category === 'COGNAC'/.test(src),
  '카테고리 상세 검증이 최소 정보 모드에서 꺼지지 않는다 — 입력칸 없는 오류로 제출이 막힌다')
expect(/\{!simple && <div className=\{`space-y-6 \$\{isWhisky \? '' : 'lg:col-span-3'\}`\}>/.test(src),
  '카테고리 상세·에디션 컬럼이 최소 정보 모드에서 제거되지 않는다')
expect(/\{!simple && isWhisky && category && \(/.test(src),
  '캐스크 컬럼이 최소 정보 모드에서 제거되지 않는다')
// ①-b 와인은 DEFAULT_WINE.vintageStatus 가 'VINTAGE' 다. 상세 카드를 안 그리는 모드에서 그대로
//    보내면 서버가 "빈티지인데 연도가 없다"로 보고 **모든 와인 요청을 400** 으로 막는다.
expect(/wineDetail: \(isVariantSplit \|\| simple\) \? \(\{ vintageStatus: 'UNKNOWN' \}/.test(src),
  '최소 정보 모드의 와인 요청이 vintageStatus=UNKNOWN 으로 나가지 않는다 — 서버가 400 으로 막는다')
// ② 사용자 화면은 최소 정보 모드다 — 생산자·국가는 계속 필수로 받는다.
expect(/useSpiritForm\(\{ requireProductionInfo: true, allowPendingProducer: true, simple: true \}\)/.test(requestPageSrc),
  '사용자 등록 요청의 폼 옵션이 바뀌었다 (requireProductionInfo · allowPendingProducer · simple)')
// ②-b 승인 대기 생산자는 id 가 없다 — 이름을 안 실으면 관리자 화면에 생산자가 빈 칸으로 도착한다.
expect(/producerName: form\.producerId \? null : form\.producerName\.trim\(\) \|\| null/.test(requestPageSrc),
  '사용자 등록 요청이 승인 대기 생산자 이름을 보내지 않는다')
// ②-c 에디션은 식별값만 받는다 — 유형·시리즈는 대상 마스터에서 물려받아 되돌려 보낸다.
expect(/variantValue: isVariantMode \? trimmedEdition : null/.test(requestPageSrc),
  '사용자 등록 요청이 에디션 식별값을 제출하지 않는다')
// ③ 와인 빈티지 상세는 마스터가 아니라 에디션에 있다. 마스터 것을 보내면 상세가 통째로 사라진다.
expect(/const wine = variant\?\.wineDetail \?\? payload\.wineDetail/.test(adaptersSrc),
  '어댑터가 와인 빈티지의 wineDetail 대신 마스터 값을 보내고 있다')
// ④ 기존 주류에 붙이는 요청은 대상 id 가 제출·프리필 양쪽에 실려야 한다.
expect(/targetSpiritId: targetSpirit\?\.id \?\? null/.test(requestPageSrc),
  '사용자 등록 요청이 targetSpiritId 를 제출하지 않는다 — 기존 주류 에디션 추가가 새 주류로 등록된다')

// ── 컬럼 골격 렌더 ──────────────────────────────────────────────
const CSS = `
  body { margin:0; background:#f8fafc; font-family:'Malgun Gothic',sans-serif; padding:16px; }
  .grid { display:grid; gap:24px; align-items:start; }
  .cols3 { grid-template-columns:repeat(3, minmax(0,1fr)); }
  .cols5 { grid-template-columns:repeat(5, minmax(0,1fr)); }
  .span2 { grid-column:span 2; }
  .span3 { grid-column:span 3; }
  .span5 { grid-column:span 5; }
  .card { background:#fff; border:1px solid #f1f5f9; border-radius:16px; padding:16px; margin-bottom:16px; }
  .t { font-size:13px; font-weight:700; color:#0f172a; margin:0 0 8px; }
  .hint { font-size:11px; font-weight:600; color:#a16207; }
  .ph { height:52px; background:#f1f5f9; border-radius:8px; margin-bottom:8px; }
  h2 { font-size:12px; color:#64748b; margin:24px 0 8px; }
`

const card = (title, hint, rows) =>
  `<div class="card"><p class="t">${title}${hint ? ` <span class="hint">${hint}</span>` : ''}</p>`
  + Array.from({ length: rows }, () => '<div class="ph"></div>').join('') + '</div>'

/** 위스키 = 3열 / 그 외 = 5분할(2:3). 이미지는 항상 최상단 전체 폭 1줄 */
function layout(kind) {
  const imageRow = (span) =>
    `<div class="${span}">${card('이미지', '최상단 전체 폭 · 6열 썸네일', 1)}</div>`
  if (kind === 'WHISKY') {
    return `<div class="grid cols3">
      ${imageRow('span3')}
      <div>${card('카테고리 &amp; 기본 정보', '', 4)}${card('생산 정보', '필수', 3)}</div>
      <div>${card('하위 에디션 목록', '각 에디션별 개별 정보 입력', 3)}${card('위스키 상세', '', 3)}</div>
      <div>${card('캐스크', '에디션 · Batch 3', 5)}</div>
    </div>`
  }
  return `<div class="grid cols5">
    ${imageRow('span5')}
    <div class="span2">${card('카테고리 &amp; 기본 정보', '', 4)}${card('생산 정보', '필수', 3)}${card('공통 상세 정보', '', 2)}</div>
    <div class="span3">${card(`${kind} 상세`, '', 6)}</div>
  </div>`
}

mkdirSync(OUT_DIR, { recursive: true })
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] })
const results = []
for (const kind of ['WHISKY', 'WINE']) {
  const page = await browser.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.setViewport({ width: 1600, height: 1000 })
  const html = `<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"><style>${CSS}</style></head>
    <body><h2>${kind}</h2>${layout(kind)}</body></html>`
  const p = join(OUT_DIR, `${kind.toLowerCase()}.html`)
  writeFileSync(p, html, 'utf8')
  await page.goto(`file://${p.replace(/\\/g, '/')}`, { waitUntil: 'load' })
  const cols = await page.evaluate(() => {
    const grid = document.querySelector('.grid')
    return {
      tracks: getComputedStyle(grid).gridTemplateColumns.split(' ').length,
      children: grid.children.length,
      gridWidth: Math.round(grid.getBoundingClientRect().width),
      widths: [...grid.children].map((c) => Math.round(c.getBoundingClientRect().width)),
    }
  })
  await page.screenshot({ path: join(OUT_DIR, `${kind.toLowerCase()}.png`) })
  await page.close()
  results.push({ kind, ...cols, errors })
  console.log(`[${kind}] 트랙=${cols.tracks} 컬럼=${cols.children} 폭=${cols.widths.join('/')} 오류=${cols.errors ?? 0}`)
}
await browser.close()

const whisky = results.find((r) => r.kind === 'WHISKY')
const wine = results.find((r) => r.kind === 'WINE')
// 이미지 행 1개 + 컬럼들
if (whisky.children !== 4) problems.push(`위스키 그리드 자식 ${whisky.children}개 (기대 4 = 이미지행 + 3열)`)
if (wine.children !== 3) problems.push(`와인 그리드 자식 ${wine.children}개 (기대 3 = 이미지행 + 2열)`)
// 이미지 행은 전체 폭을 차지해야 한다
if (Math.abs(whisky.widths[0] - whisky.gridWidth) > 2) {
  problems.push(`위스키 이미지 행이 전체 폭이 아니다: ${whisky.widths[0]} / ${whisky.gridWidth}`)
}
if (Math.abs(wine.widths[0] - wine.gridWidth) > 2) {
  problems.push(`와인 이미지 행이 전체 폭이 아니다: ${wine.widths[0]} / ${wine.gridWidth}`)
}
// 위스키 3열은 균등, 와인은 2:3
const wCols = whisky.widths.slice(1)
if (wCols.some((w) => Math.abs(w - wCols[0]) > 2)) {
  problems.push(`위스키 3열 폭이 균등하지 않다: ${wCols.join('/')}`)
}
const nCols = wine.widths.slice(1)
if (Math.abs(nCols[1] / nCols[0] - 1.5) > 0.05) {
  problems.push(`와인 2열 비율이 2:3 이 아니다: ${nCols.join('/')}`)
}

console.log()
if (problems.length === 0) {
  console.log('PASS — 카테고리별 컬럼 구성과 캐스크 분리가 의도대로 구성됨')
  console.log(`스크린샷: ${OUT_DIR}`)
} else {
  console.log(`FAIL — ${problems.length}건`)
  for (const p of problems) console.log('  · ' + p)
  process.exitCode = 1
}
