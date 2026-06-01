import { useState, useRef, useEffect } from 'react'
import { Outlet, Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/domain/auth/store/authStore'
import { useAuth } from '@/domain/auth/hooks/useAuth'
import { useMe } from '@/domain/user/hooks/useUser'
import { saveLang } from '@/shared/utils/i18n'
import BottomNav from '@/shared/components/BottomNav'
import Toast from '@/shared/components/Toast'
import { useToast } from '@/shared/hooks/useToast'
import { useLatestNotice } from '@/domain/notice/hooks/useNotices'
import NotificationBell from '@/domain/notification/components/NotificationBell'
import MessagePopup from '@/domain/message/components/MessagePopup'
import ForcePasswordChangeModal from '@/domain/user/components/ForcePasswordChangeModal'
import LevelIcon from '@/shared/components/icons/LevelIcon'
import AdminIcon from '@/shared/components/icons/AdminIcon'
import DistilleryIcon from '@/shared/components/icons/DistilleryIcon'

const SEEN_KEY = 'notice:lastSeenId'

// ── 출석 체크 토스트 핸들러 ──────────────────────────────────────
// 로그인 직후 authStore에 적재된 pendingAttendanceToast를 소비하여 토스트 표시
function AttendanceToastHandler() {
  const { pendingAttendanceToast, setPendingAttendanceToast } = useAuthStore()
  const { toasts, showToast, removeToast } = useToast()

  useEffect(() => {
    if (!pendingAttendanceToast) return

    const { streakCount, bonusAwarded, totalMaturingPower } = pendingAttendanceToast

    showToast(
      `🥃 출석 체크! ${streakCount}일 연속 · 총 ${totalMaturingPower.toLocaleString()} 숙성력`,
      'success',
    )

    if (bonusAwarded === 'STREAK_30') {
      setTimeout(() => showToast('🏆 30일 연속 출석 달성! 특별 보너스 지급', 'success'), 600)
    } else if (bonusAwarded === 'STREAK_7') {
      setTimeout(() => showToast('🎉 7일 연속 출석 보너스! 추가 숙성력 지급', 'success'), 600)
    }

    // 소비 완료 → 초기화 (재표시 방지)
    setPendingAttendanceToast(null)
  }, [pendingAttendanceToast]) // eslint-disable-line react-hooks/exhaustive-deps

  return <Toast toasts={toasts} onRemove={removeToast} />
}

// ── 비밀번호 변경 권고 배너 ──────────────────────────────────
// 90일 이상 비밀번호 미변경 시 노출. 세션 단위로 닫기 가능(강제 아님).
const PW_REMINDER_DISMISS_KEY = 'pw:reminder:dismissed'

function PasswordChangeBanner() {
  const { t } = useTranslation()
  const { isLoggedIn } = useAuthStore()
  const { data: profile } = useMe()
  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem(PW_REMINDER_DISMISS_KEY) === '1',
  )

  if (!isLoggedIn || !profile?.passwordChangeRequired || dismissed) return null

  const handleDismiss = () => {
    sessionStorage.setItem(PW_REMINDER_DISMISS_KEY, '1')
    setDismissed(true)
  }

  return (
    <div className="bg-amber-50 border-b border-amber-200">
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center gap-3 text-sm">
        <svg className="w-4 h-4 text-amber-600 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
        </svg>
        <p className="flex-1 text-amber-900 leading-snug">{t('pwReminder.message')}</p>
        <Link
          to="/mypage"
          className="flex-shrink-0 font-semibold text-amber-800 underline hover:text-amber-900"
        >
          {t('pwReminder.action')}
        </Link>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label={t('pwReminder.dismiss')}
          className="flex-shrink-0 text-amber-500 hover:text-amber-700"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  )
}

// ── GNB (글로벌 내비게이션 바) ────────────────────────────────

