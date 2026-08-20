import { resolveUploadErrorReason, type UploadErrorLabels } from '@/shared/utils/uploadError'

interface ApiErrorResponse {
  code?: string | null
  message?: string | null
  detectedWords?: string[] | null
}

/**
 * 리뷰 저장이 왜 실패했는지 한 줄로 만든다.
 *
 * 사진 첨부가 붙으면서 실패 사유가 다양해졌다 — 서버는 "HEIC 는 JPG 로 바꿔서 올려주세요" 처럼
 * 다음에 뭘 할지 알 수 있는 문구를 내려 주므로(ErrorCode 의 REVIEW_IMAGE_* 참고) 그 메시지를 그대로 쓴다.
 * `labels` 를 주면 응답 본문이 없는 경우(네트워크 끊김·413·429)까지 상태 코드로 사유를 가른다.
 */
export function getReviewSaveErrorMessage(
  error: unknown,
  fallback: string,
  codeMessages: Record<string, string> = {},
  labels?: UploadErrorLabels,
): string {
  const data = (error as { response?: { data?: ApiErrorResponse } })?.response?.data

  if (data?.code === 'BAD_WORD_DETECTED') {
    const message = data.message || '욕설이 포함되어 있습니다'
    const detectedWords = data.detectedWords?.filter(Boolean) ?? []
    return detectedWords.length > 0 ? `${message}: ${detectedWords.join(', ')}` : message
  }

  // 코드로 갈라야 하는 것들(아로마 프로파일 등)은 화면이 준 문구가 우선이다.
  if (data?.code && codeMessages[data.code]) return codeMessages[data.code]

  if (labels) return resolveUploadErrorReason(error, labels)

  return data?.message || fallback
}
