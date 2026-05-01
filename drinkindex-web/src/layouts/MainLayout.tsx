import { Outlet, Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/domain/auth/store/authStore'
import { useAuth } from '@/domain/auth/hooks/useAuth'

export default function MainLayout() {
  const { t, i18n } = useTranslation()
  const { isLoggedIn, user } = useAuthStore()
  const { logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold text-primary-600 tracking-tight">
            DrinkIndex
          </Link>
          <nav className="flex items-center gap-4">
            <button
              onClick={() => i18n.changeLanguage(i18n.language === 'ko' ? 'en' : 'ko')}
              className="text-xs text-neutral-400 hover:text-neutral-600 border border-neutral-200
                rounded px-2 py-0.5 transition-colors"
            >
              {i18n.language === 'ko' ? 'EN' : 'KO'}
            </button>
            {isLoggedIn ? (
              <>
                <Link
                  to="/mypage"
                  className="text-sm font-medium text-neutral-700 hover:text-primary-600 transition-colors"
                >
                  {user?.nickname}
                </Link>
                {user?.role === 'ADMIN' && (
                  <Link
                    to="/admin/spirits"
                    className="text-sm text-neutral-500 hover:text-primary-600 transition-colors"
                  >
                    {t('nav.admin')}
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  className="text-sm text-neutral-400 hover:text-neutral-600 transition-colors"
                >
                  {t('nav.logout')}
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-sm text-neutral-700 hover:text-primary-600 transition-colors"
                >
                  {t('nav.login')}
                </Link>
                <Link
                  to="/signup"
                  className="text-sm bg-primary-600 text-white px-4 py-1.5 rounded-lg
                    hover:bg-primary-700 transition-colors font-medium"
                >
                  {t('nav.signup')}
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="bg-white border-t border-neutral-200 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-sm text-neutral-400">
            © 2024 DrinkIndex. 위스키·꼬냑·와인·데낄라 리뷰 커뮤니티
          </p>
        </div>
      </footer>
    </div>
  )
}
