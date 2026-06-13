import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import SeoMeta, { buildCanonical } from '@/shared/components/SeoMeta'
import { spiritApi } from '@/domain/spirit/api/spiritApi'
import { useBanners } from '@/domain/banner/hooks/useBanners'
import { usePopups } from '@/domain/popup/hooks/usePopups'
import { useNotices, usePinnedNotices } from '@/domain/notice/hooks/useNotices'
import { useRanking } from '@/domain/ranking/hooks/useRanking'
import { usePosts } from '@/domain/community/hooks/usePosts'
import { useByobList } from '@/domain/byob/hooks/useByob'
import { PopupViewer } from '@/domain/popup/components/PopupViewer'
import BannerSlider from '@/domain/banner/components/BannerSlider'
import SpiritCard from '@/shared/components/SpiritCard'
import LevelBadge from '@/shared/components/LevelBadge'
import AdultBadge from '@/shared/components/AdultBadge'
import { formatBoardDate } from '@/shared/utils/format'
import type { SpiritListItem } from '@/domain/spirit/types/spirit.types'
import type { NoticeListItem } from '@/domain/notice/types/notice.types'
import type { RankingPeriod } from '@/domain/ranking/types/ranking.types'
import type { PostListItem } from '@/domain/community/types/community.types'
import type { ByobListItem } from '@/domain/byob/types/byob.types'

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

// ── 술 카드 가로 스크롤 행 ────────────────────────────────────────
function SpiritCardRow({ spirits }: { spirits: SpiritListItem[] }) {
  return (
    <div
      className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4
        lg:mx-0 lg:px-0 lg:grid lg:grid-cols-5 lg:overflow-visible lg:pb-0"
      style={{ scrollbarWidth: 'none' }}
    >
      {spirits.slice(0, 10).map((spirit) => (
        <div key={spirit.id} className="flex-shrink-0 w-36 sm:w-40 lg:w-auto">
          <SpiritCard spirit={spirit} />
        </div>
      ))}
    </div>
  )
}

