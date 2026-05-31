import axiosInstance from '@/shared/api/axiosInstance'
import type { ApiResponse } from '@/shared/types/common.types'
import type {
  FaqGroup,
  AdminFaqListItem,
  AdminFaqDetail,
  CreateFaqPayload,
  UpdateFaqPayload,
  FaqLanguage,
} from '../types/faq.types'

export const faqApi = {
  // ── 공개 ──────────────────────────────────────────────────
  getPublicFaqs: (lang: string) =>
    axiosInstance.get<ApiResponse<FaqGroup[]>>('/api/faq', { params: { lang } }),

  // ── 관리자 ────────────────────────────────────────────────
  getAdminFaqs: (language?: FaqLanguage) =>
    axiosInstance.get<ApiResponse<AdminFaqListItem[]>>('/api/admin/faq', {
      params: language ? { language } : {},
    }),

  getAdminFaqDetail: (id: number) =>
    axiosInstance.get<ApiResponse<AdminFaqDetail>>(`/api/admin/faq/${id}`),

  createFaq: (data: CreateFaqPayload) =>
    axiosInstance.post<ApiResponse<AdminFaqDetail>>('/api/admin/faq', data),

  updateFaq: (id: number, data: UpdateFaqPayload) =>
    axiosInstance.put<ApiResponse<AdminFaqDetail>>(`/api/admin/faq/${id}`, data),

  deleteFaq: (id: number) =>
    axiosInstance.delete<ApiResponse<null>>(`/api/admin/faq/${id}`),

  updateActive: (id: number, isActive: boolean) =>
    axiosInstance.patch<ApiResponse<null>>(`/api/admin/faq/${id}/active`, { isActive }),

  updateSortOrder: (id: number, sortOrder: number) =>
    axiosInstance.patch<ApiResponse<null>>(`/api/admin/faq/${id}/sort-order`, { sortOrder }),
}
