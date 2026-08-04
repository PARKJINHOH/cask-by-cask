export type TextFontKey =
  | 'pretendardRegular'
  | 'pretendardMedium'
  | 'pretendardBold'
  | 'pretendardBlack'
  | 'blackHanSans'
  | 'doHyeon'
  | 'jua'
  | 'nanumPenScript'
  | 'gowunBatang'
  | 'gowunBatangBold'
  | 'songMyung'

export type TextFontGroupKey = 'basic' | 'impact' | 'casual' | 'serif'

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

/** 이미지 위에 독립적으로 얹히는 텍스트 한 덩어리. 레이어마다 폰트·색·위치가 따로다. */
export interface TextLayer extends TextStyleState {
  id: string
}

export interface TextFontOption {
  key: TextFontKey
  labelKey: string
  groupKey: TextFontGroupKey
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
export const TEXT_OUTLINE_WIDTH_MAX = 30
/** 레이어 상한 — 미리보기를 매 입력마다 다시 그리므로 무제한이면 편집이 버벅인다. */
export const TEXT_LAYER_MAX = 10

const PRETENDARD_FAMILY = "'Pretendard Variable', 'Pretendard', sans-serif"
// 장식용 서체는 자소가 빠진 글자에서 Pretendard 로 폴백시킨다(네모칸 방지).
const decorativeFamily = (name: string) => `'${name}', ${PRETENDARD_FAMILY}`

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

let textLayerSequence = 0

export const createTextLayerId = (): string => {
  textLayerSequence += 1
  return `text-${Date.now().toString(36)}-${textLayerSequence}`
}

// id 는 overrides 뒤에 둔다 — 다른 레이어의 서식을 통째로 물려줄 때 id 까지 복사돼
// 두 레이어가 같은 id 를 갖는 사고를 구조적으로 막는다.
export const createTextLayer = (fontSize = 48, overrides: Partial<TextStyleState> = {}): TextLayer => ({
  ...createDefaultTextStyle(fontSize),
  ...overrides,
  id: createTextLayerId(),
})

// 브라우저마다 결과가 달라지는 시스템 폰트는 이미지 출력 옵션에 넣지 않는다.
// Pretendard 는 본문용 self-host(SIL OFL 1.1), 나머지는 이미지 편집기 전용으로
// `npm run fonts:sync-editor` 가 내려받은 Google Fonts 한글 서체(전부 SIL OFL 1.1)다.
export const TEXT_FONT_OPTIONS: TextFontOption[] = [
  { key: 'pretendardRegular', labelKey: 'imageEditor.fontPretendardRegular', groupKey: 'basic', family: PRETENDARD_FAMILY, weight: 400 },
  { key: 'pretendardMedium', labelKey: 'imageEditor.fontPretendardMedium', groupKey: 'basic', family: PRETENDARD_FAMILY, weight: 600 },
  { key: 'pretendardBold', labelKey: 'imageEditor.fontPretendardBold', groupKey: 'basic', family: PRETENDARD_FAMILY, weight: 700 },
  { key: 'pretendardBlack', labelKey: 'imageEditor.fontPretendardBlack', groupKey: 'basic', family: PRETENDARD_FAMILY, weight: 900 },
  { key: 'blackHanSans', labelKey: 'imageEditor.fontBlackHanSans', groupKey: 'impact', family: decorativeFamily('Black Han Sans'), weight: 400 },
  { key: 'doHyeon', labelKey: 'imageEditor.fontDoHyeon', groupKey: 'impact', family: decorativeFamily('Do Hyeon'), weight: 400 },
  { key: 'jua', labelKey: 'imageEditor.fontJua', groupKey: 'casual', family: decorativeFamily('Jua'), weight: 400 },
  { key: 'nanumPenScript', labelKey: 'imageEditor.fontNanumPenScript', groupKey: 'casual', family: decorativeFamily('Nanum Pen Script'), weight: 400 },
  { key: 'gowunBatang', labelKey: 'imageEditor.fontGowunBatang', groupKey: 'serif', family: decorativeFamily('Gowun Batang'), weight: 400 },
  { key: 'gowunBatangBold', labelKey: 'imageEditor.fontGowunBatangBold', groupKey: 'serif', family: decorativeFamily('Gowun Batang'), weight: 700 },
  { key: 'songMyung', labelKey: 'imageEditor.fontSongMyung', groupKey: 'serif', family: decorativeFamily('Song Myung'), weight: 400 },
]

export const TEXT_FONT_GROUPS: { key: TextFontGroupKey; labelKey: string }[] = [
  { key: 'basic', labelKey: 'imageEditor.fontGroupBasic' },
  { key: 'impact', labelKey: 'imageEditor.fontGroupImpact' },
  { key: 'casual', labelKey: 'imageEditor.fontGroupCasual' },
  { key: 'serif', labelKey: 'imageEditor.fontGroupSerif' },
]

export const getTextFont = (fontKey: TextFontKey): TextFontOption =>
  TEXT_FONT_OPTIONS.find((font) => font.key === fontKey) ?? TEXT_FONT_OPTIONS[0]

export const getTextLines = (content: string): string[] => content.replace(/\r/g, '').split('\n')

export const hasTextContent = (style: TextStyleState): boolean => Boolean(style.content.trim())

/** 실제로 이미지에 그려질 레이어만 남긴다(빈 레이어는 편집 중인 자리표시자다). */
export const getDrawableTextLayers = <T extends TextStyleState>(layers: T[]): T[] =>
  layers.filter(hasTextContent)

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

/**
 * 포인터 좌표 아래에 있는 레이어를 찾는다.
 * 나중에 추가된(= 위에 그려진) 레이어가 우선이므로 뒤에서부터 훑는다.
 */
export const findTextLayerAtPoint = (
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  layers: TextLayer[],
  point: { x: number; y: number },
  padding = 0,
): TextLayer | null => {
  for (let index = layers.length - 1; index >= 0; index -= 1) {
    const layer = layers[index]
    if (!hasTextContent(layer)) continue
    const bounds = measureTextBounds(ctx, canvas, layer)
    if (
      point.x >= bounds.left - padding
      && point.x <= bounds.right + padding
      && point.y >= bounds.top - padding
      && point.y <= bounds.bottom + padding
    ) {
      return layer
    }
  }
  return null
}

export const drawText = (
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  style: TextStyleState,
) => {
  if (!hasTextContent(style)) return

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

/** 레이어 배열을 추가된 순서대로(= 뒤쪽이 위) 그린다. */
export const drawTextLayers = (
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  layers: TextStyleState[],
) => {
  layers.forEach((layer) => drawText(ctx, canvas, layer))
}
