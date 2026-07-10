import axiosInstance from '@/shared/api/axiosInstance'
import type { ApiResponse } from '@/shared/types/common.types'
import type {
  TierList,
  TierListImageUpload,
  TierListSavePayload,
  TierListSummary,
} from '../types/tierList.types'

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
}
