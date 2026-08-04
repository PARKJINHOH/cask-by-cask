// 이미지 에디터 텍스트용 한글 서체 자산을 저장소로 가져온다(self-host).
//
// 왜 별도 스크립트인가
//   · Pretendard(`sync-pretendard.mjs`)는 서비스 본문 서체다. 여기 서체들은 이미지 편집기에서
//     "인스타 감성" 캡션을 얹을 때만 쓰는 장식용이라 수명·출처(Google Fonts)가 다르다.
//   · 본문 CSS 번들에 섞이면 안 된다 — 6종 × 약 88조각의 @font-face 선언은 수백 KB 라
//     `public/fonts/editor/editor-fonts.css` 정적 파일로 빼고, 이미지 편집기가 열릴 때만
//     <link> 로 주입한다(`imageEditorFontCss.ts`).
//
// 라이선스: 전부 SIL Open Font License 1.1 (상업적 이용 가능).
//   각 서체의 OFL 전문을 public/fonts/editor/<slug>/LICENSE.txt 로 함께 배포한다 —
//   OFL 은 재배포 시 라이선스 사본 동봉을 요구한다.
//
// 사용법: npm run fonts:sync-editor
//   서체를 추가·삭제하려면 EDITOR_FONTS 만 고치고 다시 실행한다.
//   ⚠️ 생성물(public/fonts/editor/**)은 수동 편집하지 않는다. 이 스크립트가 단일 출처다.
import { mkdir, writeFile, readdir, rm } from 'node:fs/promises'
import { join } from 'node:path'

/**
 * slug   : 저장 디렉토리 + Google Fonts 저장소 경로(ofl/<slug>)
 * family : CSS font-family 이름 (imageEditorText.ts 의 TEXT_FONT_OPTIONS 와 일치해야 한다)
 * weights: 내려받을 굵기. 서체가 실제로 제공하는 굵기만 적는다.
 */
const EDITOR_FONTS = [
  { slug: 'blackhansans', family: 'Black Han Sans', weights: [400] },
  { slug: 'dohyeon', family: 'Do Hyeon', weights: [400] },
  { slug: 'jua', family: 'Jua', weights: [400] },
  { slug: 'nanumpenscript', family: 'Nanum Pen Script', weights: [400] },
  { slug: 'gowunbatang', family: 'Gowun Batang', weights: [400, 700] },
  { slug: 'songmyung', family: 'Song Myung', weights: [400] },
]

const FONT_ROOT = join('public', 'fonts', 'editor')
const CSS_OUT = join(FONT_ROOT, 'editor-fonts.css')
const PUBLIC_PREFIX = '/fonts/editor'
const CONCURRENCY = 8

// woff2 + unicode-range 분할본을 받으려면 최신 브라우저 UA 가 필요하다.
// (구형 UA 로 요청하면 Google 이 통짜 ttf 를 내려준다 — 한글은 그 자체로 수 MB 다)
const MODERN_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
  + '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

function fail(message) {
  console.error(`[fonts:sync-editor] ${message}`)
  process.exit(1)
}

async function fetchOk(url, as) {
  const res = await fetch(url, { headers: { 'User-Agent': MODERN_UA } })
  if (!res.ok) fail(`${res.status} ${url}`)
  return as === 'text' ? res.text() : Buffer.from(await res.arrayBuffer())
}

async function mapWithLimit(items, limit, worker) {
  const results = new Array(items.length)
  let cursor = 0
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++
      results[index] = await worker(items[index], index)
    }
  }))
  return results
}

await mkdir(FONT_ROOT, { recursive: true })

// 목록에서 빠진 서체 디렉토리는 정리한다(저장소에 쓰이지 않는 폰트가 누적되지 않게).
const keep = new Set(EDITOR_FONTS.map((font) => font.slug))
for (const entry of await readdir(FONT_ROOT, { withFileTypes: true }).catch(() => [])) {
  if (entry.isDirectory() && !keep.has(entry.name)) {
    await rm(join(FONT_ROOT, entry.name), { recursive: true, force: true })
  }
}

const cssParts = []
let totalBytes = 0
let totalFiles = 0

for (const font of EDITOR_FONTS) {
  const cssUrl = 'https://fonts.googleapis.com/css2'
    + `?family=${encodeURIComponent(font.family).replace(/%20/g, '+')}`
    + `:wght@${font.weights.join(';')}`
    + '&display=swap'

  const css = await fetchOk(cssUrl, 'text')
  const refs = [...new Set(
    [...css.matchAll(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+\.woff2)\)/g)].map((m) => m[1]),
  )]
  if (refs.length === 0) fail(`${font.family}: CSS 에서 woff2 참조를 찾지 못했다. ${cssUrl}`)

  const names = refs.map((ref) => ref.split('/').pop())
  if (new Set(names).size !== names.length) fail(`${font.family}: woff2 파일명이 중복된다.`)

  const dir = join(FONT_ROOT, font.slug)
  await mkdir(dir, { recursive: true })
  for (const stale of await readdir(dir).catch(() => [])) {
    if (stale.endsWith('.woff2')) await rm(join(dir, stale))
  }

  await mapWithLimit(refs, CONCURRENCY, async (ref, index) => {
    const buffer = await fetchOk(ref)
    totalBytes += buffer.byteLength
    await writeFile(join(dir, names[index]), buffer)
  })
  totalFiles += refs.length

  await writeFile(
    join(dir, 'LICENSE.txt'),
    await fetchOk(`https://raw.githubusercontent.com/google/fonts/main/ofl/${font.slug}/OFL.txt`, 'text'),
  )

  let rewritten = css
  refs.forEach((ref, index) => {
    rewritten = rewritten.split(ref).join(`${PUBLIC_PREFIX}/${font.slug}/${names[index]}`)
  })
  if (rewritten.includes('fonts.gstatic.com')) {
    fail(`${font.family}: CSS 에 외부 경로가 남아 있다. 치환 규칙을 확인하라.`)
  }

  cssParts.push(`/* ${font.family} — SIL OFL 1.1 — ${PUBLIC_PREFIX}/${font.slug}/LICENSE.txt */\n${rewritten.trim()}`)
  console.log(`[fonts:sync-editor] ${font.family}: woff2 ${refs.length}개`)
}

const header = [
  '/*',
  ' * 이미지 에디터 텍스트용 한글 서체 (Google Fonts, 전부 SIL OFL 1.1 · 상업적 이용 가능).',
  ' *',
  ' * 이 파일은 `npm run fonts:sync-editor` 가 생성한다. 직접 편집하지 말 것.',
  ' * 본문 CSS 번들에 넣지 않는다 — 이미지 편집기가 열릴 때 <link> 로 주입한다',
  ' * (src/shared/components/imageEditorFontCss.ts).',
  ' *',
  ' * family 이름은 imageEditorText.ts 의 TEXT_FONT_OPTIONS 와 함께 유지해야 한다.',
  ' */',
  '',
].join('\n')

await writeFile(CSS_OUT, header + cssParts.join('\n\n') + '\n')

console.log(`[fonts:sync-editor] 서체 ${EDITOR_FONTS.length}종 / woff2 ${totalFiles}개, ${(totalBytes / 1024 / 1024).toFixed(2)}MB -> ${FONT_ROOT}`)
console.log(`[fonts:sync-editor] CSS ${((await import('node:fs')).statSync(CSS_OUT).size / 1024).toFixed(0)}KB -> ${CSS_OUT}`)
