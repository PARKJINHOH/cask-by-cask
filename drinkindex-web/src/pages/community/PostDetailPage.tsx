import { useState, useCallback, useRef, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { usePostDetail, usePostActions } from '@/domain/community/hooks/usePostDetail'
import PostPollWidget from '@/domain/community/components/PostPollWidget'
import PostSeriesNav from '@/domain/community/components/PostSeriesNav'
import CommentSection from '@/domain/community/components/CommentSection'
import { sanitizeHtml } from '@/shared/utils/sanitize'
import { stripHtmlForMeta } from '@/shared/utils/seoText'
import { useAuthStore } from '@/domain/auth/store/authStore'
import { useToast } from '@/shared/hooks/useToast'
import type { UserRole } from '@/domain/auth/types/auth.types'
import UserBadge from '@/shared/components/UserBadge'
import SeoMeta, { buildCanonical } from '@/shared/components/SeoMeta'
import { buildBreadcrumbSchema } from '@/shared/utils/seoSchema'

export default function PostDetailPage() {
  const { boardType, id } = useParams<{ boardType: string; id: string }>()
  const postId = Number(id)
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { isLoggedIn } = useAuthStore()
  const { showToast } = useToast()
  const boardPath = boardType ?? 'free'

  const qc = useQueryClient()
  useEffect(() => {
    return () => {
      qc.invalidateQueries({ queryKey: ['posts'] })
    }
  }, [qc])

  const { data: post, isLoading, isError } = usePostDetail(postId)
  const { likeMutation, scrapMutation, reportMutation, deleteMutation, blockMutation } = usePostActions(postId)

  const [reportReason, setReportReason] = useState('')
  const [showReport, setShowReport] = useState(false)
  const [copyBanner, setCopyBanner] = useState(false)
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleShare = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
    } catch {
      return
    }
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
    setCopyBanner(true)
    copyTimerRef.current = setTimeout(() => setCopyBanner(false), 2500)
  }, [])

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center text-neutral-400 text-sm">
        {t('common.loading')}
      </div>
    )
  }

  if (isError || !post) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <p className="text-neutral-500">{t('common.error')}</p>
      </div>
    )
  }

  const isMyPost = isLoggedIn && !!post.isMyPost
  const isLocked = post.isLocked



  const handleDelete = async () => {
    if (!window.confirm(t('post.deleteConfirm'))) return
    deleteMutation.mutate(undefined, {
      onSuccess: () => {
        showToast(t('post.deleteSuccess'), 'success')
        navigate(`/community/${boardPath}`, { replace: true })
      },
    })
  }

  const handleReport = () => {
    reportMutation.mutate(reportReason || undefined, {
      onSuccess: () => {
        showToast(t('post.reportSuccess'), 'success')
        setShowReport(false)
        setReportReason('')
      },
    })
  }

  const handleBlock = () => {
    if (!post.authorId) return
    blockMutation.mutate(post.authorId, {
      onSuccess: () => {
        showToast(post.isBlocked ? t('post.unblockSuccess') : t('post.blockSuccess'), 'success')
      },
    })
  }

  const seoDescription = stripHtmlForMeta(post.contentSanitized ?? '', 160)
    || `DrinkIndex 커뮤니티 게시글 — ${post.title}`

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <SeoMeta
        title={post.title}
        description={seoDescription}
        canonical={buildCanonical(`/community/${boardPath}/${postId}`)}
        ogType="article"
        noindex={!!post.isBlocked || !!post.isLocked}
        jsonLd={[
          {
            '@type': 'Article',
            headline: post.title,
            datePublished: post.createdAt,
            author: post.authorNickname
              ? { '@type': 'Person', name: post.authorNickname }
              : undefined,
            publisher: {
              '@type': 'Organization',
              name: 'DrinkIndex',
              logo: { '@type': 'ImageObject', url: 'https://drinkindex.net/logo.png' },
            },
          },
          buildBreadcrumbSchema([
            { name: '홈', path: '/' },
            { name: boardPath === 'notice' ? '소식 게시판' : '자유게시판',
              path: `/community/${boardPath}` },
            { name: post.title, path: `/community/${boardPath}/${postId}` },
          ]),
        ]}
      />

      {/* 링크 복사 상단 슬라이드 배너 */}
      <div
        className={[
          'fixed top-0 left-0 right-0 z-50 flex items-center justify-center py-3 text-sm font-medium text-white bg-neutral-800 shadow-md transition-transform duration-300',
          copyBanner ? 'translate-y-0' : '-translate-y-full',
        ].join(' ')}
      >
        🔗 링크가 복사되었습니다.
      </div>

      {/* 뒤로가기 */}
      <Link
        to={`/community/${boardPath}`}
        className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700 mb-6"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        {boardPath === 'notice' ? t('board.notice') : t('board.free')}
      </Link>

      {/* 차단 사용자 게시글 */}
      {post.isBlocked && (
        <div className="mb-6 p-4 bg-neutral-100 rounded-xl border border-neutral-200">
          <p className="text-sm font-medium text-neutral-600 mb-1">{t('post.blocked')}</p>
          <p className="text-xs text-neutral-400 mb-3">{t('post.blockedDesc')}</p>
          <button
            onClick={handleBlock}
            className="text-xs text-primary-600 hover:underline"
          >
            {t('post.unblock')}
          </button>
        </div>
      )}

      <article>
        {/* 게시글 헤더 */}
        <div className="mb-6">
          <div className="flex flex-wrap items-center gap-2 mb-2">
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
            {isLocked && (
              <span className="inline-flex items-center gap-1 text-xs text-red-500 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                🔒 {t('board.locked')}
              </span>
            )}
          </div>

          {/* 제목 + 스크랩/공유 아이콘 */}
          <div className="flex items-start gap-2 mb-3">
            <h1 className={['flex-1 text-xl sm:text-2xl font-bold', isLocked ? 'text-red-600' : 'text-neutral-900'].join(' ')}>
              {post.title}
            </h1>
            <div className="flex items-center gap-1 mt-0.5 flex-shrink-0">
              {/* 스크랩 */}
              {isLoggedIn && (
                <button
                  onClick={() => scrapMutation.mutate()}
                  title={post.isScrapped ? t('post.scrapped') : t('post.scrap')}
                  className={['p-1.5 rounded-lg transition-colors', post.isScrapped ? 'text-amber-500 hover:bg-amber-50' : 'text-neutral-400 hover:bg-neutral-100'].join(' ')}
                >
                  <svg className="w-5 h-5" fill={post.isScrapped ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
                  </svg>
                </button>
              )}
              {/* 공유 */}
              <button
                onClick={handleShare}
                title="공유"
                className="p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-100 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
                </svg>
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-sm text-neutral-500">
              {post.authorRole ? (
                <UserBadge
                  user={{ id: post.authorId ?? undefined, nickname: post.authorNickname, role: post.authorRole as UserRole, currentLevel: post.authorLevel, maturingPower: post.authorMaturingPower ?? undefined, nicknameFixed: post.authorNicknameFixed, profileImageUrl: post.authorProfileImageUrl }}
                  size="sm"
                />
              ) : (
                <span className="font-medium">{post.authorNickname}</span>
              )}
              <span>{new Date(post.createdAt).toLocaleString('ko-KR')}</span>
              <span>조회 {post.viewCount.toLocaleString()}</span>
            </div>

            {/* 우측: 신고 + 작성자 액션 */}
            <div className="flex items-center gap-2">
              {/* 신고 */}
              {isLoggedIn && !isMyPost && (
                <button
                  onClick={() => setShowReport(true)}
                  className="text-xs text-neutral-400 hover:text-red-500 transition-colors"
                >
                  {t('post.report')}
                </button>
              )}
              {isMyPost && (
                <>
                  <Link
                    to={`/community/${boardPath}/${postId}/edit`}
                    className="text-xs text-neutral-500 hover:text-neutral-700 px-2 py-1 rounded border border-neutral-200 hover:border-neutral-300 transition-colors"
                  >
                    {t('post.edit')}
                  </Link>
                  <button
                    onClick={handleDelete}
                    disabled={deleteMutation.isPending}
                    className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded border border-red-200 hover:border-red-300 transition-colors"
                  >
                    {t('post.delete')}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* 구분선 */}
        <hr className="border-neutral-200 mb-6" />

        {/* 본문 */}
        {isLocked && !post.contentSanitized ? (
          <div className="py-12 px-6 bg-neutral-100 rounded-xl text-center text-neutral-500 text-sm border border-neutral-200">
            🔒 {t('post.lockedNotice')}
          </div>
        ) : post.isBlocked ? (
          <div className="py-12 px-6 bg-neutral-100 rounded-xl text-center text-neutral-400 text-sm">
            {t('post.blocked')}
          </div>
        ) : (
          <div
            className="prose prose-sm sm:prose max-w-none notice-content"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(post.contentSanitized ?? '') }}
          />
        )}

        {/* 투표 위젯 */}
        {post.poll && !post.isBlocked && (
          <PostPollWidget postId={postId} pollSummary={post.poll} />
        )}

        {/* 추천 / 차단 */}
        {!post.isBlocked && (
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {/* 추천 — 본인 게시글(익명 포함) 비활성화 */}
            <button
              onClick={() => {
                if (isMyPost) return
                isLoggedIn ? likeMutation.mutate(true) : navigate('/login')
              }}
              disabled={isMyPost}
              title={isMyPost ? t('post.selfLikeDisabled') : undefined}
              className={[
                'flex items-center gap-1.5 px-5 py-2 rounded-full border text-sm font-medium transition-colors',
                isMyPost
                  ? 'border-neutral-100 bg-neutral-50 text-neutral-300 cursor-not-allowed'
                  : post.isLiked === true
                  ? 'border-primary-500 bg-primary-50 text-primary-600'
                  : 'border-neutral-200 text-neutral-600 hover:border-primary-300 hover:bg-primary-50',
              ].join(' ')}
            >
              <svg className="w-4 h-4" fill={post.isLiked === true ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3" />
              </svg>
              {t('post.like')} {post.likeCount > 0 && <span className="font-bold">{post.likeCount}</span>}
            </button>

            {/* 차단 버튼 */}
            {isLoggedIn && !isMyPost && post.authorId && (
              <button
                onClick={handleBlock}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-neutral-200 text-sm text-neutral-400 hover:border-neutral-300 transition-colors"
              >
                {post.isBlocked ? t('post.unblock') : t('post.blockUser')}
              </button>
            )}
          </div>
        )}
      </article>

      {/* 시리즈 정보 */}
      {post.series && (
        <PostSeriesNav
          seriesId={post.series.id}
          currentPostId={postId}
          seriesTitle={post.series.title}
          boardType={post.boardType}
        />
      )}

      {/* 신고 모달 */}
      {showReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-base font-semibold text-neutral-900 mb-3">{t('post.report')}</h3>
            <p className="text-sm text-neutral-500 mb-3">{t('post.reportReason')}</p>
            <textarea
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-300 resize-none"
              placeholder={t('comment.reportPlaceholder')}
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => { setShowReport(false); setReportReason('') }}
                className="flex-1 py-2 text-sm font-medium border border-neutral-200 rounded-lg text-neutral-600 hover:bg-neutral-50"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleReport}
                disabled={reportMutation.isPending}
                className="flex-1 py-2 text-sm font-medium rounded-lg bg-red-500 text-white hover:bg-red-600 disabled:opacity-40"
              >
                {t('post.report')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 댓글 섹션 — STEP 37에서 구현 */}
      <section className="mt-10 pt-6 border-t border-neutral-200">
        <h2 className="text-base font-semibold text-neutral-700 mb-4">
          {t('post.commentSection')} {post.commentCount > 0 && `(${post.commentCount})`}
        </h2>
        <CommentSection postId={postId} />
      </section>
    </div>
  )
}
