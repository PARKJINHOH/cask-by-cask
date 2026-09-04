import axiosInstance from '@/shared/api/axiosInstance'
import type { ApiResponse } from '@/shared/types/common.types'
import type {
  VenueComment,
  VenueCommentImage,
  VenueCommentImagePlanItem,
} from '@/domain/venue/types/venue.types'

export interface VenueCommentPayload {
  content: string
  parentId?: number | null
}

/**
 * 멀티파트 조립.
 *
 * JSON 본문을 `Blob`으로 감싸 `Content-Type: application/json`을 붙이는 것이 핵심이다 —
 * 문자열로 넣으면 Spring 이 `@RequestPart`를 문자열로 받아 역직렬화에 실패한다.
 * (리뷰 이미지 업로드가 이미 같은 방식을 쓴다.)
 */
function buildFormData(
  payload: VenueCommentPayload,
  files: File[],
  imagePlan?: VenueCommentImagePlanItem[],
): FormData {
  const form = new FormData()
  form.append(
    'request',
    new Blob([JSON.stringify(payload)], { type: 'application/json' }),
  )
  if (imagePlan) {
    form.append(
      'imagePlan',
      new Blob([JSON.stringify(imagePlan)], { type: 'application/json' }),
    )
  }
  files.forEach((file) => form.append('images', file))
  return form
}

/**
 * 멀티파트 요청 설정.
 *
 * axiosInstance 는 기본 헤더로 `application/json` 을 붙인다 — 그대로 두면 FormData 를 보내도
 * 서버가 415 로 거절한다. 명시해 주면 axios 가 FormData 를 감지해 boundary 를 붙인 값으로
 * 바꿔 넣는다. (리뷰 이미지 업로드가 쓰는 것과 같은 설정이다.)
 */
const multipartConfig = {
  headers: { 'Content-Type': 'multipart/form-data' },
}

export const venueCommentApi = {
  list: (venueId: number) =>
    axiosInstance.get<ApiResponse<VenueComment[]>>(`/api/venues/${venueId}/comments`),

  /** 사진 탭 — 그 장소의 모든 댓글 사진을 최신순으로 모은다. */
  gallery: (venueId: number) =>
    axiosInstance.get<ApiResponse<VenueCommentImage[]>>(`/api/venues/${venueId}/gallery`),

  create: (venueId: number, payload: VenueCommentPayload, files: File[]) =>
    axiosInstance.post<ApiResponse<VenueComment>>(
      `/api/venues/${venueId}/comments`,
      buildFormData(payload, files),
      multipartConfig,
    ),

  /**
   * 수정. `imagePlan`이 "유지·재정렬·교체"를 한 번에 표현한다 —
   * 계획에 없는 기존 사진은 서버에서 지워진다.
   */
  update: (
    commentId: number,
    payload: VenueCommentPayload,
    files: File[],
    imagePlan: VenueCommentImagePlanItem[],
  ) =>
    axiosInstance.patch<ApiResponse<VenueComment>>(
      `/api/venues/comments/${commentId}`,
      buildFormData(payload, files, imagePlan),
      multipartConfig,
    ),

  delete: (commentId: number) =>
    axiosInstance.delete<ApiResponse<null>>(`/api/venues/comments/${commentId}`),
}
