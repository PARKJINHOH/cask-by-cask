import axiosInstance from '@/shared/api/axiosInstance'
import type { ApiResponse, PageResponse } from '@/shared/types/common.types'
import type { DistilleryRegisterRequestForm, MyDistilleryRequest } from '../types/distilleryRequest.types'

export const distilleryRequestApi = {
  submit: (data: DistilleryRegisterRequestForm) =>
    axiosInstance.post<ApiResponse<MyDistilleryRequest>>('/api/distilleries/requests', data),

  myRequests: () =>
    axiosInstance.get<ApiResponse<MyDistilleryRequest[]>>('/api/distilleries/requests/me'),
}

export const adminDistilleryRequestApi = {
  list: (status: string, page: number) =>
    axiosInstance.get<ApiResponse<PageResponse<MyDistilleryRequest>>>(
      '/api/admin/distilleries/requests',
      { params: { status, page, size: 20 } },
    ),

  approve: (id: number) =>
    axiosInstance.patch<ApiResponse<null>>(`/api/admin/distilleries/requests/${id}/approve`),

  reject: (id: number, rejectReason: string) =>
    axiosInstance.patch<ApiResponse<null>>(`/api/admin/distilleries/requests/${id}/reject`, { rejectReason }),
}
