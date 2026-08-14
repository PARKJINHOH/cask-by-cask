import { getTextFont, getTextLines, type TextFontKey } from '@/shared/components/imageEditorText'
import { getPhotoCardIcon } from '../constants/photoCardIcons'
import { ratioValue } from '../constants/photoCardRatios'
import type {
  PhotoCardDataContext,
  PhotoCardLayer,
  PhotoCardLayout,
  PhotoCardPadding,
  PhotoCardRatio,
} from '../types/photoCard.types'
import {
  getDrawableLayers,
  getSelectableLayers,
  resolveLayerImageUrl,
  resolveLayerText,
} from './resolveBindings'

/**
 * 포토카드 캔버스 렌더러.
 *
 * ── 왜 imageEditorText.ts 를 고치지 않고 여기에 따로 그리는가 ──
 * 포토카드에는 그 파일에 없는 것들이 있다 — 바인딩으로 채우는 글, 외곽선, 자간·행간, 회전.
 * 그 파일은 ImageEditorModal 을 통해 리치텍스트 에디터와 관리자 화면 여러 곳에 물려 있고
 * 전용 테스트도 있다. 운영 중인 공유 코드를 건드리는 대신 글꼴 정의(getTextFont/getTextLines/
 * TEXT_FONT_OPTIONS)만 가져다 쓰고 그리기만 여기서 다시 구현한다.
 *
 * ── 좌표계 ──
 * 레이아웃의 좌표·크기는 전부 비율이다.
 *   · position(x, y) : 프레임 가로/세로 대비 0~1 (요소의 앵커)
 *   · 나머지 크기     : **프레임 짧은 변** 대비 0~1
 * 짧은 변을 기준으로 삼아야 1:1 과 9:16 에서 글자 크기가 같아 보인다.
 */

export interface PhotoRect {
  left: number
  top: number
  width: number
  height: number
}

export interface PhotoCardCanvasSize {
  width: number
  height: number
  /**
   * 비율→px 환산 기준. <b>확장 전 기준 프레임</b>의 짧은 변이다(확장이 없으면 캔버스 짧은 변과 같다).
   *
   * 카드를 넓혀도 글자·여백·사진이 그대로 남는 것은 이 값이 캔버스 크기와 따로 놀기 때문이다.
   * 캔버스 짧은 변으로 환산하면 좌우를 넓힐 때 글자까지 함께 커진다.
   */
  unit?: number
  /** 기준 프레임이 캔버스 안에서 차지하는 자리. 확장이 없으면 캔버스 전체다. */
  base?: PhotoRect
}

/**
 * 액자 안에서 원본 사진을 얼마나 당겨 어디를 보여줄지.
 *
 * <b>레이아웃에 저장하지 않는다.</b> 액자의 위치·크기(frame.photo)는 템플릿 데이터가 맞지만,
 * "이 사진의 어느 부분을 보여줄지"는 그 사진에만 해당하는 값이다. 템플릿에 넣으면
 * 남이 그 템플릿을 쓸 때 엉뚱한 곳이 잘린다.
 */
export interface PhotoTransform {
  /** 1 = 액자에 꽉 맞춘 상태(COVER/CONTAIN 결과) */
  scale: number
  /** -1 ~ 1. 넘치는 양 대비 비율이라 이 범위 안에서는 액자에 빈 틈이 생기지 않는다. */
  offsetX: number
  offsetY: number
}

export const IDENTITY_PHOTO_TRANSFORM: PhotoTransform = { scale: 1, offsetX: 0, offsetY: 0 }

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value))

/** frameSizeOf 가 실제로 쓰는 값. 프레임 전체를 넘겨도 되고 이 두 개만 넘겨도 된다. */
export interface FrameSizeSource {
  ratio: PhotoCardRatio
  extend?: PhotoCardPadding
}

const extendOf = (extend: PhotoCardPadding | undefined) => ({
  top: Math.max(0, extend?.top ?? 0),
  right: Math.max(0, extend?.right ?? 0),
  bottom: Math.max(0, extend?.bottom ?? 0),
  left: Math.max(0, extend?.left ?? 0),
})

/**
 * 카드 캔버스 크기. 확장까지 포함한 전체가 maxEdge 안에 들어간다.
 *
 * 확장이 있으면 기준 프레임은 캔버스보다 작아지고, 그 자리(base)와 환산 단위(unit)를 함께 돌려준다.
 * 확장이 없을 때는 예전과 완전히 같은 `{ width, height }` 만 돌려준다 —
 * 기존 템플릿·테스트가 보던 값이 달라지지 않게.
 */
export const frameSizeOf = (frame: FrameSizeSource, maxEdge: number): PhotoCardCanvasSize => {
  const value = ratioValue(frame.ratio)
  // 기준 프레임을 '짧은 변 = 1' 로 두면 확장값(짧은 변 대비 비율)을 그대로 더할 수 있다.
  const baseWidth = value >= 1 ? value : 1
  const baseHeight = value >= 1 ? 1 : 1 / value
  const ext = extendOf(frame.extend)

  const totalWidth = baseWidth + ext.left + ext.right
  const totalHeight = baseHeight + ext.top + ext.bottom
  const scale = maxEdge / Math.max(totalWidth, totalHeight)
  const width = Math.max(1, Math.round(totalWidth * scale))
  const height = Math.max(1, Math.round(totalHeight * scale))

  if (ext.top === 0 && ext.right === 0 && ext.bottom === 0 && ext.left === 0) {
    return { width, height }
  }
  return {
    width,
    height,
    unit: scale,
    base: {
      left: ext.left * scale,
      top: ext.top * scale,
      width: baseWidth * scale,
      height: baseHeight * scale,
    },
  }
}

