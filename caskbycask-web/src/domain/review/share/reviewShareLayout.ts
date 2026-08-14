import type { PhotoCardLayer, PhotoCardLayout } from '@/domain/photo-card/types/photoCard.types'
import {
  REVIEW_SHARE_SYSTEM_TEMPLATE_APPLIED_KEY,
  REVIEW_SHARE_SYSTEM_TEMPLATE_KEY,
} from '@/domain/photo-card/constants/systemTemplates'
import { PHOTO_CARD_NATIVE_MAX_EDGE, ratioValue } from '@/domain/photo-card/constants/photoCardRatios'
import {
  PHOTO_CARD_MAX_BOTTOM_EXTEND,
  PHOTO_CARD_SCHEMA_VERSION,
  normalizeLayout,
} from '@/domain/photo-card/utils/layoutSchema'
import type {
  ReviewPhotoCardContent,
  ReviewShareCardLength,
  ReviewShareImagePlacement,
} from './reviewShare.types'

export const REVIEW_SHARE_PREVIEW_WIDTH = 360
/** 리뷰 공유에서 사용하는 코드 기반 공식 템플릿 식별자. */
export const REVIEW_SHARE_OFFICIAL_TEMPLATE_KEY = REVIEW_SHARE_SYSTEM_TEMPLATE_KEY
export const REVIEW_SHARE_OFFICIAL_TEMPLATE_APPLIED_KEY =
  REVIEW_SHARE_SYSTEM_TEMPLATE_APPLIED_KEY
/** 사용자가 고를 수 있는 「긴 세로형」의 최소 높이(가로 1 기준). */
export const REVIEW_SHARE_TALL_HEIGHT_RATIO = 16 / 9
export const REVIEW_SHARE_OUTPUT_WIDTH = 1080
const REVIEW_SHARE_BASE_HEIGHT_RATIO = 1.25
const REVIEW_SHARE_MAX_HEIGHT_RATIO = REVIEW_SHARE_BASE_HEIGHT_RATIO + PHOTO_CARD_MAX_BOTTOM_EXTEND
const REVIEW_SHARE_FRAME_PADDING = 0.04
const REVIEW_SHARE_FRAME_INNER_WIDTH = 1 - REVIEW_SHARE_FRAME_PADDING * 2
const REVIEW_SHARE_FRAME_INNER_HEIGHT = REVIEW_SHARE_BASE_HEIGHT_RATIO - REVIEW_SHARE_FRAME_PADDING * 2
const NOTE_WIDTH_RATIO = 0.65
const NOTE_LINE_HEIGHT = 1.45
const NOTE_ROW_PADDING_RATIO = 0.034
const OVERALL_ROW_PADDING_RATIO = 0.045
const FOOTER_SPACE_RATIO = 0.12

export const reviewSharePreviewScale = (containerWidth: number): number =>
  Math.min(1, Math.max(0, containerWidth) / REVIEW_SHARE_PREVIEW_WIDTH)

export interface ReviewShareRecommendedImage {
  ratio: '4:5' | '16:9'
  width: number
  height: number
}

/** 공식 리뷰 템플릿의 사진 슬롯과 정확히 같은 권장 원본 비율·해상도. */
export const reviewShareRecommendedImageOf = (
  placement: ReviewShareImagePlacement,
): ReviewShareRecommendedImage => placement === 'PORTRAIT'
  ? { ratio: '4:5', width: 1080, height: 1350 }
  : { ratio: '16:9', width: 1920, height: 1080 }

/** 공식 리뷰 공유본은 기존 품질을 유지해 가로 1080px로 내보내되 모바일 안전 상한을 지킨다. */
export const reviewShareOutputMaxEdgeOf = (layout: PhotoCardLayout): number => {
  const value = ratioValue(layout.frame.ratio)
  const baseWidth = value >= 1 ? value : 1
  const baseHeight = value >= 1 ? 1 : 1 / value
  const extend = layout.frame.extend
  const totalWidth = baseWidth + Math.max(0, extend?.left ?? 0) + Math.max(0, extend?.right ?? 0)
  const totalHeight = baseHeight + Math.max(0, extend?.top ?? 0) + Math.max(0, extend?.bottom ?? 0)
  return Math.min(
    PHOTO_CARD_NATIVE_MAX_EDGE,
    Math.max(1, Math.round(REVIEW_SHARE_OUTPUT_WIDTH * Math.max(totalWidth, totalHeight) / totalWidth)),
  )
}

