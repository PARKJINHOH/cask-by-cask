import axiosInstance from '@/shared/api/axiosInstance'
import type { ApiResponse, PageResponse } from '@/shared/types/common.types'
import type {
  ByobListItem,
  ByobDetail,
  ByobParticipant,
  ByobComment,
  CreateByobPayload,
  UpdateByobPayload,
  ApplyByobPayload,
  RemoveParticipantPayload,
  RejectParticipantPayload,
  ByobStatusUpdatePayload,
  ByobMyHosted,
  ByobMyJoined,
} from '../types/byob.types'

export const byobApi = {
  getList: (params: { status?: string; page?: number; size?: number }) =>
    axiosInstance.get<ApiResponse<PageResponse<ByobListItem>>>('/api/byob', { params }),

  getDetail: (id: number) =>
    axiosInstance.get<ApiResponse<ByobDetail>>(`/api/byob/${id}`),

  create: (payload: CreateByobPayload) =>
    axiosInstance.post<ApiResponse<ByobDetail>>('/api/byob', payload),

  update: (id: number, payload: UpdateByobPayload) =>
    axiosInstance.put<ApiResponse<ByobDetail>>(`/api/byob/${id}`, payload),

  updateStatus: (id: number, payload: ByobStatusUpdatePayload) =>
    axiosInstance.patch<ApiResponse<null>>(`/api/byob/${id}/status`, payload),

  delete: (id: number) =>
    axiosInstance.delete<ApiResponse<null>>(`/api/byob/${id}`),

  apply: (id: number, payload: ApplyByobPayload) =>
    axiosInstance.post<ApiResponse<ByobParticipant>>(`/api/byob/${id}/participants`, payload),

  cancelApply: (id: number) =>
    axiosInstance.delete<ApiResponse<null>>(`/api/byob/${id}/participants/me`),

  getParticipants: (id: number) =>
    axiosInstance.get<ApiResponse<ByobParticipant[]>>(`/api/byob/${id}/participants`),

  approveParticipant: (id: number, pid: number) =>
    axiosInstance.patch<ApiResponse<null>>(`/api/byob/${id}/participants/${pid}/approve`),

  rejectParticipant: (id: number, pid: number, payload: RejectParticipantPayload) =>
    axiosInstance.patch<ApiResponse<null>>(`/api/byob/${id}/participants/${pid}/reject`, payload),

  removeParticipant: (id: number, pid: number, payload: RemoveParticipantPayload) =>
    axiosInstance.patch<ApiResponse<null>>(
      `/api/byob/${id}/participants/${pid}/remove`,
      payload,
    ),

  getComments: (id: number) =>
    axiosInstance.get<ApiResponse<ByobComment[]>>(`/api/byob/${id}/comments`),

  createComment: (id: number, payload: { content: string; parentId?: number }) =>
    axiosInstance.post<ApiResponse<ByobComment>>(`/api/byob/${id}/comments`, payload),

  deleteComment: (id: number, cid: number) =>
    axiosInstance.delete<ApiResponse<null>>(`/api/byob/${id}/comments/${cid}`),

  getMyHosted: (params: { page?: number; size?: number }) =>
    axiosInstance.get<ApiResponse<PageResponse<ByobMyHosted>>>('/api/byob/my/hosted', { params }),

  getMyJoined: (params: { page?: number; size?: number }) =>
    axiosInstance.get<ApiResponse<PageResponse<ByobMyJoined>>>('/api/byob/my/joined', { params }),
}
