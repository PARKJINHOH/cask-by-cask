import type { AxiosError } from 'axios'
import type { ApiResponse } from '@/shared/types/common.types'

/**
 * 서버가 내려준 오류 메시지를 꺼낸다. 없으면 호출 측이 준 기본 문구를 쓴다.
 *
 * 백엔드는 실패를 `ApiResponse.fail(code, message)` 로 내려 주고, `message` 는 사용자에게
 * 그대로 보여 줄 수 있게 쓰여 있다(ErrorCode 참고). 네트워크 오류처럼 응답 자체가 없는
 * 경우에만 기본 문구로 떨어진다.
 */
export function extractApiErrorMessage(error: unknown, fallback: string): string {
  return (error as AxiosError<ApiResponse<unknown>>)?.response?.data?.message ?? fallback
}

/**
 * 실패 코드(`ErrorCode` 의 code, 예: "PHOTO_CARD_007")를 꺼낸다.
 *
 * 사람에게 보여 줄 문구가 아니라 <b>동작을 갈라야 할 때</b> 쓴다 — 문구는 서버가 다듬을 수 있지만
 * 코드는 계약이라, "개수가 가득 찼을 때만 자동 저장을 멈춘다" 같은 판단을 문자열 비교에 걸지 않는다.
 */
export function extractApiErrorCode(error: unknown): string | null {
  return (error as AxiosError<ApiResponse<unknown>>)?.response?.data?.code ?? null
}

/** HTTP 상태 코드. 응답 자체가 없으면(네트워크 오류) null. */
export function extractApiErrorStatus(error: unknown): number | null {
  return (error as AxiosError)?.response?.status ?? null
}
