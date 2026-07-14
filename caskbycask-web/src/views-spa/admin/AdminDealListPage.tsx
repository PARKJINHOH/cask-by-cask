import { useState, useEffect } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Spinner from '@/shared/components/Spinner'
import Pagination from '@/shared/components/Pagination'
import { formatDateTime } from '@/shared/utils/format'
import { adminDealApi } from '@/domain/admin/api/adminDealApi'
import type { DealStatus } from '@/domain/admin/types/deal.types'
import {
  ConfidenceBadge, DealStatusBadge, SourceLinkButton,
  formatDiscount, formatPrice, siteLabel,
} from '@/domain/admin/components/dealUi'

const STATUS_TABS: Array<{ value: DealStatus | 'ALL'; label: string }> = [
  { value: 'ALL', label: '전체' },
  { value: 'PENDING', label: '검토 대기' },
  { value: 'APPROVED', label: '승인' },
]

export default function AdminDealListPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const qc = useQueryClient()
  const status = ((searchParams.get('status') ?? 'PENDING') as DealStatus | 'ALL')
  const page = Math.max(0, parseInt(searchParams.get('page') ?? '0', 10))
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const detailState = { returnTo: `${location.pathname}${location.search}` }
  const setListParam = (nextStatus: DealStatus | 'ALL', nextPage = 0) =>
    setSearchParams(
      (prev) => {
        const n = new URLSearchParams(prev)
        n.set('status', nextStatus)
        n.set('page', String(nextPage))
        return n
      },
      { replace: true },
    )

  useEffect(() => {
    setSelectedIds([])
  }, [status, page])

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'deals', { status, page }],
    queryFn: () => adminDealApi.list({
      status: status === 'ALL' ? undefined : status,
      page,
      size: 20,
    }),
  })

  const deleteBulkMut = useMutation({
    mutationFn: (ids: number[]) => adminDealApi.deleteBulk(ids),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'deals'] })
      setSelectedIds([])
    },
  })
  const isDeleting = deleteBulkMut.isPending

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-neutral-900">핫딜 검토</h1>
        <p className="mt-1 text-sm text-neutral-500">
          크롤러가 수집·AI 분석한 주류 핫딜을 검토하고 승인/반려합니다. 승인 시 사용자에게 노출됩니다.
        </p>
      </div>

      {/* 상태 필터 탭 */}
      <div className="flex flex-wrap items-center gap-1.5 p-4 bg-white rounded-xl shadow-sm">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setListParam(tab.value, 0)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              status === tab.value
                ? 'bg-primary-800 text-white'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Spinner size="lg" className="text-primary-800" />
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  <th className="px-3 py-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={data && data.content.length > 0 && selectedIds.length === data.content.length}
                      onChange={(e) => {
                        if (e.target.checked && data) {
                          setSelectedIds(data.content.map((item) => item.id))
                        } else {
                          setSelectedIds([])
                        }
                      }}
                      className="rounded border-neutral-300 text-primary-800 focus:ring-primary-800 cursor-pointer"
                    />
                  </th>
                  <th className="text-left px-3 py-3 text-neutral-500 font-medium w-32 whitespace-nowrap">수집일시</th>
                  <th className="text-left px-3 py-3 text-neutral-500 font-medium w-28">출처</th>
                  <th className="text-left px-4 py-3 text-neutral-500 font-medium">주류명</th>
                  <th className="text-left px-3 py-3 text-neutral-500 font-medium w-20">카테고리</th>
                  <th className="text-right px-3 py-3 text-neutral-500 font-medium w-20">용량</th>
                  <th className="text-right px-3 py-3 text-neutral-500 font-medium w-28">정상가</th>
                  <th className="text-right px-3 py-3 text-neutral-500 font-medium w-28">할인가</th>
                  <th className="text-center px-3 py-3 text-neutral-500 font-medium w-16">할인율</th>
                  <th className="text-center px-3 py-3 text-neutral-500 font-medium w-16">신뢰도</th>
                  <th className="text-center px-3 py-3 text-neutral-500 font-medium w-20">상태</th>
                  <th className="text-center px-3 py-3 text-neutral-500 font-medium w-16">원문</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {!data || data.empty ? (
                  <tr>
                    <td colSpan={12} className="px-4 py-10 text-center text-neutral-400">
                      데이터가 없습니다.
                    </td>
                  </tr>
                ) : (
                  data.content.map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => navigate(`/admin/deals/${item.id}`, { state: detailState })}
                      className="hover:bg-neutral-50 transition-colors cursor-pointer"
                    >
                      <td className="px-3 py-3 w-10 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(item.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedIds((prev) => [...prev, item.id])
                            } else {
                              setSelectedIds((prev) => prev.filter((id) => id !== item.id))
                            }
                          }}
                          className="rounded border-neutral-300 text-primary-800 focus:ring-primary-800 cursor-pointer"
                        />
                      </td>
                      <td className="px-3 py-3 text-neutral-500 text-xs tabular-nums whitespace-nowrap">
                        {item.crawledAt ? formatDateTime(item.crawledAt) : '-'}
                      </td>
                      <td className="px-3 py-3 text-neutral-600">{siteLabel(item.sourceSite)}</td>
                      <td className="px-4 py-3 max-w-[220px]">
                        <p className="truncate font-medium text-neutral-800">{item.drinkName ?? '(미상)'}</p>
                      </td>
                      <td className="px-3 py-3 text-neutral-500 text-xs">{item.drinkCategory ?? '-'}</td>
                      <td className="px-3 py-3 text-right tabular-nums text-neutral-500 whitespace-nowrap">
                        {item.volumeMl == null ? '미확인' : `${item.volumeMl.toLocaleString()}ml`}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-neutral-600 whitespace-nowrap">
                        {formatPrice(item.originalPrice)}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums font-medium text-neutral-800 whitespace-nowrap">
                        {formatPrice(item.dealPrice)}
                      </td>
                      <td className="px-3 py-3 text-center tabular-nums text-neutral-600">
                        {formatDiscount(item.discountRate)}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <ConfidenceBadge score={item.confidenceScore} />
                      </td>
                      <td className="px-3 py-3 text-center">
                        <DealStatusBadge status={item.status} />
                      </td>
                      <td className="px-3 py-3 text-center">
                        <SourceLinkButton url={item.sourceUrl} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={selectedIds.length === 0 || isDeleting}
                onClick={() => {
                  if (window.confirm(`선택한 ${selectedIds.length}개의 핫딜을 삭제하시겠습니까? 삭제 후에는 목록에서 사라집니다.`)) {
                    deleteBulkMut.mutate(selectedIds)
                  }
                }}
                className="px-3.5 py-2 text-xs font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-40"
              >
                {isDeleting ? '삭제 중...' : '선택 삭제'}
              </button>
              {selectedIds.length > 0 && (
                <span className="text-xs text-neutral-500 font-medium">
                  {selectedIds.length}개 선택됨
                </span>
              )}
            </div>

            {data && data.totalPages > 1 && (
              <Pagination currentPage={page} totalPages={data.totalPages} onPageChange={(p) => setListParam(status, p)} />
            )}
          </div>
        </>
      )}
    </div>
  )
}
