import axiosInstance from '@/shared/api/axiosInstance'
import type { ApiResponse, PageResponse } from '@/shared/types/common.types'
import type {
  LegalDocumentType,
  LegalDocumentListItem,
  LegalDocumentResponse,
  CreateLegalDocumentRequest,
  UpdateLegalDocumentRequest,
} from '../types/legal.types'

export const legalApi = {
  // ── 공개 ──────────────────────────────────────────────────
  getLatest: (type: LegalDocumentType) =>
    axiosInstance.get<ApiResponse<LegalDocumentResponse>>('/api/legal/latest', { params: { type } }),

  getById: (id: number) =>
    axiosInstance.get<ApiResponse<LegalDocumentResponse>>(`/api/legal/${id}`),

  // ── 관리자 ────────────────────────────────────────────────
  adminList: (params: { type: LegalDocumentType; page?: number; size?: number }) =>
    axiosInstance.get<ApiResponse<PageResponse<LegalDocumentListItem>>>('/api/admin/legal', { params }),

  adminGetById: (id: number) =>
    axiosInstance.get<ApiResponse<LegalDocumentResponse>>(`/api/admin/legal/${id}`),

  create: (data: CreateLegalDocumentRequest) =>
    axiosInstance.post<ApiResponse<LegalDocumentResponse>>('/api/admin/legal', data),

  adminUpdate: (id: number, data: UpdateLegalDocumentRequest) =>
    axiosInstance.patch<ApiResponse<LegalDocumentResponse>>(`/api/admin/legal/${id}`, data),

  activate: (id: number) =>
    axiosInstance.put<ApiResponse<LegalDocumentResponse>>(`/api/admin/legal/${id}/activate`),

  delete: (id: number) =>
    axiosInstance.delete<ApiResponse<null>>(`/api/admin/legal/${id}`),
}
