import type { PhotoCardRatio, PhotoCardRatioPreset } from '../types/photoCard.types'

/** 비율 프리셋 — 카드 도구의 단추가 되는 값들. */
export const PHOTO_CARD_RATIOS: { value: PhotoCardRatioPreset; label: string; hintKey: string }[] = [
  { value: '1:1', label: '1:1', hintKey: 'photoCard.ratioSquare' },
  { value: '4:5', label: '4:5', hintKey: 'photoCard.ratioInstagram' },
  { value: '3:4', label: '3:4', hintKey: 'photoCard.ratioPortrait' },
  { value: '9:16', label: '9:16', hintKey: 'photoCard.ratioStory' },
  { value: '16:9', label: '16:9', hintKey: 'photoCard.ratioWide' },
]

/**
 * 비율의 상·하한 — 프리셋 바깥의 값(사진에 맞춤·직접 입력)도 이 사이여야 한다.
 * 백엔드 PhotoCardTemplateService 의 MIN/MAX_RATIO_VALUE 와 같아야 한다.
 *
 * 파노라마 사진을 그대로 받으면 짧은 변이 몇십 px 로 줄어 글자를 얹을 수 없고,
 * 내보내기도 한 변만 4096px 인 띠가 된다. 4:1 은 21:9 파노라마까지는 담는 폭이다.
 */
export const PHOTO_CARD_MIN_RATIO_VALUE = 0.25
export const PHOTO_CARD_MAX_RATIO_VALUE = 4
/** 비율 한 변의 최대 숫자. 백엔드 aspect_ratio 열(varchar 12)에 넉넉히 들어간다. */
export const PHOTO_CARD_MAX_RATIO_SIDE = 9999

/** 백엔드 RATIO_PATTERN 과 같아야 한다. */
const RATIO_PATTERN = /^([1-9]\d{0,3}):([1-9]\d{0,3})$/

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

const clampRatioValue = (value: number) =>
  clamp(value, PHOTO_CARD_MIN_RATIO_VALUE, PHOTO_CARD_MAX_RATIO_VALUE)

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b))

/** `가로:세로` 를 두 수로. 형식이 어긋나면 null — 옛 템플릿의 알 수 없는 값도 여기서 걸린다. */
export const parseRatio = (ratio: PhotoCardRatio): { width: number; height: number } | null => {
  const match = RATIO_PATTERN.exec(String(ratio).trim())
  return match ? { width: Number(match[1]), height: Number(match[2]) } : null
}

/**
 * 두 수를 비율 문자열로. 최대공약수로 줄여 4032×3024 가 `4:3` 으로 떨어진다 —
 * `1333:1000` 처럼 적혀 있으면 지금 카드가 어떤 비율인지 읽어 낼 수 없다.
 *
 * 상·하한을 벗어나거나 줄이고도 네 자리를 넘으면 짧은 변을 1000 으로 두고 다시 만든다.
 */
export const formatRatio = (width: number, height: number): PhotoCardRatio | null => {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null

  const aspect = width / height
  const clamped = clampRatioValue(aspect)
  let w = Math.round(width)
  let h = Math.round(height)

  const rebuild = () => {
    w = clamped >= 1 ? Math.round(1000 * clamped) : 1000
    h = clamped >= 1 ? 1000 : Math.round(1000 / clamped)
  }
  if (clamped !== aspect || w < 1 || h < 1) rebuild()

  const reduce = () => {
    const divisor = gcd(w, h) || 1
    w = Math.max(1, Math.round(w / divisor))
    h = Math.max(1, Math.round(h / divisor))
  }
  reduce()
  if (w > PHOTO_CARD_MAX_RATIO_SIDE || h > PHOTO_CARD_MAX_RATIO_SIDE) {
    rebuild()
    reduce()
  }
  return `${w}:${h}`
}

/** 비율 값(가로÷세로). 형식이 어긋나면 정사각으로 본다. */
export const ratioValue = (ratio: PhotoCardRatio): number => {
  const parsed = parseRatio(ratio)
  return parsed ? clampRatioValue(parsed.width / parsed.height) : 1
}

/**
 * 카드 크기를 px 로 <b>보여 줄 때</b>의 기준 짧은 변.
 *
 * 레이아웃은 전부 비율로 저장돼 실제 px 는 내보내기 크기(1350/2048/원본)마다 달라진다.
 * 그래서 "몇 px 늘릴지"를 말하려면 고정된 기준 하나가 필요하다 — 디자인 도구의 '설계 크기'와 같다.
 * 1080 은 인스타그램 기준 가로폭이라 4:5 가 1080×1350 처럼 익숙한 숫자로 떨어진다.
 */
export const PHOTO_CARD_DESIGN_SHORT_SIDE = 1080

/** 설계 크기 기준의 기준 프레임(확장 전) 크기. 카드 크기 입력이 px 로 보이는 근거다. */
export const designBaseSizeOf = (ratio: PhotoCardRatio): { width: number; height: number } => {
  const value = ratioValue(ratio)
  return value >= 1
    ? { width: Math.round(PHOTO_CARD_DESIGN_SHORT_SIDE * value), height: PHOTO_CARD_DESIGN_SHORT_SIDE }
    : { width: PHOTO_CARD_DESIGN_SHORT_SIDE, height: Math.round(PHOTO_CARD_DESIGN_SHORT_SIDE / value) }
}

/** 미리보기 캔버스의 긴 변. 화면에서는 CSS 로 줄여 보여 준다. */
export const PHOTO_CARD_MAX_EDGE = 2048

/**
 * '원본 화질' 로 뽑을 때의 절대 상한.
 * 모바일 브라우저는 이보다 큰 캔버스를 toBlob 하면 메모리 부족으로 탭이 죽는다.
 */
export const PHOTO_CARD_NATIVE_MAX_EDGE = 4096

/** 내보내기 크기 선택지 — value 가 null 이면 원본 화질(사진을 늘리지도 줄이지도 않는 크기) */
export const PHOTO_CARD_EXPORT_SIZES: { key: string; labelKey: string; maxEdge: number | null }[] = [
  { key: 'instagram', labelKey: 'photoCard.sizeInstagram', maxEdge: 1350 },
  { key: 'high', labelKey: 'photoCard.sizeHigh', maxEdge: 2048 },
  { key: 'native', labelKey: 'photoCard.sizeNative', maxEdge: null },
]
