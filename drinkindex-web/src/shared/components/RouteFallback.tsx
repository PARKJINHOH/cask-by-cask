import Spinner from '@/shared/components/Spinner'

/**
 * 코드 스플리팅된 페이지 청크 로딩 중 표시되는 fallback.
 * 레이아웃(헤더/푸터/사이드바)은 유지된 채 본문 영역에만 표시되도록 레이아웃의 <Outlet/> 을 감싼다.
 */
export default function RouteFallback() {
  return (
    <div className="flex items-center justify-center py-32" aria-live="polite">
      <Spinner size="lg" />
    </div>
  )
}
