import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { bannerApi } from '../api/bannerApi'
import type {
  BannerLanguage,
  CreateBannerPayload,
  UpdateBannerPayload,
} from '../types/banner.types'

const QUERY_KEY = 'adminBanners'

export function useAdminBannerList(params: {
  language?: BannerLanguage
  page?: number
  size?: number
}) {
  return useQuery({
    queryKey: [QUERY_KEY, params],
    queryFn: () => bannerApi.getAdminBanners(params).then((r) => r.data.data!),
  })
}

export function useAdminBannerDetail(id: number | null) {
  return useQuery({
    queryKey: [QUERY_KEY, 'detail', id],
    queryFn: () => bannerApi.getAdminBannerDetail(id!).then((r) => r.data.data!),
    enabled: id != null,
  })
}

export function useCreateBanner() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateBannerPayload) =>
      bannerApi.createBanner(data).then((r) => r.data.data!),
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }),
  })
}

export function useUpdateBanner() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateBannerPayload }) =>
      bannerApi.updateBanner(id, data).then((r) => r.data.data!),
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }),
  })
}

export function useDeleteBanner() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => bannerApi.deleteBanner(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }),
  })
}

export function useUpdateBannerVisibility() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, isVisible }: { id: number; isVisible: boolean }) =>
      bannerApi.updateVisibility(id, isVisible),
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }),
  })
}

export function useUpdateBannerSortOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, sortOrder }: { id: number; sortOrder: number }) =>
      bannerApi.updateSortOrder(id, sortOrder),
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }),
  })
}