/** 기준 프레임이 캔버스 안에서 차지하는 자리. 확장이 없으면 캔버스 전체다. */
export const baseRectOf = (size: PhotoCardCanvasSize): PhotoRect =>
  size.base ?? { left: 0, top: 0, width: size.width, height: size.height }

/** 비율→px 환산 기준. 카드를 넓혀도 이 값은 변하지 않는다(=글자·사진 크기가 그대로다). */
export const shortSideOf = (size: PhotoCardCanvasSize): number =>
  size.unit ?? Math.min(size.width, size.height)

/**
 * 캔버스 자체의 짧은 변.
 * 카드 모서리·워터마크처럼 '늘어난 카드 전체'에 걸리는 값만 이 기준을 쓴다.
 */
export const canvasShortSideOf = (size: PhotoCardCanvasSize): number =>
  Math.min(size.width, size.height)

/** 비율 → 픽셀. 렌더의 모든 크기 계산이 이 함수를 통과한다. */
export const toPx = (ratioSize: number | undefined, shortSide: number, fallback = 0): number =>
  Math.round((ratioSize ?? fallback) * shortSide)

// ── 사진 영역 ────────────────────────────────────────────────

/**
 * 사진이 차지할 사각형. <b>기준 프레임</b> 안에서 padding 을 뺀 영역에 photo(x,y,w,h) 를 얹는다.
 *
 * 캔버스가 아니라 기준 프레임을 쓴다 — 카드를 넓혔을 때 늘어난 자리는 배경으로 남고
 * 사진은 원래 크기·자리를 지켜야 하기 때문이다.
 */
export const photoRectOf = (layout: PhotoCardLayout, size: PhotoCardCanvasSize): PhotoRect => {
  const shortSide = shortSideOf(size)
  const base = baseRectOf(size)
  const padding = layout.frame.padding
  const innerLeft = base.left + toPx(padding.left, shortSide)
  const innerTop = base.top + toPx(padding.top, shortSide)
  const innerWidth = base.width - toPx(padding.left, shortSide) - toPx(padding.right, shortSide)
  const innerHeight = base.height - toPx(padding.top, shortSide) - toPx(padding.bottom, shortSide)

  const photo = layout.frame.photo
  const width = Math.max(1, innerWidth * photo.w)
  const height = Math.max(1, innerHeight * photo.h)
  return {
    left: innerLeft + innerWidth * photo.x - width / 2,
    top: innerTop + innerHeight * photo.y - height / 2,
    width,
    height,
  }
}

/**
 * 액자(비율·여백·사진 자리)가 바뀔 때 요소를 새 액자에 맞춰 다시 앉힌다.
 *
 * 좌표는 <b>프레임 대비</b> 비율인데 글자 크기·여백은 <b>짧은 변 대비</b> 비율이다.
 * 그래서 비율만 바꾸면 같은 좌표가 전혀 다른 자리를 가리킨다 —
 * 4:5 밴드에 앉아 있던 줄이 9:16 에서는 사진 위로 올라가고, 1:1 에서는 줄끼리 겹친다.
 *
 * 그래서 사진 액자를 기준으로 다시 잡는다 — 축마다 [앞 여백 | 액자 | 뒤 여백] 세 칸으로 나누고,
 * 요소가 있던 칸 안에서의 <b>상대 위치</b>를 새 액자의 같은 칸에 옮긴다.
 *   · 액자 안 : 사진 위 캡션이 사진과 함께 움직인다.
 *   · 아래 밴드 : 밴드 안에서의 자리(위에서 몇 번째 줄인지)가 유지된다.
 * 밴드 높이도 글자 크기와 같은 짧은 변 기준이라, 비율만 바꾸면 줄 간격이 글자 크기와 함께 움직인다.
 * 여백이 아예 없던 쪽(밴드 없는 템플릿)만 예외로, 짧은 변 대비 거리로 옮긴다.
 */
