import axiosInstance from '@/shared/api/axiosInstance'
import type { ApiResponse, PageResponse } from '@/shared/types/common.types'
import type {
  AdminYoutubeChannel,
  AdminYoutubeVideo,
  CreateYoutubeChannelPayload,
  CreateYoutubeVideoPayload,
  UpdateYoutubeChannelPayload,
  UpdateYoutubeVideoPayload,
  YoutubeAvailabilityResult,
  YoutubeChannel,
  YoutubeSyncResult,
  YoutubeVideo,
  YoutubeVideoQuery,
} from '../types/youtube.types'

const EMPTY_PAGE = <T,>(page: number, size: number): PageResponse<T> => ({
  content: [], page, size, totalElements: 0, totalPages: 0, last: true, empty: true,
})

export const youtubeApi = {
  // ─── 공개 ────────────────────────────────────────────────

  getVideos: async (query: YoutubeVideoQuery & { page?: number; size?: number } = {}) => {
    const { page = 0, size = 24, ...filters } = query
    const response = await axiosInstance.get<ApiResponse<PageResponse<YoutubeVideo>>>(
      '/api/youtube/videos', { params: { ...filters, page, size } },
    )
    // ApiResponse<T> 는 data 가 null 일 수 있어 빈 페이지로 정규화한다.
    return response.data.data ?? EMPTY_PAGE<YoutubeVideo>(page, size)
  },

  getVideo: async (videoKey: string) => {
    const response = await axiosInstance.get<ApiResponse<YoutubeVideo>>(
      `/api/youtube/videos/${videoKey}`,
    )
    return response.data.data!
  },

  getChannels: async () => {
    const response = await axiosInstance.get<ApiResponse<YoutubeChannel[]>>('/api/youtube/channels')
    return response.data.data ?? []
  },

  /** 채널 랜딩 페이지 — `ref` 는 핸들(@ 제외) 또는 채널 ID. */
  getChannel: async (ref: string) => {
    const response = await axiosInstance.get<ApiResponse<YoutubeChannel>>(
      `/api/youtube/channels/${encodeURIComponent(ref)}`,
    )
    return response.data.data!
  },

  getVideosBySpirit: async (spiritId: number) => {
    const response = await axiosInstance.get<ApiResponse<YoutubeVideo[]>>(
      `/api/youtube/videos/by-spirit/${spiritId}`,
    )
    return response.data.data ?? []
  },

  // ─── 관리자 ──────────────────────────────────────────────

  adminChannels: async (params: {
    visible?: boolean; keyword?: string; page?: number; size?: number
  } = {}) => {
    const { page = 0, size = 20, ...filters } = params
    const response = await axiosInstance.get<ApiResponse<PageResponse<AdminYoutubeChannel>>>(
      '/api/admin/youtube/channels', { params: { ...filters, page, size } },
    )
    return response.data.data ?? EMPTY_PAGE<AdminYoutubeChannel>(page, size)
  },

  adminChannel: async (id: number) => {
    const response = await axiosInstance.get<ApiResponse<AdminYoutubeChannel>>(
      `/api/admin/youtube/channels/${id}`,
    )
    return response.data.data!
  },

  createChannel: async (payload: CreateYoutubeChannelPayload) => {
    const response = await axiosInstance.post<ApiResponse<AdminYoutubeChannel>>(
      '/api/admin/youtube/channels', payload,
    )
    return response.data.data!
  },

  updateChannel: async (id: number, payload: UpdateYoutubeChannelPayload) => {
    const response = await axiosInstance.patch<ApiResponse<AdminYoutubeChannel>>(
      `/api/admin/youtube/channels/${id}`, payload,
    )
    return response.data.data!
  },

  deleteChannel: async (id: number) => {
    await axiosInstance.delete(`/api/admin/youtube/channels/${id}`)
  },

  reorderChannels: async (orderedIds: number[]) => {
    await axiosInstance.patch('/api/admin/youtube/channels/order', orderedIds)
  },

  refreshChannelProfile: async (id: number) => {
    const response = await axiosInstance.post<ApiResponse<AdminYoutubeChannel>>(
      `/api/admin/youtube/channels/${id}/refresh-profile`,
    )
    return response.data.data!
  },

  syncChannel: async (id: number) => {
    const response = await axiosInstance.post<ApiResponse<YoutubeSyncResult>>(
      `/api/admin/youtube/channels/${id}/sync`,
    )
    return response.data.data!
  },

  syncAll: async () => {
    const response = await axiosInstance.post<ApiResponse<YoutubeSyncResult>>('/api/admin/youtube/sync')
    return response.data.data!
  },

  /** 삭제·비공개된 영상 점검 — 정기 배치와 같은 로직을 지금 돌린다. */
  checkAvailability: async () => {
    const response = await axiosInstance.post<ApiResponse<YoutubeAvailabilityResult>>(
      '/api/admin/youtube/availability-check',
    )
    return response.data.data!
  },

  adminVideos: async (params: {
    channelId?: number; visible?: boolean; keyword?: string; page?: number; size?: number
  } = {}) => {
    const { page = 0, size = 30, ...filters } = params
    const response = await axiosInstance.get<ApiResponse<PageResponse<AdminYoutubeVideo>>>(
      '/api/admin/youtube/videos', { params: { ...filters, page, size } },
    )
    return response.data.data ?? EMPTY_PAGE<AdminYoutubeVideo>(page, size)
  },

  adminVideo: async (id: number) => {
    const response = await axiosInstance.get<ApiResponse<AdminYoutubeVideo>>(
      `/api/admin/youtube/videos/${id}`,
    )
    return response.data.data!
  },

  createVideo: async (payload: CreateYoutubeVideoPayload) => {
    const response = await axiosInstance.post<ApiResponse<AdminYoutubeVideo>>(
      '/api/admin/youtube/videos', payload,
    )
    return response.data.data!
  },

  updateVideo: async (id: number, payload: UpdateYoutubeVideoPayload) => {
    const response = await axiosInstance.patch<ApiResponse<AdminYoutubeVideo>>(
      `/api/admin/youtube/videos/${id}`, payload,
    )
    return response.data.data!
  },

  deleteVideo: async (id: number) => {
    await axiosInstance.delete(`/api/admin/youtube/videos/${id}`)
  },
}
