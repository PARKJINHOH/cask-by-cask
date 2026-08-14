import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import SeoMeta, { buildCanonical } from '@/shared/components/SeoMeta'
import { spiritApi } from '@/domain/spirit/api/spiritApi'
import { eventApi } from '@/domain/event/api/eventApi'
import { reviewApi } from '@/domain/review/api/reviewApi'
import { useBanners } from '@/domain/banner/hooks/useBanners'
import { usePopups } from '@/domain/popup/hooks/usePopups'
import { usePinnedNotices } from '@/domain/notice/hooks/useNotices'
import { usePosts } from '@/domain/community/hooks/usePosts'
import { PopupViewer } from '@/domain/popup/components/PopupViewer'
import BannerSlider from '@/domain/banner/components/BannerSlider'
import SpiritCard from '@/shared/components/SpiritCard'
import AdultBadge from '@/shared/components/AdultBadge'
import { formatBoardDate, scoreColor } from '@/shared/utils/format'
import { getLocalizedNames, getLocalizedSpiritListNames } from '@/domain/spirit/utils/spiritDisplayName'
import { getSpiritDetailPath } from '@/domain/spirit/utils/spiritUrl'
import type { SpiritListItem } from '@/domain/spirit/types/spirit.types'
import type { RecentReviewItem } from '@/domain/review/types/review.types'
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
// link 가 없으면 타이틀만 노출한다. (전용 목록 페이지가 없는 섹션용)
function SectionHeader({
  title,
  link,
  linkLabel,
  badge,
}: {
  title: string
  link?: string
  linkLabel?: string
  badge?: boolean
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        {badge && <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />}
        <h2 className="text-base font-bold text-neutral-900 tracking-tight">{title}</h2>
      </div>
      {link && (
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
      )}
    </div>
  )
}

// ── 가로 드래그 캐러셀 (PC: 화살표 + drag, MO: 가로 터치/drag 스크롤) ───
// 술 카드/리뷰 카드가 공유한다. itemCount 가 바뀌면 화살표 표시를 다시 계산한다.
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
    // Wait a brief tick for elements to render so scrollWidth is populated correctly
    const timer = setTimeout(updateArrows, 50)
    window.addEventListener('resize', updateArrows)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('resize', updateArrows)
    }
  }, [itemCount])

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
        {children}
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

