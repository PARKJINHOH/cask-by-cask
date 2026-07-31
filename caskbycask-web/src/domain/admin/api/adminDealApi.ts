import axiosInstance from '@/shared/api/axiosInstance'
import type { ApiResponse, PageResponse } from '@/shared/types/common.types'
import type {
  CreateDealRequest, DealPostDetail, DealPostSummary, DealStatus, UpdateDealRequest,
} from '../types/deal.types'

export const adminDealApi = {
  list: async (params: { status?: DealStatus; drinkName?: string; page?: number; size?: number }) => {
    const res = await axiosInstance.get<ApiResponse<PageResponse<DealPostSummary>>>(
      '/api/admin/deals', { params },
    )
    return res.data.data!
  },

  /** 관리자 직접 등록 — 바로 승인·노출 상태로 저장된다. */
  create: async (data: CreateDealRequest) => {
    const res = await axiosInstance.post<ApiResponse<DealPostDetail>>('/api/admin/deals', data)
    return res.data.data!
  },

  detail: async (id: number) => {
    const res = await axiosInstance.get<ApiResponse<DealPostDetail>>(`/api/admin/deals/${id}`)
    return res.data.data!
  },

  approve: async (id: number, data?: UpdateDealRequest) => {
    const res = await axiosInstance.patch<ApiResponse<DealPostDetail>>(
      `/api/admin/deals/${id}/approve`,
      data,
    )
    return res.data.data!
  },

  deleteBulk: (ids: number[]) =>
    axiosInstance.delete<ApiResponse<void>>('/api/admin/deals', {
      params: { ids: ids.join(',') },
    }),

  delete: (id: number) =>
    axiosInstance.delete<ApiResponse<void>>(`/api/admin/deals/${id}`),

  update: async (id: number, data: UpdateDealRequest) => {
    const res = await axiosInstance.patch<ApiResponse<DealPostDetail>>(`/api/admin/deals/${id}`, data)
    return res.data.data!
  },
}
