export type TextFontKey = 'pretendardRegular' | 'pretendardMedium' | 'pretendardBold' | 'pretendardBlack'

export interface TextPosition {
  x: number
  y: number
}

export interface TextStyleState {
  content: string
  fontKey: TextFontKey
  fontSize: number
  color: string
  outlineEnabled: boolean
  outlineColor: string
  outlineWidth: number
  position: TextPosition
}

export interface TextFontOption {
  key: TextFontKey
  labelKey: string
  family: string
  weight: number
}

export interface TextBounds {
  left: number
  top: number
  right: number
  bottom: number
}

export const TEXT_MAX_LENGTH = 200
export const TEXT_FONT_SIZE_MIN = 12
export const TEXT_FONT_SIZE_MAX = 400
export const TEXT_OUTLINE_WIDTH_MAX = 20
const PRETENDARD_FAMILY = "'Pretendard Variable', 'Pretendard', sans-serif"

export const createDefaultTextStyle = (fontSize = 48): TextStyleState => ({
  content: '',
  fontKey: 'pretendardBold',
  fontSize,
  color: '#ffffff',
  outlineEnabled: true,
  outlineColor: '#000000',
  outlineWidth: 2,
  position: { x: 0.5, y: 0.5 },
})

// Pretendard 는 프로젝트에 self-host 된 SIL OFL 1.1 폰트다. 브라우저마다 결과가
// 달라지는 시스템 폰트는 이미지 출력 옵션에 넣지 않고, 한 폰트의 굵기로 분위기를 나눈다.
export const TEXT_FONT_OPTIONS: TextFontOption[] = [
  { key: 'pretendardRegular', labelKey: 'imageEditor.fontPretendardRegular', family: PRETENDARD_FAMILY, weight: 400 },
  { key: 'pretendardMedium', labelKey: 'imageEditor.fontPretendardMedium', family: PRETENDARD_FAMILY, weight: 600 },
  { key: 'pretendardBold', labelKey: 'imageEditor.fontPretendardBold', family: PRETENDARD_FAMILY, weight: 700 },
  { key: 'pretendardBlack', labelKey: 'imageEditor.fontPretendardBlack', family: PRETENDARD_FAMILY, weight: 900 },
]

export const getTextFont = (fontKey: TextFontKey): TextFontOption =>
  TEXT_FONT_OPTIONS.find((font) => font.key === fontKey) ?? TEXT_FONT_OPTIONS[0]

export const getTextLines = (content: string): string[] => content.replace(/\r/g, '').split('\n')

const setTextContextStyle = (ctx: CanvasRenderingContext2D, style: TextStyleState) => {
  const font = getTextFont(style.fontKey)
  ctx.font = `${font.weight} ${style.fontSize}px ${font.family}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.lineJoin = 'round'
}

export const measureTextBounds = (
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  style: TextStyleState,
): TextBounds => {
  setTextContextStyle(ctx, style)
  const lines = getTextLines(style.content)
  const lineHeight = style.fontSize * 1.25
  const outlinePadding = style.outlineEnabled ? style.outlineWidth : 0
  const width = Math.max(style.fontSize, ...lines.map((line) => ctx.measureText(line || ' ').width))
    + outlinePadding * 2
  const height = Math.max(lineHeight, lines.length * lineHeight) + outlinePadding * 2
  const centerX = style.position.x * canvas.width
  const centerY = style.position.y * canvas.height

  return {
    left: centerX - width / 2,
    top: centerY - height / 2,
    right: centerX + width / 2,
    bottom: centerY + height / 2,
  }
}

export const clampTextPosition = (
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  style: TextStyleState,
  position: TextPosition,
): TextPosition => {
  const bounds = measureTextBounds(ctx, canvas, { ...style, position: { x: 0.5, y: 0.5 } })
  const halfWidth = (bounds.right - bounds.left) / 2
  const halfHeight = (bounds.bottom - bounds.top) / 2
  const minX = Math.min(0.5, halfWidth / canvas.width)
  const minY = Math.min(0.5, halfHeight / canvas.height)

  return {
    x: Math.max(minX, Math.min(1 - minX, position.x)),
    y: Math.max(minY, Math.min(1 - minY, position.y)),
  }
}

export const drawText = (
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  style: TextStyleState,
) => {
  if (!style.content.trim()) return

  const lines = getTextLines(style.content)
  const lineHeight = style.fontSize * 1.25
  const firstLineY = style.position.y * canvas.height - ((lines.length - 1) * lineHeight) / 2

  ctx.save()
  setTextContextStyle(ctx, style)
  ctx.fillStyle = style.color
  if (style.outlineEnabled && style.outlineWidth > 0) {
    ctx.strokeStyle = style.outlineColor
    // Canvas stroke 는 글리프 경계를 중심으로 퍼지므로, 사용자가 지정한 바깥 굵기의 2배를 쓴다.
    ctx.lineWidth = style.outlineWidth * 2
  }

  lines.forEach((line, index) => {
    const y = firstLineY + index * lineHeight
    if (style.outlineEnabled && style.outlineWidth > 0) {
      ctx.strokeText(line || ' ', style.position.x * canvas.width, y)
    }
    ctx.fillText(line || ' ', style.position.x * canvas.width, y)
  })
  ctx.restore()
}
