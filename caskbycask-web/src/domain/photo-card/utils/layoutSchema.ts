import { TEXT_FONT_OPTIONS } from '@/shared/components/imageEditorText'
import { PHOTO_CARD_ICON_KEYS } from '../constants/photoCardIcons'
import type {
  PhotoCardBinding,
  PhotoCardImageSource,
  PhotoCardLayer,
  PhotoCardLayerType,
  PhotoCardLayout,
  PhotoCardRatio,
} from '../types/photoCard.types'

/**
 * 프론트 검증·정규화. 백엔드 `PhotoCardTemplateService` 의 상한과 같은 값을 쓴다.
 * 서버가 최종 관문이지만, 여기서 먼저 맞춰 두면 저장 버튼을 누른 뒤에야 400 을 보는 일이 없다.
 */
export const PHOTO_CARD_SCHEMA_VERSION = 1
export const PHOTO_CARD_MAX_LAYERS = 24
/** 리뷰 전문처럼 긴 글도 카드 한 장에 담을 수 있는 길이. 백엔드 MAX_TEXT_LENGTH 와 같아야 한다. */
export const PHOTO_CARD_MAX_TEXT_LENGTH = 600
export const PHOTO_CARD_MAX_TEMPLATES = 30
export const PHOTO_CARD_MIN_FONT_SIZE_RATIO = 0.005
export const PHOTO_CARD_MAX_FONT_SIZE_RATIO = 0.3
/**
 * 한 변에 더할 수 있는 최대 확장 — 기준 프레임 짧은 변 대비.
 * 1 이면 사방으로 짧은 변만큼씩, 즉 카드가 최대 3배까지 커진다. 그 이상은 사진이 점만 해진다.
 */
export const PHOTO_CARD_MAX_EXTEND = 1

export const PHOTO_CARD_LAYER_TYPES: PhotoCardLayerType[] = ['TEXT', 'IMAGE', 'DIVIDER', 'BOX', 'ICON']
export const PHOTO_CARD_IMAGE_SOURCES: PhotoCardImageSource[] = ['PRODUCER_LOGO', 'SPIRIT_IMAGE', 'UPLOAD']

/** 백엔드 `PhotoCardBinding` enum 과 같아야 한다. GPS 항목은 의도적으로 없다. */
export const PHOTO_CARD_BINDINGS: PhotoCardBinding[] = [
  'NONE',
  'EXIF_CAMERA', 'EXIF_LENS', 'EXIF_APERTURE', 'EXIF_SHUTTER',
  'EXIF_ISO', 'EXIF_FOCAL_LENGTH', 'EXIF_FOCAL_LENGTH_35', 'EXIF_SHOT_AT', 'EXIF_GPS',
  'SPIRIT_NAME_KO', 'SPIRIT_NAME_EN', 'SPIRIT_ABV', 'SPIRIT_VOLUME',
  'SPIRIT_VINTAGE', 'SPIRIT_CATEGORY',
  'PRODUCER_NAME_KO', 'PRODUCER_NAME_EN', 'PRODUCER_COUNTRY',
  'USER_PLACE', 'USER_MEMO', 'USER_DATE',
]

const FONT_KEYS = new Set(TEXT_FONT_OPTIONS.map((font) => font.key))
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/
const HEX_COLOR_ALPHA = /^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value))

const ratio = (value: number | undefined, fallback: number, min: number, max: number): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  return clamp(value, min, max)
}

const color = (value: string | undefined | null, fallback: string, allowAlpha = false): string => {
  if (!value) return fallback
  return (allowAlpha ? HEX_COLOR_ALPHA : HEX_COLOR).test(value) ? value : fallback
}