const textLayer = (
  id: string,
  text: string,
  x: number,
  y: number,
  size: number,
  color: string,
  options: Partial<PhotoCardLayer> = {},
): PhotoCardLayer => ({
  id,
  type: 'TEXT',
  position: { x, y },
  visible: true,
  binding: options.binding ?? 'NONE',
  overridden: options.binding == null || options.binding === 'NONE',
  text: options.binding == null || options.binding === 'NONE' ? text : '',
  fontKey: 'pretendardMedium',
  fontSizeRatio: size,
  color,
  outlineEnabled: false,
  outlineColor: '#000000',
  outlineWidthRatio: 0,
  ...options,
})

const divider = (id: string, y: number): PhotoCardLayer => ({
  id,
  type: 'DIVIDER',
  position: { x: 0.5, y },
  visible: true,
  widthRatio: 0.9,
  thicknessRatio: 0.0015,
  fill: '#ddc7a2',
})

const aromaImageLayer = (
  id: string,
  source: 'REVIEW_AROMA_NOSE' | 'REVIEW_AROMA_TASTE' | 'REVIEW_AROMA_FINISH',
  x: number,
  y: number,
  widthRatio = 0.28,
): PhotoCardLayer => ({
  id,
  type: 'IMAGE',
  position: { x, y },
  visible: true,
  source,
  opacity: 1,
  widthRatio,
})

const compact = (value: string, max = 112): string => {
  const normalized = value.replace(/\s+/g, ' ').trim()
  return normalized.length > max ? `${normalized.slice(0, max - 1)}…` : normalized
}

const present = (...values: string[]): string => values.filter((value) => value.trim()).join(' · ')

const visualLength = (value: string): number => Array.from(value).reduce((sum, character) => {
  if (/\s/u.test(character)) return sum + 0.35
  if (/^[\x00-\xff]$/u.test(character)) return sum + 0.56
  return sum + 1
}, 0)

const estimatedLines = (value: string, widthRatio: number, fontSizeRatio: number): number => {
  const capacity = Math.max(1, (widthRatio / fontSizeRatio) * 0.9)
  const lines = Math.max(1, value.replace(/\r/g, '').split('\n')
    .reduce((sum, line) => sum + Math.max(1, Math.ceil(visualLength(line) / capacity)), 0))
  // Canvas/DOM 글꼴의 실제 한글 폭과 영문 혼합 줄바꿈 오차를 흡수한다.
  return lines <= 2 ? lines : Math.ceil(lines * 1.2)
}

interface ReviewShareFlow {
  topEnd: number
  noteSize: number
  overallSize: number
  noteLines: number[]
  overallLines: number
  aromaCount: number
  aromaHeight: number
  contentEnd: number
}

export interface ReviewShareCardMetrics extends ReviewShareFlow {
  extendBottom: number
  totalHeightRatio: number
}

const flowOf = (
  content: ReviewPhotoCardContent,
  placement: ReviewShareImagePlacement,
  includeAroma: boolean,
  noteSize: number,
  overallSize: number,
): ReviewShareFlow => {
  const notes = [content.noseNote, content.tasteNote, content.finishNote].filter(Boolean)
  const noteLines = notes
    .map((value) => estimatedLines(value, NOTE_WIDTH_RATIO, noteSize))
  const overallLines = content.overall ? estimatedLines(content.overall, NOTE_WIDTH_RATIO, overallSize) : 0
  const aromaCount = includeAroma
    ? [content.aromaNose, content.aromaTaste, content.aromaFinish].filter(Boolean).length
    : 0
  const topEnd = placement === 'PORTRAIT'
    // 정보 표의 마지막 구분선(0.575)보다 아래에서 TASTING NOTES 가 시작되어야 한다.
    ? aromaCount === 0 ? 0.78 : aromaCount === 1 ? 0.65 : 0.62
    : aromaCount === 0 ? 0.82 : aromaCount === 1 ? 0.72 : 0.69
  const aromaHeight = aromaCount === 1 ? 0.36 : aromaCount === 2 ? 0.32 : aromaCount === 3 ? 0.25 : 0
  let cursor = topEnd + (noteLines.length > 0 ? 0.045 : 0.02)
  noteLines.forEach((lines) => {
    cursor += Math.max(0.042, lines * noteSize * NOTE_LINE_HEIGHT) + NOTE_ROW_PADDING_RATIO
  })
  if (overallLines > 0) {
    cursor += Math.max(0.04, overallLines * overallSize * NOTE_LINE_HEIGHT) + OVERALL_ROW_PADDING_RATIO
  }
  if (aromaCount > 0) cursor += aromaHeight
  return {
    topEnd,
    noteSize,
    overallSize,
    noteLines,
    overallLines,
    aromaCount,
    aromaHeight,
    contentEnd: cursor,
  }
}