export const reflowLayersForFrame = (
  layout: PhotoCardLayout,
  nextFrame: PhotoCardLayout['frame'],
): PhotoCardLayer[] => {
  // 비율만 쓰므로 기준 크기가 무엇이든 결과는 같다.
  const PROBE_EDGE = 1000
  const fromSize = frameSizeOf(layout.frame, PROBE_EDGE)
  const toSize = frameSizeOf(nextFrame, PROBE_EDGE)
  const from = photoRectOf(layout, fromSize)
  const to = photoRectOf({ ...layout, frame: nextFrame }, toSize)
  if (from.width <= 1 || from.height <= 1) return layout.layers
  const scale = shortSideOf(toSize) / shortSideOf(fromSize)
  /** 칸이 이보다 얇으면 '그 안에서의 비율'이 의미가 없다(0 으로 나누는 것과 같다). */
  const THIN = 0.5

  const mapAxis = (
    value: number,
    fromStart: number, fromLength: number, fromTotal: number,
    toStart: number, toLength: number, toTotal: number,
  ) => {
    if (value < fromStart) {
      return fromStart <= THIN
        ? toStart - (fromStart - value) * scale
        : (value / fromStart) * toStart
    }
    const fromEnd = fromStart + fromLength
    if (value > fromEnd) {
      const fromGap = fromTotal - fromEnd
      const toGap = toTotal - (toStart + toLength)
      return fromGap <= THIN
        ? toStart + toLength + (value - fromEnd) * scale
        : toStart + toLength + ((value - fromEnd) / fromGap) * toGap
    }
    return toStart + ((value - fromStart) / fromLength) * toLength
  }

  return layout.layers.map((layer) => ({
    ...layer,
    position: {
      x: mapAxis(layer.position.x * fromSize.width,
        from.left, from.width, fromSize.width,
        to.left, to.width, toSize.width) / toSize.width,
      y: mapAxis(layer.position.y * fromSize.height,
        from.top, from.height, fromSize.height,
        to.top, to.height, toSize.height) / toSize.height,
    },
  }))
}

/**
 * 카드를 넓혔을 때(frame.extend 변경) 요소를 제자리에 붙잡아 둔다.
 *
 * 요소 좌표는 <b>캔버스 대비</b> 비율이라, 캔버스만 커지면 같은 0.5 가 다른 자리를 가리킨다 —
 * 아래로 200px 늘렸을 뿐인데 밴드에 앉아 있던 글이 위로 딸려 올라간다.
 * 기준 프레임 안에서의 상대 위치를 그대로 새 캔버스 좌표로 옮겨, 사용자가 맞춰 둔 자리를 지킨다.
 *
 * reflowLayersForFrame 과 달리 <b>사진 액자를 기준으로 다시 앉히지 않는다</b> —
 * 확장은 액자 안쪽을 하나도 건드리지 않으므로, 재배치하면 오히려 자리가 틀어진다.
 */
export const reanchorLayersForExtend = (
  layout: PhotoCardLayout,
  nextFrame: PhotoCardLayout['frame'],
): PhotoCardLayer[] => {
  const PROBE_EDGE = 1000
  const fromSize = frameSizeOf(layout.frame, PROBE_EDGE)
  const toSize = frameSizeOf(nextFrame, PROBE_EDGE)
  const from = baseRectOf(fromSize)
  const to = baseRectOf(toSize)
  if (from.width <= 0 || from.height <= 0) return layout.layers

  const mapAxis = (
    value: number,
    fromStart: number, fromLength: number, fromTotal: number,
    toStart: number, toLength: number, toTotal: number,
  ) => clamp(
    (toStart + ((value * fromTotal - fromStart) / fromLength) * toLength) / toTotal,
    0, 1,
  )

  return layout.layers.map((layer) => ({
    ...layer,
    position: {
      x: mapAxis(layer.position.x,
        from.left, from.width, fromSize.width,
        to.left, to.width, toSize.width),
      y: mapAxis(layer.position.y,
        from.top, from.height, fromSize.height,
        to.top, to.height, toSize.height),
    },
  }))
}

const roundedRectPath = (
  ctx: CanvasRenderingContext2D,
  left: number,
  top: number,
  width: number,
  height: number,
  radius: number,
) => {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2))
  ctx.beginPath()
  ctx.moveTo(left + r, top)
  ctx.lineTo(left + width - r, top)
  ctx.quadraticCurveTo(left + width, top, left + width, top + r)
  ctx.lineTo(left + width, top + height - r)
  ctx.quadraticCurveTo(left + width, top + height, left + width - r, top + height)
  ctx.lineTo(left + r, top + height)
  ctx.quadraticCurveTo(left, top + height, left, top + height - r)
  ctx.lineTo(left, top + r)
  ctx.quadraticCurveTo(left, top, left + r, top)
  ctx.closePath()
}

export interface PhotoPlacement extends PhotoRect {
  /** 액자를 넘치는 양의 절반 = offset ±1 이 밀 수 있는 최대 거리(px) */
  slackX: number
  slackY: number
}

/**
 * 원본 사진이 실제로 그려질 사각형. COVER/CONTAIN 으로 액자를 채운 뒤 transform 을 얹는다.
 * 화면에서 사진을 끌어 옮길 때 "얼마나 밀 수 있는지"도 여기서 나온다.
 */
