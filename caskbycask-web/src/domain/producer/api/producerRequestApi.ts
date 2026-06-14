import axiosInstance from '@/shared/api/axiosInstance'
import type { ApiResponse, PageResponse } from '@/shared/types/common.types'
import type { ProducerRegisterRequestForm, MyProducerRequest, UpdateProducerRequestPayload } from '../types/producerRequest.types'

export const producerRequestApi = {
  submit: (data: ProducerRegisterRequestForm) =>
    axiosInstance.post<ApiResponse<MyProducerRequest>>('/api/producers/requests', data),

  myRequests: () =>
    axiosInstance.get<ApiResponse<MyProducerRequest[]>>('/api/producers/requests/me'),
}

export const adminProducerRequestApi = {
  list: (status: string, page: number) =>
    axiosInstance.get<ApiResponse<PageResponse<MyProducerRequest>>>(
      '/api/admin/producers/requests',
      { params: { status, page, size: 20 } },
    ),

  detail: (id: number) =>
    axiosInstance.get<ApiResponse<MyProducerRequest>>(
      `/api/admin/producers/requests/${id}`,
    ),

  update: (id: number, body: UpdateProducerRequestPayload) =>
    axiosInstance.patch<ApiResponse<MyProducerRequest>>(
      `/api/admin/producers/requests/${id}`, body,
    ),

  approve: (id: number) =>
    axiosInstance.patch<ApiResponse<null>>(`/api/admin/producers/requests/${id}/approve`),

  reject: (id: number, rejectReason: string) =>
    axiosInstance.patch<ApiResponse<null>>(`/api/admin/producers/requests/${id}/reject`, { rejectReason }),
}
