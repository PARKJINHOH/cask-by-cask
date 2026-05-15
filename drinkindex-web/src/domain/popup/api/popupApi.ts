import axiosInstance from '@/shared/api/axiosInstance'
import type { ApiResponse, PageResponse } from '@/shared/types/common.types'
import type {
  PopupResponse,
  AdminPopupListItem,
  AdminPopupDetail,
  CreatePopupPayload,
  UpdatePopupPayload,
  UploadedPopupImage,
  PopupLanguage,
  PopupImageType,
} from '../types/popup.types'

export const popupApi = {
  // ── 공개 ──────────────────────────────────────────────────
  getPopups: (language: PopupLanguage) =>
    axiosInstance.get<ApiResponse<PopupResponse[]>>('/api/popups', {
      params: { language, page: 'MAIN' },
    }),

  // ── 관리자 ────────────────────────────────────────────────
  getAdminPopups: (params: {
    language?: PopupLanguage
    isVisible?: boolean
    page?: number
    size?: number
  }) =>
    axiosInstance.get<ApiResponse<PageResponse<AdminPopupListItem>>>('/api/admin/popups', { params }),

  getAdminPopupDetail: (id: number) =>
    axiosInstance.get<ApiResponse<AdminPopupDetail>>(`/api/admin/popups/${id}`),

  createPopup: (data: CreatePopupPayload) =>
    axiosInstance.post<ApiResponse<AdminPopupDetail>>('/api/admin/popups', data),

  updatePopup: (id: number, data: UpdatePopupPayload) =>
    axiosInstance.patch<ApiResponse<AdminPopupDetail>>(`/api/admin/popups/${id}`, data),

  deletePopup: (id: number) =>
    axiosInstance.delete<ApiResponse<null>>(`/api/admin/popups/${id}`),

  updateVisibility: (id: number, isVisible: boolean) =>
    axiosInstance.patch<ApiResponse<null>>(`/api/admin/popups/${id}/visibility`, { isVisible }),

  updateSortOrder: (id: number, sortOrder: number) =>
    axiosInstance.patch<ApiResponse<null>>(`/api/admin/popups/${id}/sort-order`, { sortOrder }),

  uploadPopupImage: (file: File, imageType: PopupImageType) => {
    const form = new FormData()
    form.append('image', file)
    form.append('imageType', imageType)
    return axiosInstance.post<ApiResponse<UploadedPopupImage>>(
      '/api/admin/popups/images',
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    )
  },

  deletePopupImage: (imageId: number) =>
    axiosInstance.delete<ApiResponse<null>>(`/api/admin/popups/images/${imageId}`),
}