export const createLayerId = (): string =>
  `pcl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

/**
 * 저장 직전 정규화. 서버에 보내는 것은 언제나 이 결과다.
 * 범위를 벗어난 값은 던지지 않고 잘라 낸다 — 편집 중 슬라이더 값이 잠깐 어긋났다고
 * 저장을 막을 이유는 없다. 서버는 같은 규칙으로 한 번 더 검증한다.
 */
export const normalizeLayer = (layer: PhotoCardLayer): PhotoCardLayer => {
  const base = {
    id: layer.id || createLayerId(),
    type: layer.type,
    position: {
      x: ratio(layer.position?.x, 0.5, 0, 1),
      y: ratio(layer.position?.y, 0.5, 0, 1),
    },
    rotation: ratio(layer.rotation, 0, -180, 180),
    visible: layer.visible !== false,
  }

  switch (layer.type) {
    case 'TEXT':
      return {
        ...base,
        binding: layer.binding ?? 'NONE',
        overridden: Boolean(layer.overridden),
        text: (layer.text ?? '').slice(0, PHOTO_CARD_MAX_TEXT_LENGTH),
        fontKey: FONT_KEYS.has((layer.fontKey ?? '') as never) ? layer.fontKey : 'pretendardBold',
        fontSizeRatio: ratio(layer.fontSizeRatio, 0.04,
          PHOTO_CARD_MIN_FONT_SIZE_RATIO, PHOTO_CARD_MAX_FONT_SIZE_RATIO),
        color: color(layer.color, '#ffffff'),
        outlineEnabled: Boolean(layer.outlineEnabled),
        outlineColor: color(layer.outlineColor, '#000000'),
        outlineWidthRatio: ratio(layer.outlineWidthRatio, 0, 0, 0.05),
        // 자간·행간은 값이 없으면 undefined 로 남긴다 — 직렬화에서 빠져 기존 템플릿 JSON 이 커지지 않는다.
        // 범위는 백엔드 normalizeTextLayer 의 clamp 와 같다.
        letterSpacing: layer.letterSpacing != null ? ratio(layer.letterSpacing, 0, -0.5, 1) : undefined,
        lineHeight: layer.lineHeight != null ? ratio(layer.lineHeight, 1.25, 0.5, 3) : undefined,
      }
    case 'IMAGE':
      return {
        ...base,
        source: PHOTO_CARD_IMAGE_SOURCES.includes(layer.source as PhotoCardImageSource)
          ? layer.source : 'UPLOAD',
        uploadUrl: layer.source === 'UPLOAD' ? (layer.uploadUrl ?? null) : null,
        opacity: ratio(layer.opacity, 1, 0, 1),
        widthRatio: ratio(layer.widthRatio, 0.15, 0.01, 1),
      }
    case 'ICON':
      return {
        ...base,
        iconKey: PHOTO_CARD_ICON_KEYS.includes(layer.iconKey ?? '') ? layer.iconKey : PHOTO_CARD_ICON_KEYS[0],
        widthRatio: ratio(layer.widthRatio, 0.06, 0.005, 0.5),
        fill: color(layer.fill, '#111111', true),
        opacity: ratio(layer.opacity, 1, 0, 1),
      }
    case 'DIVIDER':
      return {
        ...base,
        widthRatio: ratio(layer.widthRatio, 0.8, 0.01, 1),
        thicknessRatio: ratio(layer.thicknessRatio, 0.002, 0.0005, 0.05),
        fill: color(layer.fill, '#dddddd', true),
      }
    default:
      return {
        ...base,
        type: 'BOX',
        opacity: ratio(layer.opacity, 1, 0, 1),
        widthRatio: ratio(layer.widthRatio, 0.5, 0.01, 1),
        heightRatio: ratio(layer.heightRatio, 0.2, 0.01, 1),
        radius: ratio(layer.radius, 0, 0, 0.5),
        fill: color(layer.fill, '#00000080', true),
        strokeColor: layer.strokeColor ? color(layer.strokeColor, '#000000', true) : null,
        strokeWidthRatio: ratio(layer.strokeWidthRatio, 0, 0, 0.05),
      }
  }
}

export const normalizeLayout = (layout: PhotoCardLayout): PhotoCardLayout => {
  const padding = layout.frame?.padding ?? { top: 0, right: 0, bottom: 0, left: 0 }
  const photo = layout.frame?.photo ?? { fit: 'COVER' as const, radius: 0, x: 0.5, y: 0.5, w: 1, h: 1 }
  const extend = layout.frame?.extend
  const safeExtend = {
    top: ratio(extend?.top, 0, 0, PHOTO_CARD_MAX_EXTEND),
    right: ratio(extend?.right, 0, 0, PHOTO_CARD_MAX_EXTEND),
    bottom: ratio(extend?.bottom, 0, 0, PHOTO_CARD_MAX_EXTEND),
    left: ratio(extend?.left, 0, 0, PHOTO_CARD_MAX_EXTEND),
  }
  // 늘리지 않은 카드는 필드를 아예 남기지 않는다 — 기존 템플릿 JSON 이 그대로 유지된다.
  const extended = Object.values(safeExtend).some((value) => value > 0)
  return {
    // 서버가 어차피 자기 상수로 덮어쓴다. 여기서도 클라이언트 값을 넘겨받지 않는다.
    schemaVersion: PHOTO_CARD_SCHEMA_VERSION,
    frame: {
      ratio: (layout.frame?.ratio ?? '4:5') as PhotoCardRatio,
      backgroundColor: color(layout.frame?.backgroundColor, '#ffffff'),
      radius: ratio(layout.frame?.radius, 0, 0, 0.5),
      padding: {
        top: ratio(padding.top, 0, 0, 0.5),
        right: ratio(padding.right, 0, 0, 0.5),
        bottom: ratio(padding.bottom, 0, 0, 0.5),
        left: ratio(padding.left, 0, 0, 0.5),
      },
      ...(extended ? { extend: safeExtend } : {}),
      photo: {
        fit: photo.fit === 'CONTAIN' ? 'CONTAIN' : 'COVER',
        radius: ratio(photo.radius, 0, 0, 0.5),
        x: ratio(photo.x, 0.5, 0, 1),
        y: ratio(photo.y, 0.5, 0, 1),
        w: ratio(photo.w, 1, 0.01, 1),
        h: ratio(photo.h, 1, 0.01, 1),
      },
    },
    layers: (layout.layers ?? []).slice(0, PHOTO_CARD_MAX_LAYERS).map(normalizeLayer),
  }
}
