import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useRequireLogin } from '@/domain/auth/hooks/useRequireLogin'

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24"
      fill={active ? 'currentColor' : 'none'}
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    >
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

function HeartIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24"
      fill={active ? 'currentColor' : 'none'}
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  )
}

function PersonIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24"
      fill={active ? 'currentColor' : 'none'}
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    >
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

export default function BottomNav() {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const requireLogin = useRequireLogin()

  const isHome    = location.pathname === '/'
  const isSpirits = location.pathname.startsWith('/spirits')
  const isMypage  = location.pathname.startsWith('/mypage')
  const currentTab = new URLSearchParams(location.search).get('tab')
  const isWishlist   = isMypage && currentTab === 'wishlist'
  const isMypageMain = isMypage && currentTab !== 'wishlist'

  const tabs = [
    {
      label:  t('nav.home'),
      icon:   <HomeIcon active={isHome} />,
      active: isHome,
      onClick: () => navigate('/'),
    },
    {
      label:  t('nav.search'),
      icon:   <SearchIcon />,
      active: isSpirits,
      onClick: () => navigate('/spirits'),
    },
    {
      label:  t('wishlist.tab'),
      icon:   <HeartIcon active={isWishlist} />,
      active: isWishlist,
      // 로그인이 필요하면 지금 보던 화면을 실어 보낸다 — 로그인 후 홈으로 떨어지지 않게.
      onClick: () => requireLogin(() => navigate('/mypage?tab=wishlist')),
    },
    {
      label:  t('nav.mypage'),
      icon:   <PersonIcon active={isMypageMain} />,
      active: isMypageMain,
      onClick: () => requireLogin(() => navigate('/mypage')),
    },
  ]

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-neutral-200 lg:hidden
        pb-[env(safe-area-inset-bottom)]"
      aria-label="하단 탭 네비게이션"
    >
      <div className="grid grid-cols-4 h-16">
        {tabs.map((tab, i) => (
          <button
            key={i}
            onClick={tab.onClick}
            aria-label={tab.label}
            aria-current={tab.active ? 'page' : undefined}
            className={`flex flex-col items-center justify-center gap-0.5 transition-colors
              ${tab.active
                ? 'text-primary-800'
                : 'text-neutral-400 hover:text-neutral-600'
              }`}
          >
            {tab.icon}
            <span className="text-[10px] font-medium leading-none">{tab.label}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}