type GNBChild = { key: string; label: string; to: string; comingSoon?: boolean }
type GNBItem =
  | { key: string; label: string; to: string }
  | { key: string; label: string; children: GNBChild[] }

function GNB() {
  const { t } = useTranslation()
  const [open, setOpen] = useState<string | null>(null)

  const { data: latestNotice } = useLatestNotice()
  const lastSeenId = Number(localStorage.getItem(SEEN_KEY) ?? 0)
  const hasUnread = latestNotice != null && latestNotice.id > lastSeenId

  const menus: GNBItem[] = [
    { key: 'spirits', label: t('nav.spirits'), to: '/spirits' },
    { key: 'calendar', label: t('menu.calendar'), to: '/calendar' },
    {
      key: 'request',
      label: t('menu.request'),
      children: [
        { key: 'requestSpirit',     label: t('menu.requestSpirit'),     to: '/request/spirit' },
        { key: 'requestDistillery', label: t('menu.requestDistillery'), to: '/request/distillery' },
      ],
    },
    { key: 'notice', label: t('menu.notice'), to: '/notices' },
    { key: 'faq', label: t('menu.faq'), to: '/faq' },
    {
      key: 'community',
      label: t('menu.community'),
      children: [
        { key: 'communityAll',   label: t('menu.communityAll'),   to: '/community/all' },
        { key: 'communityNews',  label: t('menu.communityNews'),  to: '/community/notice' },
        { key: 'communityBoard', label: t('menu.communityBoard'), to: '/community/free' },
        { key: 'communityByob',  label: t('menu.communityByob'),  to: '/community/byob' },
      ],
    },
  ]

  const itemCls = (active: boolean) =>
    `inline-flex items-center gap-1 px-3 py-2.5 text-sm font-medium transition-colors
    ${active ? 'text-primary-800' : 'text-neutral-600 hover:text-primary-800'}`

  return (
    <nav className="bg-white border-b border-neutral-100">
      <div className="max-w-7xl mx-auto px-4">
        <ul className="flex items-center gap-1">
          {menus.map(menu => {
            if ('to' in menu) {
              const isNotice   = menu.key === 'notice'
              const isSpirits  = menu.key === 'spirits'
              const isCalendar = menu.key === 'calendar'
              return (
                <li
                  key={menu.key}
                  className={`flex items-center ${isSpirits ? 'mr-1' : ''} ${isCalendar ? 'gap-2 mr-1' : ''}`}
                >
                  <Link
                    to={menu.to}
                    className={
                      isSpirits
                        ? 'inline-flex items-center px-3.5 py-1.5 text-sm font-semibold rounded-lg\
 bg-primary-800 text-white hover:bg-primary-900 transition-colors'
                        : isCalendar
                        ? 'inline-flex items-center px-3.5 py-1.5 text-sm font-medium rounded-lg\
 border border-neutral-300 text-neutral-600 hover:text-primary-800 hover:border-primary-300 transition-colors'
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
                  {isCalendar && (
                    <span className="h-4 w-px bg-neutral-200" aria-hidden="true" />
                  )}
                </li>
              )
            }

            const isOpen = open === menu.key
            return (
              <li
                key={menu.key}
                className="relative"
                onMouseEnter={() => setOpen(menu.key)}
                onMouseLeave={() => setOpen(null)}
              >
                <button className={itemCls(isOpen)}>
                  {menu.label}
                  <svg
                    className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {isOpen && (
                  <div className="absolute top-full left-0 w-40 pt-1 z-30">
                  <div className="bg-white rounded-xl shadow-lg border border-neutral-100 py-1">
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
                            hover:bg-neutral-50 hover:text-primary-800 transition-colors"
                        >
                          {child.label}
                        </Link>
                      )
                    )}
                  </div>
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
      className="flex items-center gap-1 px-3.5 py-1.5 rounded-lg text-sm font-semibold
        border border-neutral-300 text-neutral-500 hover:border-primary-400
        hover:text-primary-800 transition-all duration-150 select-none"
    >
      <span className={i18n.language === 'ko' ? 'text-primary-800' : 'text-neutral-400'}>KO</span>
      <span className="text-neutral-300">/</span>
      <span className={i18n.language === 'en' ? 'text-primary-800' : 'text-neutral-400'}>EN</span>
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
  const { data: profile } = useMe()
  const isFixed = profile?.nicknameFixed === true
  const profileImageUrl = profile?.profileImageUrl ?? user?.profileImageUrl

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
          className="inline-flex items-center gap-1.5 text-sm font-medium px-3.5 py-1.5 rounded-lg
            border border-neutral-300 text-neutral-700
            hover:border-primary-400 hover:text-primary-800 hover:bg-primary-50
            transition-all duration-150"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
            <polyline points="10 17 15 12 10 7" />
            <line x1="15" y1="12" x2="3" y2="12" />
          </svg>
          {t('nav.login')}
        </Link>
        <Link
          to="/signup"
          className="inline-flex items-center gap-1.5 text-sm font-semibold px-3.5 py-1.5 rounded-lg
            bg-primary-800 text-white shadow-sm
            hover:bg-primary-900 active:bg-primary-800
            transition-all duration-150"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <line x1="19" y1="8" x2="19" y2="14" />
            <line x1="22" y1="11" x2="16" y2="11" />
          </svg>
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
        {/* Avatar with role icon overlay */}
        <span className="relative flex-shrink-0">
          {isFixed ? (
            <span className="p-[2px] rounded-full inline-flex bg-gradient-to-br from-amber-400 via-orange-400 to-amber-600">
              <span className="w-7 h-7 rounded-full bg-primary-100 text-primary-800 flex items-center
                justify-center text-xs font-bold select-none ring-[1.5px] ring-white overflow-hidden">
                {profileImageUrl
                  ? <img src={profileImageUrl} alt="" className="w-full h-full object-cover" />
                  : (user?.nickname?.[0]?.toUpperCase() ?? '?')}
              </span>
            </span>
          ) : (
            <span className="w-7 h-7 rounded-full bg-primary-100 text-primary-800 flex items-center
              justify-center text-xs font-bold select-none overflow-hidden">
              {profileImageUrl
                ? <img src={profileImageUrl} alt="" className="w-full h-full object-cover" />
                : (user?.nickname?.[0]?.toUpperCase() ?? '?')}
            </span>
          )}
          {user?.role === 'MEMBER' && (
            <span className="absolute -bottom-1 -left-1 bg-white rounded-full ring-1 ring-white flex items-center justify-center">
              <LevelIcon level={user.currentLevel ?? 1} size={13} />
            </span>
          )}
          {user?.role === 'ADMIN' && (
            <span className="absolute -bottom-1 -left-1 bg-white rounded-full ring-1 ring-white flex items-center justify-center">
              <AdminIcon size={13} />
            </span>
          )}
          {(user?.role === 'PARTNER' || user?.role === 'SUPER_ADMIN') && (
            <span className="absolute -bottom-1 -left-1 bg-white rounded-full ring-1 ring-white flex items-center justify-center">
              <DistilleryIcon size={13} />
            </span>
          )}
        </span>
        <span className="hidden sm:flex flex-col items-start leading-none">
          <span className="max-w-[120px] truncate text-sm font-medium text-neutral-800">{user?.nickname}</span>
          {user?.role === 'MEMBER' && user?.currentLevel != null && (
            <span className="text-[10px] text-amber-500 font-semibold mt-0.5">
              {t('nav.maturingPower', { level: user.currentLevel, power: (user.maturingPower ?? 0).toLocaleString() })}
            </span>
          )}
        </span>
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

          {(user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' ||
            (user?.role === 'PARTNER' && user.allowedMenus && user.allowedMenus.length > 0)
          ) && (
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
              {user?.role === 'PARTNER' ? '파트너 콘솔' : t('nav.admin')}
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
  const { isLoggedIn } = useAuthStore()

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      {/* 헤더 */}
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center gap-4">
          {/* 로고 */}
          <Link to="/" className="flex items-center gap-2 flex-shrink-0">
            <img src="/logo.png" alt="DrinkIndex" className="h-8 w-auto" />
            <span className="text-xl font-bold text-primary-800 tracking-tight">DrinkIndex</span>
          </Link>

          {/* 언어 토글 */}
          <LangToggle />

          {/* PC 검색바 */}
          <HeaderSearch />

          {/* 우측 액션 */}
          <div className="flex items-center gap-2 ml-auto flex-shrink-0">
            {isLoggedIn && <NotificationBell />}
            <UserDropdown />
          </div>
        </div>
      </header>

      {/* GNB */}
      <GNB />

      {/* 비밀번호 변경 권고 배너 */}
      <PasswordChangeBanner />

      {/* 본문 */}
      <main className="flex-1 pb-16 lg:pb-0">
        <Outlet />
      </main>

      {/* 푸터 (PC only) */}
      <footer className="hidden lg:block bg-white border-t border-neutral-200 py-6">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-center items-start gap-16 mb-5">
            {/* 로고 + 태그라인 */}
            <div>
              <Link to="/" className="inline-block text-sm font-bold text-primary-800 tracking-tight mb-1">
                DrinkIndex
              </Link>
              <p className="text-xs text-neutral-400">{t('app.tagline')}</p>
            </div>

            {/* 탐색 */}
            <div>
              <p className="text-xs font-bold text-neutral-700 mb-2">{t('footer.explore')}</p>
              <ul className="space-y-1.5">
                <li><Link to="/spirits" className="text-xs text-neutral-500 hover:text-primary-800 transition-colors">{t('nav.spirits')}</Link></li>
                <li><Link to="/community/free" className="text-xs text-neutral-500 hover:text-primary-800 transition-colors">{t('menu.communityBoard')}</Link></li>
                <li><Link to="/notices" className="text-xs text-neutral-500 hover:text-primary-800 transition-colors">{t('menu.notice')}</Link></li>
                <li><Link to="/request/spirit" className="text-xs text-neutral-500 hover:text-primary-800 transition-colors">{t('menu.requestSpirit')}</Link></li>
                <li><Link to="/faq" className="text-xs text-neutral-500 hover:text-primary-800 transition-colors">{t('menu.faq')}</Link></li>
              </ul>
            </div>

            {/* 정보 */}
            <div>
              <p className="text-xs font-bold text-neutral-700 mb-2">{t('footer.info')}</p>
              <ul className="space-y-1.5">
                <li><a href="/terms" className="text-xs text-neutral-500 hover:text-primary-800 transition-colors">{t('footer.terms')}</a></li>
                <li><a href="/privacy" className="text-xs text-neutral-500 hover:text-neutral-700 transition-colors">{t('footer.privacy')}</a></li>
                <li><Link to="/inquiry" className="text-xs text-neutral-500 hover:text-neutral-700 transition-colors">{t('footer.inquiry')}</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-neutral-100 pt-4 text-center">
            <p className="text-xs text-neutral-400">© 2026 DrinkIndex. All rights reserved.</p>
            <p className="text-xs text-neutral-400">지나친 음주는 뇌졸중, 기억력 손상이나 치매를 유발합니다.</p>
          </div>
        </div>
      </footer>

      {/* 모바일 하단 탭 네비게이션 */}
      <BottomNav />

      {/* 로그인 출석 체크 토스트 */}
      <AttendanceToastHandler />

      {/* 쪽지 보내기 플로팅 팝업 */}
      {isLoggedIn && <MessagePopup />}

      {/* 임시 비밀번호 강제 변경 모달 (필요 시 자동 노출) */}
      <ForcePasswordChangeModal />
    </div>
  )
}
