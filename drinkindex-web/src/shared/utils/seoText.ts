/**
 * SEO description 용 HTML → 평문 변환 유틸.
 *
 * - 모든 HTML 태그 제거, 연속 공백 단일화, 줄바꿈 → 공백.
 * - meta description 권장 길이 (~160자) 에 맞춰 자름.
 * - 가능하면 단어 경계에서 자르고 끝에 … 추가.
 */
export function stripHtmlForMeta(html: string | null | undefined, maxLen: number = 160): string {
  if (!html) return ''
  const text = html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
  if (text.length <= maxLen) return text
  const sliced = text.slice(0, maxLen)
  const lastSpace = sliced.lastIndexOf(' ')
  const cut = lastSpace > maxLen * 0.6 ? sliced.slice(0, lastSpace) : sliced
  return cut + '…'
}
