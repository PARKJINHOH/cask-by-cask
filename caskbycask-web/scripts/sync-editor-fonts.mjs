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
import { mkdir, writeFile, readdir, readFile, copyFile, rm } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { join } from 'node:path'
import { compress as compressWoff2 } from 'wawoff2'

/**
 * slug   : 저장 디렉토리 + Google Fonts 저장소 경로(ofl/<slug>)
 * family : CSS font-family 이름 (imageEditorText.ts 의 TEXT_FONT_OPTIONS 와 일치해야 한다)
 * weights: 내려받을 굵기. 서체가 실제로 제공하는 굵기만 적는다.
 *
 * source 를 'npm' 으로 두면 Google Fonts 대신 jsDelivr 의 npm 패키지에서 받는다.
 * (OFL 이지만 Google Fonts 에 올라가 있지 않은 서체용. css/license 경로를 직접 지정한다)
 */
const EDITOR_FONTS = [
  { slug: 'blackhansans', family: 'Black Han Sans', weights: [400] },
  { slug: 'dohyeon', family: 'Do Hyeon', weights: [400] },
  { slug: 'jua', family: 'Jua', weights: [400] },
  { slug: 'nanumpenscript', family: 'Nanum Pen Script', weights: [400] },
  { slug: 'gowunbatang', family: 'Gowun Batang', weights: [400, 700] },
  { slug: 'gowundodum', family: 'Gowun Dodum', weights: [400] },
  { slug: 'songmyung', family: 'Song Myung', weights: [400] },
  // 굵기 폭이 넓은 한글 본문 서체. 조각 수가 많아 용량을 보고 굵기를 고른다
  // (Light·Regular·Medium·Bold — 더 얹으면 저장소만 커지고 쓰임은 겹친다).
  { slug: 'notosanskr', family: 'Noto Sans KR', weights: [300, 400, 500, 700] },
  // ── 영문 위주 서체 ──────────────────────────────────────
  { slug: 'bebasneue', family: 'Bebas Neue', weights: [400] },
  { slug: 'pacifico', family: 'Pacifico', weights: [400] },
  { slug: 'ibmplexsanscondensed', family: 'IBM Plex Sans Condensed', weights: [700] },
  // 필기체 3종 — 라틴 자소만 있어 한글은 Pretendard 로 폴백된다(imageEditorText 의 decorativeFamily).
  { slug: 'allura', family: 'Allura', weights: [400] },
  { slug: 'greatvibes', family: 'Great Vibes', weights: [400] },
  // 가변 서체라 굵기를 고를 수 있다. 라틴 조각만이라 굵기 하나를 더 얹어도 용량 부담이 없다.
  { slug: 'dancingscript', family: 'Dancing Script', weights: [400, 700] },
  {
    slug: 'wantedsans',
    family: 'Wanted Sans',
    weights: [800],
    source: 'npm',
    pkg: 'wanted-sans@1.0.3',
    css: '/fonts/webfonts/static/split/WantedSans-ExtraBold.css',
    license: '/fonts/OFL.txt',
  },
  // ── 저장소에 넣어 둔 서체 ────────────────────────────────
  // 배포처(dafont)에서 자동으로 받아오지 않는다 — 내려받기 주소가 서체마다 제각각이고
  // 언제 바뀔지 알 수 없다. 원본과 라이선스 문서를 assets/editor-fonts 에 함께 두고,
  // 여기서는 woff2 로 바꿔 public 으로 내보내기만 한다.
  {
    slug: 'stilu',
    family: 'Stilu',
    source: 'local',
    files: [
      { file: 'Stilu-SemiBold.otf', weight: 600 },
      { file: 'Stilu-Bold.otf', weight: 700 },
    ],
    licenseFiles: ['LICENSE.rtf'],
    licenseNote: 'SIL OFL 1.1',
  },
  {
    slug: 'kalamkari',
    family: 'Kalamkari',
    source: 'local',
    files: [{ file: 'Kalamkari-Regular.ttf', weight: 400 }],
    licenseFiles: ['LICENSE.txt'],
    licenseNote: 'dafont 100% Free (배포본에 라이선스 파일 없음 — LICENSE.txt 참고)',
  },
  {
    slug: 'coolstory',
    family: 'Cool Story',
    source: 'local',
    files: [{ file: 'CoolStory-Regular.otf', weight: 400 }],
    licenseFiles: ['LICENSE.txt'],
    licenseNote: 'Personal & Commercial Use (제작자 readme)',
  },
  {
    slug: 'magnoliascript',
    family: 'Magnolia Script',
    source: 'local',
    files: [{ file: 'MagnoliaScript-Regular.otf', weight: 400 }],
    licenseFiles: ['LICENSE.txt'],
    licenseNote: 'SIL OFL 1.1',
  },
  {
    // 라이선스가 "폴더를 바꾸지 말고, 빠진 파일 없이 그대로 넘겨라" 는 조건이라
    // keepOriginals 로 배포본에도 원본 3개 파일을 손대지 않은 채 함께 올린다.
    // woff2 는 화면에 그리기 위한 파생본이고, 원본 폴더는 그대로 배포된다.
    slug: 'exmouth',
    family: 'Exmouth',
    source: 'local',
    files: [{ file: 'exmouth_.ttf', weight: 400 }],
    licenseFiles: ['english_.txt', 'german__.txt'],
    licenseNote: 'PrimaFont — 원본 폴더 그대로 동봉 배포 조건',
    keepOriginals: true,
  },
]