// ── 술 카드 캐러셀 ───────────────────────────────────────────────
function SpiritCarousel({ spirits }: { spirits: SpiritListItem[] }) {
  return (
    <DragCarousel itemCount={spirits.length}>
      {spirits.map((s) => (
        <div key={s.id} className="flex-shrink-0 w-32 sm:w-36 lg:w-44">
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

// ── 최근 등록된 리뷰 카드 캐러셀 ─────────────────────────────────
// 표시명은 서버(SpiritSlugUtils)가 에디션·빈티지 접미어까지 만들어 내려주므로 그대로 사용한다.
function RecentReviewCarousel({ reviews }: { reviews: RecentReviewItem[] }) {
  const { i18n } = useTranslation()

  return (
    <DragCarousel itemCount={reviews.length}>
      {reviews.map((review) => {
        const name = getLocalizedNames(
          review.displayNameKo, review.displayNameEn, i18n.language,
        ).primaryName
        const totalScore = Number(review.totalScore)

        return (
          <div key={review.id} className="flex-shrink-0 w-32 sm:w-36 lg:w-44">
            {/* 카드 모양·hover 는 바로 위 '최근 등록된 술'(SpiritCard)과 같아야 한다 —
                같은 폭의 캐러셀이 위아래로 붙어 있어 비율이나 그림자가 다르면 두 줄이 어긋나 보인다.
                술 카드는 사진을 object-contain 으로 담을 때 확대하지 않는다(여백째로 커져 어색하다). */}
            <Link
              to={`/reviews/${review.id}`}
              title={name}
              className="group block h-full overflow-hidden rounded-2xl bg-white shadow-sm
                transition-all duration-300 ease-out hover:shadow-xl
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500"
            >
              <div className="aspect-[3/4] w-full overflow-hidden bg-white">
                {review.imageUrl ? (
                  <img
                    src={review.imageUrl}
                    alt=""
                    loading="lazy"
                    draggable="false"
                    className="h-full w-full object-contain transition-transform duration-300"
                  />
                ) : (
                  <div
                    className="flex h-full w-full items-center justify-center bg-neutral-50 text-neutral-300"
                    aria-hidden="true"
                  >
                    <svg
                      className="h-10 w-10" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                    >
                      <path d="M10 2h4" />
                      <path d="M10.5 2v4.2a3 3 0 0 1-.45 1.58L9 9.6A4 4 0 0 0 8.5 11.6V19a3 3 0 0 0 3 3h1a3 3 0 0 0 3-3v-7.4a4 4 0 0 0-.5-2l-1.05-1.82A3 3 0 0 1 13.5 6.2V2" />
                      <path d="M8.5 13h7" />
                    </svg>
                  </div>
                )}
              </div>

              {/* 정보 줄도 술 카드와 같은 짜임 — 이름 옆에 점수, 그 아래 한 줄에 나머지.
                  이름은 두 줄 자리(min-h-9)를 늘 잡아 둬야 한 줄짜리 카드와 아래 줄 높이가 맞는다. */}
              <div className="px-2.5 py-2">
                <div className="flex items-start justify-between gap-1.5">
                  <p className="line-clamp-2 min-h-9 min-w-0 break-keep text-sm font-semibold
                    leading-[1.125rem] text-neutral-900">
                    {name}
                  </p>
                  <span
                    className="flex-shrink-0 text-xs font-bold"
                    style={{ color: scoreColor(totalScore) }}
                  >
                    {totalScore.toFixed(1)}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between gap-1.5 text-xs text-neutral-500">
                  <span className="truncate" title={review.nickname}>{review.nickname}</span>
                  <span className="flex-shrink-0 text-neutral-400">
                    {formatBoardDate(review.createdAt)}
                  </span>
                </div>
              </div>
            </Link>
          </div>
        )
      })}
    </DragCarousel>
  )
}

// ── 평점 Top 5 목록 (사이드바) ────────────────────────────────────
// 사이드바 폭(PC 320px)에 맞춘 목록형. 순위 + 40px 썸네일 + 이름 + 평점.
function TopRatedList({ spirits }: { spirits: SpiritListItem[] }) {
  const { t, i18n } = useTranslation()

  return (
    <ol className="overflow-hidden rounded-xl border border-neutral-100 bg-white">
      {spirits.map((spirit, index) => {
        const { primaryName, secondaryName } = getLocalizedSpiritListNames(spirit, i18n.language)
        const detailPath = getSpiritDetailPath(spirit, i18n.language)

        return (
          <li key={spirit.id} className="border-b border-neutral-50 last:border-b-0">
            <Link
              to={detailPath}
              title={secondaryName ? `${primaryName} (${secondaryName})` : primaryName}
              className="group flex items-center gap-2.5 px-3 py-2.5 transition-colors hover:bg-primary-50/40
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40"
            >
              <span
                className="w-4 flex-shrink-0 text-center text-xs font-bold text-primary-800"
                aria-label={t('home.sections.rank', { rank: index + 1 })}
              >
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
                  <div
                    className="flex h-full w-full items-center justify-center bg-neutral-50 text-neutral-300"
                    aria-hidden="true"
                  >
                    <svg
                      className="h-5 w-5" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                    >
                      <path d="M10 2h4" />
                      <path d="M10.5 2v4.2a3 3 0 0 1-.45 1.58L9 9.6A4 4 0 0 0 8.5 11.6V19a3 3 0 0 0 3 3h1a3 3 0 0 0 3-3v-7.4a4 4 0 0 0-.5-2l-1.05-1.82A3 3 0 0 1 13.5 6.2V2" />
                      <path d="M8.5 13h7" />
                    </svg>
                  </div>
                )}
              </div>

              <p className="min-w-0 flex-1 break-keep text-xs font-medium leading-snug text-neutral-800
                line-clamp-2 transition-colors group-hover:text-primary-800">
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
            </Link>
          </li>
        )
      })}
    </ol>
  )
}

// ── 사이드바 통계 (카테고리별 등록 수 · 등록 리뷰 수) ─────────────
// 두 카드가 같은 골격(제목 행 + 흰 카드)을 공유하도록 한 컴포넌트로 그린다.
function StatRow({ label, value, to }: { label: string; value: number; to?: string }) {
  const content = (
    <>
      <span className="min-w-0 truncate text-sm text-neutral-700">{label}</span>
      <span className="flex-shrink-0 text-sm font-bold tabular-nums text-primary-800">
        {value.toLocaleString()}
      </span>
    </>
  )

  const rowCls = `flex items-center justify-between gap-2 px-3 py-2.5 transition-colors
    ${to ? 'hover:bg-primary-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40' : ''}`

  return (
    <li className="border-b border-neutral-50 last:border-b-0">
      {to ? <Link to={to} className={rowCls}>{content}</Link> : <div className={rowCls}>{content}</div>}
    </li>
  )
}

/** 카테고리별 등록 주류 수. 카탈로그 카드는 마스터만이지만 여기 숫자는 에디션까지 센다. */
function CategoryCountCard() {
  const { t } = useTranslation()

  const { data: stats } = useQuery({
    queryKey: ['home', 'categoryStats'],
    queryFn: () => spiritApi.getCategoryStats().then((r) => r.data.data ?? []),
    staleTime: 5 * 60_000,
  })

  if (!stats || stats.length === 0) return null

  // 카테고리 순서는 하단 타일·탐색 필터와 같게 고정한다(응답 순서는 GROUP BY 에 달렸다).
  const ordered = CATEGORY_MENU
    .map((menu) => stats.find((stat) => stat.category === menu.key))
    .filter((stat): stat is NonNullable<typeof stat> => Boolean(stat))
  const total = ordered.reduce((sum, stat) => sum + stat.totalCount, 0)
  if (total === 0) return null

  return (
    <section>
      <SectionHeader
        title={t('home.stats.spiritCountTitle')}
        link="/spirits"
        linkLabel={t('home.sections.viewAll')}
      />
      <ul className="overflow-hidden rounded-xl border border-neutral-100 bg-white">
        {ordered.map((stat) => (
          <StatRow
            key={stat.category}
            label={t(`spirit.category.${stat.category}`)}
            value={stat.totalCount}
            to={`/spirits?category=${stat.category}`}
          />
        ))}
        <StatRow label={t('home.stats.total')} value={total} />
      </ul>
      <p className="mt-1.5 px-1 text-[11px] text-neutral-400">{t('home.stats.editionIncluded')}</p>
    </section>
  )
}

/** 등록된 리뷰 수. 위 카테고리 카드와 같은 골격을 쓴다. */
function ReviewCountCard() {
  const { t } = useTranslation()

  const { data: count } = useQuery({
    queryKey: ['home', 'reviewCount'],
    queryFn: () => reviewApi.getReviewCount().then((r) => r.data.data ?? 0),
    staleTime: 5 * 60_000,
  })

  if (count == null) return null

  return (
    <section>
      <SectionHeader title={t('home.stats.reviewCountTitle')} />
      <ul className="overflow-hidden rounded-xl border border-neutral-100 bg-white">
        <StatRow label={t('home.stats.reviewCountLabel')} value={count} />
      </ul>
    </section>
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
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-600 shadow-sm">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <p className="mb-1 text-[11px] font-semibold tracking-wide text-stone-500">
            {t('home.eventCard.label')}
          </p>
          <p className="whitespace-normal break-keep text-xs font-bold leading-snug text-neutral-800">
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

  // 평점 Top 5 (사이드바 목록형)
  const { data: topRatedData } = useQuery({
    queryKey: ['home', 'topRated', 5],
    queryFn: () => spiritApi.search({ sort: 'SCORE_DESC', size: 5 }).then((r) => r.data.data!),
    staleTime: 60_000,
  })

  const { data: recentData } = useQuery({
    queryKey: ['home', 'recent'],
    queryFn: () => spiritApi.search({ sort: 'LATEST', size: 10 }).then((r) => r.data.data!),
    staleTime: 60_000,
  })

  // 최근 등록된 리뷰 (마스터 주류 단위 중복 없이 최신순, 최근 등록된 술과 동일 개수)
  const { data: recentReviews = [] } = useQuery({
    queryKey: ['home', 'recentReviews', 10],
    queryFn: () => reviewApi.getRecentReviews(10).then((r) => r.data.data ?? []),
    staleTime: 60_000,
  })

  const topRated = topRatedData?.content ?? []
  const recent   = recentData?.content   ?? []

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
        canonical={buildCanonical(isEn ? '/en' : '/ko')}
        locale={isEn ? 'en_US' : 'ko_KR'}
        alternateKo={buildCanonical('/ko')}
        alternateEn={buildCanonical('/en')}
        alternateDefault={buildCanonical('/ko')}
        keywords={isEn
          ? 'whisky specs, wine reviews, cognac ratings, liquor directory, community, caskbycask'
          : '주류 정보, 위스키 리뷰, 와인 평점, 꼬냑 등급, 주류 커뮤니티, 캐스크바이캐스크, 캐바캐'}
      />

      {/* 본문: 2열 (주 콘텐츠 + 사이드바) */}
      <div className="max-w-7xl mx-auto px-4 py-6 lg:py-8">
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-7">

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

            {/* 최근 등록된 리뷰 (전용 목록 페이지가 없어 전체보기 링크 없음) */}
            {recentReviews.length > 0 && (
              <section>
                <SectionHeader title={t('home.sections.recentReviews')} />
                <RecentReviewCarousel reviews={recentReviews} />
              </section>
            )}

          </div>

          {/* 사이드바 — PC: 시음회 → 평점 Top 5 → 배너 / MO: 평점 Top 5 → 시음회 → 배너 */}
          <aside className="mt-10 flex flex-col gap-5 lg:mt-0">
            <div className="order-2 lg:order-1">
              <EventCard />
            </div>

            {/* 평점 Top 5 */}
            {topRated.length > 0 && (
              <section className="order-1 lg:order-2">
                <SectionHeader
                  title={t('home.sections.topRated5')}
                  link="/spirits?sort=SCORE_DESC"
                  linkLabel={t('home.sections.viewAll')}
                />
                <TopRatedList spirits={topRated} />
              </section>
            )}

            {/* 카테고리별 등록 주류 수 (에디션 포함) */}
            <div className="order-3">
              <CategoryCountCard />
            </div>

            {/* 등록된 리뷰 수 — 위 카드와 같은 디자인 */}
            <div className="order-4">
              <ReviewCountCard />
            </div>

            {/* 사이드바 배너 */}
            {sideBanners.some((banner) => banner.pcImage) && (
              <div className="order-5 rounded-xl shadow-sm">
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
