import axiosInstance from '@/shared/api/axiosInstance'
import type { ApiResponse } from '@/shared/types/common.types'
import type { SpiritCategory, WineRegionCountry } from '@/domain/spirit/types/spirit.types'

/**
 * 산지 카탈로그 API (와인·위스키).
 *
 * 산지 이름·계층·코드는 백엔드 `WineRegion` enum 이 단일 소스다.
 * 배포 없이는 변하지 않는 참조 데이터이므로 조회 결과를 장기 캐싱해도 안전하다.
 * 경로는 역사적으로 `/api/wine-regions` 이며 `category` 로 카테고리를 고른다
 * (미지정 시 백엔드가 와인만 반환한다).
 */
export const wineRegionApi = {
  /** 국가별 L1 대산지 목록 (각 L1 의 children 에 L2 세부산지) */
  getCatalog: (category: SpiritCategory = 'WINE') =>
    axiosInstance.get<ApiResponse<WineRegionCountry[]>>('/api/wine-regions', {
      params: { category },
    }),
}