/** 저장소에 넣어 둔 원본 서체 위치 */
const LOCAL_ROOT = join('assets', 'editor-fonts')

const FONT_ROOT = join('public', 'fonts', 'editor')
const CSS_OUT = join(FONT_ROOT, 'editor-fonts.css')
/** CSS 내용 해시를 담는 생성 파일 — 로더가 캐시 무효화용 쿼리로 쓴다. */
const VERSION_OUT = join('src', 'shared', 'components', 'editorFontCssVersion.ts')
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
  // 저장소에 둔 원본(otf/ttf)을 woff2 로 바꿔 내보낸다. 자간·글리프는 그대로고 용량만 절반이 된다.
  if (font.source === 'local') {
    const dir = join(FONT_ROOT, font.slug)
    await mkdir(dir, { recursive: true })
    for (const stale of await readdir(dir).catch(() => [])) {
      if (stale.endsWith('.woff2')) await rm(join(dir, stale))
    }

    const faces = []
    for (const entry of font.files) {
      const source = await readFile(join(LOCAL_ROOT, font.slug, entry.file))
      const woff2 = Buffer.from(await compressWoff2(source))
      const name = `${entry.file.replace(/\.(otf|ttf)$/i, '')}.woff2`
      await writeFile(join(dir, name), woff2)
      totalBytes += woff2.byteLength
      totalFiles += 1
      faces.push([
        '@font-face {',
        `  font-family: '${font.family}';`,
        '  font-style: normal;',
        '  font-display: swap;',
        `  font-weight: ${entry.weight};`,
        `  src: url(${PUBLIC_PREFIX}/${font.slug}/${name}) format('woff2');`,
        '}',
      ].join('\n'))
    }

    for (const name of font.licenseFiles) {
      await copyFile(join(LOCAL_ROOT, font.slug, name), join(dir, name))
    }
    // 원본을 함께 배포해야 하는 라이선스(예: Exmouth)는 폰트 파일도 손대지 않고 그대로 올린다.
    if (font.keepOriginals) {
      for (const entry of font.files) {
        await copyFile(join(LOCAL_ROOT, font.slug, entry.file), join(dir, entry.file))
      }
    }
    cssParts.push(`/* ${font.family} — ${font.licenseNote} — ${PUBLIC_PREFIX}/${font.slug}/${font.licenseFiles[0]} */\n${faces.join('\n\n')}`)
    console.log(`[fonts:sync-editor] ${font.family}: woff2 ${font.files.length}개 (저장소 원본에서 변환)`)
    continue
  }

  const fromNpm = font.source === 'npm'
  const cdnRoot = fromNpm ? `https://cdn.jsdelivr.net/npm/${font.pkg}` : ''
  const cssUrl = fromNpm
    ? `${cdnRoot}${font.css}`
    : 'https://fonts.googleapis.com/css2'
      + `?family=${encodeURIComponent(font.family).replace(/%20/g, '+')}`
      + `:wght@${font.weights.join(';')}`
      + '&display=swap'

  const css = await fetchOk(cssUrl, 'text')
  // Google 은 절대 URL, npm 배포본은 CSS 위치 기준 상대 경로를 쓴다.
  const refs = fromNpm
    ? [...new Set([...css.matchAll(/url\(["']?(\.\/[^"')]+\.woff2)["']?\)/g)].map((m) => m[1]))]
      .map((relative) => `${cdnRoot}${font.css.replace(/\/[^/]+$/, '')}${relative.slice(1)}`)
    : [...new Set(
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
    await fetchOk(fromNpm
      ? `${cdnRoot}${font.license}`
      : `https://raw.githubusercontent.com/google/fonts/main/ofl/${font.slug}/OFL.txt`, 'text'),
  )

  let rewritten = css
  if (fromNpm) {
    // 상대 경로("./woff2/x.woff2")를 우리 공개 경로로 바꾼다.
    names.forEach((name) => {
      rewritten = rewritten.replace(
        new RegExp(`\\.\\/[^"')]*${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g'),
        `${PUBLIC_PREFIX}/${font.slug}/${name}`,
      )
    })
  } else {
    refs.forEach((ref, index) => {
      rewritten = rewritten.split(ref).join(`${PUBLIC_PREFIX}/${font.slug}/${names[index]}`)
    })
  }
  if (/fonts\.gstatic\.com|cdn\.jsdelivr\.net|url\(["']?\.\//.test(rewritten)) {
    fail(`${font.family}: CSS 에 외부·상대 경로가 남아 있다. 치환 규칙을 확인하라.`)
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

const cssText = header + cssParts.join('\n\n') + '\n'
await writeFile(CSS_OUT, cssText)

// 내용이 바뀌면 URL 도 바뀌게 한다.
//
// CSS 는 /fonts/editor/editor-fonts.css 한 자리에 계속 덮어써진다. 예전에 이 경로를
// immutable 로 캐시한 브라우저는 서체를 추가해도 새 목록을 영영 받지 못했다
// (헤더는 고쳤지만, 이미 굳어 버린 캐시는 URL 이 바뀌어야만 우회된다).
const version = createHash('sha256').update(cssText).digest('hex').slice(0, 8)
await writeFile(VERSION_OUT, [
  '// 이 파일은 `npm run fonts:sync-editor` 가 만든다. 직접 고치지 말 것.',
  '//',
  '// 글꼴 목록 CSS 의 내용 해시다. imageEditorFontCss.ts 가 이 값을 쿼리로 붙여',
  '// 서체가 바뀌면 브라우저가 반드시 새로 받게 한다.',
  `export const EDITOR_FONT_CSS_VERSION = '${version}'`,
  '',
].join('\n'))

console.log(`[fonts:sync-editor] 서체 ${EDITOR_FONTS.length}종 / woff2 ${totalFiles}개, ${(totalBytes / 1024 / 1024).toFixed(2)}MB -> ${FONT_ROOT}`)
console.log(`[fonts:sync-editor] CSS ${((await import('node:fs')).statSync(CSS_OUT).size / 1024).toFixed(0)}KB -> ${CSS_OUT}`)
