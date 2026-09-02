export function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr)
  const y = d.getFullYear()
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const da = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${mo}-${da} ${h}:${mi}`
}

/** 네이버 카페 스타일 작성시간: yyyy.mm.dd hh:mm */
export function formatDotDateTime(dateStr: string): string {
  const d = new Date(dateStr)
  const y = d.getFullYear()
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const da = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${y}.${mo}.${da} ${h}:${mi}`
}

export function formatBoardDate(dateStr: string): string {
  const d = new Date(dateStr)
  const now = new Date()
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  if (sameDay) {
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

/** 항상 절대 날짜로 표기한다: yyyy.mm.dd (상대 시간이 오히려 헷갈리는 리뷰 목록 등) */
export function formatDotDate(dateStr: string): string {
  const d = new Date(dateStr)
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const da = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}.${mo}.${da}`
}

export function formatDate(dateStr: string, lang = 'ko'): string {
  const d = new Date(dateStr)
  const diff = Date.now() - d.getTime()
  const abs = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`

  if (lang === 'en') {
    if (diff < 60_000)       return 'just now'
    if (diff < 3_600_000)    return `${Math.floor(diff / 60_000)}m ago`
    if (diff < 86_400_000)   return `${Math.floor(diff / 3_600_000)}h ago`
    if (diff < 604_800_000)  return `${Math.floor(diff / 86_400_000)}d ago`
    return abs
  }

  if (diff < 60_000)       return '방금 전'
  if (diff < 3_600_000)    return `${Math.floor(diff / 60_000)}분 전`
  if (diff < 86_400_000)   return `${Math.floor(diff / 3_600_000)}시간 전`
  if (diff < 604_800_000)  return `${Math.floor(diff / 86_400_000)}일 전`
  return abs
}

export function scoreColor(v: number): string {
  if (v >= 90) return '#B8860B'
  if (v >= 80) return '#4F8FDB'
  return '#D95F5F'
}

/** 점수 미입력 리뷰 자리에 쓰는 표시 — 0 점으로 읽히지 않도록 숫자를 쓰지 않는다. */
export const NO_SCORE_TEXT = '–'

/** 점수 미입력 자리의 글자색 — scoreColor 의 어느 등급도 아닌 회색. */
export const NO_SCORE_COLOR = '#a3a3a3'

/**
 * 리뷰 점수 표시. 점수를 남기지 않은 리뷰(`null`)는 {@link NO_SCORE_TEXT} 로 그린다.
 *
 * 점수는 선택 항목이라 화면 어디서든 null 이 올 수 있다 — `toFixed` 를 직접 부르면
 * 그 자리에서 터지거나 `NaN` 이 찍힌다.
 */
export function formatScore(v: number | string | null | undefined): string {
  if (v == null || v === '') return NO_SCORE_TEXT
  const n = Number(v)
  return Number.isFinite(n) ? n.toFixed(1) : NO_SCORE_TEXT
}

/** 점수 표시용 색 — 미입력이면 회색. */
export function optionalScoreColor(v: number | string | null | undefined): string {
  if (v == null || v === '') return NO_SCORE_COLOR
  const n = Number(v)
  return Number.isFinite(n) ? scoreColor(n) : NO_SCORE_COLOR
}
