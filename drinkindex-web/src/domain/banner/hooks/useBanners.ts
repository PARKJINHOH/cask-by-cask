import { useQuery } from '@tanstack/react-query'
import { bannerApi } from '../api/bannerApi'
import type { BannerLanguage } from '../types/banner.types'

export function useBanners(language: BannerLanguage) {
  return useQuery({
    queryKey: ['banners', language],
    queryFn: () =>
      bannerApi.getBanners(language).then((r) => r.data.data ?? []),
    staleTime: 5 * 60 * 1000,
    retry: false,
  })
}
