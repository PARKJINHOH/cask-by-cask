import axiosInstance from '@/shared/api/axiosInstance'
import type { ApiResponse, PageResponse } from '@/shared/types/common.types'
import type {
  NoticeListItem,
  NoticeDetail,
  NoticeAdminDetail,
  CreateNoticePayload,
  UpdateNoticePayload,
  UploadedNoticeImage,
  NoticeCategory,
} from '../types/notice.types'

export const noticeApi = {
  // ── 공개 ──────────────────────────────────────────────────
  list: (params: { category?: NoticeCategory; page?: number; size?: number }) =>
    axiosInstance.get<ApiResponse<PageResponse<NoticeListItem>>>('/api/notices', { params }),

  getDetail: (id: number) =>
    axiosInstance.get<ApiResponse<NoticeDetail>>(`/api/notices/${id}`),

  // ── 관리자 ────────────────────────────────────────────────
  adminList: (params: {
    category?: NoticeCategory
    isPublished?: boolean
    page?: number
    size?: number
  }) =>
    axiosInstance.get<ApiResponse<PageResponse<NoticeListItem>>>('/api/admin/notices', { params }),

  adminGetDetail: (id: number) =>
    axiosInstance.get<ApiResponse<NoticeAdminDetail>>(`/api/admin/notices/${id}`),

  create: (data: CreateNoticePayload) =>
    axiosInstance.post<ApiResponse<NoticeAdminDetail>>('/api/admin/notices', data),

  update: (id: number, data: UpdateNoticePayload) =>
    axiosInstance.patch<ApiResponse<NoticeAdminDetail>>(`/api/admin/notices/${id}`, data),

  delete: (id: number) =>
    axiosInstance.delete<ApiResponse<null>>(`/api/admin/notices/${id}`),

  uploadImage: (file: File) => {
    const form = new FormData()
    form.append('image', file)
    return axiosInstance.post<ApiResponse<UploadedNoticeImage>>(
      '/api/admin/notices/images',
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    )
  },

  deleteImage: (imageId: number) =>
    axiosInstance.delete<ApiResponse<null>>(`/api/admin/notices/images/${imageId}`),
}
