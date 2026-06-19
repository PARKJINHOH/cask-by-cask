/**
 * 연월(YYYY 또는 YYYY-MM) 입력 자동 포맷.
 * 사용자가 숫자만 입력해도 자동으로 하이픈을 넣어준다.
 *   "2025"   → "2025"
 *   "202505" → "2025-05"
 *   "2025-05"→ "2025-05"
 * 최대 6자리(YYYYMM)까지만 인식한다.
 */
export function formatYearMonth(input: string): string {
  const digits = input.replace(/\D/g, '').slice(0, 6)
  if (digits.length <= 4) return digits
  return `${digits.slice(0, 4)}-${digits.slice(4)}`
}
