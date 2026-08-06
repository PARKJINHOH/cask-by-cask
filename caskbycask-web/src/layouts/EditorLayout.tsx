import { Suspense, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import RouteFallback from '@/shared/components/RouteFallback'

/**
 * 편집기 전용 레이아웃.
 *
 * MainLayout 과 달리 GNB·PageIndicator·푸터·BottomNav 가 없다 —
 * 편집기는 화면 전체를 도구·캔버스·속성에 쓰고, 상단 바는 편집기 액션(되돌리기·확대율·내보내기)이라
 * 페이지가 직접 그린다. 여기서는 "스크롤되지 않는 껍데기"만 책임진다.
 *
 * 높이는 100vh 가 아니라 100dvh 다. 모바일 브라우저 주소창이 접히고 펴질 때
 * 100vh 는 값이 고정돼 하단 도구 바가 화면 밖으로 밀린다.
 */
export default function EditorLayout() {
  useEffect(() => {
    const html = document.documentElement
    const { body } = document
    const previous = {
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
      overscroll: body.style.overscrollBehavior,
    }
    // 페이지 자체 스크롤 차단. overscroll 까지 막아야 모바일에서 당겨 새로고침·고무줄 튕김이 없다.
    html.style.overflow = 'hidden'
    body.style.overflow = 'hidden'
    body.style.overscrollBehavior = 'none'
    return () => {
      html.style.overflow = previous.htmlOverflow
      body.style.overflow = previous.bodyOverflow
      body.style.overscrollBehavior = previous.overscroll
    }
  }, [])

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-neutral-100">
      <Suspense fallback={<RouteFallback />}>
        <Outlet />
      </Suspense>
    </div>
  )
}