export const photoPlacementOf = (
  layout: PhotoCardLayout,
  size: PhotoCardCanvasSize,
  photo: { width: number; height: number },
  transform: PhotoTransform = IDENTITY_PHOTO_TRANSFORM,
): PhotoPlacement => {
  const rect = photoRectOf(layout, size)
  const sourceRatio = photo.width / photo.height
  const targetRatio = rect.width / rect.height
  const cover = layout.frame.photo.fit !== 'CONTAIN'
  const fill = cover ? sourceRatio > targetRatio : sourceRatio < targetRatio

  const scale = Math.max(0.05, transform.scale ?? 1)
  const width = (fill ? rect.height * sourceRatio : rect.width) * scale
  const height = (fill ? rect.height : rect.width / sourceRatio) * scale

  // offset 을 넘치는 양 대비 비율로 받기 때문에, -1~1 안에서는 액자에 빈 틈이 생기지 않는다.
  const slackX = Math.max(0, width - rect.width) / 2
  const slackY = Math.max(0, height - rect.height) / 2

  return {
    left: rect.left + (rect.width - width) / 2 + clamp(transform.offsetX ?? 0, -1, 1) * slackX,
    top: rect.top + (rect.height - height) / 2 + clamp(transform.offsetY ?? 0, -1, 1) * slackY,
    width,
    height,
    slackX,
    slackY,
  }
}

/**
 * COVER(잘라서 채움) / CONTAIN(다 보이게) 로 사진을 그린다.
 * transform 으로 확대·이동을 얹는다 — 피사체가 가운데 없는 사진도 원하는 곳을 보여줄 수 있다.
 */
export const drawPhoto = (
  ctx: CanvasRenderingContext2D,
  layout: PhotoCardLayout,
  size: PhotoCardCanvasSize,
  photo: CanvasImageSource & { width: number; height: number },
  transform: PhotoTransform = IDENTITY_PHOTO_TRANSFORM,
) => {
  const rect = photoRectOf(layout, size)
  const shortSide = shortSideOf(size)
  const radius = toPx(layout.frame.photo.radius, shortSide)
  const placement = photoPlacementOf(layout, size, photo, transform)

  // 모서리를 둥글게 깎을 대상은 <b>실제로 그려지는 사진</b>이다.
  // 액자(rect)를 기준으로 깎으면 '전체 보기'처럼 사진이 액자보다 작을 때
  // 아무것도 없는 여백이 둥글게 잘리고 사진 모서리는 각진 채로 남아, 사선으로 깎인 것처럼 보인다.
  const clip = {
    left: Math.max(rect.left, placement.left),
    top: Math.max(rect.top, placement.top),
    right: Math.min(rect.left + rect.width, placement.left + placement.width),
    bottom: Math.min(rect.top + rect.height, placement.top + placement.height),
  }
  const clipWidth = Math.max(0, clip.right - clip.left)
  const clipHeight = Math.max(0, clip.bottom - clip.top)

  ctx.save()
  if (radius > 0) {
    roundedRectPath(ctx, clip.left, clip.top, clipWidth, clipHeight, radius)
  } else {
    ctx.beginPath()
    ctx.rect(clip.left, clip.top, clipWidth, clipHeight)
  }
  ctx.clip()

  ctx.drawImage(photo, placement.left, placement.top, placement.width, placement.height)
  ctx.restore()
}

// ── 텍스트 ───────────────────────────────────────────────────

const applyTextFont = (
  ctx: CanvasRenderingContext2D,
  layer: PhotoCardLayer,
  shortSide: number,
) => {
  const font = getTextFont((layer.fontKey ?? 'pretendardBold') as TextFontKey)
  const fontSize = Math.max(1, toPx(layer.fontSizeRatio, shortSide, 0.04))
  ctx.font = `${font.weight} ${fontSize}px ${font.family}`
  // 글자는 언제나 가운데 기준이다 — position 이 곧 글의 시각 중심이라 앵커 분기가 없다.
  ctx.textAlign = layer.textAlign === 'LEFT'
    ? 'left'
    : layer.textAlign === 'RIGHT' ? 'right' : 'center'
  ctx.textBaseline = 'middle'
  ctx.lineJoin = 'round'
  // 자간은 em 배수로 저장한다(백엔드도 -0.5~1.0 으로 받는다). font 를 먼저 정한 뒤 걸어야 한다.
  // Chrome 99+/Safari 17.4+/Firefox 138+ 에만 있다 — 없는 브라우저는 자간 없이 그려진다.
  // 값이 0 이어도 반드시 대입한다. 앞 레이어의 자간이 남아 새는 것을 막는다.
  if ('letterSpacing' in ctx) {
    ctx.letterSpacing = `${(layer.letterSpacing ?? 0) * fontSize}px`
  }
  return fontSize
}

/**
 * 캔버스가 실제로 재는 폭으로 문단을 줄바꿈한다.
 * 공백이 있는 문장은 단어 단위를 우선하고, 한 단어가 칸보다 길거나 한글처럼 공백이 드문 문장은
 * 글자 단위로 한 번 더 나눈다. 미리보기·히트 테스트·최종 출력이 모두 이 함수를 사용한다.
 */
