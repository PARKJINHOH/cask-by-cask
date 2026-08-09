interface ApiErrorResponse {
  code?: string | null
  message?: string | null
  detectedWords?: string[] | null
}

export function getReviewSaveErrorMessage(
  error: unknown,
  fallback: string,
  codeMessages: Record<string, string> = {},
): string {
  const data = (error as { response?: { data?: ApiErrorResponse } })?.response?.data
  if (!data) return fallback

  if (data.code === 'BAD_WORD_DETECTED') {
    const message = data.message || '욕설이 포함되어 있습니다'
    const detectedWords = data.detectedWords?.filter(Boolean) ?? []
    return detectedWords.length > 0 ? `${message}: ${detectedWords.join(', ')}` : message
  }

  if (data.code && codeMessages[data.code]) return codeMessages[data.code]

  return data.message || fallback
}
