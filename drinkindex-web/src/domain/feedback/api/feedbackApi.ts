import axiosInstance from '@/shared/api/axiosInstance'
import type { ApiResponse, PageResponse } from '@/shared/types/common.types'
import type {
  CreateFeedbackData,
  FeedbackDetail,
  FeedbackListItem,
  FeedbackStatus,
  UpdateFeedbackData,
  UpdateFeedbackStatusData,
} from '../types/feedback.types'

export const createFeedback = async (
  data: CreateFeedbackData,
  images: File[],
): Promise<number> => {
  const formData = new FormData()
  formData.append('data', new Blob([JSON.stringify(data)], { type: 'application/json' }))
  images.forEach((img) => formData.append('images', img))
  const { data: res } = await axiosInstance.post<ApiResponse<{ id: number }>>(
    '/api/feedbacks',
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  )
  return res.data!.id
}

export const getFeedbacks = async (params: {
  status?: FeedbackStatus
  page?: number
}): Promise<PageResponse<FeedbackListItem>> => {
  const { data } = await axiosInstance.get<ApiResponse<PageResponse<FeedbackListItem>>>(
    '/api/feedbacks',
    { params },
  )
  return data.data!
}

export const getFeedbackDetail = async (id: number): Promise<FeedbackDetail> => {
  const { data } = await axiosInstance.get<ApiResponse<FeedbackDetail>>(`/api/feedbacks/${id}`)
  return data.data!
}

export const updateFeedback = async (id: number, data: UpdateFeedbackData): Promise<void> => {
  await axiosInstance.put(`/api/feedbacks/${id}`, data)
}

export const deleteFeedback = async (id: number): Promise<void> => {
  await axiosInstance.delete(`/api/feedbacks/${id}`)
}

export const addFeedbackComment = async (id: number, content: string): Promise<void> => {
  await axiosInstance.post(`/api/feedbacks/${id}/comments`, { content })
}

export const updateFeedbackStatus = async (
  id: number,
  data: UpdateFeedbackStatusData,
): Promise<void> => {
  await axiosInstance.patch(`/api/feedbacks/${id}/status`, data)
}
