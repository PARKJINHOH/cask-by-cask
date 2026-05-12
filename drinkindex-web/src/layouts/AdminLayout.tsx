import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/domain/auth/hooks/useAuth'

interface NavItem {
  path: string
  label: string
  icon: string
  exact?: boolean
}

const navItems: NavItem[] = [
  { path: '/admin/notices',          label: '공지 관리',  icon: '📢' },
  { path: '/admin/spirits/requests', label: '등록 요청',  icon: '📋' },
  { path: '/admin/reports',          label: '신고 관리',  icon: '🚨' },
  { path: '/admin/users',            label: '회원 관리',  icon: '👥', exact: true },
  { path: '/admin/spirits',          label: '술 관리',    icon: '🥃', exact: true },
  { path: '/admin/distilleries',     label: '증류소 관리', icon: '🏭', exact: true },
]

export default function AdminLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { logout } = useAuth()

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  const isActive = (item: NavItem) =>
    item.exact
      ? location.pathname === item.path
      : location.pathname.startsWith(item.path)

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
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium
                transition-colors ${
                isActive(item)
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-neutral-600 hover:bg-neutral-100'
              }`}
            >
              <span className="text-base leading-none">{item.icon}</span>
              {item.label}
            </Link>
          ))}
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
