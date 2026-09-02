import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useRequireLogin } from '@/domain/auth/hooks/useRequireLogin'
import MyReviewsIcon from '@/shared/components/icons/MyReviewsIcon'
import { MY_REVIEWS_PATH } from '@/domain/review/utils/reviewRoutes'

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

function BoardIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24"
      fill={active ? 'currentColor' : 'none'}
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
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
  // PC 는 헤더 아이콘이, 모바일은 이 자리가 "내 리뷰" 진입점이다.
  const isMyReviews = isMypage && currentTab === 'reviews'
  const isFreeBoard = location.pathname.startsWith('/community/free')

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
      label:  t('nav.myReviews'),
      icon:   <MyReviewsIcon />,
      active: isMyReviews,
      // 로그인이 필요하면 지금 보던 화면을 실어 보낸다 — 로그인 후 홈으로 떨어지지 않게.
      onClick: () => requireLogin(() => navigate(MY_REVIEWS_PATH)),
    },
    {
      // 마이페이지는 헤더 프로필 드롭다운이 맡고, 이 자리는 커뮤니티 진입점으로 쓴다.
      label:  t('menu.communityBoard'),
      icon:   <BoardIcon active={isFreeBoard} />,
      active: isFreeBoard,
      // 자유게시판은 공개 목록이라 로그인을 요구하지 않는다.
      onClick: () => navigate('/community/free'),
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
