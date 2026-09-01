import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import EmptyState from '@/shared/components/EmptyState'
import SeoMeta from '@/shared/components/SeoMeta'
import { useByobMyHosted, useByobMyJoined } from '@/domain/byob/hooks/useByob'
import ByobStatusBadge from '@/domain/byob/components/ByobStatusBadge'
import type { ParticipantStatus } from '@/domain/byob/types/byob.types'

const MY_STATUS_CLS: Record<ParticipantStatus, string> = {
  PENDING:  'text-yellow-600',
  APPROVED: 'text-green-700',
  REJECTED: 'text-red-500',
  REMOVED:  'text-neutral-400',
}

/** 신청 상태 라벨은 모임 상세의 「내 신청 상태」와 같은 번역키를 쓴다. */
const MY_STATUS_LABEL_KEY: Record<ParticipantStatus, string> = {
  PENDING:  'byob.applyPending',
  APPROVED: 'byob.applyApproved',
  REJECTED: 'byob.applyRejected',
  REMOVED:  'byob.applyRemoved',
}

type Sub = 'hosted' | 'joined'

/**
 * 내가 주최했거나 참여한 BYOB 모임.
 *
 * 예전에는 마이페이지 탭이었으나, 각 메뉴가 자기 "내 것"을 책임지도록 BYOB 메뉴 아래로 옮겼다
 * (취향트리의 `/taste-trees/mine` 과 같은 구조).
 */
export default function ByobMinePage() {
  const { t, i18n } = useTranslation()
  const [sub, setSub] = useState<Sub>('hosted')

  const { data: hosted } = useByobMyHosted({ page: 0, size: 20 })
  const { data: joined } = useByobMyJoined({ page: 0, size: 20 })

  const hostedItems = hosted?.content ?? []
  const joinedItems = joined?.content ?? []
  const dateLocale = i18n.language === 'en' ? 'en-US' : 'ko-KR'

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <SeoMeta title={t('byob.myGatherings')} description={t('byob.myGatheringsDesc')} noindex />

      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">{t('byob.myGatherings')}</h1>
          <p className="mt-1 text-sm text-neutral-500">{t('byob.myGatheringsDesc')}</p>
        </div>
        <Link
          to="/community/byob"
          className="inline-flex items-center justify-center rounded-lg border border-neutral-300 bg-white
            px-4 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
        >
          {t('byob.title')}
        </Link>
      </header>

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
                    {new Date(item.createdAt).toLocaleDateString(dateLocale)}
                  </span>
                </div>
                <p className="text-sm font-medium text-neutral-800 line-clamp-1 mt-1.5">{item.title}</p>
                <p className="text-xs text-neutral-500 mt-1">
                  {new Date(item.eventAt).toLocaleDateString(dateLocale)}
                  {' · '}
                  {t('byob.participantsCount', { count: item.approvedCount, max: item.maxParticipants })}
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
                    {t(MY_STATUS_LABEL_KEY[item.myStatus])}
                  </span>
                </div>
                <p className="text-sm font-medium text-neutral-800 line-clamp-1 mt-1.5">{item.title}</p>
                <p className="text-xs text-neutral-500 mt-1">
                  {t('byob.host')}: {item.hostNickname}
                  {' · 🍾 '}
                  {item.bottleNames?.[0] ?? '-'}
                  {item.bottleNames?.length > 1
                    ? ` ${t('byob.bottleMore', { count: item.bottleNames.length - 1 })}`
                    : ''}
                </p>
              </Link>
            ))}
          </div>
        )
      )}
    </div>
  )
}
