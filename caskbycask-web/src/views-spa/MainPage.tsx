import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import SeoMeta, { buildCanonical } from '@/shared/components/SeoMeta'
import { spiritApi } from '@/domain/spirit/api/spiritApi'
import { eventApi } from '@/domain/event/api/eventApi'
import { useBanners } from '@/domain/banner/hooks/useBanners'
import { usePopups } from '@/domain/popup/hooks/usePopups'
import { useNotices, usePinnedNotices } from '@/domain/notice/hooks/useNotices'
import { usePosts } from '@/domain/community/hooks/usePosts'
import { PopupViewer } from '@/domain/popup/components/PopupViewer'
import BannerSlider from '@/domain/banner/components/BannerSlider'
import SpiritCard from '@/shared/components/SpiritCard'
import AdultBadge from '@/shared/components/AdultBadge'
import { formatBoardDate } from '@/shared/utils/format'
import type { SpiritListItem } from '@/domain/spirit/types/spirit.types'
import type { NoticeListItem } from '@/domain/notice/types/notice.types'
import type { PostListItem } from '@/domain/community/types/community.types'

// ── 카테고리 메뉴 데이터 ─────────────────────────────────────────
const CATEGORY_MENU = [
  {
    key: 'WHISKY',
    image: '/images/whisky-category.png',
    imageWebp: '/images/whisky-category.webp',
    subtitle: 'Single Malt · Blended · Bourbon',
    dot: 'bg-amber-500',
    grad: 'from-amber-900 via-amber-800 to-stone-900',
  },
  {
    key: 'COGNAC',
    image: '/images/cognac-category.png',
    imageWebp: '/images/cognac-category.webp',
    subtitle: 'VS · VSOP · XO · Hors d\'Âge',
    dot: 'bg-stone-500',
    grad: 'from-stone-800 via-amber-900 to-stone-900',
  },
  {
    key: 'WINE',
    image: '/images/wine-category.png',
    imageWebp: '/images/wine-category.webp',
    subtitle: 'Red · White · Rosé · Sparkling',
    dot: 'bg-rose-500',
    grad: 'from-rose-950 via-rose-900 to-stone-900',
  },
  {
    key: 'OTHER',
    image: '/images/etc-category.png',
    imageWebp: '/images/etc-category.webp',
    subtitle: 'Rum · Gin · Tequila · Vodka',
    dot: 'bg-neutral-400',
    grad: 'from-neutral-800 via-neutral-700 to-stone-800',
  },
] as const

// ── 섹션 헤더 ────────────────────────────────────────────────────
function SectionHeader({
  title,
  link,
  linkLabel,
  badge,
}: {
  title: string
  link: string
  linkLabel: string
  badge?: boolean
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        {badge && <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />}
        <h2 className="text-base font-bold text-neutral-900 tracking-tight">{title}</h2>
      </div>
      <Link
        to={link}
        className="text-xs text-primary-800 hover:text-primary-900 font-medium
          flex items-center gap-0.5 transition-colors"
      >
        {linkLabel}
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </Link>
    </div>
  )
}

