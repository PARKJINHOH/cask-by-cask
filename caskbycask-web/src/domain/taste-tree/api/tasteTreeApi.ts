import axiosInstance from '@/shared/api/axiosInstance'
import type { ApiResponse } from '@/shared/types/common.types'
import type {
  MyTasteTrees,
  TasteTreeEngagement,
  TasteTreeImageUpload,
  TasteTreePage,
  TasteTreeSavePayload,
  TasteTreeSort,
  TasteTreeSummary,
  TasteTreeType,
  TasteTreeView,
} from '../types/tasteTree.types'

export interface TasteTreeSearchParams {
  type?: TasteTreeType
  keyword?: string
  sort?: TasteTreeSort
  page?: number
  size?: number
}

export const tasteTreeApi = {
  search: (params: TasteTreeSearchParams) =>
    axiosInstance.get<ApiResponse<TasteTreePage>>('/api/taste-trees', { params }),

  getOfficial: () =>
    axiosInstance.get<ApiResponse<TasteTreeSummary[]>>('/api/taste-trees/official'),

  getShared: (shareKey: string) =>
    axiosInstance.get<ApiResponse<TasteTreeView>>(`/api/taste-trees/share/${shareKey}`),

  recordView: (shareKey: string) =>
    axiosInstance.post<ApiResponse<TasteTreeEngagement>>(`/api/taste-trees/share/${shareKey}/view`),

  like: (shareKey: string) =>
    axiosInstance.put<ApiResponse<TasteTreeEngagement>>(`/api/taste-trees/share/${shareKey}/like`),

  unlike: (shareKey: string) =>
    axiosInstance.delete<ApiResponse<TasteTreeEngagement>>(`/api/taste-trees/share/${shareKey}/like`),

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
    axiosInstance.post<ApiResponse<{ bookmarked: boolean }>>(`/api/taste-trees/share/${shareKey}/bookmark`),

  delete: (id: number) =>
    axiosInstance.delete<ApiResponse<void>>(`/api/taste-trees/${id}`),

  uploadImage: (treeId: number, file: File) => {
    const formData = new FormData()
    formData.append('image', file)
    return axiosInstance.post<ApiResponse<TasteTreeImageUpload>>(
      `/api/taste-trees/${treeId}/images`, formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    )
  },
}

export const adminTasteTreeApi = {
  list: () => axiosInstance.get<ApiResponse<TasteTreeSummary[]>>('/api/admin/taste-trees'),
  get: (id: number) => axiosInstance.get<ApiResponse<TasteTreeView>>(`/api/admin/taste-trees/${id}`),
  create: (payload: TasteTreeSavePayload) =>
    axiosInstance.post<ApiResponse<TasteTreeView>>('/api/admin/taste-trees', payload),
  saveDraft: (id: number, payload: TasteTreeSavePayload) =>
    axiosInstance.put<ApiResponse<TasteTreeView>>(`/api/admin/taste-trees/${id}/draft`, payload),
  publish: (id: number) =>
    axiosInstance.post<ApiResponse<TasteTreeView>>(`/api/admin/taste-trees/${id}/publish`),
  hide: (id: number) => axiosInstance.patch<ApiResponse<void>>(`/api/admin/taste-trees/${id}/hide`),
  restore: (id: number) => axiosInstance.patch<ApiResponse<void>>(`/api/admin/taste-trees/${id}/restore`),
  delete: (id: number) => axiosInstance.delete<ApiResponse<void>>(`/api/admin/taste-trees/${id}`),
  uploadImage: (treeId: number, file: File) => {
    const formData = new FormData()
    formData.append('image', file)
    return axiosInstance.post<ApiResponse<TasteTreeImageUpload>>(
      `/api/admin/taste-trees/${treeId}/images`, formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    )
  },
}
