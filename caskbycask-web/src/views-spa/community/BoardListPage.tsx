import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { usePosts, useBestPosts, usePostPrefixes } from '@/domain/community/hooks/usePosts'
import { usePinnedNotices } from '@/domain/notice/hooks/useNotices'
import type { BoardType, PostListItem, PostSort } from '@/domain/community/types/community.types'
import type { UserRole } from '@/domain/auth/types/auth.types'
import Pagination from '@/shared/components/Pagination'
import UserBadge from '@/shared/components/UserBadge'
import RecommendBadge from '@/shared/components/RecommendBadge'
import AdultBadge from '@/shared/components/AdultBadge'
import SeoMeta, { buildCanonical } from '@/shared/components/SeoMeta'
import { useAuthStore } from '@/domain/auth/store/authStore'
import { formatBoardDate } from '@/shared/utils/format'
import { buildBreadcrumbSchema, buildItemListSchema } from '@/shared/utils/seoSchema'
import {
  isBoardListNoindex,
  metadataSearchParamsFromUrl,
  type BoardListType,
} from '@/shared/utils/seoIndexing'

const PAGE_SIZE = 20

const SORT_OPTIONS: { value: PostSort; labelKey: string }[] = [
  { value: 'LATEST', labelKey: 'board.sortLatest' },
  { value: 'BEST',   labelKey: 'board.sortBest' },
  { value: 'VIEW',   labelKey: 'board.sortView' },
]


type Tab = 'all' | 'best' | 'event'

interface Props {
  boardType?: BoardType
  title: string
}

type PostThumbnailMedia = {
  type: 'image' | 'video'
  url: string
}

function getPostThumbnail(post: PostListItem): PostThumbnailMedia | null {
  if (post.adultOnly || post.isLocked) return null
  if (post.thumbnailImageUrl) return { type: 'image', url: post.thumbnailImageUrl }
  if (post.thumbnailVideoUrl) return { type: 'video', url: post.thumbnailVideoUrl }
  return null
}

function PreviewMedia({ media, className }: { media: PostThumbnailMedia; className: string }) {
  return (
    media.type === 'video' ? (
      <video
        src={media.url}
        muted
        playsInline
        preload="metadata"
        className={className}
      />
    ) : (
      <img
        src={media.url}
        alt=""
        loading="lazy"
        className={className}
      />
    )
  )
}

function MediaMarker({ media }: { media: PostThumbnailMedia | null }) {
  const markerRef = useRef<HTMLSpanElement>(null)
  const [previewPosition, setPreviewPosition] = useState<{ left: number; top: number } | null>(null)
  if (!media) return null

  const isVideo = media?.type === 'video'
  const showPreview = () => {
    const rect = markerRef.current?.getBoundingClientRect()
    if (!rect) return
    const size = 144
    const gap = 8
    const left = rect.right + gap + size <= window.innerWidth - gap
      ? rect.right + gap
      : Math.max(gap, rect.left - gap - size)
    const top = Math.min(
      Math.max(gap, rect.top + rect.height / 2 - size / 2),
      Math.max(gap, window.innerHeight - size - gap),
    )
    setPreviewPosition({ left, top })
  }

  return (
    <span
      ref={markerRef}
      className="inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border border-neutral-300 bg-neutral-100 text-neutral-600"
      onMouseEnter={showPreview}
      onMouseLeave={() => setPreviewPosition(null)}
      aria-hidden="true"
    >
      {isVideo ? (
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5.5v13l11-6.5-11-6.5z" />
        </svg>
      ) : (
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 7a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V7z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="m4 16 4-4 3 3 2-2 7 7" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 8h.01" />
        </svg>
      )}
      {previewPosition && typeof document !== 'undefined' && createPortal(
        <span
          className="pointer-events-none fixed z-[100] hidden h-36 w-36 overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-xl ring-1 ring-black/5 sm:block"
          style={previewPosition}
        >
          <PreviewMedia media={media} className="h-full w-full object-cover" />
          {isVideo && (
            <span className="absolute inset-0 flex items-center justify-center bg-black/10 text-white">
              <svg className="h-8 w-8 drop-shadow" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5.5v13l11-6.5-11-6.5z" />
              </svg>
            </span>
          )}
        </span>,
        document.body,
      )}
    </span>
  )
}

