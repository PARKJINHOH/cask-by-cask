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
import type { AdminMenuKey } from '@/domain/auth/types/auth.types'

interface NavItem {
  path: string
  label: string
  exact?: boolean
  subItem?: boolean
  menuKey?: AdminMenuKey
}

type NavEntry =
  | { type: 'item'; path: string; label: string; icon: string; exact?: boolean; menuKey?: AdminMenuKey }
  | { type: 'group'; groupLabel: string; groupIcon: string; items: NavItem[] }

const navEntries: NavEntry[] = [
  {
    type: 'item',
    path: '/admin',
    label: '대시보드',
    icon: '📊',
    exact: true,
  },
  {
    type: 'group',
    groupLabel: '관리',
    groupIcon: '⚙️',
    items: [
      { path: '/admin/notices',  label: '공지사항' },
      { path: '/admin/banners',  label: '배너',     exact: true },
      { path: '/admin/events',   label: '이벤트 달력', exact: true },
      { path: '/admin/popups',   label: '팝업',     exact: true },
      { path: '/admin/legal',    label: '약관 관리', exact: true },
      { path: '/admin/faq',      label: 'FAQ 관리',  exact: true },
    ],
  },
  {
    type: 'group',
    groupLabel: '회원',
    groupIcon: '👥',
    items: [
      { path: '/admin/users',           label: '회원 관리', exact: true },
      { path: '/admin/users/nickname-bad-words', label: '닉네임 금지 단어', exact: true },
      { path: '/admin/roles',           label: '역할 관리', exact: true },
      { path: '/admin/logs',            label: '변경 이력', exact: true },
      { path: '/admin/reports',         label: '신고 관리' },
      { path: '/admin/inquiries',       label: '문의 관리', exact: true },
      { path: '/admin/emails/send',     label: '메일 발송', exact: true },
      { path: '/admin/emails/history',  label: '메일 이력', exact: true },
    ],
  },
  {
    type: 'group',
    groupLabel: '주류',
    groupIcon: '🥃',
    items: [
      { path: '/admin/spirits/requests', label: '등록 요청', menuKey: 'SPIRIT_REQUESTS' },
      { path: '/admin/spirits',          label: '주류 관리', exact: true, menuKey: 'SPIRITS' },
    ],
  },
  {
    type: 'group',
    groupLabel: '제조사',
    groupIcon: '🏭',
    items: [
      { path: '/admin/producers/requests', label: '생산자 등록 요청', exact: true, menuKey: 'PRODUCER_REQUESTS' },
      { path: '/admin/producers',          label: '생산자 관리',      exact: true, menuKey: 'PRODUCERS' },
    ],
  },
  {
    type: 'group',
    groupLabel: '가격 트래커',
    groupIcon: '💰',
    items: [
      { path: '/admin/price-reports', label: '가격 등록 승인', exact: true },
      { path: '/admin/stores',        label: '매장 관리',      exact: true },
      { path: '/admin/deals',         label: '핫딜 검토',      exact: true },
    ],
  },
  {
    type: 'group',
    groupLabel: '레벨',
    groupIcon: '🏅',
    items: [
      { path: '/admin/score/points', label: '점수 설정', exact: true },
      { path: '/admin/score/levels', label: '레벨 설정', exact: true },
    ],
  },
  {
    type: 'group',
    groupLabel: '커뮤니티',
    groupIcon: '💬',
    items: [
      { path: '/admin/community/post-reports', label: '게시글 신고' },
      { path: '/admin/community/bad-words',    label: '욕설 필터' },
      { path: '/admin/community/emojis',       label: '이모지 관리', exact: true },
      { path: '/admin/community/prefixes',     label: '말머리 관리', exact: true },
    ],
  },
]

function isItemVisible(item: NavItem, isAdmin: boolean, allowedMenus: AdminMenuKey[]): boolean {
  if (isAdmin) return true
  if (!item.menuKey) return false  // menuKey 없는 메뉴 = ADMIN 전용
  return allowedMenus.includes(item.menuKey)
}

export default function AdminLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { logout } = useAuth()
  const user = useAuthStore((s) => s.user)

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN'
  const isSuperAdmin = user?.role === 'SUPER_ADMIN'
  const allowedMenus: AdminMenuKey[] = user?.allowedMenus ?? []

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

  // DISTILLERY 사용자가 허용되지 않은 페이지에 직접 접근 시 첫 번째 허용 메뉴로 이동
  useEffect(() => {
    if (isAdmin || allowedMenus.length === 0) return

    const allItems = navEntries.flatMap((e) => (e.type === 'group' ? e.items : [e]))
    const currentItem = allItems.find((item) =>
      item.exact
        ? location.pathname === item.path
        : location.pathname.startsWith(item.path),
    )

    if (currentItem && !isItemVisible(currentItem as NavItem, false, allowedMenus)) {
      const firstAllowed = allItems.find((item) => isItemVisible(item as NavItem, false, allowedMenus))
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
          <Link to="/" className="text-lg font-bold text-primary-800">DrinkIndex</Link>
          <p className="text-xs text-neutral-400 mt-0.5">
            {isSuperAdmin ? '최고관리자 콘솔' : isAdmin ? '관리자 콘솔' : '파트너 콘솔'}
          </p>
        </div>

        {/* 네비게이션 */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navEntries.map((entry) => {
            if (entry.type === 'item') {
              if (!isItemVisible(entry, isAdmin, allowedMenus)) return null
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
              isItemVisible(item, isAdmin, allowedMenus),
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
                          ${item.subItem ? 'pl-10 pr-3 py-1.5' : 'pl-8 pr-3 py-1.5'}
                          ${active
                            ? 'bg-primary-50 text-primary-900 font-medium'
                            : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700'
                          }`}
                      >
                        {item.subItem && <span className="text-neutral-300 text-xs">└</span>}
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
