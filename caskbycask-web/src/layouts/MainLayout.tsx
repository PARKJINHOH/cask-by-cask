import { Fragment, useState, useRef, useEffect, useMemo, Suspense, lazy } from 'react'
import { Outlet, Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'

import RouteFallback from '@/shared/components/RouteFallback'
import RouteTransition from '@/shared/components/RouteTransition'
import PageIndicator from '@/shared/components/PageIndicator'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/domain/auth/store/authStore'
import { useAuth } from '@/domain/auth/hooks/useAuth'
import { loginRouteState } from '@/domain/auth/hooks/useRequireLogin'
import { useMe } from '@/domain/user/hooks/useUser'
import { changeLanguage } from '@/shared/utils/locale'
import BottomNav from '@/shared/components/BottomNav'
import { useChromeTop } from '@/shared/hooks/useChromeTop'
import { useImmersiveEditing } from '@/shared/hooks/useImmersiveEditing'
import Toast from '@/shared/components/Toast'
import { useToast } from '@/shared/hooks/useToast'
import { useLatestNotice } from '@/domain/notice/hooks/useNotices'
import { GNB_MENUS, filterVisibleGnbMenus, isGnbGroup } from '@/domain/gnb-menu/constants/gnbMenu'
import type { GnbChild, GnbItem } from '@/domain/gnb-menu/constants/gnbMenu'
import { useGnbHiddenKeys } from '@/domain/gnb-menu/hooks/useGnbMenus'
import NotificationBell from '@/domain/notification/components/NotificationBell'
import MessagePopup from '@/domain/message/components/MessagePopup'
import LevelBadge from '@/shared/components/LevelBadge'
import DefaultAvatar from '@/shared/components/DefaultAvatar'
import AdminIcon from '@/shared/components/icons/AdminIcon'
import ProducerIcon from '@/shared/components/icons/ProducerIcon'
import InstagramIcon from '@/shared/components/icons/InstagramIcon'
import ThreadsIcon from '@/shared/components/icons/ThreadsIcon'
import { SITE_SOCIAL_LINKS } from '@/shared/config/site'
import AttendanceButton from '@/domain/score/components/AttendanceButton'
import axios from 'axios'
import { spiritApi } from '@/domain/spirit/api/spiritApi'
import type { SpiritAutocompleteItem } from '@/domain/spirit/types/spirit.types'
import { getSpiritListDisplayNames } from '@/domain/spirit/utils/spiritDisplayName'
import { getSpiritDetailPath } from '@/domain/spirit/utils/spiritUrl'
import { SEARCH_DEBOUNCE_MS } from '@/shared/hooks/useDebouncedValue'
import { scrollToPageTop } from '@/shared/utils/scrollToPageTop'

// 임시 비밀번호 발급 사용자에게만 열리는 모달. 평소에는 null 을 반환한다.
// 정적 import 하면 zod/@hookform/resolvers 가 모든 페이지의 초기 번들에 포함되므로 지연 로드한다.
const ForcePasswordChangeModal = lazy(() => import('@/domain/user/components/ForcePasswordChangeModal'))


const SEEN_KEY = 'notice:lastSeenId'

function SocialFooterLinks({ className = '' }: { className?: string }) {
  const { t } = useTranslation()

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <a
        href={SITE_SOCIAL_LINKS[0].url}
        target="_blank"
        rel="me noopener noreferrer"
        aria-label={t('footer.instagramAria')}
        title={t('footer.instagramAria')}
        className="inline-flex size-10 items-center justify-center rounded-full border border-neutral-200 text-neutral-500 transition-colors hover:border-neutral-900 hover:bg-neutral-900 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-700"
      >
        <InstagramIcon size={21} />
      </a>
      <a
        href={SITE_SOCIAL_LINKS[1].url}
        target="_blank"
        rel="me noopener noreferrer"
        aria-label={t('footer.threadsAria')}
        title={t('footer.threadsAria')}
        className="inline-flex size-10 items-center justify-center rounded-full border border-neutral-200 text-neutral-500 transition-colors hover:border-neutral-900 hover:bg-neutral-900 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-700"
      >
        <ThreadsIcon size={22} />
      </a>
    </div>
  )
}

