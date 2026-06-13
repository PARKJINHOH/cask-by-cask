import axiosInstance from '@/shared/api/axiosInstance'
import type { ApiResponse } from '@/shared/types/common.types'

// 목록 항목 (content 제외, preview 포함)
export interface DraftListItem {
  id: number
  draftKey: string
  title: string | null
  preview: string | null
  updatedAt: string
}

// 단건/저장 결과 (content·meta 포함)
export interface DraftDetail {
  id: number
  draftKey: string
  title: string | null
  content: string | null
  meta: string | null
  updatedAt: string
}

export interface SaveDraftPayload {
  // 있으면 갱신, 없으면 새 항목 생성
  id?: number
  draftKey: string
  title?: string
  content?: string
  meta?: string
}

// 게시글/공지 작성 임시저장 (로그인 필요) — draftKey(작성 화면)별 목록 보관
export const draftApi = {
  // 저장(생성/갱신)
  save: (data: SaveDraftPayload) =>
    axiosInstance.put<ApiResponse<DraftDetail>>('/api/drafts', data),

  // 작성 화면(draftKey)별 목록
  list: (draftKey: string) =>
    axiosInstance.get<ApiResponse<DraftListItem[]>>('/api/drafts', { params: { draftKey } }),

  // 단건 조회(불러오기)
  getOne: (id: number) =>
    axiosInstance.get<ApiResponse<DraftDetail>>(`/api/drafts/${id}`),

  // 삭제
  remove: (id: number) =>
    axiosInstance.delete<ApiResponse<null>>(`/api/drafts/${id}`),
}
