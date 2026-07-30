// Pretendard 웹폰트 자산을 저장소로 가져온다(self-host).
//
// 왜 self-host 인가
//   · 서드파티 CDN(jsdelivr) 장애·차단 시 본문 서체가 폴백으로 떨어지는 위험을 없앤다.
//   · same-origin 이므로 추가 DNS/TLS 연결이 사라지고, Cloudflare 엣지 캐시를 그대로 탄다.
//
// 왜 '가변(variable) + dynamic subset' 인가
//   · 정적 배포본은 weight 하나가 한글 전체를 담은 약 750KB 파일이다. 본문에서 실제 렌더링되는
//     weight 가 400·500·600·700 네 종이라 그대로 쓰면 페이지당 약 3MB 를 내려받는다.
//   · 가변 + dynamic subset 은 unicode-range 로 92개 조각(조각당 8~43KB)으로 나뉘어
//     페이지에 실제로 등장하는 문자 범위만 받고, 한 파일이 45~920 weight 를 모두 커버한다.
//
// 사용법: npm run fonts:sync
//   버전을 올릴 때는 PRETENDARD_VERSION 만 바꿔 다시 실행한다.
//   생성물: public/fonts/pretendard/*.woff2 (92개, 약 2.8MB), src/fonts/pretendard.css
//   ⚠️ 생성물은 수동 편집하지 않는다. 이 스크립트가 단일 출처다.
import { mkdir, writeFile, readdir, rm } from 'node:fs/promises'
import { join } from 'node:path'

const PRETENDARD_VERSION = 'v1.3.9'
const CSS_URL = `https://cdn.jsdelivr.net/gh/orioncactus/pretendard@${PRETENDARD_VERSION}`
  + '/dist/web/variable/pretendardvariable-dynamic-subset.min.css'

// 조각 파일명(PretendardVariable.subset.N.woff2)은 버전이 올라가도 동일하다.
// 따라서 경로에 버전을 포함시켜야 `immutable` 장기 캐시가 안전하다(버전 교체 = URL 교체).
const FONT_DIR = join('public', 'fonts', 'pretendard', PRETENDARD_VERSION)
const FONT_ROOT = join('public', 'fonts', 'pretendard')
const CSS_OUT = join('src', 'fonts', 'pretendard.css')
const PUBLIC_PREFIX = `/fonts/pretendard/${PRETENDARD_VERSION}`
const CONCURRENCY = 8

function fail(message) {
  console.error(`[fonts:sync] ${message}`)
  process.exit(1)
}

async function fetchOk(url, as) {
  const res = await fetch(url)
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

const css = await fetchOk(CSS_URL, 'text')
const refs = [...new Set(
  [...css.matchAll(/url\(([^)]+\.woff2)\)/g)].map((m) => m[1].replace(/["']/g, '')),
)]
if (refs.length === 0) fail('CSS 에서 woff2 참조를 찾지 못했다. 배포본 구조가 바뀐 것 같다.')

// 조각 파일명이 서로 겹치면 덮어쓰기가 발생하므로 미리 확인한다.
const names = refs.map((ref) => ref.split('/').pop())
if (new Set(names).size !== names.length) fail('woff2 파일명이 중복된다. 경로 규칙을 확인하라.')

await mkdir(FONT_ROOT, { recursive: true })
await mkdir(join('src', 'fonts'), { recursive: true })

// 이전 버전 디렉토리를 남겨두면 저장소에 쓰이지 않는 폰트가 누적된다.
for (const entry of await readdir(FONT_ROOT, { withFileTypes: true }).catch(() => [])) {
  if (entry.name !== PRETENDARD_VERSION) {
    await rm(join(FONT_ROOT, entry.name), { recursive: true, force: true })
  }
}
await mkdir(FONT_DIR, { recursive: true })
for (const stale of await readdir(FONT_DIR).catch(() => [])) {
  if (stale.endsWith('.woff2')) await rm(join(FONT_DIR, stale))
}

let bytes = 0
await mapWithLimit(refs, CONCURRENCY, async (ref, index) => {
  const buffer = await fetchOk(new URL(ref, CSS_URL).href)
  bytes += buffer.byteLength
  await writeFile(join(FONT_DIR, names[index]), buffer)
})

// url() 을 저장소 경로로 바꾼다. format('woff2-variations') 등 나머지 선언은 원본을 그대로 둔다.
let rewritten = css
refs.forEach((ref, index) => {
  rewritten = rewritten.split(ref).join(`${PUBLIC_PREFIX}/${names[index]}`)
})
if (rewritten.includes('cdn.jsdelivr.net') || rewritten.includes('../')) {
  fail('CSS 에 외부 경로가 남아 있다. 치환 규칙을 확인하라.')
}

const header = [
  '/*',
  ` * Pretendard ${PRETENDARD_VERSION} — 가변(variable) + dynamic subset, self-host.`,
  ' *',
  ' * 이 파일은 `npm run fonts:sync` 가 생성한다. 직접 편집하지 말 것.',
  ` * 원본: ${CSS_URL}`,
  ` * 폰트 파일: ${PUBLIC_PREFIX}/ (${refs.length}개)`,
  ' *',
  " * family 이름은 'Pretendard Variable' 이다. src/index.css 의 --font-sans 와",
  ' * TipTap 기본 글꼴 옵션이 이 이름을 함께 유지해야 한다.',
  ' */',
  '',
].join('\n')

await writeFile(CSS_OUT, header + rewritten + '\n')

console.log(`[fonts:sync] Pretendard ${PRETENDARD_VERSION}`)
console.log(`[fonts:sync] woff2 ${refs.length}개, ${(bytes / 1024 / 1024).toFixed(2)}MB -> ${FONT_DIR}`)
console.log(`[fonts:sync] CSS ${(rewritten.length / 1024).toFixed(0)}KB -> ${CSS_OUT}`)