export const wrapPhotoCardText = (
  ctx: CanvasRenderingContext2D,
  value: string,
  maxWidth?: number,
): string[] => {
  const paragraphs = getTextLines(value)
  if (!maxWidth || !Number.isFinite(maxWidth) || maxWidth <= 0) return paragraphs

  const wrapped: string[] = []
  paragraphs.forEach((paragraph) => {
    if (!paragraph) {
      wrapped.push('')
      return
    }

    const tokens = paragraph.match(/\s+|\S+/gu) ?? [paragraph]
    let line = ''
    const pushLine = () => {
      wrapped.push(line.trimEnd())
      line = ''
    }

    tokens.forEach((token) => {
      if (/^\s+$/u.test(token)) {
        if (line && !line.endsWith(' ')) line += ' '
        return
      }

      const candidate = line ? `${line}${token}` : token
      if (ctx.measureText(candidate).width <= maxWidth) {
        line = candidate
        return
      }
      if (line.trim()) pushLine()

      Array.from(token).forEach((character) => {
        const next = `${line}${character}`
        if (line && ctx.measureText(next).width > maxWidth) pushLine()
        line += character
      })
    })
    if (line || wrapped.length === 0) pushLine()
  })
  return wrapped.length > 0 ? wrapped : ['']
}

const textLinesForLayer = (
  ctx: CanvasRenderingContext2D,
  size: PhotoCardCanvasSize,
  layer: PhotoCardLayer,
  context: PhotoCardDataContext,
): string[] => wrapPhotoCardText(
  ctx,
  resolveLayerText(layer, context),
  layer.widthRatio == null ? undefined : toPx(layer.widthRatio, shortSideOf(size)),
)

/** baseline 오프셋을 잴 때 쓰는 고정 표본. 글자 내용과 무관하게 같은 값이 나와야 줄이 맞는다. */
const BASELINE_PROBE = 'Hxg'

/**
 * textBaseline='middle' 로 그린 글자에서 알파벳 baseline 이 중심선보다 얼마나 아래인가(px).
 *
 * 같은 문자열을 두 기준선으로 재서 차이를 본다 — 브라우저가 쓰는 'middle' 정의를 그대로 따르므로
 * 폰트 메트릭을 직접 해석할 때보다 정확하다. 호출 전에 ctx.font 가 정해져 있어야 한다.
 */
export const baselineOffsetOf = (ctx: CanvasRenderingContext2D, fontSize: number): number => {
  const previous = ctx.textBaseline
  ctx.textBaseline = 'alphabetic'
  const fromAlphabetic = ctx.measureText(BASELINE_PROBE).actualBoundingBoxAscent
  ctx.textBaseline = 'middle'
  const fromMiddle = ctx.measureText(BASELINE_PROBE).actualBoundingBoxAscent
  ctx.textBaseline = previous
  // 구형 브라우저·테스트 대역 캔버스는 이 값을 주지 않는다. 근사치로 계속 진행한다.
  if (!Number.isFinite(fromAlphabetic) || !Number.isFinite(fromMiddle)) return fontSize * 0.35
  return fromAlphabetic - fromMiddle
}

export interface LayerBounds {
  left: number
  top: number
  right: number
  bottom: number
}

export interface CanvasPoint {
  x: number
  y: number
}

/** 요소 중심을 기준으로 점을 회전한다. 선택 표시와 히트 테스트가 실제 렌더링 좌표를 공유할 때 쓴다. */
export const rotatePointAround = (
  point: CanvasPoint,
  center: CanvasPoint,
  degrees: number,
): CanvasPoint => {
  if (degrees === 0) return point
  const radians = (degrees * Math.PI) / 180
  const cosine = Math.cos(radians)
  const sine = Math.sin(radians)
  const dx = point.x - center.x
  const dy = point.y - center.y
  return {
    x: center.x + dx * cosine - dy * sine,
    y: center.y + dx * sine + dy * cosine,
  }
}

/** 드래그 히트 테스트·선택 표시에 쓸 요소 경계. */
export const measureLayerBounds = (
  ctx: CanvasRenderingContext2D,
  size: PhotoCardCanvasSize,
  layer: PhotoCardLayer,
  context: PhotoCardDataContext,
): LayerBounds => {
  const shortSide = shortSideOf(size)
  const centerX = layer.position.x * size.width
  const centerY = layer.position.y * size.height

  if (layer.type === 'TEXT') {
    const fontSize = applyTextFont(ctx, layer, shortSide)
    const lines = textLinesForLayer(ctx, size, layer, context)
    const lineHeight = fontSize * (layer.lineHeight ?? 1.25)
    const outline = layer.outlineEnabled ? toPx(layer.outlineWidthRatio, shortSide) : 0
    const measuredWidth = Math.max(fontSize, ...lines.map((line) => ctx.measureText(line || ' ').width)) + outline * 2
    const width = layer.textAlign === 'CENTER' || layer.textAlign == null || layer.widthRatio == null
      ? measuredWidth
      : Math.max(measuredWidth, toPx(layer.widthRatio, shortSide))
    const height = Math.max(lineHeight, lines.length * lineHeight) + outline * 2
    const left = centerX - width / 2
    return { left, top: centerY - height / 2, right: left + width, bottom: centerY + height / 2 }
  }

  if (layer.type === 'DIVIDER') {
    const width = toPx(layer.widthRatio, shortSide, 0.8)
    const thickness = Math.max(1, toPx(layer.thicknessRatio, shortSide, 0.002))
    return {
      left: centerX - width / 2,
      top: centerY - thickness / 2,
      right: centerX + width / 2,
      bottom: centerY + thickness / 2,
    }
  }

  if (layer.type === 'ICON') {
    const size24 = toPx(layer.widthRatio, shortSide, 0.06)
    return {
      left: centerX - size24 / 2, top: centerY - size24 / 2,
      right: centerX + size24 / 2, bottom: centerY + size24 / 2,
    }
  }

  // IMAGE / BOX — 높이는 이미지 비율에 따라 그릴 때 결정되지만, 히트 테스트는 사각형으로 충분하다.
  const width = toPx(layer.widthRatio, shortSide, 0.2)
  const height = layer.type === 'BOX' ? toPx(layer.heightRatio, shortSide, 0.2) : width
  return {
    left: centerX - width / 2,
    top: centerY - height / 2,
    right: centerX + width / 2,
    bottom: centerY + height / 2,
  }
}

