import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import FormFieldLabel from '@/shared/components/FormFieldLabel'
import SeoMeta from '@/shared/components/SeoMeta'
import RichContent from '@/shared/components/RichContent'
import { useAuthStore } from '@/domain/auth/store/authStore'
import {
  useAddFeedbackComment,
  useDeleteFeedback,
  useFeedbackDetail,
  useUpdateFeedbackStatus,
} from '@/domain/feedback/hooks/useFeedback'
import { FEEDBACK_STATUSES, type FeedbackStatus } from '@/domain/feedback/types/feedback.types'
import { ProgressBar, StatusBadge, TypeChip } from '@/domain/feedback/components/FeedbackUi'
import { formatDateTime } from '@/shared/utils/format'

export default function FeedbackDetailPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { id } = useParams()
  const feedbackId = Number(id)
  const listReturnTo =
    typeof location.state === 'object' &&
    location.state !== null &&
    'returnTo' in location.state &&
    typeof location.state.returnTo === 'string'
      ? location.state.returnTo
      : '/request/feedback'

  const role = useAuthStore((s) => s.user?.role)
  const isAdmin = role === 'SUPER_ADMIN' || role === 'ADMIN'

  const { data: detail, isLoading } = useFeedbackDetail(feedbackId)
  const deleteMutation = useDeleteFeedback()
  const addCommentMutation = useAddFeedbackComment(feedbackId)
  const statusMutation = useUpdateFeedbackStatus(feedbackId)

  const [comment, setComment] = useState('')
  // 관리자 상태 관리용 로컬 상태
  const [mStatus, setMStatus] = useState<FeedbackStatus>('RECEIVED')
  const [mProgress, setMProgress] = useState(0)
  const [savedMsg, setSavedMsg] = useState(false)

  useEffect(() => {
    if (detail) {
      setMStatus(detail.status)
      setMProgress(detail.progress)
    }
  }, [detail])

  if (isLoading || !detail) {
    return <div className="max-w-3xl mx-auto px-4 py-20 text-center text-sm text-neutral-400">···</div>
  }

  const handleDelete = async () => {
    if (!window.confirm(t('feedback.detail.deleteConfirm'))) return
    await deleteMutation.mutateAsync(feedbackId)
    navigate(listReturnTo)
  }

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!comment.trim()) return
    await addCommentMutation.mutateAsync(comment.trim())
    setComment('')
  }

  const handleSaveStatus = async () => {
    await statusMutation.mutateAsync({ status: mStatus, progress: mProgress })
    setSavedMsg(true)
    setTimeout(() => setSavedMsg(false), 2000)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <SeoMeta title={detail.title} noindex />

      {/* 헤더 카드 */}
      <div className="p-5 bg-white border border-neutral-200 rounded-2xl">
        <div className="flex items-center gap-2 flex-wrap">
          <TypeChip type={detail.type} />
          <StatusBadge status={detail.status} />
          {!detail.isPublic && (
            <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-md border bg-neutral-50 text-neutral-500 border-neutral-200">
              {t('feedback.visibility.private')}
            </span>
          )}
          {detail.authorNickname && (
            <span className="text-xs text-neutral-400">
              · {t('feedback.reporter')}: {detail.authorNickname}
            </span>
          )}
        </div>

        <h1 className="mt-3 text-xl font-bold text-neutral-900">{detail.title}</h1>

        <div className="mt-1.5 flex items-center gap-3 text-xs text-neutral-400">
          <span>{t('feedback.createdAt')}: {formatDateTime(detail.createdAt)}</span>
          {detail.resolvedAt && (
            <span>{t('feedback.resolvedAt')}: {formatDateTime(detail.resolvedAt)}</span>
          )}
        </div>

        <div className="mt-4">
          <ProgressBar status={detail.status} progress={detail.progress} />
        </div>

        {/* 본문 — 리치 에디터 도입 이전 평문(태그 없음) 글은 줄바꿈 보존 위해 평문 렌더링 */}
        {/<\/?(p|br|div|h[1-4]|ul|ol|li|img|video|iframe|table|blockquote|pre|strong|em|span|mark|a)\b/i.test(detail.content) ? (
          <RichContent
            className="mt-5 prose prose-sm max-w-none notice-content text-neutral-700"
            html={detail.content}
          />
        ) : (
          <p className="mt-5 text-sm text-neutral-700 leading-relaxed whitespace-pre-wrap">
            {detail.content}
          </p>
        )}

        {/* 첨부 이미지 */}
        {detail.imageUrls.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-2">
            {detail.imageUrls.map((url, i) => (
              <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                <img
                  src={url}
                  alt={`image ${i + 1}`}
                  className="w-28 h-28 object-cover rounded-lg border border-neutral-200 hover:opacity-80 transition-opacity"
                />
              </a>
            ))}
          </div>
        )}

        {/* 작성자 본인 — 수정/삭제 (접수 상태에서만) */}
        {detail.editable && (
          <div className="mt-5 flex gap-2">
            <Link
              to={`/request/feedback/${feedbackId}/edit`}
              className="px-3 py-1.5 text-sm border border-neutral-200 rounded-lg text-neutral-600 hover:bg-neutral-50 transition-colors"
            >
              {t('feedback.detail.edit')}
            </Link>
            <button
              onClick={handleDelete}
              className="px-3 py-1.5 text-sm border border-red-200 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
            >
              {t('feedback.detail.delete')}
            </button>
          </div>
        )}
      </div>

      {/* 관리자 운영 관리 (SUPER_ADMIN/ADMIN 전용 인라인) */}
      {isAdmin && (
        <div className="mt-4 p-5 bg-amber-50/60 border border-amber-200 rounded-2xl">
          <p className="text-sm font-semibold text-amber-800 mb-3">{t('feedback.detail.manageTitle')}</p>
          <div className="flex flex-col sm:flex-row gap-4 sm:items-end">
            <div className="sm:w-44">
              <label className="block text-xs text-neutral-500 mb-1">{t('feedback.detail.statusLabel')}</label>
              <select
                value={mStatus}
                onChange={(e) => setMStatus(e.target.value as FeedbackStatus)}
                className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-400"
              >
                {FEEDBACK_STATUSES.map((s) => (
                  <option key={s} value={s}>{t(`feedback.status.${s}`)}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-xs text-neutral-500 mb-1">
                {t('feedback.progress')}: {mProgress}%
              </label>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={mProgress}
                onChange={(e) => setMProgress(Number(e.target.value))}
                className="w-full accent-primary-700"
              />
            </div>
            <button
              onClick={handleSaveStatus}
              disabled={statusMutation.isPending}
              className="shrink-0 px-4 py-2 bg-primary-800 text-white text-sm font-semibold rounded-lg hover:bg-primary-900 transition-colors disabled:opacity-50"
            >
              {statusMutation.isPending ? t('feedback.detail.saving') : t('feedback.detail.save')}
            </button>
          </div>
          {savedMsg && <p className="mt-2 text-xs text-green-600">{t('feedback.detail.saved')}</p>}
        </div>
      )}

      {/* 댓글 스레드 */}
      <div className="mt-6">
        <h2 className="text-sm font-semibold text-neutral-700 mb-3">
          {t('feedback.detail.comments')} {detail.commentCount > 0 && `(${detail.commentCount})`}
        </h2>

        {detail.comments.length === 0 ? (
          <p className="text-sm text-neutral-400 py-4">{t('feedback.detail.noComments')}</p>
        ) : (
          <ul className="space-y-3">
            {detail.comments.map((c) => {
              const label = c.isAdminReply
                ? t('feedback.detail.opTeam')
                : c.isMine
                  ? t('feedback.detail.me')
                  : c.authorNickname ?? t('feedback.reporter')
              return (
                <li
                  key={c.id}
                  className={`p-3 rounded-xl border ${
                    c.isAdminReply
                      ? 'bg-amber-50/60 border-amber-200'
                      : 'bg-white border-neutral-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-semibold ${c.isAdminReply ? 'text-amber-700' : 'text-neutral-600'}`}>
                      {label}
                    </span>
                    <span className="text-xs text-neutral-400">{formatDateTime(c.createdAt)}</span>
                  </div>
                  <p className="text-sm text-neutral-700 whitespace-pre-wrap">{c.content}</p>
                </li>
              )
            })}
          </ul>
        )}

        {/* 댓글 입력 — 작성자 본인 또는 관리자만 */}
        {(detail.isOwner || isAdmin) && (
          <form onSubmit={handleAddComment} className="mt-4">
            <FormFieldLabel required className="mb-1.5">{t('comment.contentLabel')}</FormFieldLabel>
            <textarea
              required
              aria-required="true"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={5000}
              rows={3}
              placeholder={t('feedback.detail.commentPlaceholder')}
              className="w-full px-3 py-2.5 text-sm border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none"
            />
            <div className="flex justify-end mt-2">
              <button
                type="submit"
                disabled={addCommentMutation.isPending || !comment.trim()}
                className="px-4 py-2 bg-primary-800 text-white text-sm font-semibold rounded-lg hover:bg-primary-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('feedback.detail.addComment')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
