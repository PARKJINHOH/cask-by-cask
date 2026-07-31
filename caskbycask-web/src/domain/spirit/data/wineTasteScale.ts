/**
 * 와인 맛(관능) 지표 5단계 척도.
 *
 * 값과 순서의 단일 소스는 백엔드 enum(`WineSweetness`·`WineBody`·`WineIntensity`)이다.
 * 여기서는 그 순서를 UI 가 쓸 수 있게 배열로 옮겨 두며,
 * `npm run test:wine-taste` 가 백엔드 enum 과 어긋나지 않는지 검증한다.
 */

export const WINE_TASTE_MAX_LEVEL = 5

/** 당도 — 낮은 단계부터 */
export const WINE_SWEETNESS_SCALE = ['DRY', 'OFF_DRY', 'MEDIUM', 'MEDIUM_SWEET', 'SWEET'] as const
/** 바디 — 낮은 단계부터 */
export const WINE_BODY_SCALE = ['LIGHT', 'LIGHT_MEDIUM', 'MEDIUM', 'MEDIUM_FULL', 'FULL'] as const
/** 산도·타닌 공통 — 낮은 단계부터 */
export const WINE_INTENSITY_SCALE = ['LOW', 'LOW_MEDIUM', 'MEDIUM', 'MEDIUM_HIGH', 'HIGH'] as const

export type WineSweetnessValue = (typeof WINE_SWEETNESS_SCALE)[number]
export type WineBodyValue = (typeof WINE_BODY_SCALE)[number]
export type WineIntensityValue = (typeof WINE_INTENSITY_SCALE)[number]

/** 맛 지표 축 정의 — 관리자 입력과 사용자 표시가 같은 정의를 공유한다 */
export interface TasteAxis {
  /** 상세/폼에서 쓰는 키 */
  key: 'sweetness' | 'body' | 'acidity' | 'tannin'
  /** i18n 라벨 키 */
  labelKey: string
  /** 값 → 라벨 i18n 네임스페이스 */
  valueNs: string
  /** 낮은 단계 → 높은 단계 */
  scale: readonly string[]
}

export const WINE_TASTE_AXES: readonly TasteAxis[] = [
  { key: 'sweetness', labelKey: 'spirit.taste.sweetness', valueNs: 'spirit.wineSweetness', scale: WINE_SWEETNESS_SCALE },
  { key: 'body', labelKey: 'spirit.taste.body', valueNs: 'spirit.wineBody', scale: WINE_BODY_SCALE },
  { key: 'acidity', labelKey: 'spirit.taste.acidity', valueNs: 'spirit.wineIntensity', scale: WINE_INTENSITY_SCALE },
  { key: 'tannin', labelKey: 'spirit.taste.tannin', valueNs: 'spirit.wineIntensity', scale: WINE_INTENSITY_SCALE },
]

/**
 * 값의 단계(1~5) — 값이 없거나 척도에 없으면 0(미지정).
 * 3단계 시절 값(LOW/MEDIUM/HIGH 등)도 그대로 척도에 남아 있어 계속 올바른 단계로 해석된다.
 */
export function tasteLevel(scale: readonly string[], value: string | null | undefined): number {
  if (!value) return 0
  const index = scale.indexOf(value)
  return index < 0 ? 0 : index + 1
}
