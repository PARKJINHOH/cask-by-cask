import { useState, Fragment, useEffect, useRef } from 'react'
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react'
import { sanitizeHtml } from '@/shared/utils/sanitize'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { spiritApi } from '@/domain/spirit/api/spiritApi'
import { reviewApi } from '@/domain/review/api/reviewApi'
import { useBanners } from '@/domain/banner/hooks/useBanners'
import { usePinnedNotices } from '@/domain/notice/hooks/useNotices'
import { usePosts } from '@/domain/community/hooks/usePosts'
import SpiritCard from '@/shared/components/SpiritCard'
import AdultBadge from '@/shared/components/AdultBadge'
import { formatBoardDate, scoreColor, formatScore, optionalScoreColor } from '@/shared/utils/format'
import { getLocalizedSpiritListNames } from '@/domain/spirit/utils/spiritDisplayName'
import BannerSlider from '@/domain/banner/components/BannerSlider'
import type { SpiritListItem } from '@/domain/spirit/types/spirit.types'
import type { RecentReviewItem } from '@/domain/review/types/review.types'
import type { NoticeListItem } from '@/domain/notice/types/notice.types'
import type { PostListItem } from '@/domain/community/types/community.types'
import type { BannerResponse } from '@/domain/banner/types/banner.types'

interface RealMainPreviewModalProps {
  open: boolean
  onClose: () => void
  position: 'MAIN' | 'SIDE'
  bannerType: 'IMAGE' | 'HTML'
  pcImageUrl: string | null
  moImageUrl: string | null
  content?: string | null
  linkUrl?: string | null
}

// ── 섹션 헤더 ────────────────────────────────────────────────────
// linkLabel 이 없으면 타이틀만 노출한다. (실제 메인의 SectionHeader 와 동일 규칙)
function SectionHeader({
  title,
  linkLabel,
}: {
  title: string
  linkLabel?: string
}) {
  return (
    <div className="flex items-center justify-between mb-4 select-none">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
        <h2 className="text-base font-bold text-neutral-900 tracking-tight">{title}</h2>
      </div>
      {linkLabel && (
        <div className="text-xs text-primary-800 font-medium flex items-center gap-0.5">
          {linkLabel}
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </div>
      )}
    </div>
  )
}

// ── 병 모양 플레이스홀더 (이미지 없는 주류) ───────────────────────
function BottlePlaceholder({ className }: { className: string }) {
  return (
    <div
      className="flex h-full w-full items-center justify-center bg-neutral-50 text-neutral-300"
      aria-hidden="true"
    >
      <svg
        className={className} viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      >
        <path d="M10 2h4" />
        <path d="M10.5 2v4.2a3 3 0 0 1-.45 1.58L9 9.6A4 4 0 0 0 8.5 11.6V19a3 3 0 0 0 3 3h1a3 3 0 0 0 3-3v-7.4a4 4 0 0 0-.5-2l-1.05-1.82A3 3 0 0 1 13.5 6.2V2" />
        <path d="M8.5 13h7" />
      </svg>
    </div>
  )
}

// ── 평점 Top 5 목록 (사이드바) — 실제 메인의 TopRatedList 모사 ─────
function TopRatedList({ spirits }: { spirits: SpiritListItem[] }) {
  const { i18n } = useTranslation()

  return (
    <ol className="overflow-hidden rounded-xl border border-neutral-100 bg-white select-none">
      {spirits.map((spirit, index) => {
        const { primaryName } = getLocalizedSpiritListNames(spirit, i18n.language)

        return (
          <li
            key={spirit.id}
            className="flex items-center gap-2.5 border-b border-neutral-50 px-3 py-2.5 last:border-b-0"
          >
            <span className="w-4 flex-shrink-0 text-center text-xs font-bold text-primary-800">
              {index + 1}
            </span>

            <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-md bg-white">
              {spirit.primaryImageUrl ? (
                <img
                  src={spirit.primaryImageUrl}
                  alt=""
                  loading="lazy"
                  draggable="false"
                  className="h-full w-full object-contain"
                />
              ) : (
                <BottlePlaceholder className="h-5 w-5" />
              )}
            </div>

            <p className="min-w-0 flex-1 break-keep text-xs font-medium leading-snug text-neutral-800 line-clamp-2">
              {primaryName}
            </p>

            {spirit.avgScore != null && (
              <span
                className="flex-shrink-0 text-xs font-bold"
                style={{ color: scoreColor(spirit.avgScore) }}
              >
                {spirit.avgScore.toFixed(1)}
              </span>
            )}
          </li>
        )
      })}
    </ol>
  )
}