// ── 술 카드 캐러셀 (PC: 4×1 페이지네이션 + drag, MO: 가로 터치/drag 스크롤) ───
function SpiritCarousel({ spirits }: { spirits: SpiritListItem[] }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const dragStart = useRef({ isDragging: false, startX: 0, scrollLeft: 0, moved: false, startTime: 0 })
  const [showLeft, setShowLeft] = useState(false)
  const [showRight, setShowRight] = useState(false)

  const updateArrows = () => {
    if (!containerRef.current) return
    const { scrollLeft, scrollWidth, clientWidth } = containerRef.current
    setShowLeft(scrollLeft > 5)
    setShowRight(scrollLeft < scrollWidth - clientWidth - 5)
  }

  useEffect(() => {
    // Wait a brief tick for elements to render so scrollWidth is populated correctly
    const timer = setTimeout(updateArrows, 50)
    window.addEventListener('resize', updateArrows)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('resize', updateArrows)
    }
  }, [spirits])

  const onMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current) return
    if (e.button !== 0) return // Left click only

    dragStart.current = {
      isDragging: true,
      startX: e.clientX,
      scrollLeft: containerRef.current.scrollLeft,
      moved: false,
      startTime: Date.now(),
    }
  }

  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragStart.current.isDragging || !containerRef.current) return
    const dx = e.clientX - dragStart.current.startX
    if (Math.abs(dx) > 15) {
      dragStart.current.moved = true
    }
    if (dragStart.current.moved) {
      e.preventDefault()
      containerRef.current.scrollLeft = dragStart.current.scrollLeft - dx
    }
  }

  const onMouseUp = () => {
    dragStart.current.isDragging = false
  }

  const onMouseLeave = () => {
    dragStart.current.isDragging = false
  }

  const onClickCapture = (e: React.MouseEvent) => {
    const elapsed = Date.now() - dragStart.current.startTime
    if (dragStart.current.moved && elapsed > 200) {
      e.preventDefault()
      e.stopPropagation()
    }
    dragStart.current.moved = false
  }

  const scroll = (direction: 'left' | 'right') => {
    if (!containerRef.current) return
    const width = containerRef.current.clientWidth
    const offset = direction === 'left' ? -width * 0.8 : width * 0.8
    containerRef.current.scrollBy({ left: offset, behavior: 'smooth' })
  }

  const navBtn = `absolute top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white
    border border-neutral-200 shadow-md flex items-center justify-center
    transition-all duration-150 cursor-pointer
    hover:bg-primary-50 hover:text-primary-800 hover:border-primary-200 hover:shadow-lg`

  return (
    <div className="relative group/carousel">
      <div
        ref={containerRef}
        className="flex gap-3 overflow-x-auto pb-2.5 select-none no-scrollbar cursor-grab active:cursor-grabbing -mx-4 px-4 lg:mx-0 lg:px-0"
        style={{ scrollbarWidth: 'none' }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
        onDragStart={(e) => e.preventDefault()}
        onClickCapture={onClickCapture}
        onScroll={updateArrows}
      >
        {spirits.map((s) => (
          <div key={s.id} className="flex-shrink-0 w-36 sm:w-40 lg:w-[250px]">
            <SpiritCard spirit={s} imageFit="contain" />
          </div>
        ))}
      </div>

      {showLeft && (
        <button
          onClick={() => scroll('left')}
          className={`${navBtn} -left-4 text-neutral-600 hidden lg:flex`}
          aria-label="Previous"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      )}

      {showRight && (
        <button
          onClick={() => scroll('right')}
          className={`${navBtn} -right-4 text-neutral-600 hidden lg:flex`}
          aria-label="Next"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      )}
    </div>
  )
}

function PostRow({ post, boardPath }: { post: PostListItem; boardPath: string }) {
  const { t } = useTranslation()
  const label = post.prefix
    ? t(`prefix.${post.prefix.name}`, post.prefix.name)
    : (boardPath === 'notice' ? t('home.community.news', '소식') : t('home.community.free', '자유'))
  const labelColor = post.prefix?.colorHex
  return (
    <Link
      to={`/community/${boardPath}/${post.id}`}
      className={[
        'flex items-center gap-2.5 px-4 py-2.5 border-b border-neutral-50 last:border-b-0 transition-colors group',
        post.isPinned ? 'bg-amber-50/50 hover:bg-amber-50' : 'hover:bg-primary-50/40',
      ].join(' ')}
    >
      <span
        className="flex-shrink-0 text-xs font-medium px-1.5 py-0.5 rounded w-12 text-center
          bg-neutral-50 text-neutral-500 truncate"
        style={labelColor ? { color: labelColor } : undefined}
      >
        {label}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-neutral-800 group-hover:text-primary-800 line-clamp-1 transition-colors">
          {post.adultOnly && <AdultBadge className="mr-1 w-4 h-4 text-[9px] align-middle" />}
          {post.title}
          {post.commentCount > 0 && (
            <span className="text-primary-500 text-xs ml-1">[{post.commentCount}]</span>
          )}
        </p>
      </div>
      <div className="flex-shrink-0 flex items-center gap-3 text-xs text-neutral-400">
        <span className="hidden sm:inline max-w-[90px] truncate">{post.authorNickname}</span>
        {post.likeCount > 0 && (
          <span className="hidden sm:flex items-center gap-0.5">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3z" />
            </svg>
            {post.likeCount}
          </span>
        )}
        <span>{formatBoardDate(post.createdAt)}</span>
      </div>
    </Link>
  )
}

