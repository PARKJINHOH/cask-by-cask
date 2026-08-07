export type TextFontKey =
  | 'pretendardRegular'
  | 'pretendardMedium'
  | 'pretendardBold'
  | 'pretendardBlack'
  | 'notoSansKrLight'
  | 'notoSansKrRegular'
  | 'notoSansKrMedium'
  | 'notoSansKrBold'
  | 'gowunDodum'
  | 'blackHanSans'
  | 'doHyeon'
  | 'jua'
  | 'nanumPenScript'
  | 'gowunBatang'
  | 'gowunBatangBold'
  | 'songMyung'
  | 'wantedSansExtraBold'
  | 'ibmPlexSansCondBold'
  | 'bebasNeue'
  | 'pacifico'
  | 'stiluSemiBold'
  | 'stiluBold'
  | 'kalamkari'
  | 'coolStory'
  | 'magnoliaScript'
  | 'exmouth'
  | 'allura'
  | 'greatVibes'
  | 'dancingScript'
  | 'dancingScriptBold'

export type TextFontGroupKey = 'basic' | 'impact' | 'casual' | 'serif' | 'latin'

/** 굵기 이름. 서체마다 제공하는 굵기가 달라 값에서 이름을 찾아 쓴다. */
export const TEXT_FONT_WEIGHT_LABEL_KEYS: Record<number, string> = {
  100: 'imageEditor.weightThin',
  200: 'imageEditor.weightExtraLight',
  300: 'imageEditor.weightLight',
  400: 'imageEditor.weightRegular',
  500: 'imageEditor.weightMedium',
  600: 'imageEditor.weightSemiBold',
  700: 'imageEditor.weightBold',
  800: 'imageEditor.weightExtraBold',
  900: 'imageEditor.weightBlack',
}

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
  /**
   * 같은 서체 가족을 묶는 키.
   *
   * 저장되는 값은 지금도 굵기까지 포함한 key 하나다(백엔드 화이트리스트가 그 값을 검사한다).
   * 화면에서만 가족 → 굵기 두 단계로 고르게 하려고, 어느 가족에 속하는지를 여기 적어 둔다.
   * 서체가 늘수록 굵기별 항목이 한 줄로 쭉 늘어나는 것을 막는다.
   */
  familyKey: string
  /** 가족 이름(굵기 빼고). 같은 familyKey 끼리 같아야 한다. */
  familyLabelKey: string
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
  // ── 한글 본문 ──
  { key: 'pretendardRegular', familyKey: 'pretendard', familyLabelKey: 'imageEditor.familyPretendard', labelKey: 'imageEditor.fontPretendardRegular', groupKey: 'basic', family: PRETENDARD_FAMILY, weight: 400 },
  { key: 'pretendardMedium', familyKey: 'pretendard', familyLabelKey: 'imageEditor.familyPretendard', labelKey: 'imageEditor.fontPretendardMedium', groupKey: 'basic', family: PRETENDARD_FAMILY, weight: 600 },
  { key: 'pretendardBold', familyKey: 'pretendard', familyLabelKey: 'imageEditor.familyPretendard', labelKey: 'imageEditor.fontPretendardBold', groupKey: 'basic', family: PRETENDARD_FAMILY, weight: 700 },
  { key: 'pretendardBlack', familyKey: 'pretendard', familyLabelKey: 'imageEditor.familyPretendard', labelKey: 'imageEditor.fontPretendardBlack', groupKey: 'basic', family: PRETENDARD_FAMILY, weight: 900 },
  { key: 'notoSansKrLight', familyKey: 'notoSansKr', familyLabelKey: 'imageEditor.familyNotoSansKr', labelKey: 'imageEditor.fontNotoSansKrLight', groupKey: 'basic', family: decorativeFamily('Noto Sans KR'), weight: 300 },
  { key: 'notoSansKrRegular', familyKey: 'notoSansKr', familyLabelKey: 'imageEditor.familyNotoSansKr', labelKey: 'imageEditor.fontNotoSansKrRegular', groupKey: 'basic', family: decorativeFamily('Noto Sans KR'), weight: 400 },
  { key: 'notoSansKrMedium', familyKey: 'notoSansKr', familyLabelKey: 'imageEditor.familyNotoSansKr', labelKey: 'imageEditor.fontNotoSansKrMedium', groupKey: 'basic', family: decorativeFamily('Noto Sans KR'), weight: 500 },
  { key: 'notoSansKrBold', familyKey: 'notoSansKr', familyLabelKey: 'imageEditor.familyNotoSansKr', labelKey: 'imageEditor.fontNotoSansKrBold', groupKey: 'basic', family: decorativeFamily('Noto Sans KR'), weight: 700 },
  { key: 'gowunDodum', familyKey: 'gowunDodum', familyLabelKey: 'imageEditor.familyGowunDodum', labelKey: 'imageEditor.fontGowunDodum', groupKey: 'basic', family: decorativeFamily('Gowun Dodum'), weight: 400 },
  // ── 임팩트 ──
  { key: 'blackHanSans', familyKey: 'blackHanSans', familyLabelKey: 'imageEditor.familyBlackHanSans', labelKey: 'imageEditor.fontBlackHanSans', groupKey: 'impact', family: decorativeFamily('Black Han Sans'), weight: 400 },
  { key: 'doHyeon', familyKey: 'doHyeon', familyLabelKey: 'imageEditor.familyDoHyeon', labelKey: 'imageEditor.fontDoHyeon', groupKey: 'impact', family: decorativeFamily('Do Hyeon'), weight: 400 },
  // ── 캐주얼 ──
  { key: 'jua', familyKey: 'jua', familyLabelKey: 'imageEditor.familyJua', labelKey: 'imageEditor.fontJua', groupKey: 'casual', family: decorativeFamily('Jua'), weight: 400 },
  { key: 'nanumPenScript', familyKey: 'nanumPenScript', familyLabelKey: 'imageEditor.familyNanumPenScript', labelKey: 'imageEditor.fontNanumPenScript', groupKey: 'casual', family: decorativeFamily('Nanum Pen Script'), weight: 400 },
  // ── 명조 ──
  { key: 'gowunBatang', familyKey: 'gowunBatang', familyLabelKey: 'imageEditor.familyGowunBatang', labelKey: 'imageEditor.fontGowunBatang', groupKey: 'serif', family: decorativeFamily('Gowun Batang'), weight: 400 },
  { key: 'gowunBatangBold', familyKey: 'gowunBatang', familyLabelKey: 'imageEditor.familyGowunBatang', labelKey: 'imageEditor.fontGowunBatangBold', groupKey: 'serif', family: decorativeFamily('Gowun Batang'), weight: 700 },
  { key: 'songMyung', familyKey: 'songMyung', familyLabelKey: 'imageEditor.familySongMyung', labelKey: 'imageEditor.fontSongMyung', groupKey: 'serif', family: decorativeFamily('Song Myung'), weight: 400 },
  // ── 영문 위주 ──
  // Bebas Neue·Pacifico·IBM Plex Sans Condensed 는 한글 자소가 없어 한글을 적으면
  // Pretendard 로 떨어진다(decorativeFamily 의 폴백). Wanted Sans 는 한글도 있다.
  { key: 'wantedSansExtraBold', familyKey: 'wantedSans', familyLabelKey: 'imageEditor.familyWantedSans', labelKey: 'imageEditor.fontWantedSansExtraBold', groupKey: 'latin', family: decorativeFamily('Wanted Sans'), weight: 800 },
  { key: 'ibmPlexSansCondBold', familyKey: 'ibmPlexSansCond', familyLabelKey: 'imageEditor.familyIbmPlexSansCond', labelKey: 'imageEditor.fontIbmPlexSansCondBold', groupKey: 'latin', family: decorativeFamily('IBM Plex Sans Condensed'), weight: 700 },
  { key: 'bebasNeue', familyKey: 'bebasNeue', familyLabelKey: 'imageEditor.familyBebasNeue', labelKey: 'imageEditor.fontBebasNeue', groupKey: 'latin', family: decorativeFamily('Bebas Neue'), weight: 400 },
  { key: 'pacifico', familyKey: 'pacifico', familyLabelKey: 'imageEditor.familyPacifico', labelKey: 'imageEditor.fontPacifico', groupKey: 'latin', family: decorativeFamily('Pacifico'), weight: 400 },
  { key: 'stiluSemiBold', familyKey: 'stilu', familyLabelKey: 'imageEditor.familyStilu', labelKey: 'imageEditor.fontStiluSemiBold', groupKey: 'latin', family: decorativeFamily('Stilu'), weight: 600 },
  { key: 'stiluBold', familyKey: 'stilu', familyLabelKey: 'imageEditor.familyStilu', labelKey: 'imageEditor.fontStiluBold', groupKey: 'latin', family: decorativeFamily('Stilu'), weight: 700 },
  { key: 'kalamkari', familyKey: 'kalamkari', familyLabelKey: 'imageEditor.familyKalamkari', labelKey: 'imageEditor.fontKalamkari', groupKey: 'latin', family: decorativeFamily('Kalamkari'), weight: 400 },
  { key: 'coolStory', familyKey: 'coolStory', familyLabelKey: 'imageEditor.familyCoolStory', labelKey: 'imageEditor.fontCoolStory', groupKey: 'latin', family: decorativeFamily('Cool Story'), weight: 400 },
  { key: 'magnoliaScript', familyKey: 'magnoliaScript', familyLabelKey: 'imageEditor.familyMagnoliaScript', labelKey: 'imageEditor.fontMagnoliaScript', groupKey: 'latin', family: decorativeFamily('Magnolia Script'), weight: 400 },
  { key: 'exmouth', familyKey: 'exmouth', familyLabelKey: 'imageEditor.familyExmouth', labelKey: 'imageEditor.fontExmouth', groupKey: 'latin', family: decorativeFamily('Exmouth'), weight: 400 },
  { key: 'allura', familyKey: 'allura', familyLabelKey: 'imageEditor.familyAllura', labelKey: 'imageEditor.fontAllura', groupKey: 'latin', family: decorativeFamily('Allura'), weight: 400 },
  { key: 'greatVibes', familyKey: 'greatVibes', familyLabelKey: 'imageEditor.familyGreatVibes', labelKey: 'imageEditor.fontGreatVibes', groupKey: 'latin', family: decorativeFamily('Great Vibes'), weight: 400 },
  { key: 'dancingScript', familyKey: 'dancingScript', familyLabelKey: 'imageEditor.familyDancingScript', labelKey: 'imageEditor.fontDancingScript', groupKey: 'latin', family: decorativeFamily('Dancing Script'), weight: 400 },
  { key: 'dancingScriptBold', familyKey: 'dancingScript', familyLabelKey: 'imageEditor.familyDancingScript', labelKey: 'imageEditor.fontDancingScriptBold', groupKey: 'latin', family: decorativeFamily('Dancing Script'), weight: 700 },
]

