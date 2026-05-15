import { useState, useEffect, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { usePosts, useBestPosts, usePostPrefixes } from '@/domain/community/hooks/usePosts'
import type { BoardType, PostSort, PostPeriod } from '@/domain/community/types/community.types'
import Pagination from '@/shared/components/Pagination'
import { useAuthStore } from '@/domain/auth/store/authStore'

const PAGE_SIZE = 20

const SORT_OPTIONS: { value: PostSort; labelKey: string }[] = [
  { value: 'LATEST', labelKey: 'board.sortLatest' },
  { value: 'BEST',   labelKey: 'board.sortBest' },
  { value: 'VIEW',   labelKey: 'board.sortView' },
]

const PERIOD_OPTIONS: { value: PostPeriod; labelKey: string }[] = [
  { value: 'ALL',   labelKey: 'board.periodAll' },
  { value: 'WEEK',  labelKey: 'board.periodWeek' },
  { value: 'TODAY', labelKey: 'board.periodToday' },
]

interface Props {
  boardType: BoardType
  title: string
}

export default function BoardListPage({ boardType, title }: Props) {
  const { t } = useTranslation()
  const { isLoggedIn } = useAuthStore()
  const [searchParams, setSearchParams] = useSearchParams()
  const boardPath = boardType === 'NOTICE' ? 'notice' : 'free'

  // ── URL 파라미터 ──────────────────────────────────────────
  const tabParam    = (searchParams.get('tab') ?? 'all') as 'all' | 'best'
  const prefixParam = searchParams.get('prefix') ? Number(searchParams.get('prefix')) : undefined
  const sortParam   = (searchParams.get('sort') ?? 'LATEST') as PostSort
  const periodParam = (searchParams.get('period') ?? 'ALL') as PostPeriod
  const keywordParam = searchParams.get('keyword') ?? ''
  const pageParam   = Number(searchParams.get('page') ?? '0')

  const [keywordInput, setKeywordInput] = useState(keywordParam)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // ── 데이터 ────────────────────────────────────────────────
  const { data: prefixes = [] } = usePostPrefixes(boardType)

  const allPostsQuery = usePosts({
    boardType,
    prefixId: prefixParam,
    keyword: keywordParam || undefined,
    sort: sortParam,
    page: pageParam,
    size: PAGE_SIZE,
  })

  const bestPostsQuery = useBestPosts({
    boardType,
    period: periodParam,
    page: pageParam,
    size: PAGE_SIZE,
  })

  const query    = tabParam === 'best' ? bestPostsQuery : allPostsQuery
  const posts    = query.data?.content ?? []
  const totalPages = query.data?.totalPages ?? 0

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

  const setTab = (tab: 'all' | 'best') => {
    const next = new URLSearchParams(searchParams)
    next.set('tab', tab)
    next.set('page', '0')
    setSearchParams(next, { replace: true })
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-neutral-900">{title}</h1>
        {isLoggedIn && (
          <Link
            to={`/community/${boardPath}/write`}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            {t('board.write')}
          </Link>
        )}
      </div>

      {/* 탭: 전체글 / 베스트 */}
      <div className="flex gap-1 border-b border-neutral-200 mb-5">
        {(['all', 'best'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setTab(tab)}
            className={[
              'px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
              tabParam === tab
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-neutral-500 hover:text-neutral-700',
            ].join(' ')}
          >
            {tab === 'all' ? t('board.all') : t('board.best')}
          </button>
        ))}
      </div>

      {/* 베스트 기간 필터 */}
      {tabParam === 'best' && (
        <div className="flex gap-2 mb-4">
          {PERIOD_OPTIONS.map(({ value, labelKey }) => (
            <button
              key={value}
              onClick={() => setParam('period', value)}
              className={[
                'px-3 py-1.5 text-xs font-medium rounded-full border transition-colors',
                periodParam === value
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-neutral-200 text-neutral-600 hover:border-neutral-300',
              ].join(' ')}
            >
              {t(labelKey)}
            </button>
          ))}
        </div>
      )}

      {/* 말머리 필터 */}
      {prefixes.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setParam('prefix', null)}
            className={[
              'px-3 py-1.5 text-xs font-medium rounded-full border transition-colors',
              !prefixParam
                ? 'border-primary-500 bg-primary-50 text-primary-700'
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
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
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
        {tabParam === 'all' && (
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
                  <th className="text-left px-4 py-3 font-medium text-neutral-500">{t('common.search')}</th>
                  <th className="text-left px-4 py-3 font-medium text-neutral-500 w-24">작성자</th>
                  <th className="text-right px-4 py-3 font-medium text-neutral-500 w-16">{t('board.likes')}</th>
                  <th className="text-right px-4 py-3 font-medium text-neutral-500 w-16">{t('board.views')}</th>
                  <th className="text-right px-4 py-3 font-medium text-neutral-500 w-24">작성일</th>
                </tr>
              </thead>
              <tbody>
                {posts.map((post) => (
                  <tr key={post.id} className="border-b border-neutral-50 hover:bg-neutral-50 transition-colors">
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
                    <td className="px-4 py-3">
                      <Link
                        to={`/community/${boardPath}/${post.id}`}
                        className="flex items-center gap-2 group"
                        title={post.isLocked ? t('board.locked') : undefined}
                      >
                        {post.isLocked && <span className="text-neutral-400">🔒</span>}
                        <span className={[
                          'font-medium group-hover:text-primary-600 transition-colors truncate',
                          post.isLocked ? 'text-red-600' : 'text-neutral-800',
                        ].join(' ')}>
                          {post.title}
                        </span>
                        {post.commentCount > 0 && (
                          <span className="text-primary-500 text-xs flex-shrink-0">[{post.commentCount}]</span>
                        )}
                        {post.hasPoll && <span className="text-xs text-neutral-400 flex-shrink-0">📊</span>}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-neutral-500 text-xs truncate">{post.authorNickname}</td>
                    <td className="px-4 py-3 text-right text-neutral-500 text-xs">{post.likeCount}</td>
                    <td className="px-4 py-3 text-right text-neutral-500 text-xs">{post.viewCount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-neutral-400 text-xs">
                      {new Date(post.createdAt).toLocaleDateString('ko-KR')}
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
                  <span>{post.authorNickname}</span>
                  <span>▲ {post.likeCount}</span>
                  <span>조회 {post.viewCount.toLocaleString()}</span>
                  <span>{new Date(post.createdAt).toLocaleDateString('ko-KR')}</span>
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
