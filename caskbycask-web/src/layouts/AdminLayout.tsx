import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useRef, Suspense, useState } from 'react'
import RouteFallback from '@/shared/components/RouteFallback'
import RouteTransition from '@/shared/components/RouteTransition'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/domain/auth/hooks/useAuth'
import { useAuthStore } from '@/domain/auth/store/authStore'
import { getInquiryPendingCount } from '@/domain/inquiry/api/inquiryApi'
import { adminReportApi } from '@/domain/admin/api/adminReportApi'
import { adminCommunityApi } from '@/domain/admin/api/adminCommunityApi'
import { adminAiNewsApi } from '@/domain/admin/api/adminAiNewsApi'
import {
  REPORT_PENDING_COUNT_KEY,
  POST_REPORT_PENDING_COUNT_KEY,
  INQUIRY_PENDING_COUNT_KEY,
} from '@/domain/admin/constants/queryKeys'
import { ADMIN_NAV, isMenuVisible } from '@/domain/admin/constants/adminMenu'
import { useAdminApprovalEventDots } from '@/domain/admin/hooks/useAdminApprovalEventDots'

export default function AdminLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { logout } = useAuth()
  const user = useAuthStore((s) => s.user)
  const contentRef = useRef<HTMLDivElement>(null)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0 })
    setIsMobileMenuOpen(false)
  }, [location.pathname])

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN'
  const isSuperAdmin = user?.role === 'SUPER_ADMIN'
  const allowedMenus: string[] = user?.allowedMenus ?? []
  const hasMenuNewEvent = useAdminApprovalEventDots({
    enabled: isAdmin,
    pathname: location.pathname,
    userId: user?.id,
  })

  const { data: inquiryPendingCount = 0 } = useQuery({
    queryKey: INQUIRY_PENDING_COUNT_KEY,
    queryFn: getInquiryPendingCount,
    refetchInterval: 60_000,
    enabled: isAdmin,
  })

  const { data: reportPendingCount = 0 } = useQuery({
    queryKey: REPORT_PENDING_COUNT_KEY,
    queryFn: () => adminReportApi.pendingCount().then((r) => r.data.data ?? 0),
    refetchInterval: 60_000,
    enabled: isAdmin,
  })

  const { data: postReportPendingCount = 0 } = useQuery({
    queryKey: POST_REPORT_PENDING_COUNT_KEY,
    queryFn: () => adminCommunityApi.getPostReportPendingCount().then((r) => r.data.data ?? 0),
    refetchInterval: 60_000,
    enabled: isAdmin,
  })

  const { data: aiNewsPendingCount = 0 } = useQuery({
    queryKey: ['admin', 'ai-news', 'pending-count'],
    queryFn: adminAiNewsApi.pendingCount,
    refetchInterval: 60_000,
    enabled: isAdmin,
  })

  // 메뉴 경로별 미처리 배지 카운트
  const badgeCountFor = (path: string): number => {
    switch (path) {
      case '/admin/inquiries':              return inquiryPendingCount
      case '/admin/reports':                return reportPendingCount
      case '/admin/community/post-reports': return postReportPendingCount
      case '/admin/community/ai-news':      return aiNewsPendingCount
      default:                              return 0
    }
  }

  // 비관리자 사용자가 허용되지 않은 페이지에 직접 접근 시 첫 번째 허용 메뉴로 이동
  useEffect(() => {
    if (isAdmin || allowedMenus.length === 0) return

    const allItems = ADMIN_NAV.flatMap((e) => (e.type === 'group' ? e.items : [e]))
    const currentItem = allItems.find((item) =>
      item.exact
        ? location.pathname === item.path
        : location.pathname.startsWith(item.path),
    )

    if (currentItem && !isMenuVisible(currentItem.path, false, allowedMenus)) {
      const firstAllowed = allItems.find((item) => isMenuVisible(item.path, false, allowedMenus))
      navigate(firstAllowed ? firstAllowed.path : '/', { replace: true })
    }
  }, [location.pathname, isAdmin, allowedMenus, navigate])

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  return (
    <div className="h-screen bg-canvas flex flex-col md:flex-row overflow-hidden relative">
      {/* 모바일 상단 헤더 */}
      <header className="flex md:hidden items-center justify-between px-4 py-3 bg-white border-b border-neutral-200 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-1.5 rounded-lg text-neutral-600 hover:bg-neutral-100 transition-colors focus:outline-none"
            aria-label="메뉴 열기"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div>
            <Link to="/" className="text-base font-bold text-primary-800">CaskByCask</Link>
            <span className="text-[10px] text-neutral-400 ml-1.5 px-1.5 py-0.5 bg-neutral-100 rounded-md font-medium">
              {isSuperAdmin ? '운영자' : isAdmin ? '관리자' : '파트너'}
            </span>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="text-xs text-neutral-500 hover:text-neutral-700 px-2.5 py-1.5 rounded-lg border border-neutral-200 bg-neutral-50 font-medium transition-colors"
        >
          로그아웃
        </button>
      </header>

      {/* 모바일 드로어 뒷배경 (오버레이) */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden transition-opacity duration-300"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* 사이드바 */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-neutral-200 flex flex-col flex-shrink-0
          transition-transform duration-300 transform
          md:relative md:translate-x-0 md:w-56 md:z-auto
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* 헤더 */}
        <div className="p-5 border-b border-neutral-100 flex items-center justify-between">
          <div>
            <Link to="/" className="text-lg font-bold text-primary-800">CaskByCask</Link>
            <p className="text-xs text-neutral-400 mt-0.5">
              {isSuperAdmin ? '운영자 콘솔' : isAdmin ? '관리자 콘솔' : '파트너 콘솔'}
            </p>
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="md:hidden p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-50 transition-colors"
            aria-label="메뉴 닫기"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 네비게이션 */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {ADMIN_NAV.map((entry) => {
            if (entry.type === 'item') {
              if (!isMenuVisible(entry.path, isAdmin, allowedMenus)) return null
              const active = entry.exact
                ? location.pathname === entry.path
                : location.pathname.startsWith(entry.path)
              return (
                <Link
                  key={entry.path}
                  to={entry.path}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium
                    transition-colors ${
                    active
                      ? 'bg-primary-50 text-primary-900'
                      : 'text-neutral-600 hover:bg-neutral-100'
                  }`}
                >
                  <span className="text-base leading-none">{entry.icon}</span>
                  {entry.label}
                </Link>
              )
            }

            // group
            const visibleItems = entry.items.filter((item) =>
              isMenuVisible(item.path, isAdmin, allowedMenus),
            )
            if (visibleItems.length === 0) return null

            const groupActive = visibleItems.some((item) =>
              location.pathname.startsWith(item.path),
            )
            return (
              <div key={entry.groupLabel}>
                <div className={`flex items-center gap-2.5 px-3 py-2 text-sm font-semibold
                  ${groupActive ? 'text-primary-900' : 'text-neutral-500'}`}>
                  <span className="text-base leading-none">{entry.groupIcon}</span>
                  {entry.groupLabel}
                </div>
                <div className="space-y-0.5">
                  {visibleItems.map((item) => {
                    const active = item.exact
                      ? location.pathname === item.path
                      : location.pathname.startsWith(item.path)
                    const badgeCount = badgeCountFor(item.path)
                    const showNewEventDot = hasMenuNewEvent(item.path)
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={`flex items-center gap-2 rounded-lg text-sm transition-colors
                          pl-8 pr-3 py-1.5
                          ${active
                            ? 'bg-primary-50 text-primary-900 font-medium'
                            : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700'
                          }`}
                      >
                        <span className="min-w-0 flex-1 truncate">{item.label}</span>
                        {(showNewEventDot || badgeCount > 0) && (
                          <span className="ml-auto flex shrink-0 items-center gap-1.5">
                            {showNewEventDot && (
                              <span
                                className="h-2 w-2 rounded-full bg-red-500"
                                aria-label="새 승인 요청"
                              />
                            )}
                            {badgeCount > 0 && (
                              <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[11px] font-bold flex items-center justify-center leading-none">
                                {badgeCount > 99 ? '99+' : badgeCount}
                              </span>
                            )}
                          </span>
                        )}
                      </Link>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </nav>

        {/* 바닥 */}
        <div className="p-4 border-t border-neutral-100 space-y-1">
          <Link
            to="/"
            className="flex items-center gap-2 px-3 py-2 text-sm text-neutral-500
              hover:text-neutral-700 hover:bg-neutral-50 rounded-lg transition-colors"
          >
            ← 사이트로 돌아가기
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-neutral-400
              hover:text-neutral-600 hover:bg-neutral-50 rounded-lg transition-colors text-left"
          >
            로그아웃
          </button>
        </div>
      </aside>

      {/* 컨텐츠 */}
      <div ref={contentRef} className="flex-1 overflow-auto w-full admin-content-area">
        <Suspense fallback={<RouteFallback />}>
          <RouteTransition>
            <Outlet />
          </RouteTransition>
        </Suspense>
      </div>
    </div>
  )
}