/** 서체 가족 — 목록은 가족으로 보여 주고, 굵기는 가족을 고른 뒤에 고른다. */
export interface TextFontFamily {
  key: string
  labelKey: string
  groupKey: TextFontGroupKey
  family: string
  /** 가벼운 것부터. 굵기가 하나뿐인 가족도 많다. */
  weights: { weight: number; fontKey: TextFontKey }[]
}

/**
 * TEXT_FONT_OPTIONS 에서 가족 목록을 만든다.
 *
 * 저장되는 값은 여전히 굵기까지 포함한 fontKey 하나다(백엔드가 그 값을 검사한다).
 * 여기서 만드는 것은 화면용 묶음일 뿐이라, 서체를 추가할 때 옵션 한 줄만 늘리면
 * 가족 목록·굵기 선택이 저절로 따라온다.
 */
export const TEXT_FONT_FAMILIES: TextFontFamily[] = (() => {
  const byKey = new Map<string, TextFontFamily>()
  for (const option of TEXT_FONT_OPTIONS) {
    const found = byKey.get(option.familyKey)
    if (found) {
      found.weights.push({ weight: option.weight, fontKey: option.key })
      continue
    }
    byKey.set(option.familyKey, {
      key: option.familyKey,
      labelKey: option.familyLabelKey,
      groupKey: option.groupKey,
      family: option.family,
      weights: [{ weight: option.weight, fontKey: option.key }],
    })
  }
  const families = [...byKey.values()]
  families.forEach((entry) => entry.weights.sort((a, b) => a.weight - b.weight))
  return families
})()

