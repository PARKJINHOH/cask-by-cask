import axiosInstance from '@/shared/api/axiosInstance'
import type { ApiResponse, PageResponse } from '@/shared/types/common.types'
import type { AdminSpiritItem, SpiritRegisterRequest, UpdateSpiritPayload } from '../types/admin.types'
import type { SpiritCategory, SpiritStatus } from '@/domain/spirit/types/spirit.types'

export const adminSpiritApi = {
  list: (params: {
    keyword?: string
    category?: SpiritCategory
    status?: SpiritStatus
    page?: number
    size?: number
  }) =>
    axiosInstance.get<ApiResponse<PageResponse<AdminSpiritItem>>>('/api/spirits', { params }),

  update: (id: number, data: UpdateSpiritPayload) =>
    axiosInstance.patch<ApiResponse<AdminSpiritItem>>(`/api/admin/spirits/${id}`, data),

  delete: (id: number) =>
    axiosInstance.delete<ApiResponse<null>>(`/api/admin/spirits/${id}`),

  listRequests: (params: { status?: string; page?: number; size?: number }) =>
    axiosInstance.get<ApiResponse<PageResponse<SpiritRegisterRequest>>>(
      '/api/admin/spirits/requests',
      { params },
    ),

  approveRequest: (id: number) =>
    axiosInstance.patch<ApiResponse<null>>(`/api/admin/spirits/requests/${id}/approve`),

  rejectRequest: (id: number, rejectReason: string) =>
    axiosInstance.patch<ApiResponse<null>>(`/api/admin/spirits/requests/${id}/reject`, {
      rejectReason,
    }),
}