/**
 * 텍스트 첫 줄의 알파벳 baseline 절대 y. 텍스트가 아니거나 그려지지 않으면 null.
 *
 * 세로 정렬의 기준이다. position.y 는 글자 덩어리의 <b>시각 중심</b>이라, 크기가 다른 두 텍스트를
 * 같은 y 에 두면 중심만 맞고 밑줄은 어긋난다. 한 줄로 보이게 하려면 이 값을 맞춰야 한다.
 */
export const textBaselineYOf = (
  ctx: CanvasRenderingContext2D,
  size: PhotoCardCanvasSize,
  layer: PhotoCardLayer,
  context: PhotoCardDataContext,
): number | null => {
  if (layer.type !== 'TEXT') return null
  const value = resolveLayerText(layer, context)
  if (!value.trim()) return null

  const fontSize = applyTextFont(ctx, layer, shortSideOf(size))
  const lines = textLinesForLayer(ctx, size, layer, context)
  const lineHeight = fontSize * (layer.lineHeight ?? 1.25)
  // drawTextLayer 의 firstLineY 와 같은 식이어야 한다.
  const firstLineY = layer.position.y * size.height - ((lines.length - 1) * lineHeight) / 2
  return firstLineY + baselineOffsetOf(ctx, fontSize)
}

/** 포인터 아래 요소를 찾는다. 나중에 그려진(=위) 것이 우선이라 뒤에서부터 훑는다. */
export const findLayerAtPoint = (
  ctx: CanvasRenderingContext2D,
  size: PhotoCardCanvasSize,
  layers: PhotoCardLayer[],
  context: PhotoCardDataContext,
  point: { x: number; y: number },
  padding = 0,
): PhotoCardLayer | null => {
  // 그리는 목록이 아니라 '집을 수 있는' 목록을 쓴다 — 아직 글을 안 쓴 빈 텍스트도 잡혀야 한다.
  const pickable = getSelectableLayers(layers, context)
  for (let i = pickable.length - 1; i >= 0; i -= 1) {
    const layer = pickable[i]
    const bounds = measureLayerBounds(ctx, size, layer, context)
    const center = {
      x: layer.position.x * size.width,
      y: layer.position.y * size.height,
    }
    // 경계는 요소의 회전 전 로컬 축을 기준으로 잰다. 포인터를 반대로 회전시키면
    // 세로로 돌린 구분선처럼 가늘고 긴 요소도 화면에 보이는 자리에서 정확히 집힌다.
    const localPoint = rotatePointAround(point, center, -(layer.rotation ?? 0))
    if (
      localPoint.x >= bounds.left - padding && localPoint.x <= bounds.right + padding
      && localPoint.y >= bounds.top - padding && localPoint.y <= bounds.bottom + padding
    ) {
      return layer
    }
  }
  return null
}

const drawTextLayer = (
  ctx: CanvasRenderingContext2D,
  size: PhotoCardCanvasSize,
  layer: PhotoCardLayer,
  context: PhotoCardDataContext,
) => {
  const value = resolveLayerText(layer, context)
  if (!value.trim()) return

  const shortSide = shortSideOf(size)
  const fontSize = applyTextFont(ctx, layer, shortSide)
  const lines = textLinesForLayer(ctx, size, layer, context)
  const lineHeight = fontSize * (layer.lineHeight ?? 1.25)
  const centerX = layer.position.x * size.width
  const textWidth = layer.widthRatio == null ? 0 : toPx(layer.widthRatio, shortSide)
  const x = layer.textAlign === 'LEFT'
    ? centerX - textWidth / 2
    : layer.textAlign === 'RIGHT' ? centerX + textWidth / 2 : centerX
  const firstLineY = layer.position.y * size.height - ((lines.length - 1) * lineHeight) / 2
  const outline = layer.outlineEnabled ? toPx(layer.outlineWidthRatio, shortSide) : 0

  ctx.fillStyle = layer.color ?? '#ffffff'
  if (outline > 0) {
    ctx.strokeStyle = layer.outlineColor ?? '#000000'
    // Canvas stroke 는 글리프 경계를 중심으로 퍼지므로 바깥 굵기의 2배를 준다(에디터와 같은 규칙).
    ctx.lineWidth = outline * 2
  }
  lines.forEach((line, index) => {
    const y = firstLineY + index * lineHeight
    if (outline > 0) ctx.strokeText(line || ' ', x, y)
    ctx.fillText(line || ' ', x, y)
  })
}

