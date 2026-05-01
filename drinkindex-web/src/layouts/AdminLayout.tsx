import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/domain/auth/hooks/useAuth'

const navItems = [
  { path: '/admin/spirits',  labelKey: 'admin.nav.spirits' },
  { path: '/admin/users',    labelKey: 'admin.nav.users' },
  { path: '/admin/reviews',  labelKey: 'admin.nav.reviews' },
  { path: '/admin/comments', labelKey: 'admin.nav.comments' },
  { path: '/admin/reports',  labelKey: 'admin.nav.reports' },
]

export default function AdminLayout() {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const { logout } = useAuth()

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex">
      <aside className="w-56 bg-white border-r border-neutral-200 flex flex-col flex-shrink-0">
        <div className="p-5 border-b border-neutral-100">
          <Link to="/" className="text-lg font-bold text-primary-600">DrinkIndex</Link>
          <p className="text-xs text-neutral-400 mt-0.5">{t('admin.title')}</p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {navItems.map(({ path, labelKey }) => (
            <Link
              key={path}
              to={path}
              className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                location.pathname.startsWith(path)
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-neutral-600 hover:bg-neutral-100'
              }`}
            >
              {t(labelKey)}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-neutral-100">
          <button
            onClick={handleLogout}
            className="w-full text-left text-sm text-neutral-400 hover:text-neutral-600 px-3 py-2"
          >
            {t('nav.logout')}
          </button>
        </div>
      </aside>

      <div className="flex-1 overflow-auto">
        <Outlet />
      </div>
    </div>
  )
}
