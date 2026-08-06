// 포토카드 렌더 시각 검증 — 실제 Canvas 2D 로 기본 템플릿 5종을 그려 본다.
//
// 단위 테스트는 좌표 계산만 확인한다. self-host 글꼴이 실제로 로드되는지, 텍스트가 프레임 밖으로
// 나가지 않는지, 사진 아래 밴드에 정보가 제대로 앉는지는 실제로 그려 봐야 알 수 있다.
//
// 사용법: node --import ./scripts/test-alias-register.mjs scripts/verify-photo-card.mjs
// 산출물: .cache/photo-card/verify/templates.png  (gitignore 대상)
import http from 'node:http'
import { createReadStream, existsSync, mkdirSync, statSync } from 'node:fs'
import { extname, join, resolve } from 'node:path'
import puppeteer from 'puppeteer'

// 레이아웃·글꼴 정의는 Node 가 TS 를 그대로 읽을 수 있으므로 import 해서 데이터만 넘긴다.
// 소스를 정규식으로 변환해 브라우저에서 평가하는 방식은 문법이 조금만 바뀌어도 깨진다.
const { BUILTIN_LAYOUTS } = await import('../src/domain/photo-card/constants/builtinLayouts.ts')
const { TEXT_FONT_OPTIONS } = await import('../src/shared/components/imageEditorText.ts')

const WEB_ROOT = resolve('.')
const PUBLIC_DIR = join(WEB_ROOT, 'public')
const OUT_DIR = join(WEB_ROOT, '.cache', 'photo-card', 'verify')
const PORT = 4703
const MIME = { '.css': 'text/css', '.woff2': 'font/woff2', '.png': 'image/png' }

mkdirSync(OUT_DIR, { recursive: true })

// public/ 을 그대로 서빙한다 — self-host 글꼴(@font-face + woff2)을 실제 경로로 받기 위해서다.
const server = http.createServer((req, res) => {
  const path = join(PUBLIC_DIR, decodeURIComponent(req.url.split('?')[0]))
  if (!existsSync(path) || !statSync(path).isFile()) {
    res.writeHead(404); res.end('not found'); return
  }
  res.writeHead(200, { 'Content-Type': MIME[extname(path)] ?? 'application/octet-stream' })
  createReadStream(path).pipe(res)
})
await new Promise((r) => server.listen(PORT, r))

const browser = await puppeteer.launch({ headless: 'new' })
const page = await browser.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
page.on('requestfailed', (r) => errors.push(`FAILED ${r.url()}`))

await page.setViewport({ width: 1480, height: 900 })
await page.goto(`http://localhost:${PORT}/fonts/editor/editor-fonts.css`)
await page.setContent('<body style="margin:0;background:#eef0f3"></body>')

