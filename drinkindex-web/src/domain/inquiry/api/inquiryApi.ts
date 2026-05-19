import axiosInstance from '@/shared/api/axiosInstance'
import type { ApiResponse } from '@/shared/types/common.types'
import type { InquiryCategory, InquiryDetailResponse, InquiryListResponse, InquiryStatus } from '../types/inquiry.types'
import type { PageResponse } from '@/shared/types/common.types'

export interface SubmitInquiryData {
  category: InquiryCategory
  title: string
  body: string
  senderEmail: string
}

export const submitInquiry = async (data: SubmitInquiryData, images: File[]): Promise<void> => {
  const formData = new FormData()
  formData.append('data', new Blob([JSON.stringify(data)], { type: 'application/json' }))
  images.forEach((img) => formData.append('images', img))
  await axiosInstance.post('/api/inquiries', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

export const getAdminInquiries = async (params: {
  status?: InquiryStatus
  category?: InquiryCategory
  page?: number
}): Promise<PageResponse<InquiryListResponse>> => {
  const { data } = await axiosInstance.get<ApiResponse<PageResponse<InquiryListResponse>>>(
    '/api/admin/inquiries',
    { params },
  )
  return data.data!
}

export const getAdminInquiryDetail = async (id: number): Promise<InquiryDetailResponse> => {
  const { data } = await axiosInstance.get<ApiResponse<InquiryDetailResponse>>(
    `/api/admin/inquiries/${id}`,
  )
  return data.data!
}

export const updateInquiryStatus = async (id: number, status: InquiryStatus): Promise<void> => {
  await axiosInstance.patch(`/api/admin/inquiries/${id}/status`, { status })
}

export const updateInquiryNote = async (id: number, note: string): Promise<void> => {
  await axiosInstance.patch(`/api/admin/inquiries/${id}/note`, { note })
}

export const replyInquiry = async (id: number, replyBody: string): Promise<void> => {
  await axiosInstance.post(`/api/admin/inquiries/${id}/reply`, { replyBody })
}
