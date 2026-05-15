import { useState, useRef, useEffect } from 'react'
import { Outlet, Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/domain/auth/store/authStore'
import { useAuth } from '@/domain/auth/hooks/useAuth'
import { saveLang } from '@/shared/utils/i18n'
import BottomNav from '@/shared/components/BottomNav'
import { useLatestNotice } from '@/domain/notice/hooks/useNotices'

const SEEN_KEY = 'notice:lastSeenId'

// ── GNB (글로벌 내비게이션 바) ────────────────────────────────

type GNBChild = { key: string; label: string; to: string; comingSoon?: boolean }
type GNBItem =
  | { key: string; label: string; to: string }
  | { key: string; label: string; children: GNBChild[] }

function GNB() {
  const { t } = useTranslation()
  const [open, setOpen] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  // 미확인 공지 배지: 최신 공지 id > localStorage 저장 id 이면 표시
  const { data: latestNotice } = useLatestNotice()
  const lastSeenId = Number(localStorage.getItem(SEEN_KEY) ?? 0)
  const hasUnread = latestNotice != null && latestNotice.id > lastSeenId

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const menus: GNBItem[] = [
    { key: 'spirits', label: t('nav.spirits'), to: '/spirits' },
    { key: 'notice', label: t('menu.notice'), to: '/notices' },
    {
      key: 'request',
      label: t('menu.request'),
      children: [
        { key: 'requestSpirit', label: t('menu.requestSpirit'), to: '/request/spirit' },
        { key: 'requestReport', label: t('menu.requestReport'), to: '/request/report', comingSoon: true },
      ],
    },
    {
      key: 'community',
      label: t('menu.community'),
      children: [
        { key: 'communityNews', label: t('menu.communityNews'), to: '/community/news', comingSoon: true },
        { key: 'communityBoard', label: t('menu.communityBoard'), to: '/community/board', comingSoon: true },
      ],
    },
  ]

  const itemCls = (active: boolean) =>
    `inline-flex items-center gap-1 px-3 py-2.5 text-sm font-medium transition-colors
    ${active ? 'text-primary-600' : 'text-neutral-600 hover:text-primary-600'}`

  return (
    <nav className="bg-white border-b border-neutral-100">
      <div className="max-w-7xl mx-auto px-4" ref={ref}>
        <ul className="flex items-center">
          {menus.map(menu => {
            if ('to' in menu) {
              const isNotice  = menu.key === 'notice'
              const isSpirits = menu.key === 'spirits'
              return (
                <li key={menu.key} className={isSpirits ? 'mr-1' : ''}>
                  <Link
                    to={menu.to}
                    className={isSpirits
                      ? 'inline-flex items-center px-3.5 py-1.5 text-sm font-semibold rounded-lg\
 bg-primary-600 text-white hover:bg-primary-700 transition-colors'
                      : `${itemCls(false)} relative`
                    }
                  >
                    {menu.label}
                    {isNotice && hasUnread && (
                      <span
                        className="absolute top-1.5 right-0.5 w-1.5 h-1.5 rounded-full bg-red-500"
                        aria-label="새 공지"
                      />
                    )}
                  </Link>
                </li>
              )
            }

            const isOpen = open === menu.key
            return (
              <li key={menu.key} className="relative">
                <button
                  onClick={() => setOpen(isOpen ? null : menu.key)}
                  className={itemCls(isOpen)}
                >
                  {menu.label}
                  <svg
                    className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {isOpen && (
                  <div className="absolute top-full left-0 mt-0.5 w-40 bg-white rounded-xl
                    shadow-lg border border-neutral-100 py-1 z-30">
                    {menu.children.map(child =>
                      child.comingSoon ? (
                        <span
                          key={child.key}
                          className="flex items-center justify-between px-4 py-2 text-sm
                            text-neutral-400 cursor-default select-none"
                        >
                          {child.label}
                          <span className="text-xs bg-neutral-100 text-neutral-400 px-1.5 py-0.5 rounded">
                            준비중
                          </span>
                        </span>
                      ) : (
                        <Link
                          key={child.key}
                          to={child.to}
                          onClick={() => setOpen(null)}
                          className="flex items-center px-4 py-2 text-sm text-neutral-700
                            hover:bg-neutral-50 hover:text-primary-600 transition-colors"
                        >
                          {child.label}
                        </Link>
                      )
                    )}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </div>
    </nav>
  )
}

// ── 언어 토글 버튼 ────────────────────────────────────────────

function LangToggle() {
  const { i18n } = useTranslation()

  const toggle = () => {
    const next = i18n.language === 'ko' ? 'en' : 'ko'
    saveLang(next)
    i18n.changeLanguage(next)
  }

  return (
    <button
      onClick={toggle}
      aria-label="언어 전환"
      className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold
        border border-neutral-200 text-neutral-500 hover:border-primary-400
        hover:text-primary-600 transition-colors select-none"
    >
      <span className={i18n.language === 'ko' ? 'text-primary-600' : 'text-neutral-400'}>KO</span>
      <span className="text-neutral-300">/</span>
      <span className={i18n.language === 'en' ? 'text-primary-600' : 'text-neutral-400'}>EN</span>
    </button>
  )
}

// ── PC 헤더 검색바 ────────────────────────────────────────────

function HeaderSearch() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [value, setValue] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const kw = value.trim()
    navigate(kw ? `/spirits?keyword=${encodeURIComponent(kw)}` : '/spirits')
    setValue('')
  }

  return (
    <form onSubmit={handleSubmit} className="hidden lg:flex flex-1 max-w-md mx-6">
      <div className="relative w-full">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none"
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        >
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={t('spirit.search.placeholder')}
          className="w-full pl-10 pr-4 py-2 text-sm border border-neutral-200 rounded-xl bg-neutral-50
            focus:outline-none focus:ring-2 focus:ring-primary-400 focus:bg-white focus:border-transparent
            transition-colors placeholder:text-neutral-400"
        />
      </div>
    </form>
  )
}

// ── 사용자 드롭다운 ───────────────────────────────────────────

function UserDropdown() {
  const { t } = useTranslation()
  const { user, isLoggedIn } = useAuthStore()
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleLogout = async () => {
    setOpen(false)
    await logout()
    navigate('/')
  }

  if (!isLoggedIn) {
    return (
      <div className="flex items-center gap-2">
        <Link
          to="/login"
          className="text-sm text-neutral-700 hover:text-primary-600 transition-colors font-medium"
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
      </div>
    )
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-neutral-100
          transition-colors text-sm font-medium text-neutral-800"
        aria-haspopup="true"
        aria-expanded={open}
      >
        {/* Avatar */}
        <span className="w-7 h-7 rounded-full bg-primary-100 text-primary-600 flex items-center
          justify-center text-xs font-bold flex-shrink-0 select-none">
          {user?.nickname?.[0]?.toUpperCase() ?? '?'}
        </span>
        <span className="hidden sm:inline max-w-[120px] truncate">{user?.nickname}</span>
        <svg
          className={`w-3.5 h-3.5 text-neutral-400 transition-transform ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-1.5 w-44 bg-white rounded-xl shadow-lg border
          border-neutral-100 py-1 z-50">
          <Link
            to="/mypage"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2 text-sm text-neutral-700
              hover:bg-neutral-50 transition-colors"
          >
            <svg className="w-4 h-4 text-neutral-400" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            {t('nav.mypage')}
          </Link>

          {user?.role === 'ADMIN' && (
            <Link
              to="/admin"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2 text-sm text-neutral-700
                hover:bg-neutral-50 transition-colors"
            >
              <svg className="w-4 h-4 text-neutral-400" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
              </svg>
              {t('nav.admin')}
            </Link>
          )}

          <div className="my-1 border-t border-neutral-100" />

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-neutral-500
              hover:bg-neutral-50 transition-colors text-left"
          >
            <svg className="w-4 h-4 text-neutral-400" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            {t('nav.logout')}
          </button>
        </div>
      )}
    </div>
  )
}

// ── 메인 레이아웃 ─────────────────────────────────────────────

export default function MainLayout() {
  const { t } = useTranslation()

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      {/* 헤더 */}
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center gap-4">
          {/* 로고 */}
          <Link to="/" className="text-xl font-bold text-primary-600 tracking-tight flex-shrink-0">
            DrinkIndex
          </Link>

          {/* PC 검색바 */}
          <HeaderSearch />

          {/* 우측 액션 */}
          <div className="flex items-center gap-2 ml-auto flex-shrink-0">
            <LangToggle />
            <UserDropdown />
          </div>
        </div>
      </header>

      {/* GNB */}
      <GNB />

      {/* 본문 */}
      <main className="flex-1 pb-16 lg:pb-0">
        <Outlet />
      </main>

      {/* 푸터 (PC only) */}
      <footer className="hidden lg:block bg-white border-t border-neutral-200 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center space-y-1">
          <p className="text-sm font-semibold text-primary-600">DrinkIndex</p>
          <p className="text-xs text-neutral-400">{t('app.tagline')}</p>
          <p className="text-xs text-neutral-400">© 2024 DrinkIndex.</p>
        </div>
      </footer>

      {/* 모바일 하단 탭 네비게이션 */}
      <BottomNav />
    </div>
  )
}
