import axiosInstance from '@/shared/api/axiosInstance'
import type { ApiResponse, PageResponse } from '@/shared/types/common.types'
import type {
  BannerResponse,
  AdminBannerListItem,
  AdminBannerDetail,
  CreateBannerPayload,
  UpdateBannerPayload,
  UploadedBannerImage,
  BannerLanguage,
  BannerImageType,
  BannerPosition,
} from '../types/banner.types'

export const bannerApi = {
  // ── 공개 ──────────────────────────────────────────────────
  getBanners: (language: BannerLanguage, position: BannerPosition = 'MAIN') =>
    axiosInstance.get<ApiResponse<BannerResponse[]>>('/api/banners', {
      params: { language, position },
    }),

  // ── 관리자 ────────────────────────────────────────────────
  getAdminBanners: (params: {
    language?: BannerLanguage
    position?: BannerPosition
    isVisible?: boolean
    page?: number
    size?: number
  }) =>
    axiosInstance.get<ApiResponse<PageResponse<AdminBannerListItem>>>('/api/admin/banners', { params }),

  getAdminBannerDetail: (id: number) =>
    axiosInstance.get<ApiResponse<AdminBannerDetail>>(`/api/admin/banners/${id}`),

  createBanner: (data: CreateBannerPayload) =>
    axiosInstance.post<ApiResponse<AdminBannerDetail>>('/api/admin/banners', data),

  updateBanner: (id: number, data: UpdateBannerPayload) =>
    axiosInstance.patch<ApiResponse<AdminBannerDetail>>(`/api/admin/banners/${id}`, data),

  deleteBanner: (id: number) =>
    axiosInstance.delete<ApiResponse<null>>(`/api/admin/banners/${id}`),

  updateVisibility: (id: number, isVisible: boolean) =>
    axiosInstance.patch<ApiResponse<null>>(`/api/admin/banners/${id}/visibility`, { isVisible }),

  updateSortOrder: (id: number, sortOrder: number) =>
    axiosInstance.patch<ApiResponse<null>>(`/api/admin/banners/${id}/sort-order`, { sortOrder }),

  uploadBannerImage: (file: File, imageType: BannerImageType, onProgress?: (percent: number) => void) => {
    const form = new FormData()
    form.append('image', file)
    form.append('imageType', imageType)
    return axiosInstance.post<ApiResponse<UploadedBannerImage>>(
      '/api/admin/banners/images',
      form,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100))
        },
      },
    )
  },

  deleteBannerImage: (imageId: number) =>
    axiosInstance.delete<ApiResponse<null>>(`/api/admin/banners/images/${imageId}`),
}
