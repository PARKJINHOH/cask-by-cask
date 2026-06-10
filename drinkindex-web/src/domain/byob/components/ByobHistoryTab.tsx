import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import EmptyState from '@/shared/components/EmptyState'
import { useByobMyHosted, useByobMyJoined } from '../hooks/useByob'
import ByobStatusBadge from './ByobStatusBadge'
import type { ParticipantStatus } from '../types/byob.types'

const MY_STATUS_CLS: Record<ParticipantStatus, string> = {
  PENDING:  'text-yellow-600',
  APPROVED: 'text-green-700',
  REJECTED: 'text-red-500',
  REMOVED:  'text-neutral-400',
}

const MY_STATUS_LABEL: Record<ParticipantStatus, string> = {
  PENDING:  '대기',
  APPROVED: '참여 확정',
  REJECTED: '거절됨',
  REMOVED:  '제외됨',
}

type Sub = 'hosted' | 'joined'

export default function ByobHistoryTab() {
  const { t } = useTranslation()
  const [sub, setSub] = useState<Sub>('hosted')

  const { data: hosted } = useByobMyHosted({ page: 0, size: 20 })
  const { data: joined } = useByobMyJoined({ page: 0, size: 20 })

  const hostedItems = hosted?.content ?? []
  const joinedItems = joined?.content ?? []

  return (
    <div>
      <div className="flex gap-1 border-b border-neutral-200 mb-5">
        {(['hosted', 'joined'] as Sub[]).map((s) => (
          <button
            key={s}
            onClick={() => setSub(s)}
            className={[
              'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
              sub === s
                ? 'border-primary-800 text-primary-900'
                : 'border-transparent text-neutral-500 hover:text-neutral-700',
            ].join(' ')}
          >
            {s === 'hosted' ? t('byob.myHosted') : t('byob.myJoined')}
          </button>
        ))}
      </div>

      {sub === 'hosted' && (
        hostedItems.length === 0 ? (
          <EmptyState
            title={t('byob.noPost')}
            description={t('byob.noPostDesc')}
            className="border border-neutral-200 rounded-2xl bg-white"
          />
        ) : (
          <div className="space-y-3">
            {hostedItems.map((item) => (
              <Link
                key={item.id}
                to={`/community/byob/${item.id}`}
                className="block bg-white border border-neutral-200 rounded-xl p-4
                  hover:border-neutral-300 transition-colors"
              >
                <div className="flex items-center justify-between mb-1">
                  <ByobStatusBadge status={item.status} size="sm" />
                  <span className="text-xs text-neutral-400">
                    {new Date(item.createdAt).toLocaleDateString('ko-KR')}
                  </span>
                </div>
                <p className="text-sm font-medium text-neutral-800 line-clamp-1 mt-1.5">{item.title}</p>
                <p className="text-xs text-neutral-500 mt-1">
                  {new Date(item.eventAt).toLocaleDateString('ko-KR')}
                  · {t('byob.participantsCount', { count: item.approvedCount, max: item.maxParticipants })}
                </p>
              </Link>
            ))}
          </div>
        )
      )}

      {sub === 'joined' && (
        joinedItems.length === 0 ? (
          <EmptyState
            title={t('byob.noPost')}
            description={t('byob.noPostDesc')}
            className="border border-neutral-200 rounded-2xl bg-white"
          />
        ) : (
          <div className="space-y-3">
            {joinedItems.map((item) => (
              <Link
                key={item.id}
                to={`/community/byob/${item.id}`}
                className="block bg-white border border-neutral-200 rounded-xl p-4
                  hover:border-neutral-300 transition-colors"
              >
                <div className="flex items-center justify-between mb-1">
                  <ByobStatusBadge status={item.status} size="sm" />
                  <span className={`text-xs font-medium ${MY_STATUS_CLS[item.myStatus]}`}>
                    {MY_STATUS_LABEL[item.myStatus]}
                  </span>
                </div>
                <p className="text-sm font-medium text-neutral-800 line-clamp-1 mt-1.5">{item.title}</p>
                <p className="text-xs text-neutral-500 mt-1">
                  주최: {item.hostNickname} · 🍾 {item.bottleNames?.[0] ?? '-'}{item.bottleNames?.length > 1 ? ` 외 ${item.bottleNames.length - 1}종` : ''}
                </p>
              </Link>
            ))}
          </div>
        )
      )}
    </div>
  )
}