// ── 상단노출 공지 행 (커뮤니티 최신글 상단 고정) ──────────────────
function NoticePostRow({ notice }: { notice: NoticeListItem }) {
  const { t } = useTranslation()
  return (
    <Link
      to={`/notices/${notice.id}`}
      className="flex items-center gap-2.5 px-4 py-2.5 border-b border-neutral-50 last:border-b-0
        bg-amber-50/40 hover:bg-amber-50 transition-colors group"
    >
      <span
        className="flex-shrink-0 text-xs font-semibold px-1.5 py-0.5 rounded w-12 text-center
          bg-amber-100 text-amber-700"
      >
        {t('board.noticeBadge')}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-neutral-800 group-hover:text-primary-800 line-clamp-1 transition-colors">
          {notice.title}
        </p>
      </div>
      <div className="flex-shrink-0 flex items-center gap-3 text-xs text-neutral-400">
        <span>{formatBoardDate(notice.createdAt)}</span>
      </div>
    </Link>
  )
}

// ── 커뮤니티 최신글 섹션 ──────────────────────────────────────────
function CommunityLatestSection() {
  const { t } = useTranslation()

  const { data: freeData } = usePosts({ boardType: 'FREE', sort: 'LATEST', page: 0, size: 5 })
  const { data: newsData } = usePosts({ boardType: 'NOTICE', sort: 'LATEST', page: 0, size: 3 })
  const { data: pinnedNotices = [] } = usePinnedNotices()

  const freePosts = freeData?.content ?? []
  const newsPosts = newsData?.content ?? []
  const visiblePinnedNotices = pinnedNotices.slice(0, 5)
  const visibleFreePosts = freePosts.slice(0, 5)
  const visibleNewsPosts = newsPosts.slice(0, 3)

  // 상단노출 공지를 함께 노출하므로 공지가 있으면 빈 상태가 아님
  const isEmpty = visibleFreePosts.length === 0 && visiblePinnedNotices.length === 0

  return (
    <div className="space-y-6">
    <section>
      <SectionHeader
        title={t('home.community.title')}
        link="/community/all"
        linkLabel={t('home.sections.viewAll')}
      />

      <div className="bg-white rounded-xl border border-neutral-100 overflow-hidden">
        {isEmpty ? (
          <p className="text-sm text-neutral-400 py-10 text-center">{t('home.community.empty')}</p>
        ) : (
          <>
            {visiblePinnedNotices.map((n) => <NoticePostRow key={`notice-${n.id}`} notice={n} />)}
            {visibleFreePosts.map((p) => <PostRow key={p.id} post={p} boardPath="free" />)}
          </>
        )}
      </div>
    </section>
    <section>
      <SectionHeader
        title={t('home.community.newsLatest')}
        link="/community/notice"
        linkLabel={t('home.sections.viewAll')}
      />
      <div className="overflow-hidden rounded-xl border border-neutral-100 bg-white">
        {visibleNewsPosts.length > 0
          ? visibleNewsPosts.map((post) => <PostRow key={post.id} post={post} boardPath="notice" />)
          : <p className="py-10 text-center text-sm text-neutral-400">{t('home.community.empty')}</p>}
      </div>
    </section>
    </div>
  )
}


