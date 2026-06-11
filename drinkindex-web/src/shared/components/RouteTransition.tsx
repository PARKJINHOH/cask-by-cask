import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * 라우트 전환 시 본문에 부드러운 페이드 + 상승 애니메이션을 적용한다.
 *
 * - `pathname` 을 key 로 사용 → 경로가 실제로 바뀔 때만 재실행.
 *   (검색 파라미터만 바뀌는 경우 — 예: /spirits?keyword=… 필터링 — 은 재실행하지 않아
 *    스크롤/입력 포커스가 튀지 않는다.)
 * - 애니메이션 정의(.route-enter)는 index.css 에 있으며, fill-mode 없이 종료되어
 *   transform 잔존으로 인한 fixed/sticky containing-block 부작용이 없다.
 * - prefers-reduced-motion 환경에선 index.css 전역 미디어쿼리가 애니메이션을
 *   사실상 즉시 표시로 만들어 접근성을 보장한다.
 */
export default function RouteTransition({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  return (
    <div key={pathname} className="route-enter">
      {children}
    </div>
  )
}
