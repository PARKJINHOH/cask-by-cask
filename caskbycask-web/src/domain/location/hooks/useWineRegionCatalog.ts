import { useQuery } from '@tanstack/react-query'
import { wineRegionApi } from '@/domain/location/api/wineRegionApi'
import { indexRegionsByCode } from '@/domain/location/data/wineRegionSelection'
import type { RegionCountry, RegionNode } from '@/domain/location/data/wineRegionSelection'
import type { SpiritCategory } from '@/domain/spirit/types/spirit.types'

const EMPTY_COUNTRIES: RegionCountry[] = []
const EMPTY_NODES: RegionNode[] = []

/**
 * 산지 카탈로그를 쓰는 카테고리 — 그 외 카테고리는 기존 텍스트 지역 목록을 그대로 쓴다.
 *
 * `OTHER` 는 브랜디(아르마냑·칼바도스)와 전통주(한국 시도)가 카탈로그에 있어 포함한다.
 * 카탈로그에 없는 국가(멕시코 테킬라 등)는 `isSupportedCountry` 판정으로 자동 폴백된다.
 */
export const REGION_CATALOG_CATEGORIES: SpiritCategory[] = ['WINE', 'WHISKY', 'COGNAC', 'OTHER']

/**
 * 산지 카탈로그 조회 (와인·위스키).
 *
 * 배포 없이는 변하지 않는 참조 데이터라 `staleTime: Infinity` 로 세션당 1회만 받는다.
 * 관리자 선택기와 사용자 산지 지도가 같은 캐시를 공유한다.
 * 카테고리별로 목록이 다르므로(미국은 와인=캘리포니아 / 위스키=켄터키) 캐시 키에 카테고리를 포함한다.
 */
export function useWineRegionCatalog(enabled = true, category: SpiritCategory = 'WINE') {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['wine-regions', category],
    queryFn: () => wineRegionApi.getCatalog(category).then((r) => r.data.data ?? EMPTY_COUNTRIES),
    enabled,
    staleTime: Infinity,
    gcTime: Infinity,
  })

  const countries = data ?? EMPTY_COUNTRIES

  return {
    countries,
    /** 코드 → 노드 (L1·L2 모두) */
    byCode: indexRegionsByCode(countries),
    /** 해당 국가의 L1 목록 — 지원하지 않는 국가는 빈 배열 */
    topLevelsOf: (countryCode: string | null | undefined): RegionNode[] =>
      countries.find((c) => c.countryCode === countryCode)?.regions ?? EMPTY_NODES,
    /** 카탈로그가 산지 지도를 지원하는 국가인지 */
    isSupportedCountry: (countryCode: string | null | undefined) =>
      !!countryCode && countries.some((c) => c.countryCode === countryCode),
    isLoading,
    isError,
  }
}