export default function BoardListPage({ boardType, title }: Props) {
  const { t, i18n } = useTranslation()
  const { isLoggedIn, user } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const isAll = !boardType
  const boardPath: BoardListType = isAll ? 'all' : boardType === 'NOTICE' ? 'notice' : 'free'
  const detailState = { returnTo: `${location.pathname}${location.search}` }

  const tabs: Tab[] = isAll
    ? ['all']
    : boardType === 'NOTICE' ? ['all', 'event'] : ['all', 'best']

  // ── URL 파라미터 ──────────────────────────────────────────
  const rawTab      = searchParams.get('tab') ?? 'all'
  const tabParam    = (tabs.includes(rawTab as Tab) ? rawTab : 'all') as Tab
  const prefixParam = searchParams.get('prefix') ? Number(searchParams.get('prefix')) : undefined
  const sortParam   = (searchParams.get('sort') ?? 'LATEST') as PostSort
  const keywordParam = searchParams.get('keyword') ?? ''
  const pageParam   = Number(searchParams.get('page') ?? '0')
  const authorIdParam = searchParams.get('authorId') ? Number(searchParams.get('authorId')) : undefined
  const commentAuthorIdParam = searchParams.get('commentAuthorId') ? Number(searchParams.get('commentAuthorId')) : undefined
  const authorNicknameParam = searchParams.get('authorNickname') ?? ''

  const [keywordInput, setKeywordInput] = useState(keywordParam)

  // ── 데이터 ────────────────────────────────────────────────
  // "전체" 게시판은 말머리 필터를 노출하지 않으므로 prefix 호출도 생략
  const { data: prefixes = [] } = usePostPrefixes(boardType ?? 'FREE')

  const eventPrefix = prefixes.find(p => p.name === '이벤트')
  const effectivePrefixId = tabParam === 'event' ? eventPrefix?.id : prefixParam

  const allPostsQuery = usePosts({
    boardType,
    prefixId: isAll ? undefined : effectivePrefixId,
    keyword: keywordParam || undefined,
    sort: isAll ? 'LATEST' : sortParam,
    authorId: authorIdParam,
    commentAuthorId: commentAuthorIdParam,
    page: pageParam,
    size: PAGE_SIZE,
  })

  const bestPostsQuery = useBestPosts({
    boardType: boardType ?? 'FREE',
    page: pageParam,
    size: PAGE_SIZE,
  })

  const query    = !isAll && tabParam === 'best' ? bestPostsQuery : allPostsQuery
  const posts    = query.data?.content ?? []
  const totalPages = query.data?.totalPages ?? 0

  // ── 상단노출 공지 ─────────────────────────────────────────
  // 전체/소식/자유 게시판 모두 기본 탐색 상태(첫 페이지·전체글 탭·필터/검색 없음)일 때만
  // 목록 최상단에 고정 노출. 검색·정렬·페이징 시에는 노출하지 않아 결과 정확도를 유지.
  const { data: pinnedNotices = [] } = usePinnedNotices()
  const showPinnedNotices =
    tabParam === 'all' &&
    pageParam === 0 &&
    !keywordParam &&
    !prefixParam &&
    !authorIdParam &&
    !commentAuthorIdParam &&
    pinnedNotices.length > 0

  // 전체: 글쓰기 불가. NOTICE: ADMIN·SUPER_ADMIN·PARTNER만 글쓰기 가능
  const canWrite = !isAll && isLoggedIn && (
    boardType === 'FREE' ||
    user?.role === 'SUPER_ADMIN' ||
    user?.role === 'ADMIN' ||
    user?.role === 'PARTNER'
  )

  // ── 파라미터 업데이트 헬퍼 ────────────────────────────────
  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(searchParams)
    if (value !== null) next.set(key, value)
    else next.delete(key)
    // 필터(검색·말머리·정렬) 변경 시에만 1페이지로 리셋. 페이지 이동 자체는 그대로 반영.
    if (key !== 'page') next.set('page', '0')
    setSearchParams(next, { replace: true })
  }

  // 키워드 검색 (Enter 또는 검색 버튼 클릭 시에만)
  const submitKeyword = (e: React.FormEvent) => {
    e.preventDefault()
    setParam('keyword', keywordInput || null)
  }

  const setTab = (tab: Tab) => {
    const next = new URLSearchParams(searchParams)
    next.set('tab', tab)
    next.set('page', '0')
    setSearchParams(next, { replace: true })
  }

  const seoTitle = isAll
    ? t('menu.communityAll', '전체 게시판')
    : boardType === 'NOTICE' ? t('menu.communityNews', '소식 게시판') : t('menu.communityBoard', '자유게시판')
  const seoDesc = isAll
    ? t('board.seo.allDesc', 'CaskByCask 커뮤니티 전체 게시판 — 소식과 자유게시판 글을 한 곳에서.')
    : boardType === 'NOTICE'
      ? t('board.seo.noticeDesc', 'CaskByCask 소식 게시판 — 위스키·와인·꼬냑 관련 소식과 이벤트 게시글.')
      : t('board.seo.freeDesc', 'CaskByCask 자유게시판 — 위스키, 와인, 꼬냑 등 주류에 대한 자유로운 의견과 정보 공유.')
  const seoNoindex = isBoardListNoindex(
    boardPath,
    metadataSearchParamsFromUrl(searchParams),
  )

  // "전체" 게시판에서 게시글 클릭 시 원래 게시판 경로로 분기
  const getPostHref = (post: typeof posts[number]) => {
    if (!isAll) return `/community/${boardPath}/${post.id}`
    const sub = post.boardType === 'NOTICE' ? 'notice' : 'free'
    return `/community/${sub}/${post.id}`
  }
  const seoCanonical = buildCanonical(`/ko/community/${boardPath}`)
  const seoJsonLd = [
    buildBreadcrumbSchema([
      { name: t('menu.home', '홈'), path: '/ko' },
      { name: seoTitle, path: `/ko/community/${boardPath}` },
    ]),
    {
      '@type': 'CollectionPage' as const,
      name: seoTitle,
      description: seoDesc,
      url: seoCanonical,
    },
    ...(posts.length > 0 ? [buildItemListSchema(
      posts
        .filter((post) => !post.isLocked && !post.adultOnly)
        .map((post) => ({ name: post.title, path: `/ko${getPostHref(post)}` })),
    )] : []),
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <SeoMeta
        title={seoTitle}
        description={seoDesc}
        canonical={seoCanonical}
        locale={i18n.language === 'en' ? 'en_US' : 'ko_KR'}
        noindex={seoNoindex}
        deferJsonLd={query.data == null && !seoNoindex}
        jsonLd={i18n.language === 'en' ? undefined : seoJsonLd}
      />

      {/* 작성자/댓글 필터 배너 */}
      {(authorIdParam || commentAuthorIdParam) && authorNicknameParam && (
        <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-primary-50 border border-primary-200 rounded-lg text-sm text-primary-900">
          <span>
            {authorIdParam
              ? t('board.filter.posts', { nickname: authorNicknameParam, defaultValue: `"${authorNicknameParam}"님의 게시글` })
              : t('board.filter.comments', { nickname: authorNicknameParam, defaultValue: `"${authorNicknameParam}"님이 댓글 단 게시글` })}
          </span>
          <button
            onClick={() => {
              const next = new URLSearchParams(searchParams)
              next.delete('authorId')
              next.delete('commentAuthorId')
              next.delete('authorNickname')
              next.set('page', '0')
              setSearchParams(next, { replace: true })
            }}
            className="ml-auto text-xs text-primary-500 hover:text-primary-900 underline"
          >
            필터 해제
          </button>
        </div>
      )}

      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-neutral-900">{title}</h1>
        {canWrite && (
          <Link
            to={`/community/${boardPath}/write`}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-primary-800 text-white hover:bg-primary-900 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            {t('board.write')}
          </Link>
        )}
      </div>

      {/* 탭: NOTICE → 전체글/이벤트, FREE → 전체글/베스트. "전체"는 탭 없음 */}
      {!isAll && (
        <div className="flex gap-1 border-b border-neutral-200 mb-5">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setTab(tab)}
              className={[
                'px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
                tabParam === tab
                  ? 'border-primary-800 text-primary-800'
                  : 'border-transparent text-neutral-500 hover:text-neutral-700',
              ].join(' ')}
            >
              {tab === 'all' ? t('board.all') : tab === 'best' ? t('board.best') : t('board.event')}
            </button>
          ))}
        </div>
      )}



      {/* 말머리 필터 (FREE 게시판 전체글 탭에서만 표시) */}
      {boardType === 'FREE' && tabParam === 'all' && prefixes.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setParam('prefix', null)}
            className={[
              'px-3 py-1.5 text-xs font-medium rounded-full border transition-colors',
              !prefixParam
                ? 'border-primary-500 bg-primary-50 text-primary-900'
                : 'border-neutral-200 text-neutral-600 hover:border-neutral-300',
            ].join(' ')}
          >
            {t('board.allPrefix')}
          </button>
          {prefixes.map((p) => (
            <button
              key={p.id}
              onClick={() => setParam('prefix', String(p.id))}
              className={[
                'px-3 py-1.5 text-xs font-medium rounded-full border transition-colors',
                prefixParam === p.id
                  ? 'border-primary-500 bg-primary-50 text-primary-900'
                  : 'border-neutral-200 text-neutral-600 hover:border-neutral-300',
              ].join(' ')}
              style={p.colorHex ? { borderColor: p.colorHex, color: p.colorHex } : undefined}
            >
              {t(`prefix.${p.name}`, p.name)}
            </button>
          ))}
        </div>
      )}

      {/* 검색 + 정렬 */}
      <div className="flex gap-3 mb-5">
        <form onSubmit={submitKeyword} className="flex-1 relative">
          <input
            type="text"
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            placeholder={t('board.searchPlaceholder')}
            className="w-full pl-4 pr-10 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400"
          />
          <button
            type="submit"
            aria-label={t('nav.search')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-primary-600 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
          </button>
        </form>
        {!isAll && (tabParam === 'all' || tabParam === 'event') && (
          <select
            value={sortParam}
            onChange={(e) => setParam('sort', e.target.value)}
            className="px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white"
          >
            {SORT_OPTIONS.map(({ value, labelKey }) => (
              <option key={value} value={value}>{t(labelKey)}</option>
            ))}
          </select>
        )}
      </div>

      {/* 게시글 목록 */}
      {query.isLoading ? (
        <div className="py-20 text-center text-neutral-400 text-sm">{t('common.loading')}</div>
      ) : posts.length === 0 && !showPinnedNotices ? (
        <div className="py-20 text-center text-neutral-400 text-sm">{t('board.noPost')}</div>
      ) : (
        <>
          {/* PC 테이블 */}
          <div className="hidden overflow-hidden rounded-xl border border-neutral-200 bg-white sm:block">
            <table className="w-full text-sm table-fixed">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-100">
                  <th className="text-center px-4 py-2.5 font-medium text-neutral-500 w-28">{t('board.prefix')}</th>
                  <th className="text-center px-2 py-2.5 font-medium text-neutral-500 w-10"></th>
                  <th className="text-center px-4 py-2.5 font-medium text-neutral-500">{t('board.title')}</th>
                  <th className="text-center px-4 py-2.5 font-medium text-neutral-500 w-32">닉네임</th>
                  <th className="text-center px-4 py-2.5 font-medium text-neutral-500 w-16">{t('board.likes')}</th>
                  <th className="text-center px-4 py-2.5 font-medium text-neutral-500 w-16">{t('board.views')}</th>
                  <th className="text-center px-4 py-2.5 font-medium text-neutral-500 w-24">작성일</th>
                </tr>
              </thead>
              <tbody>
                {showPinnedNotices && pinnedNotices.map((notice) => (
                  <tr
                    key={`notice-${notice.id}`}
                    onClick={() => navigate(`/notices/${notice.id}`, { state: detailState })}
                    className="group/row border-b border-neutral-200 bg-amber-50/40 hover:bg-amber-50 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-2 text-center">
                      <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                        {t('board.noticeBadge')}
                      </span>
                    </td>
                    <td className="px-2 py-2 text-center">
                      <MediaMarker media={null} />
                    </td>
                    <td className="px-4 py-2">
                      <span className="block truncate text-sm font-normal text-neutral-800 transition-colors group-hover/row:text-primary-800">
                        {notice.title}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-center">
                      <span className="text-xs font-medium text-rose-700">운영자</span>
                    </td>
                    <td className="px-4 py-2 text-center"><div className="flex justify-center"><RecommendBadge count={notice.recommendCount} /></div></td>
                    <td className="px-4 py-2 text-center text-neutral-500 text-xs">{notice.viewCount.toLocaleString()}</td>
                    <td className="px-4 py-2 text-center text-neutral-400 text-xs">
                      {formatBoardDate(notice.createdAt)}
                    </td>
                  </tr>
                ))}
                {posts.map((post) => (
                  <tr
                    key={post.id}
                    onClick={() => navigate(getPostHref(post), { state: detailState })}
                    className={[
                      'group/row border-b border-neutral-200 transition-colors cursor-pointer',
                      post.isPinned ? 'bg-amber-50/50 hover:bg-amber-50' : 'hover:bg-neutral-50',
                    ].join(' ')}
                  >
                    <td className="px-4 py-2 text-center">
                      {post.prefix && (
                        <span
                          className="inline-block text-xs font-medium px-2 py-0.5 rounded-full border bg-neutral-50"
                          style={post.prefix.colorHex
                            ? { color: post.prefix.colorHex, borderColor: post.prefix.colorHex }
                            : { color: '#6b7280', borderColor: '#d1d5db' }}
                        >
                          {t(`prefix.${post.prefix.name}`, post.prefix.name)}
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-2 text-center">
                      <MediaMarker media={getPostThumbnail(post)} />
                    </td>
                    <td className="px-4 py-2" title={post.isLocked ? t('board.locked') : undefined}>
                      <div className="flex items-center gap-2 min-w-0">
                        {post.isLocked && <span className="text-neutral-400">🔒</span>}
                        {post.adultOnly && <AdultBadge />}
                        <span className={[
                          'flex-1 min-w-0 truncate text-sm font-normal transition-colors group-hover/row:text-primary-800',
                          post.isLocked ? 'text-red-600' : 'text-neutral-800',
                        ].join(' ')}>
                          {post.title}
                        </span>
                        {(post as any).byobStatus && (
                          <span className="flex-shrink-0 inline-flex items-center text-xs font-bold
                            px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 border border-orange-200">
                            비욥
                          </span>
                        )}
                        {(post as any).byobStatus === 'OPEN' && (
                          <span className="flex-shrink-0 text-xs text-green-700 font-medium">모집중</span>
                        )}
                        {(post as any).byobStatus === 'CLOSED' && (
                          <span className="flex-shrink-0 text-xs text-yellow-700 font-medium">마감</span>
                        )}
                        {(post as any).byobStatus === 'CANCELLED' && (
                          <span className="flex-shrink-0 text-xs text-neutral-400 font-medium">취소</span>
                        )}
                        {post.commentCount > 0 && (
                          <span className="text-primary-500 text-xs flex-shrink-0">[{post.commentCount}]</span>
                        )}
                        {post.hasPoll && <span className="text-xs text-neutral-400 flex-shrink-0">📊</span>}
                      </div>
                    </td>
                    <td className="px-4 py-2 text-center">
                      {post.authorRole ? (
                        <UserBadge
                          user={{ id: post.authorId ?? undefined, nickname: post.authorNickname, role: post.authorRole as UserRole, currentLevel: post.authorLevel, maturingPower: post.authorMaturingPower ?? undefined, nicknameFixed: post.authorNicknameFixed, profileImageUrl: post.authorProfileImageUrl, systemAccount: post.authorSystemAccount }}
                          size="sm"
                          avatarSize="xs"
                          levelIconSize={14}
                        />
                      ) : (
                        <span className="text-neutral-500 text-xs">{post.authorNickname}</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-center"><div className="flex justify-center"><RecommendBadge count={post.likeCount} /></div></td>
                    <td className="px-4 py-2 text-center text-neutral-500 text-xs">{post.viewCount.toLocaleString()}</td>
                    <td className="px-4 py-2 text-center text-neutral-400 text-xs">
                      {formatBoardDate(post.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 모바일 카드 */}
          <div className="sm:hidden space-y-2">
            {showPinnedNotices && pinnedNotices.map((notice) => (
              <Link
                key={`notice-${notice.id}`}
                to={`/notices/${notice.id}`}
                state={detailState}
                className="block bg-amber-50/60 border border-amber-200 rounded-xl px-4 py-3.5 hover:border-amber-300 transition-colors"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                    {t('board.noticeBadge')}
                  </span>
                  <MediaMarker media={null} />
                </div>
                <p className="line-clamp-2 text-sm font-normal leading-5 text-neutral-800">
                  {notice.title}
                </p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-neutral-400">
                  <RecommendBadge count={notice.recommendCount} />
                  <span>조회 {notice.viewCount.toLocaleString()}</span>
                  <span>{formatBoardDate(notice.createdAt)}</span>
                </div>
              </Link>
            ))}
            {posts.map((post) => (
              <Link
                key={post.id}
                to={getPostHref(post)}
                state={detailState}
                className={[
                  'block border rounded-xl px-4 py-3.5 transition-colors',
                  post.isPinned
                    ? 'bg-amber-50/60 border-amber-200 hover:border-amber-300'
                    : 'bg-white border-neutral-200 hover:border-neutral-300',
                ].join(' ')}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  {post.prefix && (
                    <span
                      className="text-xs font-medium px-2 py-0.5 rounded-full border"
                      style={post.prefix.colorHex
                        ? { color: post.prefix.colorHex, borderColor: post.prefix.colorHex }
                        : { color: '#6b7280', borderColor: '#d1d5db' }}
                    >
                      {t(`prefix.${post.prefix.name}`, post.prefix.name)}
                    </span>
                  )}
                  <MediaMarker media={getPostThumbnail(post)} />
                  {post.isLocked && <span className="text-neutral-400 text-sm">🔒</span>}
                  {(post as any).byobStatus && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-orange-100
                      text-orange-700 border border-orange-200 inline-flex items-center">
                      {t('prefix.비욥', '비욥')}
                    </span>
                  )}
                </div>
                <p className={[
                  'line-clamp-2 text-sm font-normal leading-5',
                  post.isLocked ? 'text-red-600' : 'text-neutral-800',
                ].join(' ')}>
                  {post.adultOnly && <AdultBadge className="mr-1 align-middle" />}
                  {post.title}
                </p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-neutral-400">
                  {post.authorRole ? (
                    <UserBadge
                      user={{ nickname: post.authorNickname, role: post.authorRole as UserRole, currentLevel: post.authorLevel, maturingPower: post.authorMaturingPower ?? undefined, nicknameFixed: post.authorNicknameFixed, profileImageUrl: post.authorProfileImageUrl, systemAccount: post.authorSystemAccount }}
                      size="sm"
                      avatarSize="xs"
                      levelIconSize={14}
                    />
                  ) : (
                    <span>{post.authorNickname}</span>
                  )}
                  <RecommendBadge count={post.likeCount} />
                  <span>조회 {post.viewCount.toLocaleString()}</span>
                  <span>{formatBoardDate(post.createdAt)}</span>
                </div>
              </Link>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-8 flex justify-center">
              <Pagination
                currentPage={pageParam}
                totalPages={totalPages}
                onPageChange={(p) => setParam('page', String(p))}
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}