const drawDividerLayer = (
  ctx: CanvasRenderingContext2D,
  size: PhotoCardCanvasSize,
  layer: PhotoCardLayer,
) => {
  const shortSide = shortSideOf(size)
  const width = toPx(layer.widthRatio, shortSide, 0.8)
  const thickness = Math.max(1, toPx(layer.thicknessRatio, shortSide, 0.002))
  ctx.fillStyle = layer.fill ?? '#dddddd'
  ctx.fillRect(
    layer.position.x * size.width - width / 2,
    layer.position.y * size.height - thickness / 2,
    width,
    thickness,
  )
}

const drawBoxLayer = (
  ctx: CanvasRenderingContext2D,
  size: PhotoCardCanvasSize,
  layer: PhotoCardLayer,
) => {
  const shortSide = shortSideOf(size)
  const width = toPx(layer.widthRatio, shortSide, 0.5)
  const height = toPx(layer.heightRatio, shortSide, 0.2)
  const left = layer.position.x * size.width - width / 2
  const top = layer.position.y * size.height - height / 2
  const radius = toPx(layer.radius, shortSide)

  ctx.globalAlpha = layer.opacity ?? 1
  roundedRectPath(ctx, left, top, width, height, radius)
  ctx.fillStyle = layer.fill ?? '#00000080'
  ctx.fill()
  const strokeWidth = toPx(layer.strokeWidthRatio, shortSide)
  if (layer.strokeColor && strokeWidth > 0) {
    ctx.strokeStyle = layer.strokeColor
    ctx.lineWidth = strokeWidth
    ctx.stroke()
  }
  ctx.globalAlpha = 1
}

/**
 * 아이콘은 24×24 뷰박스 SVG path 를 Path2D 로 그린다.
 * 비트맵이 아니라 벡터라 원본 화질(4096px)로 뽑아도 가장자리가 뭉개지지 않는다.
 */
const drawIconLayer = (
  ctx: CanvasRenderingContext2D,
  size: PhotoCardCanvasSize,
  layer: PhotoCardLayer,
) => {
  const icon = getPhotoCardIcon(layer.iconKey)
  if (!icon || typeof Path2D === 'undefined') return
  const shortSide = shortSideOf(size)
  const box = toPx(layer.widthRatio, shortSide, 0.06)
  const scale = box / 24

  ctx.save()
  ctx.globalAlpha = layer.opacity ?? 1
  ctx.translate(layer.position.x * size.width - box / 2, layer.position.y * size.height - box / 2)
  ctx.scale(scale, scale)
  ctx.fillStyle = layer.fill ?? '#111111'
  ctx.fill(new Path2D(icon.path))
  ctx.restore()
}

const drawImageLayer = (
  ctx: CanvasRenderingContext2D,
  size: PhotoCardCanvasSize,
  layer: PhotoCardLayer,
  image: CanvasImageSource & { width: number; height: number },
) => {
  const shortSide = shortSideOf(size)
  const width = toPx(layer.widthRatio, shortSide, 0.15)
  const height = width * (image.height / image.width)
  ctx.globalAlpha = layer.opacity ?? 1
  ctx.drawImage(
    image,
    layer.position.x * size.width - width / 2,
    layer.position.y * size.height - height / 2,
    width,
    height,
  )
  ctx.globalAlpha = 1
}

/** 이미지 레이어가 참조하는 이미지들. 그리기 전에 미리 로드해 넘긴다. */
export type LoadedImages = Map<string, CanvasImageSource & { width: number; height: number }>

// ── 비회원 저장본 워터마크 ───────────────────────────────────

/** 브랜드 마크의 가로 길이(짧은 변 대비). 카드가 커져도 마크가 차지하는 비중은 같다. */
export const WATERMARK_WIDTH_RATIO = 0.09
/**
 * 카드 모서리에서 띄우는 거리(짧은 변 대비).
 *
 * 기본 템플릿의 아래 밴드(짧은 변의 0.13) 안에서 세로 가운데에 오도록 잡은 값이다 —
 * 이보다 크면 마크가 밴드 위쪽에 붙어 사진 쪽으로 올라붙어 보인다.
 */
export const WATERMARK_MARGIN_RATIO = 0.022
/** 사진을 가리지 않으면서 출처는 알아볼 수 있는 정도 */
export const WATERMARK_OPACITY = 0.5

/**
 * 마크가 놓일 자리 — 오른쪽 아래 모서리에 붙인다.
 * @param aspect 마크 그림의 세로/가로 비. 정사각이 아니어도 아래·오른쪽 끝이 맞는다.
 */
export const watermarkRectOf = (size: PhotoCardCanvasSize, aspect = 1) => {
  // 마크는 '내보낸 이미지' 오른쪽 아래에 붙는 표시라, 늘어난 카드 전체를 기준으로 잡는다.
  const shortSide = canvasShortSideOf(size)
  const width = shortSide * WATERMARK_WIDTH_RATIO
  const height = width * aspect
  const margin = shortSide * WATERMARK_MARGIN_RATIO
  return {
    left: size.width - margin - width,
    top: size.height - margin - height,
    width,
    height,
  }
}