// ── 출석 체크 토스트 핸들러 ──────────────────────────────────────
// 로그인 직후 authStore에 적재된 pendingAttendanceToast를 소비하여 토스트 표시
function AttendanceToastHandler() {
  const { pendingAttendanceToast, setPendingAttendanceToast } = useAuthStore()
  const { toasts, showToast, removeToast } = useToast()

  useEffect(() => {
    if (!pendingAttendanceToast) return

    const { streakCount, bonusAwarded } = pendingAttendanceToast

    showToast(
      `🥃 출석 체크! ${streakCount}일 연속`,
      'success',
    )

    if (bonusAwarded === 'STREAK_30') {
      setTimeout(() => showToast('🏆 30일 연속 출석 달성! 특별 보너스 지급', 'success'), 600)
    } else if (bonusAwarded === 'STREAK_7') {
      setTimeout(() => showToast('🎉 7일 연속 출석 보너스 지급!', 'success'), 600)
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
  const { isLoggedIn, isAuthReady } = useAuthStore()
  const { data: profile } = useMe()
  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem(PW_REMINDER_DISMISS_KEY) === '1',
  )

  if (!isAuthReady || !isLoggedIn || !profile?.passwordChangeRequired || dismissed) return null

  const handleDismiss = () => {
    sessionStorage.setItem(PW_REMINDER_DISMISS_KEY, '1')
    setDismissed(true)
  }

  return (
    <div className="bg-amber-50 border-b border-amber-200">
      <div className="user-layout-container px-4 py-2 flex items-center gap-3 text-sm">
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
// 메뉴 목록은 gnbMenu.ts 카탈로그가 소유하고, 노출 여부만 관리자 설정(DB)이 정한다.

/**
 * 마우스 hover 로만 드롭다운을 열고 닫기 위한 포인터 판별.
 *
 * 터치 디바이스는 탭 한 번에 pointerenter → focus → click 이 연달아 발생한다.
 * pointerenter 로 열어버리면 직후의 click 이 "이미 열려 있음"으로 판단해 즉시 닫아
 * 모바일에서 드롭다운이 아예 열리지 않는다. 따라서 hover 계열 핸들러는
 * 실제 마우스 입력일 때만 동작시키고, 터치·펜 입력은 click 토글에 맡긴다.
 */
function isMousePointer(event: React.PointerEvent): boolean {
  return event.pointerType === 'mouse'
}

function GNB() {
  const { t } = useTranslation()
  const location = useLocation()
  const [open, setOpen] = useState<string | null>(null)
  const [dropdownLeft, setDropdownLeft] = useState(0)
  const navRef = useRef<HTMLElement>(null)

  // 드롭다운: 외부 클릭 / ESC 로 닫기 (터치·키보드 접근성)
  useEffect(() => {
    if (!open) return
    const onDocClick = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setOpen(null)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(null)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const { data: latestNotice } = useLatestNotice()
  const lastSeenId = Number(localStorage.getItem(SEEN_KEY) ?? 0)
  const hasUnread = latestNotice != null && latestNotice.id > lastSeenId

  // 관리자가 숨긴 메뉴는 여기서 걸러진다. 조회 실패 시 빈 배열 → 전 메뉴 노출.
  const { data: hiddenKeys } = useGnbHiddenKeys()
  const menus = useMemo(
    () => filterVisibleGnbMenus(GNB_MENUS, new Set(hiddenKeys ?? [])),
    [hiddenKeys],
  )

  const activeDropdown = open
    ? menus.find((menu): menu is Extract<GnbItem, { children: GnbChild[] }> => menu.key === open && isGnbGroup(menu))
    : undefined

  const isPathActive = (to: string) => {
    if (to === '/spirits') return location.pathname.startsWith('/spirits')
    return location.pathname === to || location.pathname.startsWith(`${to}/`)
  }

  const isGroupActive = (children: GnbChild[]) => children.some((child) => isPathActive(child.to))

  const openDropdown = (key: string, anchor: HTMLElement) => {
    const nav = navRef.current
    if (nav) {
      const navRect = nav.getBoundingClientRect()
      const anchorRect = anchor.getBoundingClientRect()
      const menuWidth = 160
      const edgeGap = 8
      setDropdownLeft(Math.min(
        Math.max(edgeGap, anchorRect.left - navRect.left),
        Math.max(edgeGap, navRect.width - menuWidth - edgeGap),
      ))
    }
    setOpen(key)
  }

  const itemCls = (active: boolean) =>
    `relative inline-flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-3 py-3 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap
    after:absolute after:inset-x-1.5 after:bottom-0 after:h-0.5 after:rounded-full after:transition-colors sm:after:inset-x-3
    ${active ? 'text-primary-800 after:bg-primary-700' : 'text-neutral-600 after:bg-transparent hover:text-primary-800'}`

  return (
    <nav
      ref={navRef}
      className="bg-canvas border-b-2 border-neutral-200 sticky top-16 z-30"
      onPointerLeave={(event) => { if (isMousePointer(event)) setOpen(null) }}
    >
      <div
        className="user-layout-container overflow-x-auto overscroll-x-contain px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        onScroll={() => setOpen(null)}
      >
        <ul className="flex min-w-max items-center gap-0.5 py-1 sm:gap-1">
          {menus.map(menu => {
            if (!isGnbGroup(menu)) {
              const isNotice  = menu.badge === 'notice'
              const isSpirits = menu.variant === 'cta'
              const isActive = isPathActive(menu.to)
              return (
                <li
                  key={menu.key}
                  className={`flex items-center ${isSpirits ? 'mr-1' : ''}`}
                  onPointerEnter={(event) => { if (isMousePointer(event)) setOpen(null) }}
                >
                  <Link
                    to={menu.to}
                    className={
                      isSpirits
                        ? `inline-flex items-center px-2 sm:px-3.5 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold rounded-lg text-white transition-colors whitespace-nowrap ${isActive ? 'bg-primary-900 ring-2 ring-primary-300 ring-offset-1' : 'bg-primary-800 hover:bg-primary-900'}`
                        : itemCls(isActive)
                    }
                  >
                    {t(menu.labelKey)}
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
            const isActive = isGroupActive(menu.children)
            return (
              <li
                key={menu.key}
                className="relative"
                onPointerEnter={(event) => {
                  if (isMousePointer(event)) openDropdown(menu.key, event.currentTarget)
                }}
              >
                <button
                  className={itemCls(isOpen || isActive)}
                  onClick={(event) => isOpen
                    ? setOpen(null)
                    : openDropdown(menu.key, event.currentTarget)}
                  aria-haspopup="true"
                  aria-expanded={isOpen}
                >
                  {t(menu.labelKey)}
                  <svg
                    className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

              </li>
            )
          })}
          <li
            className="ml-auto flex-shrink-0"
            onPointerEnter={(event) => { if (isMousePointer(event)) setOpen(null) }}
          >
            <Link
              to="/calendar"
              className={`inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-lg
                border transition-colors whitespace-nowrap ${isPathActive('/calendar')
                  ? 'border-primary-400 bg-primary-50 text-primary-800'
                  : 'border-neutral-300 text-neutral-600 hover:text-primary-800 hover:border-primary-300'}`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <span className="hidden sm:inline">{t('menu.calendar')}</span>
            </Link>
          </li>
        </ul>
      </div>

      {/*
        드롭다운은 열린 메뉴 하나만 마운트되므로, 하위 메뉴 주소가 평소에는 DOM 에 존재하지 않는다.
        크롤러는 hover 도 클릭도 하지 않기 때문에 이미지 갤러리·자유게시판 같은 섹션이
        렌더링된 문서에서 유입 링크 0개가 되어 sitemap 말고는 발견 경로가 없어진다.
        화면 구성은 그대로 두고, DOM 에는 항상 남는 목록을 함께 둔다
        (스크린리더에는 읽히므로 섹션 이동 수단으로도 쓰인다).
      */}
      <nav aria-label={t('menu.community')} className="sr-only">
        <ul>
          {/* 숨긴 메뉴가 DOM 에 남지 않도록 필터를 통과한 menus 를 그대로 쓴다. */}
          {menus.flatMap((menu) => (isGnbGroup(menu) ? menu.children : [menu]))
            .filter((item) => !('comingSoon' in item && item.comingSoon))
            .map((item) => (
              <li key={item.key}>
                <Link to={item.to}>{t(item.labelKey)}</Link>
              </li>
            ))}
          <li><Link to="/calendar">{t('menu.calendar')}</Link></li>
        </ul>
      </nav>

      {activeDropdown && (
        <div
          className="absolute top-full w-40 pt-1 z-50"
          style={{ left: dropdownLeft }}
        >
          <div className="bg-white rounded-xl shadow-lg border border-neutral-100 py-1">
            {activeDropdown.children.map((child, index) => {
              const startsGallerySection = child.section === 'gallery'
                && activeDropdown.children[index - 1]?.section !== 'gallery'

              return (
                <Fragment key={child.key}>
                  {startsGallerySection && (
                    <div aria-hidden="true" className="mx-auto my-1 h-px w-8 bg-neutral-200" />
                  )}
                  {child.comingSoon ? (
                    <span className="flex items-center justify-between px-4 py-2 text-sm text-neutral-400 cursor-default select-none">
                      {t(child.labelKey)}
                      <span className="text-xs bg-neutral-100 text-neutral-400 px-1.5 py-0.5 rounded">
                        준비중
                      </span>
                    </span>
                  ) : (
                    <Link
                      to={child.to}
                      onClick={() => setOpen(null)}
                      className="flex items-center px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 hover:text-primary-800 transition-colors"
                    >
                      {t(child.labelKey)}
                    </Link>
                  )}
                </Fragment>
              )
            })}
          </div>
        </div>
      )}
    </nav>
  )
}

// ── 언어 토글 버튼 ────────────────────────────────────────────

function LangToggle() {
  const { i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const selectLang = (lang: string) => {
    changeLanguage(lang as 'ko' | 'en')
    setOpen(false)
  }

  const languages = [
    { code: 'ko', label: '한국어 (KO)' },
    { code: 'en', label: 'English (EN)' },
  ]

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="언어 선택 / Select Language"
        className="flex items-center justify-center p-2 rounded-lg text-neutral-500 hover:text-primary-800 hover:bg-neutral-100 transition-all duration-150 select-none cursor-pointer"
      >
        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-1.5 w-32 bg-white rounded-lg shadow-lg border border-neutral-100 py-1 z-50">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => selectLang(lang.code)}
              className={`w-full text-left px-3 py-2 text-xs font-semibold hover:bg-neutral-50 transition-colors cursor-pointer
                ${i18n.language === lang.code ? 'text-primary-800 bg-primary-50/50' : 'text-neutral-600'}`}
            >
              {lang.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function GuestLangToggle() {
  const { i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const selectLang = (lang: string) => {
    changeLanguage(lang as 'ko' | 'en')
    setOpen(false)
  }

  const languages = [
    { code: 'ko', label: 'KO' },
    { code: 'en', label: 'EN' },
  ]

  return (
    <div ref={ref} className="relative inline-flex flex-shrink-0">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="언어 선택 / Select Language"
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-300 bg-white text-neutral-500 transition-colors hover:border-neutral-400 hover:bg-neutral-50 hover:text-primary-800 select-none cursor-pointer"
      >
        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1.5 w-24 bg-white rounded-lg shadow-lg border border-neutral-100 py-1 z-50">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => selectLang(lang.code)}
              className={`w-full text-left px-3 py-1.5 text-xs font-semibold hover:bg-neutral-50 transition-colors cursor-pointer
                ${i18n.language === lang.code ? 'text-primary-800 bg-primary-50/50' : 'text-neutral-600'}`}
            >
              {lang.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── PC 헤더 검색바 ────────────────────────────────────────────

function HeaderSearch() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [value, setValue] = useState('')
  const [results, setResults] = useState<SpiritAutocompleteItem[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const cacheRef = useRef<Map<string, SpiritAutocompleteItem[]>>(new Map())
  const abortControllerRef = useRef<AbortController | null>(null)
  const debounceTimeoutRef = useRef<number | NodeJS.Timeout | null>(null)

  const keywordParam = searchParams.get('keyword') ?? ''

  // URL의 keyword가 바뀌면 검색어 입력창 상태와 동기화 (네이버 검색 방식)
  useEffect(() => {
    setValue(keywordParam)
  }, [keywordParam])

  const handleSearchRedirect = (kw: string) => {
    navigate(kw ? `/spirits?keyword=${encodeURIComponent(kw)}` : '/spirits')
    setIsOpen(false)
  }

  const handleItemClick = (item: SpiritAutocompleteItem) => {
    const displayName = getSpiritListDisplayNames(item)
    navigate(getSpiritDetailPath(item, i18n.language))
    setValue(displayName.nameKo)
    setIsOpen(false)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleSearchRedirect(value.trim())
    scrollToPageTop(e.currentTarget as HTMLFormElement)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setValue(val)

    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current as number)
    }

    const kw = val.trim()
    if (kw.length < 2) {
      setResults([])
      setIsOpen(false)
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      return
    }

    debounceTimeoutRef.current = setTimeout(async () => {
      // 1. 로컬 메모리 캐시 체크
      if (cacheRef.current.has(kw)) {
        setResults(cacheRef.current.get(kw) || [])
        setIsOpen(true)
        return
      }

      // 2. 이전 API 요청 취소 (AbortController)
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      const controller = new AbortController()
      abortControllerRef.current = controller
      setIsLoading(true)

      try {
        const res = await spiritApi.autocomplete(kw, controller.signal)
        const items = res.data.data ?? []
        cacheRef.current.set(kw, items)
        setResults(items)
        setIsOpen(true)
      } catch (err: any) {
        if (err.name !== 'CanceledError' && err.name !== 'AbortError' && !axios.isCancel(err)) {
          console.error('Failed to autocomplete spirits:', err)
        }
      } finally {
        if (abortControllerRef.current === controller) {
          setIsLoading(false)
        }
      }
    }, SEARCH_DEBOUNCE_MS)
  }

  const handleFocus = () => {
    if (value.trim().length >= 2) {
      setIsOpen(true)
    }
  }

  const handleBlur = () => {
    setTimeout(() => {
      setIsOpen(false)
    }, 200)
  }

  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current as number)
      if (abortControllerRef.current) abortControllerRef.current.abort()
    }
  }, [])

  return (
    <form onSubmit={handleSubmit} className="hidden lg:flex flex-1 max-w-md mx-6 relative">
      <div className="relative w-full">
        <input
          type="search"
          value={value}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={t('spirit.search.placeholder')}
          className="w-full pl-4 pr-10 py-2 text-sm border border-neutral-300 rounded-xl bg-neutral-50
            focus:outline-none focus:ring-2 focus:ring-primary-400 focus:bg-white focus:border-transparent
            transition-colors placeholder:text-neutral-400"
        />
        <button
          type="submit"
          aria-label={t('nav.search')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-primary-600 transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </button>
      </div>

      {/* 자동완성 글래스모피즘 드롭다운 */}
      {isOpen && (results.length > 0 || isLoading) && (
        <div
          className="absolute top-full left-0 right-0 mt-2 z-50 bg-white/90 backdrop-blur-md border border-neutral-200/80 rounded-2xl shadow-xl overflow-hidden max-h-96 overflow-y-auto"
          onMouseDown={(e) => e.preventDefault()}
        >
          {isLoading && results.length === 0 ? (
            <div className="p-4 text-center text-sm text-neutral-500">
              {t('spirit.search.loading', '검색 중...')}
            </div>
          ) : results.length > 0 ? (
            <ul className="py-2">
              {results.map((item) => {
                const displayName = getSpiritListDisplayNames(item)
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => handleItemClick(item)}

                      className="w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-neutral-50/50 transition-colors"
                    >
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={displayName.nameKo}
                          className="w-10 h-10 object-contain rounded bg-white flex-shrink-0 border border-neutral-100"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded bg-neutral-100/50 flex items-center justify-center text-neutral-400 flex-shrink-0 text-[10px]">
                          No Image
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-neutral-800 truncate">
                          {displayName.nameKo}
                        </div>
                        <div className="text-xs text-neutral-400 truncate">
                          {displayName.nameEn}
                        </div>
                      </div>
                      <span className="text-[10px] font-semibold bg-primary-50 text-primary-800 px-2 py-0.5 rounded-full flex-shrink-0">
                        {t(`category.${item.category.toLowerCase()}`, item.category)}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          ) : null}
        </div>
      )}
    </form>
  )
}


// ── 사용자 드롭다운 ───────────────────────────────────────────

function UserDropdown() {
  const { t } = useTranslation()
  const { user, isLoggedIn, isAuthReady, setUser } = useAuthStore()
  const { logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { data: profile } = useMe()
  const isFixed = profile?.nicknameFixed === true
  const profileImageUrl = profile?.profileImageUrl ?? user?.profileImageUrl
  const avatarSeed = String(user?.id ?? user?.nickname ?? '?')

  // 레벨업/숙성력 변동이 authStore(헤더 표시용)에 즉시 반영되도록 동기화
  useEffect(() => {
    if (!profile || !user) return
    if (profile.currentLevel !== user.currentLevel || profile.maturingPower !== user.maturingPower) {
      setUser({ ...user, currentLevel: profile.currentLevel, maturingPower: profile.maturingPower })
    }
  }, [profile, user, setUser])

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

  if (!isAuthReady || (isLoggedIn && !user && !profile)) {
    return (
      <div className="flex items-center gap-2" aria-hidden="true">
        <div className="w-7 h-7 rounded-full bg-neutral-100 animate-pulse" />
        <div className="hidden sm:block w-20 h-4 rounded bg-neutral-100 animate-pulse" />
      </div>
    )
  }

  if (!isLoggedIn) {
    return (
      <div className="flex items-center gap-1 sm:gap-2">
        <GuestLangToggle />
        <div className="inline-flex h-8 items-center overflow-hidden rounded-[var(--radius-control)] border border-neutral-300 bg-white">
          <Link
            to="/login"
            // 헤더에서 로그인해도 보던 페이지로 돌아온다.
            state={loginRouteState(location)}
            className="inline-flex h-full items-center px-2.5 text-sm font-medium text-neutral-700
              transition-colors whitespace-nowrap hover:bg-neutral-50 hover:text-primary-800 sm:px-3.5"
          >
            {t('nav.login')}
          </Link>
          <Link
            to="/signup"
            className="inline-flex h-full items-center border-l border-primary-800 bg-primary-800 px-2.5 text-sm font-semibold text-white
              transition-colors whitespace-nowrap hover:border-primary-900 hover:bg-primary-900 sm:px-3.5"
          >
            {t('nav.signup')}
          </Link>
        </div>
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
                  : <DefaultAvatar seed={avatarSeed} px={16} />}
              </span>
            </span>
          ) : (
            <span className="w-7 h-7 rounded-full bg-primary-100 text-primary-800 flex items-center
              justify-center text-xs font-bold select-none overflow-hidden">
              {profileImageUrl
                ? <img src={profileImageUrl} alt="" className="w-full h-full object-cover" />
                : <DefaultAvatar seed={avatarSeed} px={16} />}
            </span>
          )}
          {user?.role === 'ADMIN' && (
            <span className="absolute -bottom-1 -left-1 bg-white rounded-full ring-1 ring-white flex items-center justify-center">
              <AdminIcon size={13} />
            </span>
          )}
          {(user?.role === 'PARTNER' || user?.role === 'SUPER_ADMIN') && (
            <span className="absolute -bottom-1 -left-1 bg-white rounded-full ring-1 ring-white flex items-center justify-center">
              <ProducerIcon size={13} />
            </span>
          )}
        </span>
        <span className="hidden sm:flex items-center gap-1">
          <span className="max-w-[120px] truncate text-sm font-medium text-neutral-800">{user?.nickname}</span>
          {user?.role === 'MEMBER' && (
            <LevelBadge level={user.currentLevel ?? 1} size={16} />
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
  const { isLoggedIn, isAuthReady } = useAuthStore()
  const { data: profile } = useMe()
  const showAuthedActions = isAuthReady && isLoggedIn
  // 모바일에서 글을 쓰는 동안에는 헤더·GNB·하단 탭을 걷어내 편집 영역을 넓힌다.
  const immersive = useImmersiveEditing()
  // 헤더+GNB 높이를 --di-chrome-top 으로 흘려 보낸다. 본문 안의 sticky 요소
  // (에디터 툴바 등)가 이 둘 뒤로 숨지 않으려면 그만큼 아래에 붙어야 한다.
  // 껍데기를 접은 동안에는 잴 대상이 없으므로 0 으로 내려 준다.
  useChromeTop(!immersive)
  // lazy 컴포넌트는 렌더되는 순간 청크를 내려받으므로, 모달 내부의 조건 검사만으로는
  // 번들 분리 효과가 없다. 실제로 강제 변경이 필요한 사용자일 때만 마운트한다.
  const needsPasswordChange = showAuthedActions && Boolean(profile?.mustChangePassword)

  return (
    <div className="min-h-screen bg-canvas flex flex-col">
      {/* 헤더 */}
      <header className={`bg-canvas border-b border-neutral-200 sticky top-0 z-40 ${immersive ? 'hidden' : ''}`}>
        <div className="user-layout-container px-4 h-16 flex items-center gap-2 sm:gap-4">
          {/* 로고 */}
          <Link to="/" className="flex items-center gap-1 sm:gap-2 flex-shrink-0 -my-2">
            <img src="/logo.png" alt="CaskByCask" className="h-10 sm:h-15 w-auto" />
            <span className="flex flex-col leading-none tracking-tight">
              <span className="text-[18px] sm:text-[24px] font-bold">
                <span className="text-primary-800">캐</span>
                <span className="text-primary-600">바</span>
                <span className="text-primary-800">캐</span>
              </span>
              <span className="text-[14px] sm:text-[20px] font-bold">
                <span className="text-primary-800">Cask</span>
                <span className="text-primary-600">By</span>
                <span className="text-primary-800">Cask</span>
              </span>
            </span>
          </Link>



          {/* PC 검색바 */}
          <HeaderSearch />

          {/* 우측 액션 */}
          <div className="flex items-center gap-1 sm:gap-2 ml-auto flex-shrink-0">
            {showAuthedActions && <AttendanceButton />}
            {showAuthedActions && <NotificationBell />}
            {/* 비로그인 상태의 언어 전환은 UserDropdown 안의 GuestLangToggle 이 맡는다 —
                여기서 함께 띄우면 토글이 두 개로 보인다 */}
            {showAuthedActions && <LangToggle />}
            <UserDropdown />
          </div>
        </div>
      </header>

      {/* GNB */}
      {!immersive && <GNB />}

      {/* 비밀번호 변경 권고 배너 */}
      <PasswordChangeBanner />

      {/* 사용자 페이지 공통 메뉴 위치 표시 및 뒤로가기 */}
      <PageIndicator />

      {/* 본문 */}
      <main className="user-content-container flex-1 pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0">
        <Suspense fallback={<RouteFallback />}>
          <RouteTransition>
            <Outlet />
          </RouteTransition>
        </Suspense>
      </main>

      {/* 푸터 (PC only) */}
      <footer className="hidden lg:block border-t border-neutral-200 bg-canvas py-5">
        <div className="user-layout-container px-4">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            {/* 로고 + 태그라인 */}
            <div className="text-center xl:text-left">
              <Link to="/" className="inline-block text-sm font-bold text-primary-800 tracking-tight mb-1">
                CaskByCask
              </Link>
              <p className="text-xs text-neutral-400">{t('app.tagline')}</p>
              <p className="text-xs text-neutral-400">{t('footer.brandAlias')}</p>
              <SocialFooterLinks className="mt-3 justify-center xl:justify-start" />
            </div>

            {/* GNB와 중복되지 않는 푸터 전용 링크 */}
            <div className="flex flex-col items-center gap-3 xl:items-end">
              <div className="flex items-center gap-3">
                <p className="text-xs font-bold text-neutral-700">{t('footer.support')}</p>
                <ul className="flex items-center gap-3">
                  <li>
                    <Link to="/about" className="text-xs text-neutral-500 transition-colors hover:text-primary-800">
                      {t('footer.about')}
                    </Link>
                  </li>
                  <li className="border-l border-neutral-200 pl-3">
                    <Link to="/faq" className="text-xs text-neutral-500 transition-colors hover:text-primary-800">
                      {t('menu.faq')}
                    </Link>
                  </li>
                  <li className="border-l border-neutral-200 pl-3">
                    <Link to="/inquiry" className="text-xs text-neutral-500 transition-colors hover:text-primary-800">
                      {t('footer.inquiry')}
                    </Link>
                  </li>
                </ul>
              </div>

              <div className="flex items-center gap-3">
                <p className="text-xs font-bold text-neutral-700">{t('footer.policy')}</p>
                <ul className="flex items-center gap-3">
                  <li>
                    <a href="/terms" className="text-xs text-neutral-500 transition-colors hover:text-primary-800">
                      {t('footer.terms')}
                    </a>
                  </li>
                  <li className="border-l border-neutral-200 pl-3">
                    <a href="/privacy" className="text-xs text-neutral-500 transition-colors hover:text-primary-800">
                      {t('footer.privacy')}
                    </a>
                  </li>
                  <li className="border-l border-neutral-200 pl-3">
                    <a href="/operation-policy" className="text-xs text-neutral-500 transition-colors hover:text-primary-800">
                      {t('footer.operationPolicy')}
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-1 border-t border-neutral-100 pt-4 text-center">
            <p className="text-xs text-neutral-400">{t('footer.copyright')}</p>
            <p className="text-xs text-neutral-400">{t('footer.drinkWarning')}</p>
          </div>
        </div>
      </footer>

      {/* 모바일 소셜 푸터 — main 밖이라 main 의 하단 여백을 물려받지 못한다.
          문서 맨 끝까지 스크롤하면 고정 탭바(h-16)가 이 자리를 덮으므로 직접 비워 둔다. */}
      <footer className="border-t border-neutral-200 bg-canvas pt-5 pb-[calc(1.25rem+4rem+env(safe-area-inset-bottom))] lg:hidden">
        <div className="user-layout-container flex flex-col items-center gap-3 px-4">
          <p className="text-xs font-bold text-neutral-700">CaskByCask</p>
          {/* 별칭 줄은 PC 푸터에만 있었다. 서버 폴백(SeoFallback)이 모든 화면 폭에서 이 줄을
              내보내므로, 모바일에도 같은 문구가 있어야 화면과 서버 HTML 이 어긋나지 않는다. */}
          <p className="-mt-2 text-xs text-neutral-400">{t('footer.brandAlias')}</p>
          <Link to="/about" className="text-xs text-neutral-500 hover:text-primary-700">
            {t('footer.about')}
          </Link>
          <SocialFooterLinks />
        </div>
      </footer>

      {/* 모바일 하단 탭 네비게이션 — 글 쓰는 동안에는 키보드 위를 가리므로 접는다 */}
      {!immersive && <BottomNav />}

      {/* 로그인 출석 체크 토스트 */}
      <AttendanceToastHandler />

      {/* 쪽지 보내기 플로팅 팝업 */}
      {showAuthedActions && <MessagePopup />}

      {/* 임시 비밀번호 강제 변경 모달 (필요 시 자동 노출) */}
      {needsPasswordChange && (
        <Suspense fallback={null}>
          <ForcePasswordChangeModal />
        </Suspense>
      )}
    </div>
  )
}
