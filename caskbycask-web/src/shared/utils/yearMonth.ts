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

/**
 * 숙성 연수 입력(년 또는 년-개월) 자동 포맷.
 * 증류/병입 연월(YYYY-MM)과 동일하게 하이픈을 자동으로 끼워 넣는다.
 * 단, '년'은 2자리로 고정 가정한다(년 2자리 + 개월 2자리).
 *   "12"    → "12"
 *   "126"   → "12-6"
 *   "1206"  → "12-06"
 *   "12-06" → "12-06"
 * 한 자리 연수 + 개월을 입력하려면 앞에 0을 붙인다("0806" → "08-06").
 */
export function sanitizeAgeYearMonth(input: string): string {
  const digits = input.replace(/\D/g, '').slice(0, 4)
  if (digits.length <= 2) return digits
  return `${digits.slice(0, 2)}-${digits.slice(2)}`
}

/** 숙성 연수 입력 문자열("년" 또는 "년-개월")을 {years, months}로 분해. 개월은 0~11로 클램프. */
export function parseAgeYearMonth(text: string): { years: number | null; months: number | null } {
  if (!text) return { years: null, months: null }
  const [yearsPart, monthsPart] = text.split('-')
  const years = yearsPart ? Number(yearsPart) : null
  if (monthsPart === undefined || monthsPart === '') return { years, months: null }
  const months = Math.min(11, Math.max(0, Number(monthsPart)))
  return { years, months }
}

/** {years, months}를 숙성 연수 입력 문자열("년" 또는 "년-개월")로 합성. */
export function formatAgeYearMonth(years: number | null, months: number | null): string {
  if (years == null) return ''
  const yearsStr = String(years).padStart(2, '0')
  return months != null ? `${yearsStr}-${String(months).padStart(2, '0')}` : `${yearsStr}`
}
