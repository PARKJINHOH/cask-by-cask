/**
 * 주류 수치 데이터의 허용 범위 — 폼 입력 속성과 검증이 참조하는 단일 소스.
 *
 * 백엔드 `SpiritLimits.java` 와 값을 일치시켜야 한다. 한쪽만 바꾸면
 * "화면에서는 통과했는데 저장 시 400" 또는 그 반대가 발생한다.
 * `npm run test:spirit-limits` 가 두 값이 어긋나지 않는지 검증한다.
 */

/** 도수(%) — 물리적으로 100%를 넘을 수 없다 */
export const ABV_MIN = 0
export const ABV_MAX = 100

/**
 * 용량(ml).
 *
 * 상한 30,000ml = 30L 은 실제 유통되는 가장 큰 병 포맷(Midas·Melchizedek)을 담는 값이다.
 * 이전 상한 100,000ml(100L)는 존재하지 않는 값이라 오타를 걸러내지 못했다.
 */
export const VOLUME_ML_MIN = 1
export const VOLUME_ML_MAX = 30_000

/** 연도 — 빈티지·병입 등 */
export const YEAR_MIN = 1800
export const YEAR_MAX = 2100

/**
 * 실제 유통되는 병 규격(ml).
 *
 * 여기 없는 값도 저장은 되지만(640·720ml 처럼 실존하는 비표준 규격이 있다)
 * 폼에서 "오타 아닌가요?" 힌트를 띄우는 기준으로 쓴다.
 * 실제로 696ml(700 오타)·45ml(450 오타)이 등록된 적이 있다.
 */
export const STANDARD_VOLUMES_ML = [
  20, 30, 40, 50, 100, 180, 187, 200, 250, 300, 330, 350, 355, 375, 400,
  450, 500, 550, 570, 600, 620, 640, 660, 665, 700, 710, 720, 730, 750,
  800, 900, 946, 1000, 1125, 1500, 1750, 1800, 2000, 3000, 4500, 6000,
  9000, 12000, 15000, 18000, 27000, 30000,
] as const

/**
 * 비표준 용량이면 의도했을 가능성이 높은 표준 규격을 돌려준다 (아니면 null).
 *
 * 자릿수 실수(`45` → `450`)가 가장 흔한 오타라 ×10·÷10 후보를 먼저 확인하고,
 * 없으면 절대 거리가 가장 가까운 표준 규격을 제안한다.
 * 실제 사례: `45` → `450`(자릿수 누락), `696` → `700`(인접 오타).
 */
export function suspiciousVolume(value: string | number | null | undefined): number | null {
  const ml = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(ml) || ml <= 0) return null
  const standards: readonly number[] = STANDARD_VOLUMES_ML
  if (standards.includes(ml)) return null

  // ① 자릿수 실수 우선
  for (const candidate of [ml * 10, ml / 10]) {
    if (Number.isInteger(candidate) && standards.includes(candidate)) return candidate
  }

  // ② 인접 오타 — 가장 가까운 표준 규격
  let nearest = standards[0]
  for (const v of standards) {
    if (Math.abs(v - ml) < Math.abs(nearest - ml)) nearest = v
  }
  return nearest
}

/**
 * 증류주(위스키·꼬냑)의 통상 도수 하한.
 *
 * 스카치·꼬냑은 법정 최저 40%다. 그보다 훨씬 낮으면 `4.6` ↔ `46` 같은 오타일 가능성이 높다.
 * 리큐르·전통주는 낮은 도수가 정상이므로 위스키·꼬냑에만 적용한다.
 */
export const SPIRIT_ABV_TYPICAL_MIN = 20

/** 카테고리 기준으로 도수가 의심스러운지 (저장은 막지 않는다) */
export function suspiciousAbv(
  value: string | number | null | undefined,
  category: string | null | undefined,
): boolean {
  if (category !== 'WHISKY' && category !== 'COGNAC') return false
  const abv = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(abv) || abv <= 0) return false
  return abv < SPIRIT_ABV_TYPICAL_MIN
}

/** 검증 메시지 — 폼 여러 곳에서 같은 문구를 쓰도록 모아 둔다 */
export const LIMIT_MESSAGE = {
  abv: `도수는 ${ABV_MIN}~${ABV_MAX} 사이여야 합니다.`,
  volumeMl: `용량은 ${VOLUME_ML_MIN}~${VOLUME_ML_MAX.toLocaleString('ko-KR')} 사이여야 합니다.`,
  year: `연도는 ${YEAR_MIN}~${YEAR_MAX} 사이여야 합니다.`,
} as const
