import axiosInstance from '@/shared/api/axiosInstance'
import type { ApiResponse, PageResponse } from '@/shared/types/common.types'
import type { CommentItem, CreateCommentRequest, UpdateCommentRequest } from '../types/comment.types'

export const commentApi = {
  getComments: (spiritId: number, params?: { page?: number; size?: number }) =>
    axiosInstance.get<ApiResponse<PageResponse<CommentItem>>>(
      `/api/spirits/${spiritId}/comments`,
      { params },
    ),

  createComment: (spiritId: number, data: CreateCommentRequest) =>
    axiosInstance.post<ApiResponse<CommentItem>>(`/api/spirits/${spiritId}/comments`, data),

  updateComment: (spiritId: number, commentId: number, data: UpdateCommentRequest) =>
    axiosInstance.patch<ApiResponse<CommentItem>>(
      `/api/spirits/${spiritId}/comments/${commentId}`,
      data,
    ),

  deleteComment: (spiritId: number, commentId: number) =>
    axiosInstance.delete<ApiResponse<null>>(`/api/spirits/${spiritId}/comments/${commentId}`),

  toggleLike: (commentId: number) =>
    axiosInstance.post<ApiResponse<null>>(`/api/comments/${commentId}/likes`),
}
