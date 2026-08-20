import type { AxiosError } from 'axios'
import type { ApiResponse } from '@/shared/types/common.types'

/** 서버 응답이 없을 때(네트워크·타임아웃) 또는 본문 없이 상태 코드만 왔을 때 쓸 문구. */
export interface UploadErrorLabels {
  /** 응답 자체가 없음 — 오프라인, 타임아웃, CORS */
  network: string
  /** 401 / 403 */
  auth: string
  /** 413 — 톰캣이 multipart 를 자른 경우 */
  tooLarge: string
  /** 429 */
  rateLimited: string
  /** 그 밖의 상태 코드 */
  server: string
}

/**
 * 업로드가 왜 실패했는지 한 줄로 만든다.
 *
 * 서버가 준 메시지를 최우선으로 쓴다 — 백엔드 `ErrorCode` 의 문구는 "HEIC 는 JPG 로 바꿔서
 * 올려주세요" 처럼 사용자가 다음에 뭘 할지 알 수 있게 쓰여 있다. 응답 본문이 없을 때만
 * 상태 코드로 문구를 고른다. 어떤 경우에도 "실패했습니다" 로 끝나지 않게 하는 게 목적이다.
 */
export function resolveUploadErrorReason(error: unknown, labels: UploadErrorLabels): string {
  const response = (error as AxiosError<ApiResponse<unknown>>)?.response
  const serverMessage = response?.data?.message
  if (serverMessage) return serverMessage

  const status = response?.status
  if (status == null) return labels.network
  if (status === 401 || status === 403) return labels.auth
  if (status === 413) return labels.tooLarge
  if (status === 429) return labels.rateLimited
  return labels.server
}
