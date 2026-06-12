import axiosInstance from '@/shared/api/axiosInstance'
import type { ApiResponse, PageResponse } from '@/shared/types/common.types'
import type {
  AdminSpiritItem,
  AdminSpiritDetail,
  SpiritRegisterRequest,
  SpiritRegisterRequestDetail,
  UpdateSpiritPayload,
  CreateSpiritPayload,
  UpdateRequestBody,
} from '../types/admin.types'
import type { SpiritCategory, SpiritStatus } from '@/domain/spirit/types/spirit.types'

export const adminSpiritApi = {
  create: (data: CreateSpiritPayload) =>
    axiosInstance.post<ApiResponse<AdminSpiritDetail>>('/api/admin/spirits', data),

  list: (params: {
    keyword?: string
    category?: SpiritCategory
    status?: SpiritStatus
    page?: number
    size?: number
  }) =>
    axiosInstance.get<ApiResponse<PageResponse<AdminSpiritItem>>>('/api/admin/spirits', { params }),

  getById: (id: number) =>
    axiosInstance.get<ApiResponse<AdminSpiritDetail>>(`/api/admin/spirits/${id}`),

  update: (id: number, data: UpdateSpiritPayload) =>
    axiosInstance.patch<ApiResponse<AdminSpiritDetail>>(`/api/admin/spirits/${id}`, data),

  delete: (id: number) =>
    axiosInstance.delete<ApiResponse<null>>(`/api/admin/spirits/${id}`),

  restore: (id: number) =>
    axiosInstance.patch<ApiResponse<null>>(`/api/admin/spirits/${id}/restore`),

  uploadImage: (id: number, file: File) => {
    const form = new FormData()
    form.append('file', file)
    return axiosInstance.post<ApiResponse<null>>(
      `/api/admin/spirits/${id}/images`,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    )
  },

  deleteImage: (id: number, imageId: number) =>
    axiosInstance.delete<ApiResponse<null>>(`/api/admin/spirits/${id}/images/${imageId}`),

  setPrimaryImage: (id: number, imageId: number) =>
    axiosInstance.patch<ApiResponse<null>>(`/api/admin/spirits/${id}/images/${imageId}/primary`),

  listRequests: (params: { status?: string; page?: number; size?: number }) =>
    axiosInstance.get<ApiResponse<PageResponse<SpiritRegisterRequest>>>(
      '/api/admin/spirits/requests',
      { params },
    ),

  getRequestDetail: (id: number) =>
    axiosInstance.get<ApiResponse<SpiritRegisterRequestDetail>>(
      `/api/admin/spirits/requests/${id}`,
    ),

  updateRequest: (id: number, data: UpdateRequestBody) =>
    axiosInstance.patch<ApiResponse<SpiritRegisterRequestDetail>>(
      `/api/admin/spirits/requests/${id}`,
      data,
    ),

  uploadRequestImage: (id: number, file: File) => {
    const form = new FormData()
    form.append('file', file)
    return axiosInstance.post<ApiResponse<SpiritRegisterRequestDetail>>(
      `/api/admin/spirits/requests/${id}/images`,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    )
  },

  removeRequestImage: (id: number, imageUrl: string) =>
    axiosInstance.delete<ApiResponse<SpiritRegisterRequestDetail>>(
      `/api/admin/spirits/requests/${id}/images`,
      { params: { imageUrl } },
    ),

  // 등록 요청 상세 화면(= 새 술 등록 폼)에서 관리자가 완성한 전체 상세로 승인
  approveRequestWithDetail: (id: number, data: CreateSpiritPayload) =>
    axiosInstance.post<ApiResponse<AdminSpiritDetail>>(`/api/admin/spirits/requests/${id}/approve`, data),

  rejectRequest: (id: number, rejectReason: string) =>
    axiosInstance.patch<ApiResponse<null>>(`/api/admin/spirits/requests/${id}/reject`, {
      rejectReason,
    }),
}
