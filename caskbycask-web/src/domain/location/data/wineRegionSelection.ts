/**
 * 와인 산지 선택 상태 도출 — 순수 로직.
 *
 * 산지 코드 하나(L1 또는 L2)만 저장하므로, 2단 선택기의 표시 상태는 항상 이 코드에서
 * 역산해야 한다. 그 계산을 컴포넌트 밖으로 빼서 단위 테스트가 가능하게 한다.
 *
 * 백엔드 `WineRegion` enum 이 이름·계층의 단일 소스이며, 여기서는 그 구조만 다룬다.
 */

/** 카탈로그 노드 — 백엔드 WineRegionResponse 와 같은 형태 */
export interface RegionNode {
  code: string
  countryCode: string
  nameKo: string
  nameEn: string
  parentCode: string | null
  children: RegionNode[]
}

export interface RegionCountry {
  countryCode: string
  regions: RegionNode[]
}

/** 선택기 표시에 필요한 도출 상태 */
export interface RegionSelection {
  /** L1 select 의 value — 미선택이면 '' */
  l1Code: string
  /** L2 select 의 value — L1 만 선택됐으면 '' */
  l2Code: string
  /** 선택된 L1 노드 */
  l1: RegionNode | undefined
  /** L1 의 하위 L2 목록 — 비어 있으면 L2 select 를 숨긴다 */
  subRegions: RegionNode[]
}

/** 카탈로그를 코드 → 노드 맵으로 평탄화 (L1·L2 모두 포함) */
export function indexRegionsByCode(countries: RegionCountry[]): Map<string, RegionNode> {
  const byCode = new Map<string, RegionNode>()
  for (const country of countries) {
    for (const l1 of country.regions) {
      byCode.set(l1.code, l1)
      for (const l2 of l1.children ?? []) byCode.set(l2.code, l2)
    }
  }
  return byCode
}

/**
 * 저장된 산지 코드에서 2단 선택기의 표시 상태를 도출한다.
 *
 * - 코드가 L2 면 부모가 L1 이고 L2 select 에 그 코드가 선택된다
 * - 코드가 L1 이면 L1 만 선택되고 L2 는 '전체'(빈 값)가 된다
 * - 코드가 없거나 카탈로그에 없으면 아무것도 선택되지 않는다
 */
export function resolveRegionSelection(
  regionCode: string | null | undefined,
  byCode: Map<string, RegionNode>,
): RegionSelection {
  const selected = regionCode ? byCode.get(regionCode) : undefined
  if (!selected) {
    return { l1Code: '', l2Code: '', l1: undefined, subRegions: [] }
  }
  const l1Code = selected.parentCode ?? selected.code
  const l1 = byCode.get(l1Code)
  return {
    l1Code,
    l2Code: selected.parentCode ? selected.code : '',
    l1,
    subRegions: l1?.children ?? [],
  }
}

/** 산지 코드의 L1 노드 (L1 이면 자신) — region 텍스트 동기화 기준 */
export function topLevelOf(
  regionCode: string | null | undefined,
  byCode: Map<string, RegionNode>,
): RegionNode | undefined {
  const node = regionCode ? byCode.get(regionCode) : undefined
  if (!node) return undefined
  return node.parentCode ? byCode.get(node.parentCode) : node
}

/**
 * L2 select 변경 결과 코드를 계산한다.
 * '전체'(빈 값)를 고르면 L1 만 남겨 확대 지도를 생략한다.
 */
export function resolveL2Change(nextL2Code: string, l1Code: string): string | null {
  return nextL2Code || l1Code || null
}