// ── 가로 드래그 캐러셀 (PC: 화살표 + drag, MO: 가로 터치/drag 스크롤) ───
function DragCarousel({ itemCount, children }: { itemCount: number; children: React.ReactNode }) {
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
    const timer = setTimeout(updateArrows, 50)
    window.addEventListener('resize', updateArrows)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('resize', updateArrows)
    }
  }, [itemCount])

  const onMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current) return
    if (e.button !== 0) return

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
    <div className="relative group/carousel select-none">
      <div
        ref={containerRef}
        className="flex gap-3 overflow-x-auto pb-2.5 no-scrollbar cursor-grab active:cursor-grabbing -mx-4 px-4 lg:mx-0 lg:px-0"
        style={{ scrollbarWidth: 'none' }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
        onDragStart={(e) => e.preventDefault()}
        onScroll={updateArrows}
      >
        {children}
      </div>

      {showLeft && (
        <button
          type="button"
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
          type="button"
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

// ── 술 카드 캐러셀 ───────────────────────────────────────────────
function SpiritCarousel({ spirits }: { spirits: SpiritListItem[] }) {
  return (
    <DragCarousel itemCount={spirits.length}>
      {spirits.map((s) => (
        <div key={s.id} className="flex-shrink-0 w-32 sm:w-36 lg:w-44 pointer-events-none">
          <SpiritCard
            spirit={s}
            imageFit="contain"
            showSecondaryName={false}
            uniformTwoLineName
          />
        </div>
      ))}
    </DragCarousel>
  )
}

// ── 최근 등록된 리뷰 카드 캐러셀 — 실제 메인의 RecentReviewCarousel 모사 ──
function RecentReviewCarousel({ reviews }: { reviews: RecentReviewItem[] }) {
  const { i18n } = useTranslation()
  const isEn = i18n.language === 'en'

  return (
    <DragCarousel itemCount={reviews.length}>
      {reviews.map((review) => {
        const name = isEn
          ? (review.displayNameEn || review.displayNameKo)
          : review.displayNameKo
        // Number(null) 은 0 이라 그대로 쓰면 점수 미입력 리뷰가 0.0 점으로 찍힌다.
        const totalScore = review.totalScore == null ? null : Number(review.totalScore)

        return (
          <div
            key={review.id}
            className="flex-shrink-0 w-32 overflow-hidden rounded-xl border border-neutral-200 bg-white
              pointer-events-none sm:w-36 lg:w-44"
          >
            <div className="aspect-square w-full overflow-hidden bg-white">
              {review.imageUrl ? (
                <img
                  src={review.imageUrl}
                  alt=""
                  loading="lazy"
                  draggable="false"
                  className="h-full w-full object-contain"
                />
              ) : (
                <BottlePlaceholder className="h-10 w-10" />
              )}
            </div>

            <div className="px-2.5 py-2">
              <p className="line-clamp-2 min-h-[2.25rem] break-keep text-xs font-medium leading-snug text-neutral-800">
                {name}
              </p>
              <div className="mt-1.5 flex items-center justify-between gap-1">
                <span className="text-sm font-bold" style={{ color: optionalScoreColor(totalScore) }}>
                  {formatScore(totalScore)}
                </span>
                <span className="truncate text-[11px] text-neutral-400">{review.nickname}</span>
              </div>
              <p className="mt-0.5 text-[11px] text-neutral-400">{formatBoardDate(review.createdAt)}</p>
            </div>
          </div>
        )
      })}
    </DragCarousel>
  )
}

function PostRow({ post }: { post: PostListItem }) {
  const { t } = useTranslation()
  const label = post.prefix
    ? t(`prefix.${post.prefix.name}`, post.prefix.name)
    : t('home.community.free', '자유')
  const labelColor = post.prefix?.colorHex
  return (
    <div
      className={[
        'flex items-center gap-3 px-4 py-3.5 border-b border-neutral-50 last:border-b-0 transition-colors group select-none',
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
        <p className="text-sm text-neutral-800 line-clamp-1 transition-colors">
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
    </div>
  )
}

function NoticePostRow({ notice }: { notice: NoticeListItem }) {
  const { t } = useTranslation()
  return (
    <div
      className="flex items-center gap-3 px-4 py-3.5 border-b border-neutral-50 last:border-b-0
        bg-amber-50/40 hover:bg-amber-50 transition-colors group select-none"
    >
      <span
        className="flex-shrink-0 text-xs font-semibold px-1.5 py-0.5 rounded w-12 text-center
          bg-amber-100 text-amber-700"
      >
        {t('board.noticeBadge')}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-neutral-800 line-clamp-1 transition-colors">
          {notice.title}
        </p>
      </div>
      <div className="flex-shrink-0 flex items-center gap-3 text-xs text-neutral-400">
        <span>{formatBoardDate(notice.createdAt)}</span>
      </div>
    </div>
  )
}

function CommunityLatestSection() {
  const { t } = useTranslation()

  const { data: freeData } = usePosts({ boardType: 'FREE', sort: 'LATEST', page: 0, size: 5 })
  const { data: pinnedNotices = [] } = usePinnedNotices()

  const freePosts = freeData?.content ?? []
  const visiblePinnedNotices = pinnedNotices.slice(0, 5)
  const visibleFreePosts = freePosts.slice(0, 5)

  const isEmpty = visibleFreePosts.length === 0 && visiblePinnedNotices.length === 0

  return (
    <section className="select-none">
      <SectionHeader
        title={t('home.community.title')}
        linkLabel={t('home.sections.viewAll')}
      />

      <div className="bg-white rounded-xl border border-neutral-100 overflow-hidden">
        {isEmpty ? (
          <p className="text-sm text-neutral-400 py-10 text-center">{t('home.community.empty')}</p>
        ) : (
          <>
            {visiblePinnedNotices.map((n) => <NoticePostRow key={`notice-${n.id}`} notice={n} />)}
            {visibleFreePosts.map((p) => <PostRow key={p.id} post={p} />)}
          </>
        )}
      </div>
    </section>
  )
}

function EventCard() {
  const { t } = useTranslation()
  return (
    <div className="block bg-amber-800 rounded-xl p-4 transition-colors group select-none">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-white/15">
          <svg className="h-4 w-4 text-amber-200" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        </div>
        <div className="min-w-0">
          <p className="text-xs text-amber-200/80 font-medium mb-0.5">{t('home.eventCard.label')}</p>
          <p className="whitespace-normal break-keep text-xs font-bold leading-snug text-white">
            {t('home.eventCard.title')}
          </p>
        </div>
        <svg className="w-4 h-4 text-white/60 ml-auto flex-shrink-0"
          fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>
    </div>
  )
}

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

function CategoryTiles() {
  const { t } = useTranslation()
  return (
    <section className="max-w-7xl mx-auto px-6 pb-12 select-none">
      <div className="mb-4">
        <h2 className="text-base font-bold text-neutral-900 tracking-tight">
          {t('home.categoryExplore')}
        </h2>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {CATEGORY_MENU.map((cat) => (
          <div
            key={cat.key}
            className="group relative overflow-hidden rounded-2xl h-28 lg:h-32 block cursor-default"
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${cat.grad}`} />
            <picture>
              <source srcSet={cat.imageWebp} type="image/webp" />
              <img
                src={cat.image}
                alt={t(`spirit.category.${cat.key}`)}
                className="absolute inset-0 w-full h-full object-cover opacity-80"
                loading="lazy"
              />
            </picture>
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
            <div className="relative z-10 h-full flex flex-col justify-end p-4">
              <p className="text-white/60 text-xs mb-1 line-clamp-1">{cat.subtitle}</p>
              <div className="flex items-center justify-between">
                <span className="text-white font-bold text-sm">{t(`spirit.category.${cat.key}`)}</span>
                <span className="text-white/70 text-xs">
                  {t('home.menu.explore')} →
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export default function RealMainPreviewModal({
  open,
  onClose,
  position,
  bannerType,
  pcImageUrl,
  moImageUrl,
  content,
  linkUrl,
}: RealMainPreviewModalProps) {
  const [viewport, setViewport] = useState<'pc' | 'mo'>('pc')
  const { i18n, t } = useTranslation()
  const bannerLanguage = (i18n.language.toUpperCase() === 'EN' ? 'EN' : 'KO') as 'KO' | 'EN'

  // HTML 내용 정화
  const sanitizedHtml = content ? sanitizeHtml(content) : ''

  // 실시간 데이터 조회
  const { data: dbBanners = [] } = useBanners(bannerLanguage, 'MAIN')
  const { data: dbSideBanners = [] } = useBanners(bannerLanguage, 'SIDE')

  const { data: topRatedData } = useQuery({
    queryKey: ['preview', 'topRated', 5],
    queryFn: () => spiritApi.search({ sort: 'SCORE_DESC', size: 5 }).then((r) => r.data.data!),
    staleTime: 60_000,
    enabled: open,
  })

  const { data: recentData } = useQuery({
    queryKey: ['preview', 'recent'],
    queryFn: () => spiritApi.search({ sort: 'LATEST', size: 10 }).then((r) => r.data.data!),
    staleTime: 60_000,
    enabled: open,
  })

  const { data: recentReviews = [] } = useQuery({
    queryKey: ['preview', 'recentReviews', 10],
    queryFn: () => reviewApi.getRecentReviews(10).then((r) => r.data.data ?? []),
    staleTime: 60_000,
    enabled: open,
  })

  const topRated = topRatedData?.content ?? []
  const recent   = recentData?.content   ?? []

  // 작성 중인 임시 배너 객체 생성
  const previewBanner: BannerResponse = {
    id: 999999,
    bannerType,
    position,
    language: bannerLanguage,
    pcImage: pcImageUrl ? { originalFileName: 'preview_pc.png', imageUrl: pcImageUrl } : null,
    moImage: moImageUrl ? { originalFileName: 'preview_mo.png', imageUrl: moImageUrl } : null,
    contentSanitized: sanitizedHtml,
    linkUrl: linkUrl || null,
    linkTargetBlank: true,
    sortOrder: 0,
  }

  // position에 따라 리스트 조합
  const banners = position === 'MAIN'
    ? [previewBanner, ...dbBanners.filter(b => b.id !== previewBanner.id)]
    : dbBanners

  const sideBanners = position === 'SIDE'
    ? [previewBanner, ...dbSideBanners.filter(b => b.id !== previewBanner.id)]
    : dbSideBanners

  return (
    <Transition show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm" />
        </TransitionChild>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <TransitionChild
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <DialogPanel className="w-full max-w-6xl transform overflow-hidden rounded-2xl bg-neutral-100 p-6 shadow-2xl transition-all flex flex-col h-[85vh]">
                
                {/* 헤더 */}
                <div className="flex items-center justify-between pb-4 border-b border-neutral-200 flex-shrink-0">
                  <div>
                    <DialogTitle as="h3" className="text-lg font-bold text-neutral-800">
                      실제 메인페이지 미리보기
                    </DialogTitle>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      {position === 'MAIN' ? '메인 상단 배너 슬라이더' : '우측 사이드바 하단 배너'}의 실제 메인 레이아웃 노출 테스트입니다.
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* PC/모바일 스위치 */}
                    <div className="flex rounded-lg overflow-hidden bg-neutral-200 p-0.5 border border-neutral-300">
                      <button
                        type="button"
                        onClick={() => setViewport('pc')}
                        className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
                          viewport === 'pc' ? 'bg-white text-neutral-800 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'
                        }`}
                      >
                        💻 PC 버전
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewport('mo')}
                        className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
                          viewport === 'mo' ? 'bg-white text-neutral-800 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'
                        }`}
                      >
                        📱 모바일 버전
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={onClose}
                      className="text-neutral-400 hover:text-neutral-600 p-1.5 rounded-full hover:bg-neutral-200 transition-colors"
                      aria-label="닫기"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* 뷰포트 영역 */}
                <div className="flex-1 overflow-y-auto py-5 relative min-h-0 bg-neutral-200 rounded-xl mt-4">
                  {viewport === 'pc' ? (
                    // ═══════════════════════════════════════════
                    // PC 버전 가상 렌더링 (맥스 1024px ~ 1140px 규격)
                    // ═══════════════════════════════════════════
                    <div className="w-full max-w-[1140px] mx-auto bg-white rounded-xl shadow-lg border border-neutral-300 overflow-hidden flex flex-col font-sans text-neutral-800">
                      
                      {/* 가상 헤더 */}
                      <header className="border-b border-neutral-100 px-6 py-4 flex items-center justify-between bg-white select-none">
                        <div className="text-primary-800 font-black text-lg tracking-wider">CASK BY CASK</div>
                        <nav className="flex items-center gap-6 text-sm font-semibold text-neutral-600">
                          <span className="text-primary-800">HOME</span>
                          <span>주류 검색</span>
                          <span>게시판</span>
                          <span>이벤트</span>
                          <span>마이페이지</span>
                        </nav>
                      </header>

                      {/* 본문 레이아웃: 2열 */}
                      <div className="px-6 py-8 grid grid-cols-[minmax(0,1fr)_320px] gap-6 bg-neutral-50/50">
                        
                        {/* 주 콘텐츠 (게시판 리스트 모사) */}
                        <div className="space-y-10 min-w-0">
                          {/* 메인 배너 슬라이더 */}
                          {banners.length > 0 ? (
                            <BannerSlider banners={banners} aspectClass="aspect-[21/9]" />
                          ) : (
                            <div className="w-full aspect-[21/9] bg-neutral-800 rounded-xl flex items-center justify-center text-white/20 select-none">
                              <span className="text-sm font-bold tracking-wider">MAIN BANNER ZONE (SAMPLE)</span>
                            </div>
                          )}

                          {/* 커뮤니티 최신글 */}
                          <CommunityLatestSection />

                          {/* 최근 등록 */}
                          {recent.length > 0 && (
                            <section>
                              <SectionHeader
                                title={t('home.sections.recent')}
                                linkLabel={t('home.sections.viewAll')}
                              />
                              <SpiritCarousel spirits={recent} />
                            </section>
                          )}

                          {/* 최근 등록된 리뷰 */}
                          {recentReviews.length > 0 && (
                            <section>
                              <SectionHeader title={t('home.sections.recentReviews')} />
                              <RecentReviewCarousel reviews={recentReviews} />
                            </section>
                          )}
                        </div>

                        {/* 사이드바 — 시음회 → 평점 Top 5 → 배너 */}
                        <aside className="space-y-5">
                          <EventCard />

                          {/* 평점 Top 5 */}
                          {topRated.length > 0 && (
                            <section>
                              <SectionHeader
                                title={t('home.sections.topRated5')}
                                linkLabel={t('home.sections.viewAll')}
                              />
                              <TopRatedList spirits={topRated} />
                            </section>
                          )}

                          {/* 사이드바 배너 영역 렌더링 */}
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

                      {/* 하단 카테고리 타일 */}
                      <div className="border-t border-neutral-100 bg-white pt-8">
                        <CategoryTiles />
                      </div>

                    </div>
                  ) : (
                    // ═══════════════════════════════════════════
                    // 모바일 버전 가상 렌더링 (iPhone w-375 프레임 모사)
                    // ═══════════════════════════════════════════
                    <div className="w-[375px] mx-auto bg-neutral-900 border-8 border-neutral-800 rounded-[36px] overflow-hidden shadow-2xl flex flex-col h-[650px] font-sans text-neutral-800 relative">
                      
                      {/* 가상 노치 디자인 */}
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-4 bg-neutral-800 rounded-b-2xl z-50 flex items-center justify-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-neutral-900" />
                        <span className="w-10 h-1 bg-neutral-900 rounded-full" />
                      </div>

                      {/* 가상 모바일 화면 안의 스크롤 컨테이너 */}
                      <div className="flex-1 overflow-y-auto bg-white pt-4 no-scrollbar">
                        
                        {/* 가상 모바일 헤더 */}
                        <header className="border-b border-neutral-100 px-4 py-3.5 flex items-center justify-between bg-white select-none">
                          <div className="text-primary-800 font-black text-sm tracking-wider">CASK BY CASK</div>
                          <button type="button" className="text-neutral-500 p-1" onClick={(e) => e.preventDefault()}>
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                          </button>
                        </header>

                        {/* 모바일 본문 스택 */}
                        <div className="p-4 space-y-8 bg-neutral-50/50">
                          {/* 메인 배너 슬라이더 (모바일도 21:9 비율 유지) */}
                          {banners.length > 0 ? (
                            <BannerSlider banners={banners} aspectClass="aspect-[21/9]" />
                          ) : (
                            <div className="w-full aspect-[21/9] bg-neutral-800 rounded-xl flex items-center justify-center text-white/20 select-none">
                              <span className="text-[10px] font-bold tracking-wider">MAIN BANNER ZONE (SAMPLE)</span>
                            </div>
                          )}

                          {/* 커뮤니티 최신글 */}
                          <CommunityLatestSection />

                          {/* 최근 등록 */}
                          {recent.length > 0 && (
                            <section>
                              <SectionHeader
                                title={t('home.sections.recent')}
                                linkLabel={t('home.sections.viewAll')}
                              />
                              <SpiritCarousel spirits={recent} />
                            </section>
                          )}

                          {/* 최근 등록된 리뷰 */}
                          {recentReviews.length > 0 && (
                            <section>
                              <SectionHeader title={t('home.sections.recentReviews')} />
                              <RecentReviewCarousel reviews={recentReviews} />
                            </section>
                          )}

                          {/* 평점 Top 5 (모바일에선 시음회 위) */}
                          {topRated.length > 0 && (
                            <section>
                              <SectionHeader
                                title={t('home.sections.topRated5')}
                                linkLabel={t('home.sections.viewAll')}
                              />
                              <TopRatedList spirits={topRated} />
                            </section>
                          )}

                          <EventCard />

                          {/* 사이드바 배너 (모바일에선 본문 하단에 단독 노출) */}
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

                        </div>

                        {/* 하단 카테고리 타일 */}
                        <div className="border-t border-neutral-100 bg-white pt-6 pb-8">
                          <CategoryTiles />
                        </div>

                      </div>
                    </div>
                  )}
                </div>

              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}
