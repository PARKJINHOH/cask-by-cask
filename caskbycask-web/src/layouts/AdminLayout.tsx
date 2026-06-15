import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, Suspense } from 'react'
import RouteFallback from '@/shared/components/RouteFallback'
import RouteTransition from '@/shared/components/RouteTransition'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/domain/auth/hooks/useAuth'
import { useAuthStore } from '@/domain/auth/store/authStore'
import { getInquiryPendingCount } from '@/domain/inquiry/api/inquiryApi'
import { adminReportApi } from '@/domain/admin/api/adminReportApi'
import { adminCommunityApi } from '@/domain/admin/api/adminCommunityApi'
import {
  REPORT_PENDING_COUNT_KEY,
  POST_REPORT_PENDING_COUNT_KEY,
  INQUIRY_PENDING_COUNT_KEY,
} from '@/domain/admin/constants/queryKeys'
import { ADMIN_NAV, isMenuVisible } from '@/domain/admin/constants/adminMenu'

export default function AdminLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { logout } = useAuth()
  const user = useAuthStore((s) => s.user)

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN'
  const isSuperAdmin = user?.role === 'SUPER_ADMIN'
  const allowedMenus: string[] = user?.allowedMenus ?? []

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

  // 메뉴 경로별 미처리 배지 카운트
  const badgeCountFor = (path: string): number => {
    switch (path) {
      case '/admin/inquiries':              return inquiryPendingCount
      case '/admin/reports':                return reportPendingCount
      case '/admin/community/post-reports': return postReportPendingCount
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
    <div className="h-screen bg-canvas flex overflow-hidden">
      {/* 사이드바 */}
      <aside className="w-56 bg-white border-r border-neutral-200 flex flex-col flex-shrink-0">
        {/* 헤더 */}
        <div className="p-5 border-b border-neutral-100">
          <Link to="/" className="text-lg font-bold text-primary-800">CaskByCask</Link>
          <p className="text-xs text-neutral-400 mt-0.5">
            {isSuperAdmin ? '운영자 콘솔' : isAdmin ? '관리자 콘솔' : '파트너 콘솔'}
          </p>
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
                        {item.label}
                        {badgeCount > 0 && (
                          <span className="ml-auto min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[11px] font-bold flex items-center justify-center leading-none">
                            {badgeCount > 99 ? '99+' : badgeCount}
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
      <div className="flex-1 overflow-auto">
        <Suspense fallback={<RouteFallback />}>
          <RouteTransition>
            <Outlet />
          </RouteTransition>
        </Suspense>
      </div>
    </div>
  )
}
