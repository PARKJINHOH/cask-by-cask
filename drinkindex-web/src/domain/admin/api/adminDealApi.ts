import axiosInstance from '@/shared/api/axiosInstance'
import type { ApiResponse, PageResponse } from '@/shared/types/common.types'
import type { DealPostDetail, DealPostSummary, DealStatus, UpdateDealRequest } from '../types/deal.types'

export const adminDealApi = {
  list: async (params: { status?: DealStatus; page?: number; size?: number }) => {
    const res = await axiosInstance.get<ApiResponse<PageResponse<DealPostSummary>>>(
      '/api/admin/deals', { params },
    )
    return res.data.data!
  },

  detail: async (id: number) => {
    const res = await axiosInstance.get<ApiResponse<DealPostDetail>>(`/api/admin/deals/${id}`)
    return res.data.data!
  },

  approve: (id: number) =>
    axiosInstance.patch<ApiResponse<null>>(`/api/admin/deals/${id}/approve`),

  reject: (id: number) =>
    axiosInstance.patch<ApiResponse<null>>(`/api/admin/deals/${id}/reject`),

  update: async (id: number, data: UpdateDealRequest) => {
    const res = await axiosInstance.patch<ApiResponse<DealPostDetail>>(`/api/admin/deals/${id}`, data)
    return res.data.data!
  },
}
