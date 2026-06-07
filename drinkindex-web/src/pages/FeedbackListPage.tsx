import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import SeoMeta from '@/shared/components/SeoMeta'
import { useAuthStore } from '@/domain/auth/store/authStore'
import { useFeedbackList } from '@/domain/feedback/hooks/useFeedback'
import { FEEDBACK_STATUSES, type FeedbackStatus } from '@/domain/feedback/types/feedback.types'
import { ProgressBar, StatusBadge, TypeChip } from '@/domain/feedback/components/FeedbackUi'
import { formatBoardDate } from '@/shared/utils/format'

export default function FeedbackListPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const role = useAuthStore((s) => s.user?.role)
  const isAdmin = role === 'SUPER_ADMIN' || role === 'ADMIN'

  const [status, setStatus] = useState<FeedbackStatus | ''>('')
  const [page, setPage] = useState(0)

  const { data, isLoading } = useFeedbackList({
    status: status || undefined,
    page,
  })

  const items = data?.content ?? []

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <SeoMeta title={t('feedback.title')} description={t('feedback.subtitle')} noindex />

      {/* 헤더 */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">{t('feedback.title')}</h1>
          <p className="mt-1 text-sm text-neutral-500">{t('feedback.subtitle')}</p>
        </div>
        <Link
          to="/request/feedback/new"
          className="shrink-0 px-4 py-2.5 bg-primary-800 text-white text-sm font-semibold rounded-xl
            hover:bg-primary-900 transition-colors"
        >
          {t('feedback.new')}
        </Link>
      </div>

      {/* 필터 */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs font-medium text-neutral-500">
          {isAdmin ? t('feedback.allRequests') : t('feedback.myRequests')}
        </span>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as FeedbackStatus | '')
            setPage(0)
          }}
          className="ml-auto px-3 py-1.5 text-sm border border-neutral-200 rounded-lg bg-white
            focus:outline-none focus:ring-2 focus:ring-primary-400"
        >
          <option value="">{t('feedback.filterAll')}</option>
          {FEEDBACK_STATUSES.map((s) => (
            <option key={s} value={s}>
              {t(`feedback.status.${s}`)}
            </option>
          ))}
        </select>
      </div>

      {/* 목록 */}
      {isLoading ? (
        <div className="py-20 text-center text-sm text-neutral-400">···</div>
      ) : items.length === 0 ? (
        <div className="py-20 text-center text-sm text-neutral-400">
          {isAdmin ? t('feedback.emptyAdmin') : t('feedback.empty')}
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((f) => (
            <li
              key={f.id}
              onClick={() => navigate(`/request/feedback/${f.id}`)}
              className="p-4 bg-white border border-neutral-200 rounded-xl cursor-pointer
                hover:border-primary-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-center gap-2 flex-wrap">
                <TypeChip type={f.type} />
                <StatusBadge status={f.status} />
                {f.hasImages && (
                  <span className="text-xs text-neutral-400" aria-label="image">📎</span>
                )}
                {isAdmin && f.authorNickname && (
                  <span className="text-xs text-neutral-400">· {f.authorNickname}</span>
                )}
                <span className="ml-auto text-xs text-neutral-400">{formatBoardDate(f.createdAt)}</span>
              </div>
              <h3 className="mt-2 text-sm font-semibold text-neutral-900 line-clamp-1">{f.title}</h3>
              <div className="mt-3 flex items-center gap-4">
                <div className="flex-1">
                  <ProgressBar status={f.status} progress={f.progress} />
                </div>
                {f.commentCount > 0 && (
                  <span className="text-xs text-neutral-400 shrink-0">💬 {f.commentCount}</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* 페이지네이션 */}
      {data && data.totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-8">
          <button
            disabled={data.first}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="px-3 py-1.5 text-sm border border-neutral-200 rounded-lg disabled:opacity-40
              hover:bg-neutral-50 transition-colors"
          >
            ←
          </button>
          <span className="text-sm text-neutral-500">
            {data.number + 1} / {data.totalPages}
          </span>
          <button
            disabled={data.last}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1.5 text-sm border border-neutral-200 rounded-lg disabled:opacity-40
              hover:bg-neutral-50 transition-colors"
          >
            →
          </button>
        </div>
      )}
    </div>
  )
}
