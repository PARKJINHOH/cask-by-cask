import { useEffect, useRef } from 'react'

interface Props {
  onReach: () => void
  /** 더 불러올 것이 없으면 관찰 자체를 멈춘다 */
  enabled: boolean
  children?: React.ReactNode
}

/**
 * 화면 아래에 두고 시야에 들어오면 다음 페이지를 부르는 감시자.
 * rootMargin 을 넉넉히 줘서 사용자가 바닥에 닿기 전에 미리 로드한다.
 */
export default function InfiniteSentinel({ onReach, enabled, children }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const callbackRef = useRef(onReach)
  callbackRef.current = onReach

  useEffect(() => {
    const element = ref.current
    if (!element || !enabled) return
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) callbackRef.current()
    }, { rootMargin: '400px' })
    observer.observe(element)
    return () => observer.disconnect()
  }, [enabled])

  // 스크린리더에도 "더 불러오는 중 / 마지막입니다" 를 알린다 — 무한 스크롤은 시각 단서뿐이라
  // 안내가 없으면 목록이 끝났는지 로딩 중인지 알 길이 없다.
  return (
    <div
      ref={ref}
      aria-live="polite"
      className="py-8 text-center text-xs text-neutral-400"
    >
      {children}
    </div>
  )
}
