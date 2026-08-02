/**
 * 꼬냑 등급·크뤼·오크 목록.
 *
 * 값과 순서의 단일 소스는 백엔드 enum(`CognacGrade`·`CognacCru`·`CognacOakType`)이다.
 * 라벨은 `spirit.cognacGrade.*` / `spirit.cognacCru.*` / `spirit.cognacOak.*` i18n 키를 쓴다 —
 * 관리자 등록 폼과 사용자 상세 페이지가 같은 정의를 공유해야 표기가 어긋나지 않는다.
 */

/** 등급 — 숙성 위계 순 (라벨 옆 연수 힌트는 폼에서만 노출) */
export const COGNAC_GRADES = ['VS', 'NAPOLEON', 'VSOP', 'XO', 'XXO', 'EXTRA', 'HORS_DAGE'] as const

/** 등급별 법정 최소 숙성연수 힌트. Extra 는 법정 기준이 없어 표시하지 않는다. */
export const COGNAC_GRADE_MIN_YEARS: Partial<Record<CognacGradeValue, string>> = {
  VS: '2년+', NAPOLEON: '6년+', VSOP: '4년+', XO: '10년+', XXO: '14년+', HORS_DAGE: '30년+',
}

/** 크뤼 — 꼬냑 AOC 법정 6개 구역. 백악질 비율이 높은(=상위) 순 */
export const COGNAC_CRUS = [
  'GRANDE_CHAMPAGNE', 'PETITE_CHAMPAGNE', 'BORDERIES',
  'FINS_BOIS', 'BONS_BOIS', 'BOIS_ORDINAIRES',
] as const

/** 숙성에 쓰는 프렌치 오크 숲 — 사용 빈도 순 */
export const COGNAC_OAK_TYPES = [
  'LIMOUSIN', 'TRONCAIS', 'ALLIER', 'NEVERS', 'VOSGES',
  'JUPILLES', 'BERTRANGES', 'FRENCH_OAK', 'OTHER',
] as const

export type CognacGradeValue = (typeof COGNAC_GRADES)[number]
export type CognacCruValue = (typeof COGNAC_CRUS)[number]
export type CognacOakTypeValue = (typeof COGNAC_OAK_TYPES)[number]

/**
 * 크뤼 구성이 싱글 크뤼인지 여부.
 *
 * <p>꼬냑은 여러 크뤼를 섞는 아상블라주가 기본값이라 "블렌드"는 별도 필드로 두지 않고
 * 구성 개수에서 파생한다 — 1개면 싱글 크뤼, 2개 이상이면 멀티 크뤼 블렌드.
 */
export function isSingleCru(composition: { cru: string }[] | null | undefined): boolean {
  return !!composition && composition.length === 1
}
