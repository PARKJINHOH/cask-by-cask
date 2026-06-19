import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { useMyRequests, useDeleteMyRequest } from '@/domain/spirit/hooks/useSpiritRequest'
import type { MySpiritRequest, RequestStatus } from '@/domain/spirit/types/spiritRequest.types'
import SeoMeta from '@/shared/components/SeoMeta'
import Breadcrumb from '@/shared/components/Breadcrumb'
import { formatBoardDate } from '@/shared/utils/format'

const STATUS_STYLE: Record<RequestStatus, string> = {
  PENDING:  'bg-amber-50 text-amber-700',
  APPROVED: 'bg-green-50 text-green-700',
  REJECTED: 'bg-red-50 text-red-700',
}

export default function MySpiritRequestsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data: myRequests = [], isLoading } = useMyRequests()
  const { mutate: deleteRequest, isPending: isDeleting } = useDeleteMyRequest()

  const handleDelete = (e: React.MouseEvent, id: number) => {
    e.stopPropagation()
    if (!confirm(t('spiritRequest.myRequests.deleteConfirm'))) return
    deleteRequest(id)
  }

  const goEdit = (item: MySpiritRequest) => {
    if (item.status === 'APPROVED') return
    navigate(`/request/spirit?edit=${item.id}`)
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <SeoMeta title={t('spiritRequest.myRequests.title')} description={t('spiritRequest.subtitle')} noindex />

      <Breadcrumb
        className="mb-2"
        items={[
          { label: t('menu.request') },
          { label: t('menu.requestSpirit'), to: '/request/spirit' },
          { label: t('spiritRequest.myRequests.title') },
        ]}
      />

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-neutral-900">{t('spiritRequest.myRequests.title')}</h1>
        <Link
          to="/request/spirit"
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-primary-800 text-white hover:bg-primary-900 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          {t('spiritRequest.myRequests.newRequest')}
        </Link>
      </div>

      {isLoading ? (
        <div className="py-20 text-center text-neutral-400 text-sm">{t('common.loading')}</div>
      ) : myRequests.length === 0 ? (
        <div className="py-20 text-center text-neutral-400 text-sm">{t('spiritRequest.myRequests.empty')}</div>
      ) : (
        <>
          {/* PC 테이블 */}
          <div className="hidden sm:block bg-white border border-neutral-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm table-fixed">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-100">
                  <th className="text-center px-4 py-2.5 font-medium text-neutral-500 w-24">{t('spiritRequest.myRequests.colStatus')}</th>
                  <th className="text-center px-4 py-2.5 font-medium text-neutral-500">{t('spiritRequest.myRequests.colName')}</th>
                  <th className="text-center px-4 py-2.5 font-medium text-neutral-500 w-24">{t('spiritRequest.myRequests.colCategory')}</th>
                  <th className="text-center px-4 py-2.5 font-medium text-neutral-500 w-28">{t('spiritRequest.myRequests.requestedAt')}</th>
                  <th className="text-center px-4 py-2.5 font-medium text-neutral-500 w-28">{t('spiritRequest.myRequests.reviewedAt')}</th>
                  <th className="text-center px-4 py-2.5 font-medium text-neutral-500 w-32">{t('spiritRequest.myRequests.colActions')}</th>
                </tr>
              </thead>
              <tbody>
                {myRequests.map((item) => {
                  const locked = item.status === 'APPROVED'
                  return (
                    <tr
                      key={item.id}
                      onClick={() => goEdit(item)}
                      className={`group/row border-b border-neutral-200 transition-colors ${
                        locked ? '' : 'cursor-pointer hover:bg-neutral-50'
                      }`}
                    >
                      <td className="px-4 py-2.5 text-center">
                        <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLE[item.status]}`}>
                          {t(`spiritRequest.myRequests.status.${item.status}`)}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 overflow-hidden">
                        <div className="min-w-0">
                          <p className="text-[15px] font-medium text-neutral-800 group-hover/row:text-primary-800 transition-colors truncate">
                            {item.nameKo}
                          </p>
                          <p className="text-xs text-neutral-400 truncate">{item.nameEn}</p>
                          {item.status === 'REJECTED' && item.rejectReason && (
                            <p className="text-xs text-red-600 mt-0.5 truncate">
                              {t('spiritRequest.myRequests.rejectReason')}: {item.rejectReason}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-center text-neutral-500 text-xs">
                        {t(`spirit.category.${item.category}`)}
                      </td>
                      <td className="px-4 py-2.5 text-center text-neutral-400 text-xs">
                        {formatBoardDate(item.createdAt)}
                      </td>
                      <td className="px-4 py-2.5 text-center text-neutral-400 text-xs">
                        {item.reviewedAt ? formatBoardDate(item.reviewedAt) : '-'}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {locked ? (
                          <span className="text-xs text-neutral-300">{t('spiritRequest.myRequests.lockedHint')}</span>
                        ) : (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); goEdit(item) }}
                              disabled={isDeleting}
                              className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-neutral-200
                                text-neutral-600 hover:bg-neutral-50 disabled:opacity-50 transition-colors"
                            >
                              {t('spiritRequest.myRequests.edit')}
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleDelete(e, item.id)}
                              disabled={isDeleting}
                              className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-red-200
                                text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
                            >
                              {t('spiritRequest.myRequests.delete')}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* 모바일 카드 */}
          <div className="sm:hidden space-y-2">
            {myRequests.map((item) => {
              const locked = item.status === 'APPROVED'
              return (
                <div
                  key={item.id}
                  onClick={() => goEdit(item)}
                  className={`block bg-white border border-neutral-200 rounded-xl px-4 py-3.5 transition-colors ${
                    locked ? '' : 'cursor-pointer hover:border-neutral-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[15px] font-medium text-neutral-800 truncate">{item.nameKo}</p>
                      <p className="text-xs text-neutral-400 truncate">{item.nameEn}</p>
                    </div>
                    <span className={`flex-shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLE[item.status]}`}>
                      {t(`spiritRequest.myRequests.status.${item.status}`)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-neutral-400 flex-wrap mt-1.5">
                    <span>{t(`spirit.category.${item.category}`)}</span>
                    <span>·</span>
                    <span>{t('spiritRequest.myRequests.requestedAt')}: {formatBoardDate(item.createdAt)}</span>
                    {item.reviewedAt && (
                      <>
                        <span>·</span>
                        <span>{t('spiritRequest.myRequests.reviewedAt')}: {formatBoardDate(item.reviewedAt)}</span>
                      </>
                    )}
                  </div>

                  {item.status === 'REJECTED' && item.rejectReason && (
                    <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mt-2">
                      <span className="font-medium">{t('spiritRequest.myRequests.rejectReason')}: </span>
                      {item.rejectReason}
                    </div>
                  )}

                  {locked ? (
                    <p className="text-xs text-neutral-300 mt-2">{t('spiritRequest.myRequests.lockedHint')}</p>
                  ) : (
                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); goEdit(item) }}
                        disabled={isDeleting}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-neutral-200
                          text-neutral-600 hover:bg-neutral-50 disabled:opacity-50 transition-colors"
                      >
                        {t('spiritRequest.myRequests.edit')}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDelete(e, item.id)}
                        disabled={isDeleting}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-red-200
                          text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
                      >
                        {t('spiritRequest.myRequests.delete')}
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