// ── 커뮤니티 게시글 행 ────────────────────────────────────────────
function PostRow({ post, boardPath }: { post: PostListItem; boardPath: string }) {
  const label = post.prefix?.name ?? (boardPath === 'notice' ? '소식' : '자유')
  const labelColor = post.prefix?.colorHex
  return (
    <Link
      to={`/community/${boardPath}/${post.id}`}
      className={[
        'flex items-center gap-3 px-4 py-3.5 border-b border-neutral-50 last:border-b-0 transition-colors group',
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
      className="flex items-center gap-3 px-4 py-3.5 border-b border-neutral-50 last:border-b-0
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

function ByobRow({ item }: { item: ByobListItem }) {
  const statusMap: Record<string, { label: string; cls: string }> = {
    OPEN: { label: '모집중', cls: 'text-green-700' },
    CLOSED: { label: '마감', cls: 'text-yellow-700' },
    CANCELLED: { label: '취소', cls: 'text-neutral-400' },
  }
  const status = statusMap[item.status]
  return (
    <Link
      to={`/community/byob/${item.id}`}
      className={[
        'flex items-center gap-3 px-4 py-3.5 border-b border-neutral-50 last:border-b-0 transition-colors group',
        item.isPinned ? 'bg-amber-50/50 hover:bg-amber-50' : 'hover:bg-primary-50/40',
      ].join(' ')}
    >
      <span className="flex-shrink-0 text-xs font-bold px-1.5 py-0.5 rounded w-12 text-center
        bg-orange-50 text-orange-700">
        BYOB
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-neutral-800 group-hover:text-primary-800 line-clamp-1 transition-colors">
          {item.title}
          {status && <span className={`text-xs ml-1.5 font-medium ${status.cls}`}>{status.label}</span>}
        </p>
      </div>
      <div className="flex-shrink-0 flex items-center gap-3 text-xs text-neutral-400">
        <span className="hidden sm:inline max-w-[90px] truncate">{item.location}</span>
        <span className="tabular-nums">{item.approvedCount}/{item.maxParticipants}</span>
        <span>{formatBoardDate(item.createdAt)}</span>
      </div>
    </Link>
  )
}

// ── 커뮤니티 최신글 섹션 ──────────────────────────────────────────
type CommunityTab = 'free' | 'news' | 'byob'

function CommunityLatestSection() {
  const { t } = useTranslation()
  const [tab, setTab] = useState<CommunityTab>('free')

  const { data: freeData } = usePosts({ boardType: 'FREE', sort: 'LATEST', page: 0, size: 6 })
  const { data: newsData } = usePosts({ boardType: 'NOTICE', sort: 'LATEST', page: 0, size: 6 })
  const { data: byobData } = useByobList({ page: 0, size: 6 })
  const { data: pinnedNotices = [] } = usePinnedNotices()

  const freePosts = freeData?.content ?? []
  const newsPosts = newsData?.content ?? []
  const byobItems = byobData?.content ?? []

  const tabs: { key: CommunityTab; label: string; to: string }[] = [
    { key: 'free', label: t('home.community.free'), to: '/community/free' },
    { key: 'news', label: t('home.community.news'), to: '/community/notice' },
    { key: 'byob', label: t('home.community.byob'), to: '/community/byob' },
  ]

  const moreLink = tabs.find((x) => x.key === tab)!.to
  // 자유/소식 탭은 상단노출 공지를 함께 노출하므로 공지가 있으면 빈 상태가 아님
  const isEmpty =
    (tab === 'free' && freePosts.length === 0 && pinnedNotices.length === 0) ||
    (tab === 'news' && newsPosts.length === 0 && pinnedNotices.length === 0) ||
    (tab === 'byob' && byobItems.length === 0)

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold text-neutral-900 tracking-tight">
          {t('home.community.title')}
        </h2>
        <div className="flex items-center gap-1">
          {tabs.map((x) => (
            <button
              key={x.key}
              onClick={() => setTab(x.key)}
              className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${
                tab === x.key
                  ? 'bg-primary-800 text-white'
                  : 'text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100'
              }`}
            >
              {x.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-neutral-100 overflow-hidden">
        {isEmpty ? (
          <p className="text-sm text-neutral-400 py-10 text-center">{t('home.community.empty')}</p>
        ) : tab === 'free' ? (
          <>
            {pinnedNotices.map((n) => <NoticePostRow key={`notice-${n.id}`} notice={n} />)}
            {freePosts.map((p) => <PostRow key={p.id} post={p} boardPath="free" />)}
          </>
        ) : tab === 'news' ? (
          <>
            {pinnedNotices.map((n) => <NoticePostRow key={`notice-${n.id}`} notice={n} />)}
            {newsPosts.map((p) => <PostRow key={p.id} post={p} boardPath="notice" />)}
          </>
        ) : (
          byobItems.map((b) => <ByobRow key={b.id} item={b} />)
        )}
      </div>

      <div className="mt-3 text-center">
        <Link
          to={moreLink}
          className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-primary-800
            font-medium transition-colors py-2 px-4 rounded-lg hover:bg-primary-50"
        >
          {t('home.community.more')}
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </Link>
      </div>
    </section>
  )
}

// ── 랭킹 위젯 ────────────────────────────────────────────────────
function RankingWidget() {
  const { t } = useTranslation()
  const [period, setPeriod] = useState<RankingPeriod>('WEEKLY')
  const { data } = useRanking(period, 0)
  const top5 = data?.content.slice(0, 5) ?? []

  const MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }

  return (
    <div className="bg-white rounded-xl border border-neutral-100 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-neutral-900 tracking-tight">
          {t('home.sections.ranking')}
        </h3>
        <Link
          to="/ranking"
          className="text-xs text-primary-800 hover:text-primary-900 font-medium
            flex items-center gap-0.5 transition-colors"
        >
          {t('home.sections.viewAll')}
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </Link>
      </div>

      <div className="flex gap-1 mb-4">
        {(['WEEKLY', 'ALL'] as RankingPeriod[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
              period === p
                ? 'bg-primary-800 text-white'
                : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200'
            }`}
          >
            {p === 'WEEKLY' ? t('home.sections.weekly') : t('home.sections.allTime')}
          </button>
        ))}
      </div>

      <div className="space-y-2.5">
        {top5.length === 0 ? (
          <p className="text-sm text-neutral-400 py-4 text-center">{t('home.community.empty')}</p>
        ) : (
          top5.map((item) => {
            const score = period === 'WEEKLY' ? item.weeklyScore : item.maturingPower
            return (
              <div key={item.userId} className="flex items-center gap-2.5">
                <span className="w-5 text-center text-sm leading-none flex-shrink-0">
                  {MEDAL[item.rank] ?? (
                    <span className="text-xs font-bold text-neutral-400">{item.rank}</span>
                  )}
                </span>
                <LevelBadge level={item.currentLevel} size={22} />
                <span className="flex-1 text-sm text-neutral-800 truncate font-medium">
                  {item.nickname}
                </span>
                <span className="text-xs font-semibold text-amber-600 tabular-nums flex-shrink-0">
                  {score.toLocaleString()}p
                </span>
              </div>
            )
          })
        )}
      </div>
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
  return (
    <Link
      to="/calendar"
      className="block bg-amber-800 rounded-xl p-4
        hover:bg-amber-700 transition-colors group"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-amber-200" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        </div>
        <div className="min-w-0">
          <p className="text-xs text-amber-200/80 font-medium mb-0.5">{t('home.eventCard.label')}</p>
          <p className="text-sm font-bold text-white truncate">{t('home.eventCard.title')}</p>
        </div>
        <svg className="w-4 h-4 text-white/60 group-hover:text-white transition-colors ml-auto flex-shrink-0"
          fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>
    </Link>
  )
}

// ── 바로가기 위젯 ────────────────────────────────────────────────
function ShortcutsWidget() {
  const { t } = useTranslation()
  const items = [
    {
      to: '/ranking', label: t('home.shortcuts.ranking'),
      icon: <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />,
    },
    {
      to: '/community/all', label: t('home.shortcuts.community'),
      icon: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>,
    },
    {
      to: '/spirits', label: t('home.shortcuts.review'),
      icon: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
    },
    {
      to: '/spirits', label: t('home.shortcuts.search'),
      icon: <><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></>,
    },
  ]
  return (
    <div className="bg-white rounded-xl border border-neutral-100 p-4">
      <h3 className="text-sm font-bold text-neutral-900 mb-3 tracking-tight">{t('home.shortcuts.title')}</h3>
      <div className="grid grid-cols-2 gap-2">
        {items.map((it, i) => (
          <Link
            key={i}
            to={it.to}
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-neutral-50 hover:bg-primary-50
              hover:text-primary-800 text-neutral-600 text-xs font-medium transition-colors"
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              {it.icon}
            </svg>
            {it.label}
          </Link>
        ))}
      </div>
    </div>
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
  const { data: banners = [] } = useBanners(bannerLanguage)

  const { data: popups = [] } = usePopups(bannerLanguage)
  const [isPopupOpen, setIsPopupOpen] = useState(false)
  useEffect(() => {
    if (popups.length > 0) setIsPopupOpen(true)
  }, [popups.length])

  const { data: popularData } = useQuery({
    queryKey: ['home', 'popular'],
    queryFn: () => spiritApi.search({ sort: 'REVIEW_COUNT_DESC', size: 10 }).then((r) => r.data.data!),
    staleTime: 60_000,
  })

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

  const popular  = popularData?.content  ?? []
  const topRated = topRatedData?.content ?? []
  const recent   = recentData?.content   ?? []
  const notices  = noticesData?.content  ?? []

  const isEn = i18n.language === 'en'

  return (
    <div>
      <SeoMeta
        title={isEn
          ? 'CaskByCask — Whisky, Wine & Cognac Review Community'
          : 'CaskByCask — 위스키 · 와인 · 꼬냑 리뷰 커뮤니티'}
        description={isEn
          ? 'Discover whisky, wine, cognac, rum and tequila reviews. Single malt, bourbon, XO cognac ratings and tasting notes by real users.'
          : '위스키 추천·리뷰, 싱글 몰트, 꼬냑 등급(VS·VSOP·XO), 와인 빈티지 정보를 한 곳에서. 증류소·와이너리별 사용자 평점과 테이스팅 노트.'}
        canonical={buildCanonical('/')}
        locale={isEn ? 'en_US' : 'ko_KR'}
        keywords={isEn
          ? 'whisky review, single malt, bourbon, cognac rating, wine community, producer, caskbycask'
          : '위스키 리뷰, 위스키 추천, 싱글 몰트, 버번, 꼬냑 등급, 와인 빈티지, 주류 리뷰, 드링크인덱스'}
      />

      {/* 메인 배너 슬라이더 (관리자 이미지, 슬림) */}
      {banners.length > 0 && <BannerSlider banners={banners} />}

      {/* 본문: 2열 (주 콘텐츠 + 사이드바) */}
      <div className="max-w-7xl mx-auto px-4 py-6 lg:py-8">
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-7">

          {/* 주 콘텐츠 */}
          <div className="space-y-10 min-w-0">
            {/* 커뮤니티 최신글 */}
            <CommunityLatestSection />

            {/* 이번 주 인기 */}
            {popular.length > 0 && (
              <section>
                <SectionHeader
                  title={t('home.sections.weeklyPopular')}
                  link="/spirits?sort=REVIEW_COUNT_DESC"
                  linkLabel={t('home.sections.viewAll')}
                  badge
                />
                <SpiritCardRow spirits={popular} />
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
                <SpiritCardRow spirits={topRated} />
              </section>
            )}

            {/* 최근 등록 */}
            {recent.length > 0 && (
              <section>
                <SectionHeader
                  title={t('home.sections.recent')}
                  link="/spirits?sort=LATEST"
                  linkLabel={t('home.sections.viewAll')}
                />
                <SpiritCardRow spirits={recent} />
              </section>
            )}
          </div>

          {/* 사이드바 */}
          <aside className="mt-10 lg:mt-0 space-y-5">
            <RankingWidget />
            <NoticeWidget notices={notices} />
            <EventCard />
            <ShortcutsWidget />
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
