import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useByobList } from '@/domain/byob/hooks/useByob'
import ByobCard from '@/domain/byob/components/ByobCard'
import ByobStatusBadge from '@/domain/byob/components/ByobStatusBadge'
import Pagination from '@/shared/components/Pagination'
import SeoMeta from '@/shared/components/SeoMeta'
import { useAuthStore } from '@/domain/auth/store/authStore'
import type { ByobStatus } from '@/domain/byob/types/byob.types'

const PAGE_SIZE = 12

type StatusFilter = 'ALL' | ByobStatus

const FILTER_OPTIONS: StatusFilter[] = ['ALL', 'OPEN', 'CLOSED', 'CANCELLED']

export default function ByobListPage() {
  const { t } = useTranslation()
  const { isLoggedIn } = useAuthStore()
  const [status, setStatus] = useState<StatusFilter>('ALL')
  const [page, setPage] = useState(0)

  const { data, isLoading } = useByobList({
    status: status === 'ALL' ? undefined : status,
    page,
    size: PAGE_SIZE,
  })

  const items = data?.content ?? []
  const totalPages = data?.totalPages ?? 0

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <SeoMeta
        title={t('byob.title')}
        description={t('byob.subtitle')}
        noindex={page > 0 || status !== 'ALL'}
      />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">{t('byob.title')}</h1>
          <p className="text-sm text-neutral-500 mt-1">{t('byob.subtitle')}</p>
        </div>
        {isLoggedIn && (
          <Link
            to="/community/byob/write"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg
              bg-primary-800 text-white hover:bg-primary-900 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            {t('byob.write')}
          </Link>
        )}
      </div>

      {/* 상태 필터 */}
      <div className="flex flex-wrap gap-2 mb-6">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt}
            onClick={() => { setStatus(opt); setPage(0) }}
            className={[
              'px-3 py-1.5 text-xs font-medium rounded-full transition-colors',
              status === opt
                ? 'bg-primary-50 text-primary-900'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200',
            ].join(' ')}
          >
            {opt === 'ALL' ? t('byob.statusAll') : <ByobStatusBadge status={opt as ByobStatus} size="sm" />}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="py-20 text-center text-neutral-400 text-sm">{t('common.loading')}</div>
      ) : items.length === 0 ? (
        <div className="py-20 text-center text-neutral-400 text-sm">{t('byob.noPost')}</div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((byob) => (
              <ByobCard key={byob.id} byob={byob} />
            ))}
          </div>
          {totalPages > 1 && (
            <div className="mt-8 flex justify-center">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}
