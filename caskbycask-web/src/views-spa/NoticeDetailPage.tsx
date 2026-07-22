import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useNoticeDetail, useToggleNoticeRecommend } from '@/domain/notice/hooks/useNoticeDetail'
import { useAuthStore } from '@/domain/auth/store/authStore'
import { NOTICE_CATEGORY_LABELS } from '@/domain/notice/types/notice.types'
import RichContent from '@/shared/components/RichContent'
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
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn)
  const recommendMutation = useToggleNoticeRecommend(noticeId)

  const handleRecommend = () => {
    if (!isLoggedIn) {
      navigate('/login')
      return
    }
    if (!recommendMutation.isPending) recommendMutation.mutate()
  }

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
        <p className="text-neutral-500 text-sm">공지사항을 찾을 수 없습니다.</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <SeoMeta
        title={notice.title}
        description={stripHtmlForMeta(notice.contentSanitized, 160)
          || `CaskByCask 공지사항 — ${notice.title}`}
        canonical={buildCanonical(`/ko/notices/${notice.id}`)}
        ogType="article"
        jsonLd={[
          {
            '@type': 'Article',
            headline: notice.title,
            datePublished: notice.createdAt,
            dateModified: notice.updatedAt ?? notice.createdAt,
            author: { '@type': 'Organization', name: 'CaskByCask' },
            publisher: {
              '@type': 'Organization',
              name: 'CaskByCask',
              logo: { '@type': 'ImageObject', url: `${SITE_URL}/logo.png` },
            },
          },
          buildBreadcrumbSchema([
            { name: '홈', path: '/ko' },
            { name: '공지사항', path: '/ko/notices' },
            { name: notice.title, path: `/ko/notices/${notice.id}` },
          ]),
        ]}
      />

      {/* 공지 헤더 */}
      <div className="mb-8 pb-6 border-b border-neutral-200">
        <div className="flex items-center gap-2 mb-3">
          <Badge variant={CATEGORY_BADGE_VARIANT[notice.category]}>
            {NOTICE_CATEGORY_LABELS[notice.category]}
          </Badge>
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
      <RichContent className="notice-content" html={notice.contentSanitized} />

      {/* 추천 버튼 */}
      <div className="mt-10 flex justify-center">
        <button
          type="button"
          onClick={handleRecommend}
          disabled={recommendMutation.isPending}
          aria-pressed={notice.isRecommended}
          className={[
            'inline-flex items-center gap-2 px-6 py-2.5 rounded-full border text-sm font-semibold transition-colors',
            'disabled:opacity-60',
            notice.isRecommended
              ? 'bg-amber-600 border-amber-600 text-white hover:bg-amber-700'
              : 'bg-white border-neutral-300 text-neutral-600 hover:border-amber-400 hover:text-amber-700',
          ].join(' ')}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M2 21h2.5a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1H2v11zM22 11.5a2 2 0 0 0-2-2h-5.6l.86-4.1a1.5 1.5 0 0 0-2.86-.86L8.5 9.4A2 2 0 0 0 7.5 11v8a2 2 0 0 0 2 2h8.3a2 2 0 0 0 1.96-1.6l1.2-6A2 2 0 0 0 22 11.5z" />
          </svg>
          추천 <span className="tabular-nums">{notice.recommendCount}</span>
        </button>
      </div>

    </div>
  )
}
