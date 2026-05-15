import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/domain/auth/hooks/useAuth'

interface NavItem {
  path: string
  label: string
  exact?: boolean
  subItem?: boolean
}

type NavEntry =
  | { type: 'item'; path: string; label: string; icon: string; exact?: boolean }
  | { type: 'group'; groupLabel: string; groupIcon: string; items: NavItem[] }

const navEntries: NavEntry[] = [
  {
    type: 'group',
    groupLabel: '관리',
    groupIcon: '⚙️',
    items: [
      { path: '/admin/notices', label: '공지사항' },
      { path: '/admin/banners', label: '배너',    exact: true },
      { path: '/admin/popups',  label: '팝업',    exact: true },
    ],
  },
  {
    type: 'group',
    groupLabel: '주류',
    groupIcon: '🥃',
    items: [
      { path: '/admin/spirits/requests', label: '등록 요청' },
      { path: '/admin/spirits',          label: '주류 관리', exact: true },
    ],
  },
  {
    type: 'group',
    groupLabel: '회원',
    groupIcon: '👥',
    items: [
      { path: '/admin/users',   label: '회원 관리', exact: true },
      { path: '/admin/reports', label: '신고 관리' },
    ],
  },
  {
    type: 'group',
    groupLabel: '제조사',
    groupIcon: '🏭',
    items: [
      { path: '/admin/distilleries',        label: '증류소 관리',      exact: true },
      { path: '/admin/wineries',            label: '와이너리 관리',    exact: true },
      { path: '/admin/cognac-houses',       label: '꼬냑 하우스 관리', exact: true },
      { path: '/admin/cognac-appellations', label: '세부 산지 관리',   exact: true, subItem: true },
    ],
  },
]

export default function AdminLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { logout } = useAuth()

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex">
      {/* 사이드바 */}
      <aside className="w-56 bg-white border-r border-neutral-200 flex flex-col flex-shrink-0">
        {/* 헤더 */}
        <div className="p-5 border-b border-neutral-100">
          <Link to="/" className="text-lg font-bold text-primary-600">DrinkIndex</Link>
          <p className="text-xs text-neutral-400 mt-0.5">관리자 콘솔</p>
        </div>

        {/* 네비게이션 */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navEntries.map((entry) => {
            if (entry.type === 'item') {
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
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-neutral-600 hover:bg-neutral-100'
                  }`}
                >
                  <span className="text-base leading-none">{entry.icon}</span>
                  {entry.label}
                </Link>
              )
            }

            // group
            const groupActive = entry.items.some((item) => location.pathname.startsWith(item.path))
            return (
              <div key={entry.groupLabel}>
                {/* 그룹 헤더 */}
                <div className={`flex items-center gap-2.5 px-3 py-2 text-sm font-semibold
                  ${groupActive ? 'text-primary-700' : 'text-neutral-500'}`}>
                  <span className="text-base leading-none">{entry.groupIcon}</span>
                  {entry.groupLabel}
                </div>
                {/* 그룹 항목 */}
                <div className="space-y-0.5">
                  {entry.items.map((item) => {
                    const active = item.exact
                      ? location.pathname === item.path
                      : location.pathname.startsWith(item.path)
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={`flex items-center gap-2 rounded-lg text-sm transition-colors
                          ${item.subItem ? 'pl-10 pr-3 py-1.5' : 'pl-8 pr-3 py-1.5'}
                          ${active
                            ? 'bg-primary-50 text-primary-700 font-medium'
                            : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700'
                          }`}
                      >
                        {item.subItem && <span className="text-neutral-300 text-xs">└</span>}
                        {item.label}
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
        <Outlet />
      </div>
    </div>
  )
}
