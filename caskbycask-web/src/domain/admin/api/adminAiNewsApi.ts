import axiosInstance from '@/shared/api/axiosInstance'
import type { ApiResponse, PageResponse } from '@/shared/types/common.types'
import type {
  AiNewsArticleCreateRequest, AiNewsArticleDetail, AiNewsArticleStatus,
  AiNewsArticleSummary, AiNewsArticleType, AiNewsArticleUpdateRequest,
  AiNewsCategory, AiNewsRun, AiNewsSettings, AiNewsSourceConfig,
  AiNewsSourceConfigRequest, AiNewsSourceType, AiNewsTopic, AiNewsTopicRequest,
  AiNewsTopicStatus, AiNewsUsageSummary, AiNewsBulkDeleteResult,
} from '../types/aiNews.types'
import type { SocialPublishSelection } from '@/domain/social/types/social.types'

export const adminAiNewsApi = {
  articles: async (params: {
    status?: AiNewsArticleStatus
    type?: AiNewsArticleType
    category?: AiNewsCategory
    fromDate?: string
    toDate?: string
    page?: number
    size?: number
  }) => {
    const res = await axiosInstance.get<ApiResponse<PageResponse<AiNewsArticleSummary>>>(
      '/api/admin/ai-news/articles', { params },
    )
    return res.data.data!
  },
  pendingCount: async () => {
    const res = await axiosInstance.get<ApiResponse<number>>('/api/admin/ai-news/articles/pending-count')
    return res.data.data ?? 0
  },
  article: async (id: number) => {
    const res = await axiosInstance.get<ApiResponse<AiNewsArticleDetail>>(`/api/admin/ai-news/articles/${id}`)
    return res.data.data!
  },
  createArticle: async (data: AiNewsArticleCreateRequest) => {
    const res = await axiosInstance.post<ApiResponse<AiNewsArticleDetail>>('/api/admin/ai-news/articles', data)
    return res.data.data!
  },
  updateArticle: async (id: number, data: AiNewsArticleUpdateRequest) => {
    const res = await axiosInstance.put<ApiResponse<AiNewsArticleDetail>>(`/api/admin/ai-news/articles/${id}`, data)
    return res.data.data!
  },
  publish: async (id: number, scheduledAt?: string | null, socialPublish?: SocialPublishSelection) => {
    const res = await axiosInstance.post<ApiResponse<AiNewsArticleDetail>>(
      `/api/admin/ai-news/articles/${id}/publish`,
      scheduledAt || socialPublish ? { scheduledAt: scheduledAt ?? null, socialPublish } : undefined,
    )
    return res.data.data!
  },
  cancelSchedule: async (id: number) => {
    const res = await axiosInstance.post<ApiResponse<AiNewsArticleDetail>>(
      `/api/admin/ai-news/articles/${id}/schedule/cancel`,
    )
    return res.data.data!
  },
  reject: (id: number, reason?: string) =>
    axiosInstance.post(`/api/admin/ai-news/articles/${id}/reject`, { reason }),
  deleteArticle: (id: number, reason?: string) =>
    axiosInstance.delete(`/api/admin/ai-news/articles/${id}`, { data: { reason } }),
  restore: (id: number) => axiosInstance.post(`/api/admin/ai-news/articles/${id}/restore`),

  topics: async (params?: {
    status?: AiNewsTopicStatus
    category?: AiNewsCategory
    keyword?: string
    page?: number
    size?: number
  }) => {
    const res = await axiosInstance.get<ApiResponse<PageResponse<AiNewsTopic>>>('/api/admin/ai-news/topics', { params })
    return res.data.data!
  },
  createTopic: (data: AiNewsTopicRequest) => axiosInstance.post('/api/admin/ai-news/topics', data),
  updateTopic: (id: number, data: AiNewsTopicRequest) => axiosInstance.put(`/api/admin/ai-news/topics/${id}`, data),
  deleteTopic: (id: number) => axiosInstance.delete(`/api/admin/ai-news/topics/${id}`),
  /** 예전 AI 자동 제안으로 쌓인 주제 정리. 원고가 붙은 주제는 건너뛰고 skipped 로 알려 준다. */
  deleteTopics: async (ids: number[]) => {
    const res = await axiosInstance.post<ApiResponse<AiNewsBulkDeleteResult>>(
      '/api/admin/ai-news/topics/bulk-delete', { ids },
    )
    return res.data.data!
  },

  sources: async (params?: {
    sourceType?: AiNewsSourceType
    enabled?: boolean
    autoDiscovered?: boolean
    keyword?: string
    page?: number
    size?: number
  }) => {
    const res = await axiosInstance.get<ApiResponse<PageResponse<AiNewsSourceConfig>>>('/api/admin/ai-news/sources', {
      params,
    })
    return res.data.data!
  },
  createSource: (data: AiNewsSourceConfigRequest) => axiosInstance.post('/api/admin/ai-news/sources', data),
  updateSource: (id: number, data: AiNewsSourceConfigRequest) => axiosInstance.put(`/api/admin/ai-news/sources/${id}`, data),
  deleteSource: (id: number) => axiosInstance.delete(`/api/admin/ai-news/sources/${id}`),
  /** 자동 등록 시절에 쌓인 출처를 한 번에 정리한다. */
  deleteSources: async (ids: number[]) => {
    const res = await axiosInstance.post<ApiResponse<number>>(
      '/api/admin/ai-news/sources/bulk-delete', { ids },
    )
    return res.data.data ?? 0
  },

  settings: async () => {
    const res = await axiosInstance.get<ApiResponse<AiNewsSettings>>('/api/admin/ai-news/settings')
    return res.data.data!
  },
  updateSettings: async (data: AiNewsSettings) => {
    const res = await axiosInstance.put<ApiResponse<AiNewsSettings>>('/api/admin/ai-news/settings', data)
    return res.data.data!
  },
  usage: async () => {
    const res = await axiosInstance.get<ApiResponse<AiNewsUsageSummary>>('/api/admin/ai-news/usage')
    return res.data.data!
  },
  runs: async (page = 0, size = 20) => {
    const res = await axiosInstance.get<ApiResponse<PageResponse<AiNewsRun>>>('/api/admin/ai-news/runs', {
      params: { page, size },
    })
    return res.data.data!
  },
}
