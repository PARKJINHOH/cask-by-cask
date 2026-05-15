import axiosInstance from '@/shared/api/axiosInstance'
import type { ApiResponse, PageResponse } from '@/shared/types/common.types'
import type {
  BoardType,
  PostSort,
  PostPeriod,
  PostListItem,
  PostDetail,
  PostPrefix,
  PollResponse,
  SeriesItem,
  SeriesDetail,
} from '../types/community.types'

export const communityApi = {
  // ── 게시글 목록 ──────────────────────────────────────────────
  getPosts: (params: {
    boardType: BoardType
    prefixId?: number
    keyword?: string
    sort?: PostSort
    page?: number
    size?: number
  }) => axiosInstance.get<ApiResponse<PageResponse<PostListItem>>>('/api/posts', { params }),

  getBestPosts: (params: {
    boardType: BoardType
    period?: PostPeriod
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
}
