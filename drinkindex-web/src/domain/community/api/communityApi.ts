import axiosInstance from '@/shared/api/axiosInstance'
import type { ApiResponse, PageResponse } from '@/shared/types/common.types'
import type {
  BoardType,
  PostSort,
  PostListItem,
  PostDetail,
  PostPrefix,
  PollResponse,
  SeriesItem,
  SeriesDetail,
  PostCommentItem,
  CommunityEmoji,
  EmojiReactionSummary,
  UserMention,
  CreatePostPayload,
  UpdatePostPayload,
} from '../types/community.types'

export const communityApi = {
  // ── 게시글 목록 ──────────────────────────────────────────────
  getPosts: (params: {
    boardType: BoardType
    prefixId?: number
    keyword?: string
    sort?: PostSort
    authorId?: number
    commentAuthorId?: number
    page?: number
    size?: number
  }) => axiosInstance.get<ApiResponse<PageResponse<PostListItem>>>('/api/posts', { params }),

  getBestPosts: (params: {
    boardType: BoardType
    page?: number
    size?: number
  }) => axiosInstance.get<ApiResponse<PageResponse<PostListItem>>>('/api/posts/best', { params }),

  // ── 게시글 상세 ──────────────────────────────────────────────
  getPost: (id: number) =>
    axiosInstance.get<ApiResponse<PostDetail>>(`/api/posts/${id}`),

  // ── 말머리 목록 ──────────────────────────────────────────────
  getPrefixes: (boardType: BoardType) =>
    axiosInstance.get<ApiResponse<PostPrefix[]>>('/api/post-prefixes', { params: { boardType } }),

  // ── 게시글 액션 ──────────────────────────────────────────────
  likePost: (id: number, isLike: boolean) =>
    axiosInstance.post<ApiResponse<null>>(`/api/posts/${id}/likes`, { isLike }),

  scrapPost: (id: number) =>
    axiosInstance.post<ApiResponse<null>>(`/api/posts/${id}/scraps`),

  reportPost: (id: number, reason?: string) =>
    axiosInstance.post<ApiResponse<null>>(`/api/posts/${id}/reports`, { reason }),

  deletePost: (id: number) =>
    axiosInstance.delete<ApiResponse<null>>(`/api/posts/${id}`),

  // ── 투표 ─────────────────────────────────────────────────────
  getPoll: (pollId: number) =>
    axiosInstance.get<ApiResponse<PollResponse>>(`/api/polls/${pollId}`),

  vote: (pollId: number, optionIds: number[]) =>
    axiosInstance.post<ApiResponse<PollResponse>>(`/api/polls/${pollId}/votes`, { optionIds }),

  // ── 차단 ─────────────────────────────────────────────────────
  toggleBlock: (userId: number) =>
    axiosInstance.post<ApiResponse<null>>(`/api/users/${userId}/block`),

  // ── 시리즈 ───────────────────────────────────────────────────
  getSeries: (params: { boardType: BoardType; page?: number; size?: number }) =>
    axiosInstance.get<ApiResponse<PageResponse<SeriesItem>>>('/api/series', { params }),

  getSeriesDetail: (id: number) =>
    axiosInstance.get<ApiResponse<SeriesDetail>>(`/api/series/${id}`),

  getMySeries: (boardType: BoardType) =>
    axiosInstance.get<ApiResponse<SeriesItem[]>>('/api/series/mine', { params: { boardType } }),

  // ── 게시글 작성/수정 ─────────────────────────────────────────
  createPost: (data: CreatePostPayload) =>
    axiosInstance.post<ApiResponse<PostDetail>>('/api/posts', data),

  updatePost: (id: number, data: UpdatePostPayload) =>
    axiosInstance.patch<ApiResponse<PostDetail>>(`/api/posts/${id}`, data),

  uploadPostImage: (file: File) => {
    const form = new FormData()
    form.append('image', file)
    return axiosInstance.post<ApiResponse<{ id: number; imageUrl: string; originalFileName: string }>>(
      '/api/posts/images', form, { headers: { 'Content-Type': 'multipart/form-data' } },
    )
  },

  // ── 댓글 ─────────────────────────────────────────────────────
  getComments: (postId: number, params: { page?: number; size?: number }) =>
    axiosInstance.get<ApiResponse<PageResponse<PostCommentItem>>>(`/api/posts/${postId}/comments`, { params }),

  createComment: (postId: number, data: { content: string; parentId?: number; mentionedUserId?: number }) =>
    axiosInstance.post<ApiResponse<PostCommentItem>>(`/api/posts/${postId}/comments`, data),

  updateComment: (postId: number, commentId: number, data: { content: string }) =>
    axiosInstance.patch<ApiResponse<PostCommentItem>>(`/api/posts/${postId}/comments/${commentId}`, data),

  deleteComment: (postId: number, commentId: number) =>
    axiosInstance.delete<ApiResponse<null>>(`/api/posts/${postId}/comments/${commentId}`),

  // ── 이모지 ───────────────────────────────────────────────────
  getEmojis: () =>
    axiosInstance.get<ApiResponse<CommunityEmoji[]>>('/api/emojis'),

  toggleReaction: (commentId: number, emojiId: number) =>
    axiosInstance.post<ApiResponse<EmojiReactionSummary>>(`/api/comments/${commentId}/reactions`, { emojiId }),

  // ── @멘션 검색 ───────────────────────────────────────────────
  searchUsers: (nickname: string, limit = 5) =>
    axiosInstance.get<ApiResponse<UserMention[]>>('/api/users/search', { params: { nickname, limit } }),
}
