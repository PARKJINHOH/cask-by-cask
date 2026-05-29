import { useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useNoticeDetail } from '@/domain/notice/hooks/useNoticeDetail'
import { useNotices } from '@/domain/notice/hooks/useNotices'
import { NOTICE_CATEGORY_LABELS } from '@/domain/notice/types/notice.types'
import { sanitizeHtml } from '@/shared/utils/sanitize'
import { stripHtmlForMeta } from '@/shared/utils/seoText'
import Badge from '@/shared/components/Badge'
import SeoMeta, { buildCanonical } from '@/shared/components/SeoMeta'
import { buildBreadcrumbSchema } from '@/shared/utils/seoSchema'
import { SITE_URL } from '@/shared/config/site'
import { markNoticesAsSeen } from './NoticePage'

const CATEGORY_BADGE_VARIANT: Record<string, 'primary' | 'warning' | 'success' | 'neutral'> = {
  GENERAL: 'neutral',
  UPDATE: 'primary',
  EVENT: 'success',
  MAINTENANCE: 'warning',
}

export default function NoticeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const noticeId = id ? Number(id) : null
  const navigate = useNavigate()

  const { data: notice, isLoading, isError } = useNoticeDetail(noticeId)

  // 이전/다음 공지 탐색용 — 목록 캐시 재사용 (staleTime 5분)
  const { data: listData } = useNotices({ page: 0, size: 50 })
  const listItems = listData?.content ?? []
  const currentIdx = listItems.findIndex((n) => n.id === noticeId)
  const prevNotice = currentIdx > 0 ? listItems[currentIdx - 1] : null
  const nextNotice = currentIdx !== -1 && currentIdx < listItems.length - 1
    ? listItems[currentIdx + 1]
    : null

  // 공지 확인 처리 — 이 공지 id 이상을 읽은 것으로 기록
  useEffect(() => {
    if (noticeId) markNoticesAsSeen(noticeId)
  }, [noticeId])

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center text-neutral-400 text-sm">
        불러오는 중...
      </div>
    )
  }

  if (isError || !notice) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p className="text-neutral-500 text-sm mb-4">공지사항을 찾을 수 없습니다.</p>
        <button
          onClick={() => navigate('/notices')}
          className="text-sm text-primary-800 hover:underline"
        >
          목록으로 돌아가기
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <SeoMeta
        title={notice.title}
        description={stripHtmlForMeta(notice.contentSanitized, 160)
          || `DrinkIndex 공지사항 — ${notice.title}`}
        canonical={buildCanonical(`/notices/${notice.id}`)}
        ogType="article"
        jsonLd={[
          {
            '@type': 'Article',
            headline: notice.title,
            datePublished: notice.createdAt,
            dateModified: notice.updatedAt ?? notice.createdAt,
            author: { '@type': 'Organization', name: 'DrinkIndex' },
            publisher: {
              '@type': 'Organization',
              name: 'DrinkIndex',
              logo: { '@type': 'ImageObject', url: `${SITE_URL}/logo.png` },
            },
          },
          buildBreadcrumbSchema([
            { name: '홈', path: '/' },
            { name: '공지사항', path: '/notices' },
            { name: notice.title, path: `/notices/${notice.id}` },
          ]),
        ]}
      />

      {/* 브레드크럼 */}
      <nav className="flex items-center gap-1.5 text-xs text-neutral-400 mb-6">
        <Link to="/" className="hover:text-neutral-600 transition-colors">홈</Link>
        <span>/</span>
        <Link to="/notices" className="hover:text-neutral-600 transition-colors">공지사항</Link>
        <span>/</span>
        <span className="text-neutral-600 truncate max-w-[200px]">{notice.title}</span>
      </nav>

      {/* 공지 헤더 */}
      <div className="mb-8 pb-6 border-b border-neutral-200">
        <div className="flex items-center gap-2 mb-3">
          <Badge variant={CATEGORY_BADGE_VARIANT[notice.category]}>
            {NOTICE_CATEGORY_LABELS[notice.category]}
          </Badge>
          {notice.isPinned && (
            <span className="inline-flex items-center gap-1 text-xs text-amber-600 font-medium">
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5v6l1 1 1-1v-6h5v-2l-2-2z" />
              </svg>
              고정
            </span>
          )}
        </div>
        <h1 className="text-2xl font-bold text-neutral-900 leading-snug mb-3">
          {notice.title}
        </h1>
        <div className="flex items-center gap-4 text-xs text-neutral-400">
          <span>{new Date(notice.createdAt).toLocaleDateString('ko-KR', {
            year: 'numeric', month: 'long', day: 'numeric',
          })}</span>
          <span>조회 {notice.viewCount.toLocaleString()}</span>
        </div>
      </div>

      {/* 본문 */}
      {/* [보안] contentSanitized를 sanitizeHtml()로 한 번 더 정제 후 렌더링 */}
      <div
        className="notice-content"
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(notice.contentSanitized) }}
      />

      {/* 하단 네비게이션 */}
      <div className="mt-12 pt-6 border-t border-neutral-200 space-y-3">
        {/* 이전/다음 공지 */}
        {(prevNotice || nextNotice) && (
          <div className="bg-neutral-50 rounded-xl border border-neutral-200 divide-y divide-neutral-200">
            {nextNotice && (
              <Link
                to={`/notices/${nextNotice.id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-neutral-100 rounded-t-xl transition-colors group"
              >
                <span className="text-xs text-neutral-400 flex-shrink-0 w-12">다음 글</span>
                <span className="text-sm text-neutral-700 group-hover:text-primary-800 transition-colors truncate">
                  {nextNotice.title}
                </span>
                <svg
                  className="w-4 h-4 text-neutral-300 flex-shrink-0 ml-auto"
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </Link>
            )}
            {prevNotice && (
              <Link
                to={`/notices/${prevNotice.id}`}
                className={[
                  'flex items-center gap-3 px-4 py-3 hover:bg-neutral-100 transition-colors group',
                  nextNotice ? 'rounded-b-xl' : 'rounded-xl',
                ].join(' ')}
              >
                <span className="text-xs text-neutral-400 flex-shrink-0 w-12">이전 글</span>
                <span className="text-sm text-neutral-700 group-hover:text-primary-800 transition-colors truncate">
                  {prevNotice.title}
                </span>
                <svg
                  className="w-4 h-4 text-neutral-300 flex-shrink-0 ml-auto"
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </Link>
            )}
          </div>
        )}

        {/* 목록으로 */}
        <div className="flex justify-center">
          <Link
            to="/notices"
            className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium
              border border-neutral-300 rounded-lg text-neutral-600
              hover:border-neutral-400 hover:text-neutral-800 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="8" y1="6" x2="21" y2="6" />
              <line x1="8" y1="12" x2="21" y2="12" />
              <line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" />
              <line x1="3" y1="12" x2="3.01" y2="12" />
              <line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
            목록으로
          </Link>
        </div>
      </div>
    </div>
  )
}
