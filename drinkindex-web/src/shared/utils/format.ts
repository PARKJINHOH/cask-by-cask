export function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  const diff = Date.now() - d.getTime()

  if (diff < 60_000) return '방금 전'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}분 전`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}시간 전`
  if (diff < 604_800_000) return `${Math.floor(diff / 86_400_000)}일 전`

  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

export function scoreColor(v: number): string {
  if (v >= 95) return '#007BFF'
  if (v >= 90) return '#28A745'
  if (v >= 85) return '#5e6f00'
  if (v >= 80) return '#FFC107'
  if (v >= 60) return '#FD7E14'
  return '#DC3545'
}
