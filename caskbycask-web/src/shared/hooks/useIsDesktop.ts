import { useEffect, useState } from 'react'

/**
 * PC(넓은 화면) 여부 — Tailwind `lg`(1024px) 기준.
 *
 * <p>드래그 정렬·캔버스 이미지 편집처럼 **마우스가 있어야 쓸 만한 기능**을
 * 모바일에서 끄는 데 쓴다. HTML5 드래그 앤 드롭은 모바일 브라우저에서 아예
 * 동작하지 않으므로, 켜 두면 "눌러도 아무 일이 없는" 기능이 된다.
 *
 * <p>단순히 보이고/안 보이는 문제라면 이 훅 대신 Tailwind `lg:` 클래스를 쓴다 —
 * 훅은 마운트 후에야 값이 정해져 첫 렌더에서 한 번 깜빡인다.
 * 이 훅은 `draggable` 처럼 CSS 로 표현할 수 없는 **동작**에만 쓴다.
 */
const DESKTOP_QUERY = '(min-width: 1024px)'

export default function useIsDesktop() {
  // SSR/hydration 결과가 어긋나지 않도록 초기값은 false 로 두고 마운트 후 동기화한다.
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const mql = window.matchMedia(DESKTOP_QUERY)
    const sync = () => setIsDesktop(mql.matches)
    sync()
    mql.addEventListener('change', sync)
    return () => mql.removeEventListener('change', sync)
  }, [])

  return isDesktop
}
