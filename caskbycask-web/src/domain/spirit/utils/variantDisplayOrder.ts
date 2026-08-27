/** 에디션 정렬·선택에 필요한 최소 필드. */
type VariantDisplayOrderSource = {
  id: number
  displayOrder?: number | null
}

/**
 * 에디션 목록 표시 순서 비교자.
 *
 * displayOrder 오름차순, 미지정(null)은 맨 뒤, 동률이면 id 오름차순.
 * 서버의 `SpiritRepository.findByParentId` (`COALESCE(displayOrder, 999999) ASC, id ASC`) 와 같은 규칙이라
 * 화면 목록과 API 가 고르는 대표 에디션이 어긋나지 않는다.
 */
export function compareVariantDisplayOrder<T extends VariantDisplayOrderSource>(a: T, b: T) {
  const orderA = a.displayOrder ?? Number.MAX_SAFE_INTEGER
  const orderB = b.displayOrder ?? Number.MAX_SAFE_INTEGER
  if (orderA !== orderB) return orderA - orderB
  return a.id - b.id
}

/**
 * 상세 화면의 기본 에디션 — 목록에 보이는 순서의 마지막 항목.
 *
 * 등록 시각이 아니라 관리자가 정렬한 표시 순서를 따른다. 누락된 옛 에디션을 뒤늦게 추가해도
 * 목록 마지막(보통 최신 릴리즈)이 그대로 기본값으로 남는다.
 */
export function findLastDisplayedVariant<T extends VariantDisplayOrderSource>(
  variants: readonly T[],
): T | null {
  return variants.reduce<T | null>(
    (last, candidate) =>
      last === null || compareVariantDisplayOrder(candidate, last) > 0 ? candidate : last,
    null,
  )
}
