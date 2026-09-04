import { useSearchParams } from 'react-router-dom'
import Badge from '@/shared/components/Badge'
import Spinner from '@/shared/components/Spinner'
import Pagination from '@/shared/components/Pagination'
import { formatDate } from '@/shared/utils/format'
import {
  useAdminReports,
  useResolveReport,
  useDismissReport,
} from '@/domain/admin/hooks/useAdminReports'
import type { ReportStatus, ReportTargetType } from '@/domain/admin/types/admin.types'

// ── 상수 ────────────────────────────────────────────────────────

const TARGET_TYPE_OPTIONS: Array<{ value: ReportTargetType | ''; label: string }> = [
  { value: '',        label: '전체' },
  { value: 'REVIEW',  label: '리뷰' },
  { value: 'COMMENT', label: '댓글' },
  { value: 'IMAGE',   label: '이미지' },
  { value: 'VENUE_COMMENT', label: '장소 후기' },
]

const STATUS_OPTIONS: Array<{ value: ReportStatus | ''; label: string }> = [
  { value: '',          label: '전체' },
  { value: 'PENDING',   label: '대기 중' },
  { value: 'RESOLVED',  label: '해결됨' },
  { value: 'DISMISSED', label: '무시됨' },
]

const TARGET_TYPE_LABEL: Record<ReportTargetType, string> = {
  REVIEW:  '리뷰',
  COMMENT: '댓글',
  IMAGE:   '이미지',
  VENUE_COMMENT: '장소 후기',
}

// ── 메인 페이지 ────────────────────────────────────────────────

export default function AdminReportPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const targetType = (searchParams.get('targetType') ?? '') as ReportTargetType | ''
  const status = (searchParams.get('status') ?? 'PENDING') as ReportStatus | ''
  const page = Math.max(0, parseInt(searchParams.get('page') ?? '0', 10))
  const setListParam = (params: { targetType?: ReportTargetType | ''; status?: ReportStatus | ''; page?: number }) =>
    setSearchParams(
      (prev) => {
        const n = new URLSearchParams(prev)
        const nextTargetType = params.targetType ?? targetType
        const nextStatus = params.status ?? status
        const nextPage = params.page ?? page
        if (nextTargetType) n.set('targetType', nextTargetType)
        else n.delete('targetType')
        if (nextStatus) n.set('status', nextStatus)
        else n.delete('status')
        n.set('page', String(nextPage))
        return n
      },
      { replace: true },
    )

  const resolve = useResolveReport()
  const dismiss = useDismissReport()

  const { data, isLoading } = useAdminReports({
    targetType: targetType || undefined,
    status: status || undefined,
    page,
  })

  const handleResolve = async (id: number) => {
    if (!confirm('이 신고를 해결(콘텐츠 유지) 처리하시겠습니까?')) return
    await resolve.mutateAsync(id)
  }

  const handleDismiss = async (id: number) => {
    if (!confirm('이 신고를 무시하고 콘텐츠를 복구하시겠습니까?')) return
    await dismiss.mutateAsync(id)
  }

  const isActionPending = resolve.isPending || dismiss.isPending

  return (
    <div className="p-6 space-y-5">
      <h1 className="text-xl font-bold text-neutral-900">신고 관리</h1>

      {/* 필터 */}
      <div className="flex flex-wrap items-center gap-4 p-4 bg-white rounded-xl shadow-sm">
        <FilterTabs
          label="대상 유형"
          options={TARGET_TYPE_OPTIONS}
          value={targetType}
          onChange={(v) => setListParam({ targetType: v as ReportTargetType | '', page: 0 })}
        />
        <FilterTabs
          label="상태"
          options={STATUS_OPTIONS}
          value={status}
          onChange={(v) => setListParam({ status: v as ReportStatus | '', page: 0 })}
        />
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
                  <th className="text-left px-4 py-3 text-neutral-500 font-medium w-14">ID</th>
                  <th className="text-left px-4 py-3 text-neutral-500 font-medium">신고자</th>
                  <th className="text-left px-4 py-3 text-neutral-500 font-medium">대상</th>
                  <th className="text-left px-4 py-3 text-neutral-500 font-medium">대상 내용</th>
                  <th className="text-left px-4 py-3 text-neutral-500 font-medium">신고 사유</th>
                  <th className="text-left px-4 py-3 text-neutral-500 font-medium">상태</th>
                  <th className="text-left px-4 py-3 text-neutral-500 font-medium">신고일</th>
                  <th className="text-right px-4 py-3 text-neutral-500 font-medium">액션</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {!data || data.empty ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-neutral-400">
                      데이터가 없습니다.
                    </td>
                  </tr>
                ) : (
                  data.content.map((report) => (
                    <tr key={report.id} className="hover:bg-neutral-50 transition-colors">
                      <td className="px-4 py-3 text-neutral-400 tabular-nums">{report.id}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-neutral-900">{report.reporterNickname}</p>
                        <p className="text-xs text-neutral-400">#{report.reporterId}</p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="neutral" size="sm">
                          {TARGET_TYPE_LABEL[report.targetType]}
                        </Badge>
                        <p className="text-xs text-neutral-400 mt-0.5 tabular-nums">
                          #{report.targetId}
                        </p>
                      </td>
                      <td className="px-4 py-3 max-w-[200px]">
                        {report.targetContent ? (
                          <p className="text-xs text-neutral-600 line-clamp-2 leading-relaxed">
                            {report.targetContent}
                          </p>
                        ) : (
                          <span className="text-xs text-neutral-300">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 max-w-[160px]">
                        {report.reason ? (
                          <p className="text-xs text-neutral-600 line-clamp-2">{report.reason}</p>
                        ) : (
                          <span className="text-xs text-neutral-300">사유 없음</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={report.status} size="sm">
                          {STATUS_OPTIONS.find((s) => s.value === report.status)?.label ?? report.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-neutral-500 text-xs tabular-nums whitespace-nowrap">
                        {formatDate(report.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        {report.status === 'PENDING' && (
                          <div className="flex items-center gap-1 justify-end">
                            <button
                              onClick={() => handleDismiss(report.id)}
                              disabled={isActionPending}
                              className="inline-flex items-center gap-1 h-7 px-2.5 text-xs font-medium
                                rounded-md border border-neutral-300 bg-white text-neutral-600
                                hover:bg-neutral-50 transition-colors whitespace-nowrap disabled:opacity-40"
                            >
                              복구
                            </button>
                            <button
                              onClick={() => handleResolve(report.id)}
                              disabled={isActionPending}
                              className="inline-flex items-center gap-1 h-7 px-2.5 text-xs font-medium
                                rounded-md border border-red-200 bg-white text-red-600
                                hover:bg-red-50 transition-colors whitespace-nowrap disabled:opacity-40"
                            >
                              삭제
                            </button>
                          </div>
                        )}
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
              onPageChange={(p) => setListParam({ page: p })}
            />
          )}
        </>
      )}
    </div>
  )
}

// ── 필터 탭 ────────────────────────────────────────────────────

function FilterTabs<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: Array<{ value: T; label: string }>
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div>
      <p className="text-xs text-neutral-500 mb-1.5">{label}</p>
      <div className="flex gap-1.5">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              value === opt.value
                ? 'bg-primary-800 text-white'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}
