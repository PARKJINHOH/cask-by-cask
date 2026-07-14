import type { ReactNode } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import Spinner from '@/shared/components/Spinner'
import Pagination from '@/shared/components/Pagination'
import { formatDateTime } from '@/shared/utils/format'
import { useAdminPriceReports } from '@/domain/pricetracker/hooks/useAdminPriceTracker'
import type { AdminPriceReport, PriceReportStatus } from '@/domain/pricetracker/types/pricetracker.types'

const krw = new Intl.NumberFormat('ko-KR')

const STATUS_TABS: { value: PriceReportStatus | ''; label: string }[] = [
  { value: 'PENDING', label: '대기' },
  { value: 'APPROVED', label: '승인' },
  { value: 'REJECTED', label: '반려' },
  { value: '', label: '전체' },
]

const STATUS_STYLE: Record<PriceReportStatus, { label: string; className: string }> = {
  PENDING: { label: '대기', className: 'bg-amber-50 text-amber-700' },
  APPROVED: { label: '승인', className: 'bg-green-50 text-green-700' },
  REJECTED: { label: '반려', className: 'bg-red-50 text-red-700' },
}

export default function AdminPriceReportPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const status = (searchParams.get('status') ?? 'PENDING') as PriceReportStatus | ''
  const flaggedOnly = searchParams.get('flagged') === 'true'
  const page = Math.max(0, parseInt(searchParams.get('page') ?? '0', 10))
  const detailState = { returnTo: `${location.pathname}${location.search}` }

  const setListParam = (params: { status?: PriceReportStatus | ''; flaggedOnly?: boolean; page?: number }) =>
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        const nextStatus = params.status ?? status
        const nextFlaggedOnly = params.flaggedOnly ?? flaggedOnly
        const nextPage = params.page ?? page
        if (nextStatus) next.set('status', nextStatus)
        else next.delete('status')
        if (nextFlaggedOnly) next.set('flagged', 'true')
        else next.delete('flagged')
        next.set('page', String(nextPage))
        return next
      },
      { replace: true },
    )

  const { data, isLoading } = useAdminPriceReports({
    status: status || undefined,
    isFlagged: flaggedOnly || undefined,
    page,
  })

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-neutral-900">가격 등록 승인</h1>
        <p className="mt-1 text-sm text-neutral-500">
          사용자가 등록한 가격을 확인합니다. 항목을 선택하면 상세 검토와 승인·반려를 진행할 수 있습니다.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-4 p-4 bg-white rounded-xl shadow-sm">
        <div className="flex flex-wrap gap-1.5">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setListParam({ status: tab.value, page: 0 })}
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
        <label
          className="flex items-center gap-2 text-sm text-neutral-600 cursor-pointer ml-auto"
          title="같은 주류·용량·매장의 최근 승인 가격 중앙값보다 30% 이상 높거나 낮은 등록만 표시합니다."
        >
          <input
            type="checkbox"
            checked={flaggedOnly}
            onChange={(e) => setListParam({ flaggedOnly: e.target.checked, page: 0 })}
            className="accent-primary-800"
          />
          ⚠️ 자동 플래그만
          <span className="text-neutral-400" aria-label="자동 플래그 기준 안내">ⓘ</span>
        </label>
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
                  <TableHead className="w-36">등록 일시</TableHead>
                  <TableHead>주류명</TableHead>
                  <TableHead className="text-right w-20">용량</TableHead>
                  <TableHead>매장</TableHead>
                  <TableHead className="text-right w-32">실구매가</TableHead>
                  <TableHead className="w-28">구매일</TableHead>
                  <TableHead className="w-28">작성자</TableHead>
                  <TableHead className="text-center w-28">주의 항목</TableHead>
                  <TableHead className="text-center w-20">상태</TableHead>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {!data || data.empty ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-neutral-400">
                      처리할 가격 등록이 없습니다.
                    </td>
                  </tr>
                ) : (
                  data.content.map((report) => (
                    <PriceReportRow
                      key={report.id}
                      report={report}
                      onClick={() => navigate(`/admin/price-reports/${report.id}`, { state: detailState })}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>

          {data && data.totalPages > 1 && (
            <Pagination
              currentPage={page}
              totalPages={data.totalPages}
              onPageChange={(nextPage) => setListParam({ page: nextPage })}
            />
          )}
        </>
      )}
    </div>
  )
}

function PriceReportRow({ report, onClick }: { report: AdminPriceReport; onClick: () => void }) {
  const status = STATUS_STYLE[report.status]
  const storeName = report.storeName ?? report.suggestedStoreName ?? '미지정'
  const actualPrice = report.actualPrice == null
    ? '-'
    : report.currency === 'USD'
      ? `$ ${report.actualPrice.toLocaleString()}`
      : `${krw.format(report.actualPrice)}원`

  return (
    <tr onClick={onClick} className="hover:bg-neutral-50 transition-colors cursor-pointer">
      <td className="px-3 py-3 text-xs text-neutral-500 whitespace-nowrap tabular-nums">
        {formatDateTime(report.createdAt)}
      </td>
      <td className="px-4 py-3 max-w-[240px]">
        <p className="font-medium text-neutral-800 truncate">{report.spiritNameKo}</p>
        <p className="text-xs text-neutral-400 mt-0.5">#{report.id}</p>
      </td>
      <td className="px-3 py-3 text-right text-xs text-neutral-600 whitespace-nowrap tabular-nums">
        {report.volumeMl == null ? '미확인' : `${report.volumeMl.toLocaleString()}ml`}
      </td>
      <td className="px-3 py-3 max-w-[200px]">
        <p className="text-neutral-700 truncate">{storeName}</p>
        {!report.storeName && report.suggestedStoreName && (
          <p className="text-xs text-amber-600 mt-0.5">제안 매장</p>
        )}
      </td>
      <td className="px-3 py-3 text-right font-semibold text-neutral-800 whitespace-nowrap tabular-nums">
        {actualPrice}
      </td>
      <td className="px-3 py-3 text-neutral-500 text-xs whitespace-nowrap">{report.purchasedAt ?? '-'}</td>
      <td className="px-3 py-3 text-neutral-600 text-xs truncate max-w-[120px]">
        {report.isAnonymous ? '익명' : report.reporterNickname ?? '-'}
      </td>
      <td className="px-3 py-3 text-center">
        <div className="flex flex-wrap justify-center gap-1">
          {report.autoFlagged && (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700">자동</span>
          )}
          {report.reportCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-600">
              신고 {report.reportCount}
            </span>
          )}
          {!report.autoFlagged && report.reportCount === 0 && <span className="text-neutral-300">-</span>}
        </div>
      </td>
      <td className="px-3 py-3 text-center">
        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${status.className}`}>
          {status.label}
        </span>
      </td>
    </tr>
  )
}

function TableHead({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <th className={`text-left px-3 py-3 text-neutral-500 font-medium whitespace-nowrap ${className}`}>{children}</th>
}
