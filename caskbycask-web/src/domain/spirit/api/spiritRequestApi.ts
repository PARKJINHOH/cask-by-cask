import axiosInstance from '@/shared/api/axiosInstance'
import type { ApiResponse } from '@/shared/types/common.types'
import type { MySpiritRequest, MySpiritRequestDetail, SpiritRegisterRequestForm } from '../types/spiritRequest.types'

export const spiritRequestApi = {
  submit: (data: SpiritRegisterRequestForm) =>
    axiosInstance.post<ApiResponse<MySpiritRequest>>('/api/spirits/requests', data),

  myRequests: () =>
    axiosInstance.get<ApiResponse<MySpiritRequest[]>>('/api/spirits/requests/me'),

  myRequestDetail: (id: number) =>
    axiosInstance.get<ApiResponse<MySpiritRequestDetail>>(`/api/spirits/requests/me/${id}`),

  update: (id: number, data: SpiritRegisterRequestForm) =>
    axiosInstance.put<ApiResponse<MySpiritRequest>>(`/api/spirits/requests/${id}`, data),

  remove: (id: number) =>
    axiosInstance.delete<ApiResponse<void>>(`/api/spirits/requests/${id}`),
}
