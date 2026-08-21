/**
 * 관리자 등록 시각을 기준으로 상세 화면의 기본 에디션을 고른다.
 *
 * 표시 순서는 관리자가 재정렬할 수 있으므로 최신 여부의 기준으로 사용하지 않는다.
 * 같은 시각에 일괄 등록된 에디션은 나중에 INSERT 된 더 큰 ID를 최신으로 본다.
 */
export function findLatestRegisteredVariant<T extends {
  id: number
  createdAt?: string | null
}>(variants: readonly T[]): T | null {
  return variants.reduce<T | null>((latest, candidate) => {
    if (!latest) return candidate

    const latestCreatedAt = latest.createdAt ?? ''
    const candidateCreatedAt = candidate.createdAt ?? ''
    if (candidateCreatedAt !== latestCreatedAt) {
      return candidateCreatedAt > latestCreatedAt ? candidate : latest
    }
    return candidate.id > latest.id ? candidate : latest
  }, null)
}
