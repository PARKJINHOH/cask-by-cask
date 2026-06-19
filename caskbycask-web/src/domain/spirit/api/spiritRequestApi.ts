import axiosInstance from '@/shared/api/axiosInstance'
import type { ApiResponse } from '@/shared/types/common.types'
import type { MySpiritRequest, MySpiritRequestDetail, SpiritRegisterRequestForm } from '../types/spiritRequest.types'

// data(JSON Blob) + images(File[]) 멀티파트 — feedback 도메인과 동일 패턴
const buildFormData = (data: SpiritRegisterRequestForm, images: File[]) => {
  const formData = new FormData()
  formData.append('data', new Blob([JSON.stringify(data)], { type: 'application/json' }))
  images.forEach((img) => formData.append('images', img))
  return formData
}

const MULTIPART = { headers: { 'Content-Type': 'multipart/form-data' } }

export const spiritRequestApi = {
  submit: (data: SpiritRegisterRequestForm, images: File[] = []) =>
    axiosInstance.post<ApiResponse<MySpiritRequest>>(
      '/api/spirits/requests', buildFormData(data, images), MULTIPART),

  myRequests: () =>
    axiosInstance.get<ApiResponse<MySpiritRequest[]>>('/api/spirits/requests/me'),

  myRequestDetail: (id: number) =>
    axiosInstance.get<ApiResponse<MySpiritRequestDetail>>(`/api/spirits/requests/me/${id}`),

  update: (id: number, data: SpiritRegisterRequestForm, images: File[] = []) =>
    axiosInstance.put<ApiResponse<MySpiritRequest>>(
      `/api/spirits/requests/${id}`, buildFormData(data, images), MULTIPART),

  remove: (id: number) =>
    axiosInstance.delete<ApiResponse<void>>(`/api/spirits/requests/${id}`),
}
