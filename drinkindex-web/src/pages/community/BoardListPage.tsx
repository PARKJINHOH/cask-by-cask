import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { usePosts, useBestPosts, usePostPrefixes } from '@/domain/community/hooks/usePosts'
import type { BoardType, PostSort } from '@/domain/community/types/community.types'
import type { UserRole } from '@/domain/auth/types/auth.types'
import Pagination from '@/shared/components/Pagination'
import UserBadge from '@/shared/components/UserBadge'
import SeoMeta, { buildCanonical } from '@/shared/components/SeoMeta'
import { useAuthStore } from '@/domain/auth/store/authStore'
import { formatBoardDate } from '@/shared/utils/format'

const PAGE_SIZE = 20

const SORT_OPTIONS: { value: PostSort; labelKey: string }[] = [
  { value: 'LATEST', labelKey: 'board.sortLatest' },
  { value: 'BEST',   labelKey: 'board.sortBest' },
  { value: 'VIEW',   labelKey: 'board.sortView' },
]


type Tab = 'all' | 'best' | 'event'

interface Props {
  boardType: BoardType
  title: string
}

export default function BoardListPage({ boardType, title }: Props) {
  const { t } = useTranslation()
  const { isLoggedIn, user } = useAuthStore()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const boardPath = boardType === 'NOTICE' ? 'notice' : 'free'

  const tabs: Tab[] = boardType === 'NOTICE' ? ['all', 'event'] : ['all', 'best']

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
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // ── 데이터 ────────────────────────────────────────────────
  const { data: prefixes = [] } = usePostPrefixes(boardType)

  const eventPrefix = prefixes.find(p => p.name === '이벤트')
  const effectivePrefixId = tabParam === 'event' ? eventPrefix?.id : prefixParam

  const allPostsQuery = usePosts({
    boardType,
    prefixId: effectivePrefixId,
    keyword: keywordParam || undefined,
    sort: sortParam,
    authorId: authorIdParam,
    commentAuthorId: commentAuthorIdParam,
    page: pageParam,
    size: PAGE_SIZE,
  })

  const bestPostsQuery = useBestPosts({
    boardType,
    page: pageParam,
    size: PAGE_SIZE,
  })

  const query    = tabParam === 'best' ? bestPostsQuery : allPostsQuery
  const posts    = query.data?.content ?? []
  const totalPages = query.data?.totalPages ?? 0

  // NOTICE 게시판: ADMIN·SUPER_ADMIN·PARTNER만 글쓰기 가능
  const canWrite = isLoggedIn && (
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
    next.set('page', '0')
    setSearchParams(next, { replace: true })
  }

  // 키워드 디바운스
  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setParam('keyword', keywordInput || null)
    }, 350)
    return () => clearTimeout(debounceRef.current)
  }, [keywordInput])

  const setTab = (tab: Tab) => {
    const next = new URLSearchParams(searchParams)
    next.set('tab', tab)
    next.set('page', '0')
    setSearchParams(next, { replace: true })
  }

  const seoTitle = boardType === 'NOTICE' ? '소식 게시판' : '자유게시판'
  const seoDesc = boardType === 'NOTICE'
    ? 'DrinkIndex 소식 게시판 — 위스키·와인·꼬냑 관련 소식과 이벤트 게시글.'
    : 'DrinkIndex 자유게시판 — 위스키, 와인, 꼬냑 등 주류에 대한 자유로운 의견과 정보 공유.'
  const seoNoindex = !!keywordParam || pageParam > 0 || tabParam !== 'all'
    || !!authorIdParam || !!commentAuthorIdParam

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <SeoMeta
        title={seoTitle}
        description={seoDesc}
        canonical={buildCanonical(`/community/${boardPath}`)}
        noindex={seoNoindex}
      />

      {/* 작성자/댓글 필터 배너 */}
      {(authorIdParam || commentAuthorIdParam) && authorNicknameParam && (
        <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-primary-50 border border-primary-200 rounded-lg text-sm text-primary-900">
          <span>
            {authorIdParam
              ? `"${authorNicknameParam}"님의 게시글`
              : `"${authorNicknameParam}"님이 댓글 단 게시글`}
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

      {/* 탭: NOTICE → 전체글/이벤트, FREE → 전체글/베스트 */}
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
              {p.name}
            </button>
          ))}
        </div>
      )}

      {/* 검색 + 정렬 */}
      <div className="flex gap-3 mb-5">
        <div className="flex-1 relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            type="text"
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            placeholder={t('board.searchPlaceholder')}
            className="w-full pl-9 pr-4 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400"
          />
        </div>
        {(tabParam === 'all' || tabParam === 'event') && (
          <select
            value={sortParam}
            onChange={(e) => setParam('sort', e.target.value)}
            className="px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white"
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
      ) : posts.length === 0 ? (
        <div className="py-20 text-center text-neutral-400 text-sm">{t('board.noPost')}</div>
      ) : (
        <>
          {/* PC 테이블 */}
          <div className="hidden sm:block bg-white border border-neutral-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-100">
                  <th className="text-left px-4 py-3 font-medium text-neutral-500 w-28">{t('board.prefix')}</th>
                  <th className="text-left px-4 py-3 font-medium text-neutral-500">{t('board.title')}</th>
                  <th className="text-left px-4 py-3 font-medium text-neutral-500 w-24">닉네임</th>
                  <th className="text-right px-4 py-3 font-medium text-neutral-500 w-16">{t('board.likes')}</th>
                  <th className="text-right px-4 py-3 font-medium text-neutral-500 w-16">{t('board.views')}</th>
                  <th className="text-right px-4 py-3 font-medium text-neutral-500 w-24">작성일</th>
                </tr>
              </thead>
              <tbody>
                {posts.map((post) => (
                  <tr
                    key={post.id}
                    onClick={() => navigate(`/community/${boardPath}/${post.id}`)}
                    className="group/row border-b border-neutral-50 hover:bg-neutral-50 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3">
                      {post.prefix && (
                        <span
                          className="inline-block text-xs font-medium px-2 py-0.5 rounded-full border bg-neutral-50"
                          style={post.prefix.colorHex
                            ? { color: post.prefix.colorHex, borderColor: post.prefix.colorHex }
                            : { color: '#6b7280', borderColor: '#d1d5db' }}
                        >
                          {post.prefix.name}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3" title={post.isLocked ? t('board.locked') : undefined}>
                      <div className="flex items-center gap-2">
                        {post.isLocked && <span className="text-neutral-400">🔒</span>}
                        <span className={[
                          'font-medium group-hover/row:text-primary-800 transition-colors truncate',
                          post.isLocked ? 'text-red-600' : 'text-neutral-800',
                        ].join(' ')}>
                          {post.title}
                        </span>
                        {post.commentCount > 0 && (
                          <span className="text-primary-500 text-xs flex-shrink-0">[{post.commentCount}]</span>
                        )}
                        {post.hasPoll && <span className="text-xs text-neutral-400 flex-shrink-0">📊</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {post.authorRole ? (
                        <UserBadge
                          user={{ id: post.authorId ?? undefined, nickname: post.authorNickname, role: post.authorRole as UserRole, currentLevel: post.authorLevel, maturingPower: post.authorMaturingPower ?? undefined, nicknameFixed: post.authorNicknameFixed, profileImageUrl: post.authorProfileImageUrl }}
                          size="sm"
                        />
                      ) : (
                        <span className="text-neutral-500 text-xs">{post.authorNickname}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-neutral-500 text-xs">{post.likeCount}</td>
                    <td className="px-4 py-3 text-right text-neutral-500 text-xs">{post.viewCount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-neutral-400 text-xs">
                      {formatBoardDate(post.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 모바일 카드 */}
          <div className="sm:hidden space-y-2">
            {posts.map((post) => (
              <Link
                key={post.id}
                to={`/community/${boardPath}/${post.id}`}
                className="block bg-white border border-neutral-200 rounded-xl px-4 py-3.5 hover:border-neutral-300 transition-colors"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  {post.prefix && (
                    <span
                      className="text-xs font-medium px-2 py-0.5 rounded-full border"
                      style={post.prefix.colorHex
                        ? { color: post.prefix.colorHex, borderColor: post.prefix.colorHex }
                        : { color: '#6b7280', borderColor: '#d1d5db' }}
                    >
                      {post.prefix.name}
                    </span>
                  )}
                  {post.isLocked && <span className="text-neutral-400 text-sm">🔒</span>}
                </div>
                <p className={[
                  'text-sm font-medium line-clamp-1',
                  post.isLocked ? 'text-red-600' : 'text-neutral-800',
                ].join(' ')}>
                  {post.title}
                </p>
                <div className="flex items-center gap-3 mt-1.5 text-xs text-neutral-400">
                  {post.authorRole ? (
                    <UserBadge
                      user={{ nickname: post.authorNickname, role: post.authorRole as UserRole, currentLevel: post.authorLevel, maturingPower: post.authorMaturingPower ?? undefined, nicknameFixed: post.authorNicknameFixed, profileImageUrl: post.authorProfileImageUrl }}
                      size="sm"
                    />
                  ) : (
                    <span>{post.authorNickname}</span>
                  )}
                  <span>▲ {post.likeCount}</span>
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