const result = await page.evaluate(async ({ builtins, fontOptions, port }) => {
  // 편집기가 런타임에 하는 것과 같은 방식으로 글꼴 CSS 를 붙인다.
  await new Promise((done) => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = `http://localhost:${port}/fonts/editor/editor-fonts.css`
    link.onload = done
    link.onerror = done
    document.head.appendChild(link)
  })

  const fontOf = (key) => fontOptions.find((font) => font.key === key)
    ?? { weight: 700, family: "'Pretendard Variable', sans-serif" }

  // 더미 사진 (외부 요청 없이)
  const photo = document.createElement('canvas')
  photo.width = 1200; photo.height = 1500
  const pctx = photo.getContext('2d')
  const grad = pctx.createLinearGradient(0, 0, 1200, 1500)
  grad.addColorStop(0, '#7c4a1e'); grad.addColorStop(1, '#180e05')
  pctx.fillStyle = grad; pctx.fillRect(0, 0, 1200, 1500)
  pctx.fillStyle = 'rgba(243,199,122,0.30)'
  pctx.fillRect(430, 640, 340, 360)
  pctx.fillStyle = 'rgba(214,138,42,0.92)'
  pctx.fillRect(445, 800, 310, 200)
  pctx.fillStyle = 'rgba(240,180,92,0.95)'
  pctx.beginPath(); pctx.ellipse(600, 800, 155, 34, 0, 0, Math.PI * 2); pctx.fill()

  const sample = {
    SPIRIT_NAME_KO: '아드벡 우거다일',
    SPIRIT_NAME_EN: 'Ardbeg Uigeadail',
    SPIRIT_ABV: '54.2%',
    PRODUCER_NAME_KO: '아드벡',
    PRODUCER_NAME_EN: 'Ardbeg · Islay',
    EXIF_APERTURE: 'ƒ/1.8 · 1/125s · ISO 800',
    EXIF_CAMERA: 'SONY α7C II · 35mm',
    EXIF_LENS: 'FE 35mm F1.4 GM',
    EXIF_SHOT_AT: '2026.08.02',
    USER_MEMO: '오늘의 한 잔',
    USER_PLACE: '이태원 Bar Cham',
  }

  const RATIO = { '1:1': 1, '4:5': 4 / 5, '3:4': 3 / 4, '9:16': 9 / 16, '16:9': 16 / 9 }
  const container = document.createElement('div')
  container.style.cssText = 'display:flex;gap:18px;padding:20px;flex-wrap:wrap;align-items:flex-start'
  document.body.appendChild(container)

  const report = []
  for (const builtin of builtins) {
    const layout = builtin.layout
    const maxEdge = 900
    const value = RATIO[layout.frame.ratio]
    const size = value >= 1
      ? { width: maxEdge, height: Math.round(maxEdge / value) }
      : { width: Math.round(maxEdge * value), height: maxEdge }
    const shortSide = Math.min(size.width, size.height)
    const px = (ratio, fallback = 0) => Math.round((ratio ?? fallback) * shortSide)

    const cell = document.createElement('div')
    cell.style.cssText = 'display:flex;flex-direction:column;gap:6px;align-items:center'
    const canvas = document.createElement('canvas')
    canvas.width = size.width; canvas.height = size.height
    canvas.style.cssText = 'width:260px;height:auto;box-shadow:0 8px 26px rgba(0,0,0,.22)'
    const caption = document.createElement('div')
    caption.textContent = builtin.key
    caption.style.cssText = 'font:600 12px sans-serif;color:#525252'
    cell.append(canvas, caption)
    container.appendChild(cell)

    const ctx = canvas.getContext('2d')
    ctx.fillStyle = layout.frame.backgroundColor
    ctx.fillRect(0, 0, size.width, size.height)

    // 사진 (COVER)
    const pad = layout.frame.padding
    const innerLeft = px(pad.left)
    const innerTop = px(pad.top)
    const innerWidth = size.width - innerLeft - px(pad.right)
    const innerHeight = size.height - innerTop - px(pad.bottom)
    const frame = layout.frame.photo
    const photoWidth = innerWidth * frame.w
    const photoHeight = innerHeight * frame.h
    const left = innerLeft + innerWidth * frame.x - photoWidth / 2
    const top = innerTop + innerHeight * frame.y - photoHeight / 2
    ctx.save(); ctx.beginPath(); ctx.rect(left, top, photoWidth, photoHeight); ctx.clip()
    const sourceRatio = photo.width / photo.height
    const targetRatio = photoWidth / photoHeight
    const drawWidth = sourceRatio > targetRatio ? photoHeight * sourceRatio : photoWidth
    const drawHeight = sourceRatio > targetRatio ? photoHeight : photoWidth / sourceRatio
    ctx.drawImage(photo, left + (photoWidth - drawWidth) / 2, top + (photoHeight - drawHeight) / 2,
      drawWidth, drawHeight)
    ctx.restore()

    const overflow = []
    const drawn = []
    for (const layer of layout.layers) {
      const x = layer.position.x * size.width
      const y = layer.position.y * size.height

      if (layer.type === 'DIVIDER') {
        const width = px(layer.widthRatio, 0.8)
        const thickness = Math.max(1, px(layer.thicknessRatio, 0.002))
        ctx.fillStyle = layer.fill
        ctx.fillRect(x - width / 2, y - thickness / 2, width, thickness)
        continue
      }
      if (layer.type !== 'TEXT') continue

      const text = sample[layer.binding] ?? ''
      if (!text) continue
      const font = fontOf(layer.fontKey)
      const fontSize = px(layer.fontSizeRatio, 0.04)
      await document.fonts.load(`${font.weight} ${fontSize}px ${font.family}`, text)
      ctx.font = `${font.weight} ${fontSize}px ${font.family}`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = layer.color
      ctx.fillText(text, x, y)
      drawn.push(layer.fontKey)

      const width = ctx.measureText(text).width
      const boxLeft = x - width / 2
      if (boxLeft < -1 || boxLeft + width > size.width + 1
        || y - fontSize / 2 < -1 || y + fontSize / 2 > size.height + 1) {
        overflow.push({
          layer: layer.id,
          box: `${Math.round(boxLeft)}~${Math.round(boxLeft + width)}`,
          frame: `0~${size.width}`,
        })
      }
      // 사진 영역을 침범하면 정보가 사진 위에 겹쳐 읽기 어려워진다(밴드형 템플릿 한정).
      if (pad.bottom > 0.05 && y - fontSize / 2 < top + photoHeight - 1) {
        overflow.push({ layer: layer.id, box: '사진 영역 침범', frame: '' })
      }
    }
    report.push({
      key: builtin.key, ratio: layout.frame.ratio, size,
      layers: layout.layers.length, drawn: drawn.length, overflow,
    })
  }

  const loaded = [...document.fonts].filter((font) => font.status === 'loaded')
    .map((font) => font.family)
  return { report, loadedFonts: [...new Set(loaded)] }
}, { builtins: BUILTIN_LAYOUTS, fontOptions: TEXT_FONT_OPTIONS, port: PORT })

console.log('템플릿별 렌더 결과:')
let problems = 0
for (const row of result.report) {
  problems += row.overflow.length
  const mark = row.overflow.length === 0 ? '✓' : '✗'
  console.log(`  ${mark} ${row.key.padEnd(9)} ${row.ratio.padEnd(5)} ${row.size.width}x${row.size.height}`
    + `  요소 ${row.layers}개 / 그려진 텍스트 ${row.drawn}개`)
  row.overflow.forEach((o) => console.log(`      ${o.layer}: ${o.box} ${o.frame}`))
}
console.log('\n로드된 글꼴:', result.loadedFonts.join(', ') || '(없음)')
if (errors.length) console.log('\n오류:\n' + errors.slice(0, 5).join('\n'))

await page.screenshot({ path: join(OUT_DIR, 'templates.png'), fullPage: true })
console.log(`스크린샷: ${join(OUT_DIR, 'templates.png')}`)

await browser.close()
server.close()
process.exit(problems === 0 && errors.length === 0 ? 0 : 1)