// ── 공지사항 위젯 ────────────────────────────────────────────────
function NoticeWidget({ notices }: { notices: NoticeListItem[] }) {
  const { t } = useTranslation()
  if (notices.length === 0) return null
  return (
    <div className="bg-white rounded-xl border border-neutral-100 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-neutral-900 tracking-tight">
          {t('home.sections.notices')}
        </h3>
        <Link
          to="/notices"
          className="text-xs text-primary-800 hover:text-primary-900 font-medium
            flex items-center gap-0.5 transition-colors"
        >
          {t('home.sections.viewAll')}
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </Link>
      </div>
      <div>
        {notices.slice(0, 4).map((notice) => (
          <Link
            key={notice.id}
            to={`/notices/${notice.id}`}
            className="flex items-center justify-between py-2.5 border-b border-neutral-50
              last:border-b-0 hover:text-primary-800 transition-colors group"
          >
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              {notice.isPinned && (
                <span className="flex-shrink-0 text-xs font-semibold text-amber-600 bg-amber-50
                  px-1.5 py-0.5 rounded">
                  공지
                </span>
              )}
              <span className="text-sm text-neutral-700 group-hover:text-primary-800
                line-clamp-1 transition-colors">
                {notice.title}
              </span>
            </div>
            <span className="text-xs text-neutral-400 ml-2 flex-shrink-0">
              {new Date(notice.createdAt).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' })}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}

// ── 이벤트 캘린더 카드 ───────────────────────────────────────────
function EventCard() {
  const { t } = useTranslation()
  const { data: upcomingEvents = [] } = useQuery({
    queryKey: ['events', 'upcoming', 1],
    queryFn: () => eventApi.getUpcomingEvents(1).then((r) => r.data.data || []),
    staleTime: 60_000,
  })

  const latestEvent = upcomingEvents[0]

  const getDDayText = (startDateStr: string) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const start = new Date(startDateStr)
    start.setHours(0, 0, 0, 0)
    const diffTime = start.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      return t('home.eventCard.dDay')
    } else if (diffDays > 0) {
      return t('home.eventCard.dMinus', { days: diffDays })
    } else {
      return t('home.eventCard.dPlus', { days: Math.abs(diffDays) })
    }
  }

  const formatDateRange = (start: string, end: string | null) => {
    const format = (dateStr: string) => dateStr.replace(/-/g, '.')
    if (!end || start === end) {
      return format(start)
    }
    return `${format(start)} ~ ${format(end)}`
  }

  return (
    <Link
      to="/calendar"
      className="block overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm
        transition-all duration-200 hover:border-amber-300 hover:shadow-md
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40 group"
    >
      <div className="flex items-center gap-3 bg-stone-100 px-4 py-4">
        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-600 shadow-sm">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <p className="mb-1 text-[11px] font-semibold tracking-wide text-stone-500">
            {t('home.eventCard.label')}
          </p>
          <p className="truncate text-[15px] font-bold text-neutral-800">
            {t('home.eventCard.title')}
          </p>
        </div>
        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-400 transition-colors group-hover:border-amber-200 group-hover:text-amber-700">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </span>
      </div>

      {latestEvent && (
        <div className="border-t border-neutral-200 bg-white px-4 py-4 text-left">
          <div className="mb-2.5 flex items-center justify-between gap-3">
            <span className="text-[11px] font-semibold tracking-wide text-neutral-500">
              {t('home.eventCard.nextEvent')}
            </span>
            <span className="flex-shrink-0 rounded-full bg-amber-50 px-2 py-1 text-[10px] font-bold tracking-wide text-amber-800">
              {getDDayText(latestEvent.startDate)}
            </span>
          </div>
          <p className="mb-1.5 text-xs font-medium text-neutral-500">
            {formatDateRange(latestEvent.startDate, latestEvent.endDate)}
          </p>
          <p className="line-clamp-2 text-sm font-semibold leading-relaxed text-neutral-800 transition-colors group-hover:text-amber-900">
            {latestEvent.title}
          </p>
        </div>
      )}
    </Link>
  )
}

// ── 하단 카테고리 타일 ───────────────────────────────────────────
function CategoryTiles() {
  const { t } = useTranslation()
  return (
    <section className="max-w-7xl mx-auto px-4 pb-12">
      <div className="mb-4">
        <h2 className="text-base font-bold text-neutral-900 tracking-tight">
          {t('home.categoryExplore')}
        </h2>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {CATEGORY_MENU.map((cat) => (
          <Link
            key={cat.key}
            to={`/spirits?category=${cat.key}`}
            className="group relative overflow-hidden rounded-2xl h-28 lg:h-32 block"
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${cat.grad}`} />
            <picture>
              <source srcSet={cat.imageWebp} type="image/webp" />
              <img
                src={cat.image}
                alt={t(`spirit.category.${cat.key}`)}
                className="absolute inset-0 w-full h-full object-cover opacity-80
                  group-hover:scale-105 transition-transform duration-500"
                loading="lazy"
              />
            </picture>
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
            <div className="relative z-10 h-full flex flex-col justify-end p-4">
              <p className="text-white/60 text-xs mb-1 line-clamp-1">{cat.subtitle}</p>
              <div className="flex items-center justify-between">
                <span className="text-white font-bold text-sm">{t(`spirit.category.${cat.key}`)}</span>
                <span className="text-white/70 text-xs group-hover:text-white transition-colors">
                  {t('home.menu.explore')} →
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}

// ── 메인 페이지 ──────────────────────────────────────────────────
export default function MainPage() {
  const { i18n } = useTranslation()
  const { t } = useTranslation()

  const bannerLanguage = (i18n.language.toUpperCase() === 'EN' ? 'EN' : 'KO') as 'KO' | 'EN'
  const { data: banners = [] } = useBanners(bannerLanguage, 'MAIN')
  const { data: sideBanners = [] } = useBanners(bannerLanguage, 'SIDE')

  const { data: popups = [] } = usePopups(bannerLanguage)
  const [isPopupOpen, setIsPopupOpen] = useState(false)
  useEffect(() => {
    if (popups.length > 0) setIsPopupOpen(true)
  }, [popups.length])

  const { data: topRatedData } = useQuery({
    queryKey: ['home', 'topRated'],
    queryFn: () => spiritApi.search({ sort: 'SCORE_DESC', size: 10 }).then((r) => r.data.data!),
    staleTime: 60_000,
  })

  const { data: recentData } = useQuery({
    queryKey: ['home', 'recent'],
    queryFn: () => spiritApi.search({ sort: 'LATEST', size: 10 }).then((r) => r.data.data!),
    staleTime: 60_000,
  })

  const { data: noticesData } = useNotices({ page: 0, size: 5 })

  const topRated = topRatedData?.content ?? []
  const recent   = recentData?.content   ?? []
  const notices  = noticesData?.content  ?? []

  const isEn = i18n.language === 'en'

  return (
    <div>
      <SeoMeta
        title={isEn
          ? 'CaskByCask — Detailed Liquor Info, Reviews & Community'
          : 'CaskByCask(캐바캐) — 주류 정보, 리뷰, 커뮤니티'}
        description={isEn
          ? 'Explore detailed specifications, user ratings, and reviews of global spirits (whisky, wine, cognac, rum, tequila) and join our community.'
          : '전 세계 위스키, 와인, 꼬냑 등의 상세한 주류 정보와 평점 리뷰를 제공하고 소통하는 주류 전문 정보 커뮤니티 플랫폼입니다.'}
        canonical={buildCanonical(isEn ? '/en/' : '/ko/')}
        locale={isEn ? 'en_US' : 'ko_KR'}
        alternateKo={buildCanonical('/ko/')}
        alternateEn={buildCanonical('/en/')}
        alternateDefault={buildCanonical('/ko/')}
        keywords={isEn
          ? 'whisky specs, wine reviews, cognac ratings, liquor directory, community, caskbycask'
          : '주류 정보, 위스키 리뷰, 와인 평점, 꼬냑 등급, 주류 커뮤니티, 캐스크바이캐스크, 캐바캐'}
      />

      {/* 본문: 2열 (주 콘텐츠 + 사이드바) */}
      <div className="max-w-7xl mx-auto px-4 py-6 lg:py-8">
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-7">

          {/* 주 콘텐츠 */}
          <div className="space-y-10 min-w-0">
            {/* 메인 배너 슬라이더 (주 콘텐츠 영역으로 이동, 21:9 비율) */}
            {banners.length > 0 && <BannerSlider banners={banners} aspectClass="aspect-[21/9]" />}

            {/* 커뮤니티 최신글 */}
            <CommunityLatestSection />

            {/* 최근 등록 */}
            {recent.length > 0 && (
              <section>
                <SectionHeader
                  title={t('home.sections.recent')}
                  link="/spirits?sort=LATEST"
                  linkLabel={t('home.sections.viewAll')}
                />
                <SpiritCarousel spirits={recent} />
              </section>
            )}

            {/* 평점 높은 술 */}
            {topRated.length > 0 && (
              <section>
                <SectionHeader
                  title={t('home.sections.topRated')}
                  link="/spirits?sort=SCORE_DESC"
                  linkLabel={t('home.sections.viewAll')}
                />
                <SpiritCarousel spirits={topRated} />
              </section>
            )}

          </div>

          {/* 사이드바 */}
          <aside className="mt-10 lg:mt-0 space-y-5">
            <EventCard />
            <NoticeWidget notices={notices} />

            {/* 사이드바 배너 */}
            {sideBanners.some((banner) => banner.pcImage) && (
              <div className="rounded-xl shadow-sm">
                <BannerSlider
                  banners={sideBanners.filter((banner) => banner.pcImage)}
                  aspectClass="aspect-[4/5]"
                  autoPlayIntervalMs={3000}
                  prioritizeFirstImage={false}
                />
              </div>
            )}
          </aside>
        </div>
      </div>

      {/* 하단 카테고리 타일 */}
      <CategoryTiles />

      {/* 팝업 뷰어 */}
      {isPopupOpen && popups.length > 0 && (
        <PopupViewer popups={popups} onClose={() => setIsPopupOpen(false)} />
      )}
    </div>
  )
}
