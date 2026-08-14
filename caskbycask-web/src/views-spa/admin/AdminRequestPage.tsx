import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import Badge from '@/shared/components/Badge'
import Spinner from '@/shared/components/Spinner'
import Pagination from '@/shared/components/Pagination'
import { formatDate } from '@/shared/utils/format'
import { useAdminRequests } from '@/domain/admin/hooks/useAdminSpirits'
import type { RequestStatus } from '@/domain/admin/types/admin.types'

const CATEGORY_LABEL: Record<string, string> = {
  WHISKY: '위스키', COGNAC: '꼬냑', WINE: '와인', OTHER: '기타',
}

// 테이블 상태 뱃지 라벨
const STATUS_OPTIONS: Array<{ value: RequestStatus; label: string }> = [
  { value: 'PENDING',  label: '대기 중' },
  { value: 'APPROVED', label: '승인됨' },
  { value: 'REJECTED', label: '반려됨' },
]

// 상태 필터 탭 (전체 포함)
type StatusFilter = RequestStatus | 'ALL'
const STATUS_FILTERS: Array<{ value: StatusFilter; label: string }> = [
  { value: 'ALL',      label: '전체' },
  { value: 'PENDING',  label: '대기 중' },
  { value: 'APPROVED', label: '승인됨' },
  { value: 'REJECTED', label: '반려됨' },
]

// ── 메인 페이지 ───────────────────────────────────────────────────

export default function AdminRequestPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const status = ((searchParams.get('status') ?? 'PENDING') as StatusFilter)
  const page = Math.max(0, parseInt(searchParams.get('page') ?? '0', 10))
  const detailState = { returnTo: `${location.pathname}${location.search}` }
  const setListParam = (nextStatus: StatusFilter, nextPage = 0) =>
    setSearchParams(
      (prev) => {
        const n = new URLSearchParams(prev)
        n.set('status', nextStatus)
        n.set('page', String(nextPage))
        return n
      },
      { replace: true },
    )

  const { data, isLoading } = useAdminRequests(status, page)

  return (
    <div className="p-6 space-y-5">
      <h1 className="text-xl font-bold text-neutral-900">주류 등록 요청</h1>

      {/* 필터 */}
      <div className="flex items-end gap-3 p-4 bg-white rounded-xl shadow-sm">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">상태</label>
          <div className="flex gap-1.5">
            {STATUS_FILTERS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setListParam(value, 0)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  status === value
                    ? 'bg-primary-800 text-white'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 테이블 */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Spinner size="lg" className="text-primary-800" />
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  <th className="text-left px-4 py-3 text-neutral-500 font-medium w-16">ID</th>
                  <th className="text-left px-4 py-3 text-neutral-500 font-medium">한글명</th>
                  <th className="text-left px-4 py-3 text-neutral-500 font-medium">영문명</th>
                  <th className="text-left px-4 py-3 text-neutral-500 font-medium">카테고리</th>
                  <th className="text-left px-4 py-3 text-neutral-500 font-medium">상태</th>
                  <th className="text-left px-4 py-3 text-neutral-500 font-medium">신청일</th>
                  <th className="text-right px-4 py-3 text-neutral-500 font-medium">액션</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {!data || data.empty ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-neutral-400">
                      데이터가 없습니다.
                    </td>
                  </tr>
                ) : (
                  data.content.map((req) => (
                    <tr
                      key={req.id}
                      className="hover:bg-neutral-50 transition-colors cursor-pointer"
                      onClick={() => navigate(`/admin/spirits/requests/${req.id}`, { state: detailState })}
                    >
                      <td className="px-4 py-3 text-neutral-400 tabular-nums">{req.id}</td>
                      <td className="max-w-[260px] px-4 py-3 font-medium text-neutral-900">{req.nameKo}</td>
                      <td className="max-w-[260px] px-4 py-3 text-neutral-500">{req.nameEn}</td>
                      <td className="px-4 py-3">
                        <Badge variant={req.category} size="sm">
                          {CATEGORY_LABEL[req.category] ?? req.category}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={req.status} size="sm">
                          {STATUS_OPTIONS.find((s) => s.value === req.status)?.label ?? req.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-neutral-500 text-xs tabular-nums">
                        {formatDate(req.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-xs text-primary-800 font-medium">상세 보기 →</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {data && data.totalPages > 1 && (
            <Pagination
              currentPage={page}
              totalPages={data.totalPages}
              onPageChange={(p) => setListParam(status, p)}
            />
          )}
        </>
      )}
    </div>
  )
}
