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
