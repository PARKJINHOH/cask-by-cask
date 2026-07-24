import axiosInstance from '@/shared/api/axiosInstance'
import type { ApiResponse, PageResponse } from '@/shared/types/common.types'
import type {
  SocialAccount,
  SocialCapabilities,
  SocialHubItem,
  SocialPlatform,
  SocialPublication,
  SocialPublicationStatus,
  PublicReview,
  SocialSourceType,
  SocialTemplate,
} from '../types/social.types'

export const socialApi = {
  capabilities: async (spiritId?: number) => {
    const response = await axiosInstance.get<ApiResponse<SocialCapabilities>>(
      '/api/social/capabilities', { params: spiritId ? { spiritId } : undefined },
    )
    return response.data.data!
  },
  sourceStates: async (sourceType: SocialSourceType, sourceId: number) => {
    const response = await axiosInstance.get<ApiResponse<SocialPublication[]>>(
      `/api/social-publications/source/${sourceType}/${sourceId}`,
    )
    return response.data.data ?? []
  },
  myHistory: async (page = 0, size = 20) => {
    const response = await axiosInstance.get<ApiResponse<PageResponse<SocialPublication>>>(
      '/api/social-publications/me', { params: { page, size } },
    )
    return response.data.data!
  },
  retry: async (id: number, admin = false) => {
    const path = admin
      ? `/api/admin/social/publications/${id}/retry`
      : `/api/social-publications/${id}/retry`
    const response = await axiosInstance.post<ApiResponse<SocialPublication>>(path)
    return response.data.data!
  },
  uploadDirect: async (file: File) => {
    const form = new FormData()
    form.append('file', file)
    const response = await axiosInstance.post<ApiResponse<{ imageUrl: string; width: number; height: number }>>(
      '/api/admin/social/images/direct', form, { headers: { 'Content-Type': 'multipart/form-data' } },
    )
    return response.data.data!
  },
  uploadBackground: async (file: File) => {
    const form = new FormData()
    form.append('file', file)
    const response = await axiosInstance.post<ApiResponse<{ imageUrl: string; width: number; height: number }>>(
      '/api/admin/social/images/background', form, { headers: { 'Content-Type': 'multipart/form-data' } },
    )
    return response.data.data!
  },
  adminPublications: async (params: {
    platform?: SocialPlatform
    status?: SocialPublicationStatus
    page?: number
    size?: number
  }) => {
    const response = await axiosInstance.get<ApiResponse<PageResponse<SocialPublication>>>(
      '/api/admin/social/publications', { params },
    )
    return response.data.data!
  },
  templates: async () => {
    const response = await axiosInstance.get<ApiResponse<SocialTemplate[]>>('/api/admin/social/templates')
    return response.data.data ?? []
  },
  createTemplate: async (data: Omit<SocialTemplate, 'id'>) => {
    const response = await axiosInstance.post<ApiResponse<SocialTemplate>>('/api/admin/social/templates', data)
    return response.data.data!
  },
  updateTemplate: async (id: number, data: Omit<SocialTemplate, 'id'>) => {
    const response = await axiosInstance.put<ApiResponse<SocialTemplate>>(`/api/admin/social/templates/${id}`, data)
    return response.data.data!
  },
  deleteTemplate: (id: number) => axiosInstance.delete(`/api/admin/social/templates/${id}`),
  accounts: async () => {
    const response = await axiosInstance.get<ApiResponse<SocialAccount[]>>('/api/admin/social/accounts')
    return response.data.data ?? []
  },
  startOAuth: async (platform: SocialPlatform) => {
    const response = await axiosInstance.post<ApiResponse<{ authorizationUrl: string }>>(
      `/api/admin/social/accounts/${platform}/oauth`,
      undefined,
      { params: { returnUrl: '/admin/social' } },
    )
    return response.data.data!
  },
  verifyAccount: async (platform: SocialPlatform) => {
    const response = await axiosInstance.post<ApiResponse<SocialAccount>>(
      `/api/admin/social/accounts/${platform}/verify`,
    )
    return response.data.data!
  },
  disconnectAccount: (platform: SocialPlatform) =>
    axiosInstance.delete(`/api/admin/social/accounts/${platform}`),
  hub: async (size = 20) => {
    const response = await axiosInstance.get<ApiResponse<SocialHubItem[]>>('/api/social/hub', { params: { size } })
    return response.data.data ?? []
  },
  publicReview: async (reviewId: number) => {
    const response = await axiosInstance.get<ApiResponse<PublicReview>>(`/api/public/reviews/${reviewId}`)
    return response.data.data!
  },
}