/** 공유 미리보기와 포토카드가 같은 높이 결정을 쓰게 하는 단일 계산 규칙. */
export const reviewShareCardMetrics = (
  content: ReviewPhotoCardContent,
  placement: ReviewShareImagePlacement,
  includeAroma: boolean,
  length: ReviewShareCardLength = 'AUTO',
): ReviewShareCardMetrics => {
  let noteSize = 0.018
  let overallSize = 0.019
  let flow = flowOf(content, placement, includeAroma, noteSize, overallSize)
  // 카드 확장 상한 안에서도 전문이 들어오도록 아주 긴 리뷰만 단계적으로 글자를 줄인다.
  while (flow.contentEnd + FOOTER_SPACE_RATIO > REVIEW_SHARE_MAX_HEIGHT_RATIO && noteSize > 0.0115) {
    noteSize = Math.max(0.0115, noteSize - 0.001)
    overallSize = Math.max(0.012, overallSize - 0.001)
    flow = flowOf(content, placement, includeAroma, noteSize, overallSize)
  }
  const requiredHeight = Math.min(
    REVIEW_SHARE_MAX_HEIGHT_RATIO,
    Math.max(
      flow.aromaCount > 0 ? 1.28 : REVIEW_SHARE_BASE_HEIGHT_RATIO,
      flow.contentEnd + FOOTER_SPACE_RATIO,
    ),
  )
  const requestedHeight = length === 'TALL'
    ? Math.max(requiredHeight, REVIEW_SHARE_TALL_HEIGHT_RATIO)
    : requiredHeight
  const totalHeightRatio = Math.min(REVIEW_SHARE_MAX_HEIGHT_RATIO, requestedHeight)
  return {
    ...flow,
    totalHeightRatio,
    extendBottom: Math.max(0, totalHeightRatio - REVIEW_SHARE_BASE_HEIGHT_RATIO),
  }
}

/** 내용 맞춤 결과가 이미 긴 세로형이면 길이 탭을 바꿔도 결과가 같으므로 잠근다. */
export const isReviewShareCardAlreadyTall = (
  content: ReviewPhotoCardContent,
  placement: ReviewShareImagePlacement,
  includeAroma: boolean,
): boolean => reviewShareCardMetrics(content, placement, includeAroma, 'AUTO').totalHeightRatio
  >= REVIEW_SHARE_TALL_HEIGHT_RATIO - Number.EPSILON

interface PhysicalPhotoBox {
  fit: 'COVER' | 'CONTAIN'
  centerX: number
  top: number
  width: number
  aspect: number
}

/**
 * 사진 좌표는 레이어와 달리 기준 프레임의 padding 안쪽 비율이다.
 * 디자인 단위(짧은 변=1)를 그대로 넣으면 높이가 약 1.17배 커지므로 여기서 반드시 환산한다.
 */
const reviewPhotoFrameOf = (
  placement: ReviewShareImagePlacement,
  aromaCount: number,
) => {
  const box: PhysicalPhotoBox = placement === 'PORTRAIT'
    ? {
      fit: 'CONTAIN',
      centerX: 0.74,
      top: aromaCount === 0 ? 0.1 : 0.09,
      width: aromaCount === 0 ? 0.44 : aromaCount === 1 ? 0.4 : 0.38,
      aspect: 4 / 5,
    }
    : {
      fit: 'COVER',
      centerX: 0.5,
      top: 0.15,
      width: aromaCount === 0 ? 0.78 : 0.72,
      aspect: 16 / 9,
    }
  const height = box.width / box.aspect
  const centerY = box.top + height / 2
  return {
    fit: box.fit,
    radius: 0,
    x: (box.centerX - REVIEW_SHARE_FRAME_PADDING) / REVIEW_SHARE_FRAME_INNER_WIDTH,
    y: (centerY - REVIEW_SHARE_FRAME_PADDING) / REVIEW_SHARE_FRAME_INNER_HEIGHT,
    w: box.width / REVIEW_SHARE_FRAME_INNER_WIDTH,
    h: height / REVIEW_SHARE_FRAME_INNER_HEIGHT,
  } as const
}

