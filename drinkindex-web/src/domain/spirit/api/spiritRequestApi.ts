import axiosInstance from '@/shared/api/axiosInstance'
import type { ApiResponse } from '@/shared/types/common.types'
import type { MySpiritRequest, SpiritRegisterRequestForm } from '../types/spiritRequest.types'

export const spiritRequestApi = {
  submit: (data: SpiritRegisterRequestForm) =>
    axiosInstance.post<ApiResponse<MySpiritRequest>>('/api/spirits/requests', data),

  myRequests: () =>
    axiosInstance.get<ApiResponse<MySpiritRequest[]>>('/api/spirits/requests/me'),
}
