import axiosInstance from '@/shared/api/axiosInstance'
import type { ApiResponse } from '@/shared/types/common.types'

/**
 * 포토카드 임시저장 — 회원 전용.
 *
 * 편집 중인 사진까지 서버에 맡기므로 로그인이 필요하고, 보관 기간이 지나면 서버가 지운다
 * (기간은 {@link PHOTO_CARD_DRAFT_RETENTION_DAYS}). 목록·저장 응답에는 content 가 없다 —
 * 배치 JSON 은 항목마다 수십 KB 라, 실제로 불러올 때만 받는다.
 */
export interface PhotoCardDraftSummary {
  id: number
  name: string | null
  /** 목록 미리보기(data URI). 저장할 때 만들어 둔 작은 JPEG. */
  thumbnailUrl: string | null
  hasPhoto: boolean
  /** 상세 조회에서만 채워진다. */
  content: string | null
  savedAt: string
  expiresAt: string
}

export interface PhotoCardDraftSaveInput {
  /** 있으면 그 임시저장을 덮어쓴다. 없으면 목록에 새로 쌓인다. */
  id?: number
  name?: string
  content: string
  thumbnail?: string | null
  /** 생략하면 서버가 들고 있던 사진을 그대로 둔다(배치만 고쳤을 때 다시 올리지 않게). */
  photo?: File | null
}

/** 보관 기간(일) — 서버 PhotoCardDraftService.RETENTION_DAYS 와 같아야 한다. */
export const PHOTO_CARD_DRAFT_RETENTION_DAYS = 14
/** 목록 상한 — 서버 PhotoCardDraftService.MAX_DRAFTS_PER_USER 와 같아야 한다. */
export const PHOTO_CARD_DRAFT_MAX_COUNT = 5

const BASE = '/api/photo-cards/drafts'

export const photoCardDraftApi = {
  list: () =>
    axiosInstance.get<ApiResponse<PhotoCardDraftSummary[]>>(BASE)
      .then((r) => r.data.data ?? []),

  get: (id: number) =>
    axiosInstance.get<ApiResponse<PhotoCardDraftSummary>>(`${BASE}/${id}`)
      .then((r) => r.data.data),

  save: ({ id, name, content, thumbnail, photo }: PhotoCardDraftSaveInput) => {
    const form = new FormData()
    // data 파트는 JSON 으로 읽혀야 한다(@RequestPart) — Blob 에 타입을 붙이지 않으면
    // text/plain 으로 가서 415 가 난다.
    form.append('data', new Blob(
      [JSON.stringify({ id, name, content, thumbnail })],
      { type: 'application/json' },
    ))
    if (photo) form.append('photo', photo)
    return axiosInstance.post<ApiResponse<PhotoCardDraftSummary>>(BASE, form, {
      // 인스턴스 기본값이 application/json 이라 여기서 덮어써야 한다(경계 문자열은 axios 가 붙인다).
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data.data)
  },

  remove: (id: number) =>
    axiosInstance.delete<ApiResponse<void>>(`${BASE}/${id}`),

  /** 편집 중이던 사진. 공개 URL 이 없으므로 로그인 상태로 받아 온다. */
  fetchPhoto: (id: number) =>
    axiosInstance.get<Blob>(`${BASE}/${id}/photo`, { responseType: 'blob' })
      .then((r) => r.data),
}
