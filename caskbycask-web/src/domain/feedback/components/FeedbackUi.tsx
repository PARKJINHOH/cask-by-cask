import { useTranslation } from 'react-i18next'
import type { FeedbackStatus, FeedbackType } from '../types/feedback.types'

// 상태별 뱃지 색상 (Tailwind)
const STATUS_STYLE: Record<FeedbackStatus, string> = {
  RECEIVED: 'bg-neutral-100 text-neutral-600',
  CONFIRMED: 'bg-blue-50 text-blue-600',
  IN_PROGRESS: 'bg-amber-50 text-amber-700',
  RESOLVED: 'bg-green-50 text-green-700',
  REJECTED: 'bg-red-50 text-red-600',
  ON_HOLD: 'bg-purple-50 text-purple-600',
}

const TYPE_STYLE: Record<FeedbackType, string> = {
  BUG: 'bg-red-50 text-red-600 border-red-100',
  IMPROVEMENT: 'bg-sky-50 text-sky-600 border-sky-100',
  FEATURE: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  ETC: 'bg-neutral-50 text-neutral-500 border-neutral-200',
}

// 진척 바 색상 — 반려/보류는 회색 처리
const PROGRESS_COLOR: Partial<Record<FeedbackStatus, string>> = {
  RESOLVED: 'bg-green-500',
  REJECTED: 'bg-neutral-300',
  ON_HOLD: 'bg-purple-300',
}

export function StatusBadge({ status }: { status: FeedbackStatus }) {
  const { t } = useTranslation()
  return (
    <span className={`inline-block px-2 py-0.5 text-xs font-semibold rounded-full ${STATUS_STYLE[status]}`}>
      {t(`feedback.status.${status}`)}
    </span>
  )
}

export function TypeChip({ type }: { type: FeedbackType }) {
  const { t } = useTranslation()
  return (
    <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-md border ${TYPE_STYLE[type]}`}>
      {t(`feedback.type.${type}`)}
    </span>
  )
}

export function ProgressBar({ status, progress }: { status: FeedbackStatus; progress: number }) {
  const { t } = useTranslation()
  const color = PROGRESS_COLOR[status] ?? 'bg-primary-500'
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-neutral-500">{t('feedback.progress')}</span>
        <span className="text-xs font-semibold text-neutral-700">{progress}%</span>
      </div>
      <div className="h-2 w-full bg-neutral-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
        />
      </div>
    </div>
  )
}
