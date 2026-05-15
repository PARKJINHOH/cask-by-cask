const KEY_PREFIX = 'popup_hide_all_'

function getDateKey(): string {
  const now = new Date()
  const y  = now.getFullYear()
  const m  = String(now.getMonth() + 1).padStart(2, '0')
  const d  = String(now.getDate()).padStart(2, '0')
  return KEY_PREFIX + `${y}${m}${d}`
}

export function isPopupHiddenToday(): boolean {
  try {
    return localStorage.getItem(getDateKey()) === 'true'
  } catch {
    return false  // localStorage 접근 불가 시 팝업 표시
  }
}

export function hidePopupToday(): void {
  try {
    localStorage.setItem(getDateKey(), 'true')
    cleanOldKeys()
  } catch {
    // localStorage 용량 초과 등 무시
  }
}

// 오늘 이전의 popup_hide_all_* 키 자동 정리
function cleanOldKeys(): void {
  const today = getDateKey()
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(KEY_PREFIX) && k !== today)
      .forEach((k) => localStorage.removeItem(k))
  } catch {
    // 무시
  }
}
