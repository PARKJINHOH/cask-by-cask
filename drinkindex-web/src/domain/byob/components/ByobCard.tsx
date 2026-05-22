import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import ByobStatusBadge from './ByobStatusBadge'
import type { ByobListItem } from '../types/byob.types'

interface Props {
  byob: ByobListItem
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
}

export default function ByobCard({ byob }: Props) {
  const { t } = useTranslation()
  const isFull = byob.approvedCount >= byob.maxParticipants

  return (
    <Link
      to={`/community/byob/${byob.id}`}
      className="block bg-white border border-neutral-200 rounded-2xl p-5 hover:border-primary-300
        hover:shadow-sm transition-all duration-150"
    >
      <div className="flex items-center justify-between mb-3">
        <ByobStatusBadge status={byob.status} size="sm" />
        <span className={`text-sm font-medium ${isFull ? 'text-red-500' : 'text-neutral-500'}`}>
          {t('byob.participantsCount', { count: byob.approvedCount, max: byob.maxParticipants })}
        </span>
      </div>

      <h3 className="text-base font-semibold text-neutral-900 line-clamp-2 mb-2">
        {byob.title}
      </h3>

      <div className="flex items-center gap-1.5 text-sm text-neutral-500 mb-1">
        <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24"
          stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <span className="truncate">{byob.location}</span>
      </div>

      <div className="flex items-center gap-1.5 text-sm text-neutral-700 mb-1">
        <svg className="w-3.5 h-3.5 flex-shrink-0 text-primary-600" fill="none" viewBox="0 0 24 24"
          stroke="currentColor" strokeWidth={2}>
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        <span className="font-medium">{formatDate(byob.eventAt)}</span>
      </div>
      <div className="text-xs text-neutral-400 mb-3 ml-5">
        모집 {formatDate(byob.recruitStartAt)} ~ {formatDate(byob.recruitEndAt)}
      </div>

      <div className="text-xs text-neutral-400">
        {t('byob.hostNickname')}: {byob.hostNickname}
      </div>
    </Link>
  )
}
