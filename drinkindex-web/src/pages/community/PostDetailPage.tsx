import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { usePostDetail, usePostActions } from '@/domain/community/hooks/usePostDetail'
import PostPollWidget from '@/domain/community/components/PostPollWidget'
import PostSeriesNav from '@/domain/community/components/PostSeriesNav'
import CommentSection from '@/domain/community/components/CommentSection'
import { sanitizeHtml } from '@/shared/utils/sanitize'
import { useAuthStore } from '@/domain/auth/store/authStore'
import { useToast } from '@/shared/hooks/useToast'

export default function PostDetailPage() {
  const { boardType, id } = useParams<{ boardType: string; id: string }>()
  const postId = Number(id)
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { isLoggedIn, user } = useAuthStore()
  const { showToast } = useToast()
  const boardPath = boardType ?? 'free'

  const { data: post, isLoading, isError } = usePostDetail(postId)
  const { likeMutation, scrapMutation, reportMutation, deleteMutation, blockMutation } = usePostActions(postId)

  const [reportReason, setReportReason] = useState('')
  const [showReport, setShowReport] = useState(false)

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

  const isMyPost = isLoggedIn && user && post.authorId === user.id
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

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
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

          <h1 className={['text-xl sm:text-2xl font-bold mb-3', isLocked ? 'text-red-600' : 'text-neutral-900'].join(' ')}>
            {post.title}
          </h1>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-sm text-neutral-500">
              <span className="font-medium">{post.authorNickname}</span>
              <span>{new Date(post.createdAt).toLocaleString('ko-KR')}</span>
              <span>조회 {post.viewCount.toLocaleString()}</span>
            </div>

            {/* 액션 버튼 (작성자만: 수정/삭제) */}
            <div className="flex items-center gap-2">
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

        {/* 추천 / 비추천 / 스크랩 / 신고 */}
        {!post.isBlocked && (
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {/* 추천 */}
            <button
              onClick={() => isLoggedIn ? likeMutation.mutate(true) : navigate('/login')}
              className={[
                'flex items-center gap-1.5 px-4 py-2 rounded-full border text-sm font-medium transition-colors',
                post.isLiked === true
                  ? 'border-primary-500 bg-primary-50 text-primary-600'
                  : 'border-neutral-200 text-neutral-600 hover:border-primary-300 hover:bg-primary-50',
              ].join(' ')}
            >
              ▲ {t('post.like')} {post.likeCount > 0 && <span className="font-bold">{post.likeCount}</span>}
            </button>

            {/* 비추천 */}
            <button
              onClick={() => isLoggedIn ? likeMutation.mutate(false) : navigate('/login')}
              className={[
                'flex items-center gap-1.5 px-4 py-2 rounded-full border text-sm font-medium transition-colors',
                post.isLiked === false
                  ? 'border-neutral-500 bg-neutral-100 text-neutral-700'
                  : 'border-neutral-200 text-neutral-500 hover:border-neutral-300',
              ].join(' ')}
            >
              ▼ {t('post.dislike')} {post.dislikeCount > 0 && <span className="font-bold">{post.dislikeCount}</span>}
            </button>

            {/* 스크랩 */}
            {isLoggedIn && (
              <button
                onClick={() => scrapMutation.mutate()}
                className={[
                  'flex items-center gap-1.5 px-4 py-2 rounded-full border text-sm font-medium transition-colors',
                  post.isScrapped
                    ? 'border-amber-500 bg-amber-50 text-amber-600'
                    : 'border-neutral-200 text-neutral-500 hover:border-amber-300',
                ].join(' ')}
              >
                {post.isScrapped ? '★' : '☆'} {post.isScrapped ? t('post.scrapped') : t('post.scrap')}
              </button>
            )}

            {/* 신고 */}
            {isLoggedIn && !isMyPost && (
              <button
                onClick={() => setShowReport(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-neutral-200 text-sm text-neutral-500 hover:border-red-300 hover:text-red-500 transition-colors"
              >
                {t('post.report')}
              </button>
            )}

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