/**
 * 리뷰 공유 화면과 포토카드 편집기가 함께 쓰는 4:5 기반 가변 높이 레이아웃.
 * 리뷰 문장은 독립 텍스트 레이어, 아로마 프로파일은 읽기 전용 이미지 레이어로 전달한다.
 */
export function buildReviewPhotoCardLayout(
  content: ReviewPhotoCardContent,
  placement: ReviewShareImagePlacement,
  includeAroma: boolean,
  isEn = false,
  length: ReviewShareCardLength = 'AUTO',
): PhotoCardLayout {
  const portrait = placement === 'PORTRAIT'
  const metrics = reviewShareCardMetrics(content, placement, includeAroma, length)
  const y = (physical: number) => physical / metrics.totalHeightRatio
  const headerWidth = portrait ? 0.43 : 0.58
  const headerLeft = 0.06
  const headerCenter = headerLeft + headerWidth / 2
  const layers: PhotoCardLayer[] = [
    textLayer('review-name-ko', compact(content.spiritNameKo, 48), headerCenter, y(portrait ? 0.086 : 0.058), 0.05, '#153047', {
      fontKey: 'gowunBatangBold', binding: isEn ? 'SPIRIT_NAME_EN' : 'SPIRIT_NAME_KO', widthRatio: headerWidth,
      textAlign: 'LEFT',
    }),
    textLayer('review-name-en', compact(content.spiritNameEn, 58), headerCenter, y(portrait ? 0.147 : 0.105), 0.025, '#b47719', {
      fontKey: 'gowunBatang', binding: isEn ? 'SPIRIT_NAME_KO' : 'SPIRIT_NAME_EN', widthRatio: headerWidth,
      textAlign: 'LEFT',
    }),
    {
      ...divider('review-header-accent', y(portrait ? 0.198 : 0.14)),
      position: { x: headerLeft + 0.06, y: y(portrait ? 0.198 : 0.14) },
      widthRatio: 0.12,
      thicknessRatio: 0.0025,
      fill: '#d5b06a',
    },
    {
      ...divider('review-score-divider-top', y(portrait ? 0.223 : 0.045)),
      position: { x: portrait ? headerCenter : 0.82, y: y(portrait ? 0.223 : 0.045) },
      widthRatio: portrait ? headerWidth : 0.24,
    },
    textLayer('review-score-label', content.scoreLabel, portrait ? 0.1 : 0.74, y(portrait ? 0.278 : 0.085), portrait ? 0.019 : 0.017, '#b47719', {
      fontKey: 'gowunBatangBold', widthRatio: portrait ? 0.08 : 0.11, textAlign: 'LEFT', letterSpacing: 0.18,
    }),
    textLayer('review-total', content.total, portrait ? 0.215 : 0.86, y(portrait ? 0.278 : 0.085), portrait ? 0.039 : 0.036, '#153047', {
      fontKey: 'pretendardMedium', binding: 'REVIEW_TOTAL_SCORE', widthRatio: portrait ? 0.13 : 0.11,
      textAlign: 'LEFT',
    }),
    {
      ...divider('review-score-divider-bottom', y(portrait ? 0.318 : 0.125)),
      position: { x: portrait ? headerCenter : 0.82, y: y(portrait ? 0.318 : 0.125) },
      widthRatio: portrait ? headerWidth : 0.24,
    },
  ]

  const infoItems = portrait ? [
    { id: 'review-category', label: content.infoCategoryLabel, value: content.category, binding: 'SPIRIT_CATEGORY' as const, x: 0.16, width: 0.2, labelY: 0.36, valueY: 0.39, dividerY: 0.425 },
    { id: 'review-origin', label: content.infoOriginLabel, value: present(content.country, content.region), binding: 'SPIRIT_REGION' as const, x: 0.385, width: 0.205, labelY: 0.36, valueY: 0.39, dividerY: 0.425 },
    { id: 'review-abv', label: content.infoAbvLabel, value: content.abv, binding: 'SPIRIT_ABV' as const, x: 0.16, width: 0.2, labelY: 0.455, valueY: 0.485, dividerY: 0.52 },
    { id: 'review-detail', label: content.infoAgedLabel, value: content.detail, binding: 'SPIRIT_DETAIL' as const, x: 0.385, width: 0.205, labelY: 0.455, valueY: 0.485, dividerY: 0.52 },
    { id: 'review-producer', label: content.infoProducerLabel, value: content.producer, binding: (isEn ? 'PRODUCER_NAME_EN' : 'PRODUCER_NAME_KO') as 'PRODUCER_NAME_EN' | 'PRODUCER_NAME_KO', x: headerCenter, width: headerWidth, labelY: 0.55, valueY: 0.58, dividerY: 0.615 },
  ] : [
    { id: 'review-category', label: content.infoCategoryLabel, value: content.category, binding: 'SPIRIT_CATEGORY' as const, x: 0.14, width: 0.15, labelY: 0.61, valueY: 0.64, dividerY: 0.67 },
    { id: 'review-origin', label: content.infoOriginLabel, value: present(content.country, content.region), binding: 'SPIRIT_REGION' as const, x: 0.32, width: 0.15, labelY: 0.61, valueY: 0.64, dividerY: 0.67 },
    { id: 'review-abv', label: content.infoAbvLabel, value: content.abv, binding: 'SPIRIT_ABV' as const, x: 0.5, width: 0.15, labelY: 0.61, valueY: 0.64, dividerY: 0.67 },
    { id: 'review-detail', label: content.infoAgedLabel, value: content.detail, binding: 'SPIRIT_DETAIL' as const, x: 0.68, width: 0.15, labelY: 0.61, valueY: 0.64, dividerY: 0.67 },
    { id: 'review-producer', label: content.infoProducerLabel, value: content.producer, binding: (isEn ? 'PRODUCER_NAME_EN' : 'PRODUCER_NAME_KO') as 'PRODUCER_NAME_EN' | 'PRODUCER_NAME_KO', x: 0.86, width: 0.15, labelY: 0.61, valueY: 0.64, dividerY: 0.67 },
  ]
  infoItems.filter((item) => item.value).forEach((item) => {
    layers.push(
      textLayer(`${item.id}-label`, item.label, item.x, y(item.labelY), 0.014, '#b47719', {
        fontKey: 'pretendardBold', widthRatio: item.width, textAlign: 'LEFT', letterSpacing: 0.12,
      }),
      textLayer(item.id, compact(item.value, 36), item.x, y(item.valueY), 0.019, '#153047', {
        binding: item.binding, widthRatio: item.width, textAlign: 'LEFT',
      }),
      {
        ...divider(`${item.id}-divider`, y(item.dividerY)),
        position: { x: item.x, y: y(item.dividerY) },
        widthRatio: item.width,
      },
    )
  })

  let cursor = metrics.topEnd
  const notes = [
    { id: 'nose', label: content.noseLabel, score: content.nose, scoreBinding: 'REVIEW_NOSE_SCORE' as const, note: content.noseNote, noteBinding: 'REVIEW_NOSE_NOTE' as const },
    { id: 'taste', label: content.tasteLabel, score: content.taste, scoreBinding: 'REVIEW_TASTE_SCORE' as const, note: content.tasteNote, noteBinding: 'REVIEW_TASTE_NOTE' as const },
    { id: 'finish', label: content.finishLabel, score: content.finish, scoreBinding: 'REVIEW_FINISH_SCORE' as const, note: content.finishNote, noteBinding: 'REVIEW_FINISH_NOTE' as const },
  ].filter((item) => item.note)
  if (notes.length > 0) {
    const headingY = y(cursor + 0.02)
    layers.push(
      textLayer('review-tasting-title', content.tastingNotesTitle, 0.15, headingY, 0.017, '#b47719', {
        fontKey: 'gowunBatangBold', widthRatio: 0.18, textAlign: 'LEFT', letterSpacing: 0.12,
      }),
      {
        ...divider('review-divider-top', headingY),
        position: { x: 0.61, y: headingY },
        widthRatio: 0.65,
      },
    )
    cursor += 0.045
  } else {
    cursor += 0.02
  }
  notes.forEach((item, index) => {
    const textHeight = Math.max(0.042, metrics.noteLines[index] * metrics.noteSize * NOTE_LINE_HEIGHT)
    const rowHeight = textHeight + NOTE_ROW_PADDING_RATIO
    const center = y(cursor + rowHeight / 2)
    const labelY = y(cursor + 0.029)
    layers.push(
      textLayer(`review-label-${item.id}`, item.label, 0.105, labelY, 0.019, '#b47719', {
        fontKey: 'pretendardBold', widthRatio: 0.09, textAlign: 'LEFT',
      }),
      textLayer(`review-score-${item.id}`, item.score, 0.22, labelY, 0.025, '#153047', {
        fontKey: 'pretendardMedium', binding: item.scoreBinding, widthRatio: 0.1,
        textAlign: 'LEFT',
      }),
      textLayer(`review-note-${item.id}`, item.note, 0.61, center, metrics.noteSize, '#405464', {
        binding: item.noteBinding, widthRatio: NOTE_WIDTH_RATIO, lineHeight: NOTE_LINE_HEIGHT,
        textAlign: 'LEFT',
      }),
    )
    cursor += rowHeight
    if (index < notes.length - 1 || content.overall) {
      layers.push(divider(`review-divider-${item.id}`, y(cursor)))
    }
  })

  if (content.overall) {
    const overallTextHeight = Math.max(0.04, metrics.overallLines * metrics.overallSize * NOTE_LINE_HEIGHT)
    const overallHeight = overallTextHeight + OVERALL_ROW_PADDING_RATIO
    const center = y(cursor + overallHeight / 2)
    const labelY = y(cursor + 0.029)
    layers.push(
      textLayer('review-overall-title', content.overallTitle, 0.17, labelY, 0.019, '#b47719', {
        fontKey: 'pretendardBold', widthRatio: 0.22, textAlign: 'LEFT',
      }),
      textLayer('review-overall', content.overall, 0.61, center, metrics.overallSize, '#153047', {
        fontKey: 'pretendardMedium', binding: 'REVIEW_OVERALL', widthRatio: NOTE_WIDTH_RATIO,
        lineHeight: NOTE_LINE_HEIGHT, textAlign: 'LEFT',
      }),
    )
    cursor += overallHeight
    layers.push(divider('review-divider-overall', y(cursor)))
  }

  const aroma = includeAroma ? [
    { id: 'review-aroma-nose', source: 'REVIEW_AROMA_NOSE' as const, value: content.aromaNose },
    { id: 'review-aroma-taste', source: 'REVIEW_AROMA_TASTE' as const, value: content.aromaTaste },
    { id: 'review-aroma-finish', source: 'REVIEW_AROMA_FINISH' as const, value: content.aromaFinish },
  ].filter((item) => item.value) : []
  if (aroma.length > 0) {
    const aromaTitleHeight = 0.035
    layers.push(textLayer(
      'review-tasting-profile-title', content.tastingProfileTitle, 0.5, y(cursor + aromaTitleHeight / 2),
      0.014, '#b47719', { fontKey: 'gowunBatangBold', widthRatio: 0.5, letterSpacing: 0.12 },
    ))
    const xs = aroma.length === 1 ? [0.5] : aroma.length === 2 ? [0.32, 0.68] : [0.18, 0.5, 0.82]
    const width = aroma.length === 1 ? 0.34 : aroma.length === 2 ? 0.31 : 0.28
    aroma.forEach((item, index) => {
      layers.push(aromaImageLayer(
        item.id,
        item.source,
        xs[index],
        y(cursor + aromaTitleHeight + (metrics.aromaHeight - aromaTitleHeight) / 2),
        width,
      ))
    })
    cursor += metrics.aromaHeight
  }

  const footerDividerY = metrics.totalHeightRatio - 0.065
  layers.push(
    divider('review-divider-bottom', y(footerDividerY)),
    textLayer('review-home', content.home, 0.82, y(footerDividerY + 0.032), 0.013, '#153047', {
      fontKey: 'gowunBatangBold', widthRatio: 0.26, textAlign: 'RIGHT',
    }),
  )

  return normalizeLayout({
    schemaVersion: PHOTO_CARD_SCHEMA_VERSION,
    frame: {
      ratio: '4:5',
      backgroundColor: '#fafaf8',
      backgroundTexture: 'PAPER',
      radius: 0,
      padding: {
        top: REVIEW_SHARE_FRAME_PADDING,
        right: REVIEW_SHARE_FRAME_PADDING,
        bottom: REVIEW_SHARE_FRAME_PADDING,
        left: REVIEW_SHARE_FRAME_PADDING,
      },
      ...(metrics.extendBottom > 0 ? {
        extend: { top: 0, right: 0, bottom: metrics.extendBottom, left: 0 },
      } : {}),
      photo: reviewPhotoFrameOf(placement, metrics.aromaCount),
    },
    layers,
  })
}
