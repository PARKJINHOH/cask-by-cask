import axiosInstance from '@/shared/api/axiosInstance'
import type { ApiResponse, PageResponse } from '@/shared/types/common.types'
import type { MessageBox, MessageSummary, MessageThread } from '../types/message.types'

export const messageApi = {
  getMessages: (params: { box?: MessageBox; page?: number; size?: number }) =>
    axiosInstance.get<ApiResponse<PageResponse<MessageSummary>>>('/api/messages', { params }),

  getThread: (id: number) =>
    axiosInstance.get<ApiResponse<MessageThread>>(`/api/messages/${id}`),

  send: (data: { receiverNickname: string; content: string }) =>
    axiosInstance.post<ApiResponse<MessageThread>>('/api/messages', data),

  reply: (id: number, content: string) =>
    axiosInstance.post<ApiResponse<MessageThread>>(`/api/messages/${id}/reply`, { content }),

  delete: (id: number) =>
    axiosInstance.delete<ApiResponse<null>>(`/api/messages/${id}`),
}
