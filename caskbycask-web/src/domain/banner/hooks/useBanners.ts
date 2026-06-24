import { useQuery } from '@tanstack/react-query'
import { bannerApi } from '../api/bannerApi'
import type { BannerLanguage, BannerPosition } from '../types/banner.types'

export function useBanners(language: BannerLanguage, position: BannerPosition = 'MAIN') {
  return useQuery({
    queryKey: ['banners', language, position],
    queryFn: () =>
      bannerApi.getBanners(language, position).then((r) => r.data.data ?? []),
    staleTime: 60_000,  // 60초 — 탭 복귀 시 관리자 변경사항 빠르게 반영
    retry: false,
  })
}
