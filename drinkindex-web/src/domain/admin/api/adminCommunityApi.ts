import axiosInstance from '@/shared/api/axiosInstance'
import type { ApiResponse, PageResponse } from '@/shared/types/common.types'
import type { PostReportAdmin, PostReportAdminStatus, BadWord, EmojiAdmin, EmojiGroup, PostPrefixAdmin } from '../types/admin.types'
import type { BoardType } from '@/domain/community/types/community.types'

export const adminCommunityApi = {
  // ── 게시글 신고 ──────────────────────────────────────────────
  getPostReports: (params: { status?: PostReportAdminStatus; page?: number; size?: number }) =>
    axiosInstance.get<ApiResponse<PageResponse<PostReportAdmin>>>('/api/admin/posts/reports', { params }),

  getPostReportPendingCount: () =>
    axiosInstance.get<ApiResponse<number>>('/api/admin/posts/reports/pending-count'),

  deletePost: (id: number, deleteReason?: string) =>
    axiosInstance.delete<ApiResponse<null>>(`/api/admin/posts/${id}`, {
      data: deleteReason ? { deleteReason } : undefined,
    }),

  unlockPost: (id: number) =>
    axiosInstance.patch<ApiResponse<null>>(`/api/admin/posts/${id}/unlock`),

  hidePost: (id: number) =>
    axiosInstance.patch<ApiResponse<null>>(`/api/admin/posts/${id}/hide`),

  // 게시글 숨김해제 — 자동 잠금 + 수동 숨김 모두 해제
  restorePost: (id: number) =>
    axiosInstance.patch<ApiResponse<null>>(`/api/admin/posts/${id}/restore-hide`),

  updatePostReportCount: (id: number, count: number) =>
    axiosInstance.patch<ApiResponse<null>>(`/api/admin/posts/${id}/report-count`, { count }),

  hideComment: (commentId: number) =>
    axiosInstance.patch<ApiResponse<null>>(`/api/admin/posts/comments/${commentId}/hide`),

  restoreComment: (commentId: number) =>
    axiosInstance.patch<ApiResponse<null>>(`/api/admin/posts/comments/${commentId}/restore-hide`),

  deleteComment: (commentId: number) =>
    axiosInstance.delete<ApiResponse<null>>(`/api/admin/posts/comments/${commentId}`),

  updateCommentReportCount: (commentId: number, count: number) =>
    axiosInstance.patch<ApiResponse<null>>(`/api/admin/posts/comments/${commentId}/report-count`, { count }),

  // ── 욕설 필터 ────────────────────────────────────────────────
  getBadWords: (params: { page?: number; size?: number }) =>
    axiosInstance.get<ApiResponse<PageResponse<BadWord>>>('/api/admin/bad-words', { params }),

  createBadWord: (word: string) =>
    axiosInstance.post<ApiResponse<BadWord>>('/api/admin/bad-words', { word }),

  deleteBadWord: (id: number) =>
    axiosInstance.delete<ApiResponse<null>>(`/api/admin/bad-words/${id}`),

  toggleBadWord: (id: number) =>
    axiosInstance.patch<ApiResponse<BadWord>>(`/api/admin/bad-words/${id}/toggle`),

  // ── 이모지 그룹 ──────────────────────────────────────────────
  getEmojiGroups: () =>
    axiosInstance.get<ApiResponse<EmojiGroup[]>>('/api/admin/emojis/groups'),

  createEmojiGroup: (name: string) =>
    axiosInstance.post<ApiResponse<EmojiGroup>>('/api/admin/emojis/groups', { name }),

  updateEmojiGroup: (id: number, name: string) =>
    axiosInstance.patch<ApiResponse<EmojiGroup>>(`/api/admin/emojis/groups/${id}`, { name }),

  deleteEmojiGroup: (id: number) =>
    axiosInstance.delete<ApiResponse<null>>(`/api/admin/emojis/groups/${id}`),

  reorderEmojiGroups: (ids: number[]) =>
    axiosInstance.post<ApiResponse<null>>('/api/admin/emojis/groups/reorder', { ids }),

  // ── 이모지 ───────────────────────────────────────────────────
  getEmojis: (params: { page?: number; size?: number }) =>
    axiosInstance.get<ApiResponse<PageResponse<EmojiAdmin>>>('/api/admin/emojis', { params }),

  getEmojisByGroup: (groupId: number | null) =>
    axiosInstance.get<ApiResponse<EmojiAdmin[]>>('/api/admin/emojis/by-group', {
      params: groupId !== null ? { groupId } : {},
    }),

  createEmoji: (data: { unicode?: string; imageUrl?: string; label: string; groupId?: number | null }) =>
    axiosInstance.post<ApiResponse<EmojiAdmin>>('/api/admin/emojis', data),

  updateEmoji: (id: number, data: { unicode?: string; imageUrl?: string; label?: string; groupId?: number | null }) =>
    axiosInstance.patch<ApiResponse<EmojiAdmin>>(`/api/admin/emojis/${id}`, data),

  deleteEmoji: (id: number) =>
    axiosInstance.delete<ApiResponse<null>>(`/api/admin/emojis/${id}`),

  toggleEmoji: (id: number) =>
    axiosInstance.patch<ApiResponse<EmojiAdmin>>(`/api/admin/emojis/${id}/toggle`),

  reorderEmojis: (ids: number[]) =>
    axiosInstance.post<ApiResponse<null>>('/api/admin/emojis/reorder', { ids }),

  uploadEmojiImage: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return axiosInstance.post<ApiResponse<{ imageUrl: string }>>('/api/admin/emojis/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  // ── 말머리 관리 ──────────────────────────────────────────────
  getPrefixes: (boardType: BoardType) =>
    axiosInstance.get<ApiResponse<PostPrefixAdmin[]>>('/api/admin/post-prefixes', { params: { boardType } }),

  createPrefix: (data: { boardType: BoardType; name: string; colorHex?: string; isActive?: boolean; sortOrder?: number }) =>
    axiosInstance.post<ApiResponse<PostPrefixAdmin>>('/api/admin/post-prefixes', data),

  updatePrefix: (id: number, data: { name?: string; colorHex?: string; isActive?: boolean; sortOrder?: number }) =>
    axiosInstance.patch<ApiResponse<PostPrefixAdmin>>(`/api/admin/post-prefixes/${id}`, data),

  togglePrefix: (id: number) =>
    axiosInstance.patch<ApiResponse<PostPrefixAdmin>>(`/api/admin/post-prefixes/${id}/toggle`),

  deletePrefix: (id: number) =>
    axiosInstance.delete<ApiResponse<null>>(`/api/admin/post-prefixes/${id}`),
}
