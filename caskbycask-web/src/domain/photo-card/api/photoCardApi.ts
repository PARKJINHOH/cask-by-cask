import axiosInstance from '@/shared/api/axiosInstance'
import type { ApiResponse } from '@/shared/types/common.types'
import type {
  PhotoCardImageUploadResponse,
  PhotoCardTemplate,
  PhotoCardTemplateSaveRequest,
  PhotoCardTemplateScope,
} from '../types/photoCard.types'

export const photoCardApi = {
  /** scope: OFFICIAL(공식) | MINE(내 것, 비공개 포함) | PUBLIC(다른 사용자가 공개한 것) */
  getTemplates: (scope: PhotoCardTemplateScope) =>
    axiosInstance.get<ApiResponse<PhotoCardTemplate[]>>('/api/photo-cards/templates', { params: { scope } })
      .then((r) => r.data.data),

  getTemplate: (id: number) =>
    axiosInstance.get<ApiResponse<PhotoCardTemplate>>(`/api/photo-cards/templates/${id}`)
      .then((r) => r.data.data),

  createTemplate: (data: PhotoCardTemplateSaveRequest) =>
    axiosInstance.post<ApiResponse<PhotoCardTemplate>>('/api/photo-cards/templates', data)
      .then((r) => r.data.data),

  updateTemplate: (id: number, data: PhotoCardTemplateSaveRequest) =>
    axiosInstance.put<ApiResponse<PhotoCardTemplate>>(`/api/photo-cards/templates/${id}`, data)
      .then((r) => r.data.data),

  /** 내 템플릿을 다른 사용자에게 열거나 닫는다. */
  togglePublic: (id: number, isPublic: boolean) =>
    axiosInstance.patch<ApiResponse<PhotoCardTemplate>>(
      `/api/photo-cards/templates/${id}/public`, null, { params: { isPublic } },
    ).then((r) => r.data.data),

  deleteTemplate: (id: number) =>
    axiosInstance.delete<ApiResponse<void>>(`/api/photo-cards/templates/${id}`),

  /** 이 템플릿으로 카드를 만들었을 때 — 공개 목록 인기순 정렬의 근거 */
  markUsed: (id: number) =>
    axiosInstance.post<ApiResponse<void>>(`/api/photo-cards/templates/${id}/use`),

  uploadImage: (file: File) => {
    const form = new FormData()
    form.append('image', file)
    return axiosInstance.post<ApiResponse<PhotoCardImageUploadResponse>>(
      '/api/photo-cards/templates/images', form,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    ).then((r) => r.data.data)
  },
}

export const adminPhotoCardApi = {
  getOfficialTemplates: () =>
    axiosInstance.get<ApiResponse<PhotoCardTemplate[]>>('/api/admin/photo-cards/templates/official')
      .then((r) => r.data.data),

  getPublicUserTemplates: (page = 0, size = 20) =>
    axiosInstance.get<ApiResponse<{ content: PhotoCardTemplate[]; last: boolean; page: number }>>(
      '/api/admin/photo-cards/templates/public', { params: { page, size } },
    ).then((r) => r.data.data),

  createOfficial: (data: PhotoCardTemplateSaveRequest) =>
    axiosInstance.post<ApiResponse<PhotoCardTemplate>>('/api/admin/photo-cards/templates/official', data)
      .then((r) => r.data.data),

  updateOfficial: (id: number, data: PhotoCardTemplateSaveRequest) =>
    axiosInstance.put<ApiResponse<PhotoCardTemplate>>(`/api/admin/photo-cards/templates/official/${id}`, data)
      .then((r) => r.data.data),

  reorderOfficial: (orderedIds: number[]) =>
    axiosInstance.patch<ApiResponse<void>>('/api/admin/photo-cards/templates/official/order', orderedIds),

  changeModeration: (id: number, status: 'VISIBLE' | 'HIDDEN') =>
    axiosInstance.patch<ApiResponse<PhotoCardTemplate>>(
      `/api/admin/photo-cards/templates/${id}/moderation`, null, { params: { status } },
    ).then((r) => r.data.data),

  deleteTemplate: (id: number) =>
    axiosInstance.delete<ApiResponse<void>>(`/api/admin/photo-cards/templates/${id}`),
}
