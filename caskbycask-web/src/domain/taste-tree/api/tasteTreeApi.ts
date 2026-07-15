import axiosInstance from '@/shared/api/axiosInstance'
import type { ApiResponse } from '@/shared/types/common.types'
import type {
  MyTasteTrees,
  TasteTreeAnswer,
  TasteTreeImageUpload,
  TasteTreeResult,
  TasteTreeSavePayload,
  TasteTreeSummary,
  TasteTreeView,
} from '../types/tasteTree.types'

export const tasteTreeApi = {
  getOfficial: () =>
    axiosInstance.get<ApiResponse<TasteTreeSummary[]>>('/api/taste-trees/official'),

  getShared: (shareKey: string) =>
    axiosInstance.get<ApiResponse<TasteTreeView>>(`/api/taste-trees/share/${shareKey}`),

  complete: (shareKey: string, answers: TasteTreeAnswer[]) =>
    axiosInstance.post<ApiResponse<TasteTreeResult>>(
      `/api/taste-trees/share/${shareKey}/complete`,
      { answers },
    ),

  getResult: (shareKey: string) =>
    axiosInstance.get<ApiResponse<TasteTreeResult>>(`/api/taste-trees/results/${shareKey}`),

  getMine: () =>
    axiosInstance.get<ApiResponse<MyTasteTrees>>('/api/taste-trees/me'),

  getMineDetail: (id: number) =>
    axiosInstance.get<ApiResponse<TasteTreeView>>(`/api/taste-trees/${id}`),

  create: (payload: TasteTreeSavePayload) =>
    axiosInstance.post<ApiResponse<TasteTreeView>>('/api/taste-trees', payload),

  saveDraft: (id: number, payload: TasteTreeSavePayload) =>
    axiosInstance.put<ApiResponse<TasteTreeView>>(`/api/taste-trees/${id}/draft`, payload),

  publish: (id: number) =>
    axiosInstance.post<ApiResponse<TasteTreeView>>(`/api/taste-trees/${id}/publish`),

  toggleBookmark: (shareKey: string) =>
    axiosInstance.post<ApiResponse<{ bookmarked: boolean }>>(
      `/api/taste-trees/share/${shareKey}/bookmark`,
    ),

  clone: (shareKey: string) =>
    axiosInstance.post<ApiResponse<TasteTreeView>>(`/api/taste-trees/share/${shareKey}/clone`),

  delete: (id: number) =>
    axiosInstance.delete<ApiResponse<void>>(`/api/taste-trees/${id}`),

  uploadImage: (file: File) => {
    const formData = new FormData()
    formData.append('image', file)
    return axiosInstance.post<ApiResponse<TasteTreeImageUpload>>(
      '/api/taste-trees/images',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    )
  },
}