/**
 * 비회원이 내려받는 이미지에 브랜드 마크를 얹는다.
 *
 * 편집 화면에는 그리지 않는다 — 카드 구성 요소가 아니라 '이 저장본이 어디서 나왔는지'를 남기는
 * 표시이므로, 사용자가 옮기거나 지울 수 있는 레이어가 되면 안 된다.
 */
export const drawWatermark = (
  ctx: CanvasRenderingContext2D,
  size: PhotoCardCanvasSize,
  mark: CanvasImageSource & { width: number; height: number },
) => {
  if (!mark.width || !mark.height) return
  const rect = watermarkRectOf(size, mark.height / mark.width)
  ctx.globalAlpha = WATERMARK_OPACITY
  ctx.drawImage(mark, rect.left, rect.top, rect.width, rect.height)
  ctx.globalAlpha = 1
}

/** 리뷰 공유 미리보기의 은은한 한지 결을 캔버스 출력에도 동일하게 재현한다. */
const drawPaperTexture = (
  ctx: CanvasRenderingContext2D,
  size: PhotoCardCanvasSize,
) => {
  const shortSide = canvasShortSideOf(size)
  const lineGap = Math.max(8, shortSide * 0.025)
  const slope = Math.tan((8 * Math.PI) / 180)

  ctx.save()
  ctx.globalAlpha = 0.025
  ctx.strokeStyle = '#153047'
  ctx.lineWidth = Math.max(0.5, shortSide * 0.00035)
  for (let startY = -size.width * slope; startY < size.height; startY += lineGap) {
    ctx.beginPath()
    ctx.moveTo(0, startY)
    ctx.lineTo(size.width, startY + size.width * slope)
    ctx.stroke()
  }

  const dotWidth = Math.max(0.7, shortSide * 0.0015)
  const gapX = Math.max(13, shortSide * 0.047)
  const gapY = Math.max(15, shortSide * 0.053)
  ctx.globalAlpha = 0.028
  ctx.fillStyle = '#b58232'
  for (let row = 0, dotY = gapY * 0.7; dotY < size.height; row += 1, dotY += gapY) {
    const offset = row % 2 === 0 ? gapX * 0.2 : gapX * 0.72
    for (let dotX = offset; dotX < size.width; dotX += gapX) {
      ctx.fillRect(dotX, dotY, dotWidth, dotWidth)
    }
  }
  ctx.restore()
}

/**
 * 전체 렌더. 미리보기 캔버스와 최종 출력 캔버스가 같은 함수를 쓴다 —
 * 보이는 그대로 저장된다는 보장이 여기서 나온다.
 */
export const drawPhotoCard = (
  ctx: CanvasRenderingContext2D,
  size: PhotoCardCanvasSize,
  layout: PhotoCardLayout,
  context: PhotoCardDataContext,
  photo: (CanvasImageSource & { width: number; height: number }) | null,
  images: LoadedImages,
  photoTransform: PhotoTransform = IDENTITY_PHOTO_TRANSFORM,
) => {
  ctx.save()
  ctx.clearRect(0, 0, size.width, size.height)

  // 카드 모서리를 둥글게 잘라 낸다. PNG 로 뽑으면 잘린 부분이 투명해지고,
  // JPG 는 투명을 담지 못해 검게 나오므로 배경색으로 한 번 칠한 뒤 클립한다.
  // 카드 모서리는 늘어난 카드 전체의 모서리다 — 기준 프레임이 아니라 캔버스를 기준으로 깎는다.
  const frameRadius = toPx(layout.frame.radius, canvasShortSideOf(size))
  if (frameRadius > 0) {
    roundedRectPath(ctx, 0, 0, size.width, size.height, frameRadius)
    ctx.clip()
  }
  ctx.fillStyle = layout.frame.backgroundColor ?? '#ffffff'
  ctx.fillRect(0, 0, size.width, size.height)
  if (layout.frame.backgroundTexture === 'PAPER') drawPaperTexture(ctx, size)

  if (photo) drawPhoto(ctx, layout, size, photo, photoTransform)

  getDrawableLayers(layout.layers, context).forEach((layer) => {
    ctx.save()
    const rotation = layer.rotation ?? 0
    if (rotation !== 0) {
      ctx.translate(layer.position.x * size.width, layer.position.y * size.height)
      ctx.rotate((rotation * Math.PI) / 180)
      ctx.translate(-layer.position.x * size.width, -layer.position.y * size.height)
    }
    switch (layer.type) {
      case 'TEXT': drawTextLayer(ctx, size, layer, context); break
      case 'DIVIDER': drawDividerLayer(ctx, size, layer); break
      case 'BOX': drawBoxLayer(ctx, size, layer); break
      case 'ICON': drawIconLayer(ctx, size, layer); break
      case 'IMAGE': {
        const url = resolveLayerImageUrl(layer, context) ?? ''
        const image = images.get(url)
        if (image) drawImageLayer(ctx, size, layer, image)
        break
      }
      default: break
    }
    ctx.restore()
  })
  ctx.restore()
}
