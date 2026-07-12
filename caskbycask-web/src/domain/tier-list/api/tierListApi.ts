import axiosInstance from '@/shared/api/axiosInstance'
import type { ApiResponse } from '@/shared/types/common.types'
import type {
  TierList,
  TierListGuestDraft,
  TierListGuestDraftPayload,
  TierListImageUpload,
  TierListSavePayload,
  TierListSummary,
} from '../types/tierList.types'

const draftHeaders = (token: string) => ({ 'X-Tier-List-Draft-Token': token })

export const tierListApi = {
  listMine: () =>
    axiosInstance.get<ApiResponse<TierListSummary[]>>('/api/tier-lists/me'),

  getMine: (id: number) =>
    axiosInstance.get<ApiResponse<TierList>>(`/api/tier-lists/${id}`),

  getShared: (shareKey: string) =>
    axiosInstance.get<ApiResponse<TierList>>(`/api/tier-lists/share/${shareKey}`),

  create: (payload: TierListSavePayload) =>
    axiosInstance.post<ApiResponse<TierList>>('/api/tier-lists', payload),

  update: (id: number, payload: TierListSavePayload) =>
    axiosInstance.put<ApiResponse<TierList>>(`/api/tier-lists/${id}`, payload),

  delete: (id: number) =>
    axiosInstance.delete<ApiResponse<void>>(`/api/tier-lists/${id}`),

  uploadImage: (file: File) => {
    const formData = new FormData()
    formData.append('image', file)
    return axiosInstance.post<ApiResponse<TierListImageUpload>>(
      '/api/tier-lists/images',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    )
  },

  createGuestDraft: (payload: TierListGuestDraftPayload) =>
    axiosInstance.post<ApiResponse<TierListGuestDraft>>('/api/tier-list-drafts', payload),

  updateGuestDraft: (token: string, payload: TierListGuestDraftPayload) =>
    axiosInstance.put<ApiResponse<TierListGuestDraft>>('/api/tier-list-drafts', payload, {
      headers: draftHeaders(token),
    }),

  getGuestDraft: (token: string) =>
    axiosInstance.get<ApiResponse<TierListGuestDraft>>('/api/tier-list-drafts', {
      headers: draftHeaders(token),
    }),

  claimGuestDraft: (token: string) =>
    axiosInstance.post<ApiResponse<TierListGuestDraft>>('/api/tier-list-drafts/claim', undefined, {
      headers: draftHeaders(token),
    }),

  uploadGuestDraftImage: (token: string, file: File) => {
    const formData = new FormData()
    formData.append('image', file)
    return axiosInstance.post<ApiResponse<TierListImageUpload>>(
      '/api/tier-list-drafts/images',
      formData,
      { headers: { ...draftHeaders(token), 'Content-Type': 'multipart/form-data' } },
    )
  },
}
