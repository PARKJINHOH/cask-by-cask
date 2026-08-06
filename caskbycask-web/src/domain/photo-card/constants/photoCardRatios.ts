import type { PhotoCardRatio } from '../types/photoCard.types'

/** 프레임 비율 — 백엔드 PhotoCardTemplateService.RATIOS 와 같아야 한다. */
export const PHOTO_CARD_RATIOS: { value: PhotoCardRatio; label: string; hintKey: string }[] = [
  { value: '1:1', label: '1:1', hintKey: 'photoCard.ratioSquare' },
  { value: '4:5', label: '4:5', hintKey: 'photoCard.ratioInstagram' },
  { value: '3:4', label: '3:4', hintKey: 'photoCard.ratioPortrait' },
  { value: '9:16', label: '9:16', hintKey: 'photoCard.ratioStory' },
  { value: '16:9', label: '16:9', hintKey: 'photoCard.ratioWide' },
]

const RATIO_VALUES: Record<PhotoCardRatio, number> = {
  '1:1': 1,
  '4:5': 4 / 5,
  '3:4': 3 / 4,
  '9:16': 9 / 16,
  '16:9': 16 / 9,
}

export const ratioValue = (ratio: PhotoCardRatio): number => RATIO_VALUES[ratio] ?? 1

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
