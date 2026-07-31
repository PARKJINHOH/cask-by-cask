/**
 * 연월(YYYY 또는 YYYY-MM) 입력 자동 포맷.
 * 사용자가 숫자만 입력해도 자동으로 하이픈을 넣어준다.
 *   "2025"   → "2025"
 *   "202505" → "2025-05"
 *   "2025-05"→ "2025-05"
 * 최대 6자리(YYYYMM)까지만 인식한다.
 *
 * 월이 두 자리가 되는 순간 01~12 범위를 넘으면 **마지막 입력을 무시**한다.
 *   "1993" + "3" → "1993-3"   (아직 유효한 접두사)
 *   "1993-3" + "0" → "1993-3" (30월은 없으므로 무시)
 * 값을 임의로 바꾸지 않고(예: 30→12) 입력만 막아 잘못된 데이터가 저장되지 않게 한다.
 */
export function formatYearMonth(input: string): string {
  const digits = input.replace(/\D/g, '').slice(0, 6)
  if (digits.length <= 4) return digits
  const year = digits.slice(0, 4)
  const month = digits.slice(4)
  if (month.length === 2) {
    const n = Number(month)
    // 유효한 월이 아니면 두 번째 자리를 버린다 (첫 자리는 유효한 접두사이므로 남긴다)
    if (n < 1 || n > 12) return `${year}-${month.slice(0, 1)}`
  }
  return `${year}-${month}`
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
