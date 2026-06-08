import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Spinner from '@/shared/components/Spinner'
import Pagination from '@/shared/components/Pagination'
import { useMyPriceReports, useDeleteMyPriceReport } from '../hooks/usePriceChart'
import type { PriceReportStatus } from '../types/pricetracker.types'

const krw = new Intl.NumberFormat('ko-KR')

const STATUS_FILTERS: { value: PriceReportStatus | ''; labelKey: string }[] = [
  { value: '', labelKey: 'common.all' },
  { value: 'PENDING', labelKey: 'price.status.PENDING' },
  { value: 'APPROVED', labelKey: 'price.status.APPROVED' },
  { value: 'REJECTED', labelKey: 'price.status.REJECTED' },
]

const STATUS_STYLE: Record<PriceReportStatus, string> = {
  PENDING: 'bg-amber-50 text-amber-700',
  APPROVED: 'bg-emerald-50 text-emerald-700',
  REJECTED: 'bg-red-50 text-red-600',
}

export default function MyPriceReportsTab() {
  const { t } = useTranslation()
  const [status, setStatus] = useState<PriceReportStatus | ''>('')
  const [page, setPage] = useState(0)
  const { data, isLoading } = useMyPriceReports(status || undefined, page)
  const del = useDeleteMyPriceReport()

  const handleDelete = (id: number) => {
    if (!confirm(t('price.my.deleteConfirm'))) return
    del.mutate(id)
  }

  return (
    <div className="space-y-4">
      {/* 상태 필터 */}
      <div className="flex gap-1.5">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => { setStatus(f.value); setPage(0) }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              status === f.value ? 'bg-primary-800 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            {t(f.labelKey)}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : !data || data.empty ? (
        <div className="text-center py-16 text-neutral-400 text-sm">{t('price.my.noReports')}</div>
      ) : (
        <>
          <ul className="space-y-2">
            {data.content.map((r) => (
              <li key={r.id} className="bg-white rounded-xl border border-neutral-200 p-4 flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Link to={`/price-tracker/spirits/${r.spiritId}`} className="font-semibold text-neutral-900 truncate hover:text-primary-700">
                      {r.spiritNameKo}
                    </Link>
                    <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLE[r.status]}`}>
                      {t(`price.status.${r.status}`)}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400 mt-0.5 truncate">
                    {r.storeName || r.suggestedStoreName || t('price.panel.unknownStore')}
                    {r.purchasedAt && ` · ${r.purchasedAt}`}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  {r.actualPrice != null && (
                    <p className="text-sm font-bold text-primary-700">
                      {r.currency === 'USD' ? `$ ${r.actualPrice.toLocaleString()}` : `${krw.format(r.actualPrice)}원`}
                    </p>
                  )}
                  <button
                    onClick={() => handleDelete(r.id)}
                    className="text-xs text-neutral-400 hover:text-red-500 mt-1"
                  >
                    {t('common.delete', '삭제')}
                  </button>
                </div>
              </li>
            ))}
          </ul>
          {data.totalPages > 1 && (
            <Pagination currentPage={page} totalPages={data.totalPages} onPageChange={setPage} />
          )}
        </>
      )}
    </div>
  )
}