export const getTextFontFamily = (fontKey: TextFontKey): TextFontFamily => {
  const option = getTextFont(fontKey)
  return TEXT_FONT_FAMILIES.find((entry) => entry.key === option.familyKey) ?? TEXT_FONT_FAMILIES[0]
}

/**
 * 가족 안에서 굵기에 맞는 fontKey 를 찾는다.
 * 그 가족에 없는 굵기면 가장 가까운 굵기로 떨어진다 — 가족을 바꿔도 느낌이 유지되게.
 */
export const resolveTextFontKey = (familyKey: string, weight: number): TextFontKey => {
  const family = TEXT_FONT_FAMILIES.find((entry) => entry.key === familyKey) ?? TEXT_FONT_FAMILIES[0]
  return family.weights.reduce((best, current) => (
    Math.abs(current.weight - weight) < Math.abs(best.weight - weight) ? current : best
  ), family.weights[0]).fontKey
}

export const TEXT_FONT_GROUPS: { key: TextFontGroupKey; labelKey: string }[] = [
  { key: 'basic', labelKey: 'imageEditor.fontGroupBasic' },
  { key: 'impact', labelKey: 'imageEditor.fontGroupImpact' },
  { key: 'casual', labelKey: 'imageEditor.fontGroupCasual' },
  { key: 'serif', labelKey: 'imageEditor.fontGroupSerif' },
  { key: 'latin', labelKey: 'imageEditor.fontGroupLatin' },
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
