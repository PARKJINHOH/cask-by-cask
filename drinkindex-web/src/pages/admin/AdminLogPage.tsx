import { useState } from 'react'
import Badge from '@/shared/components/Badge'
import Spinner from '@/shared/components/Spinner'
import Pagination from '@/shared/components/Pagination'
import { useAdminLogs } from '@/domain/admin/hooks/useAdminLogs'
import type { AdminLogType } from '@/domain/admin/types/admin.types'
import { ADMIN_LOG_TYPE_LABELS, ADMIN_LOG_CATEGORY } from '@/domain/admin/types/admin.types'
import { formatDate } from '@/shared/utils/format'

// ── 필터 카테고리 ──────────────────────────────────────────────

type CategoryKey = '전체' | '커뮤니티' | '회원'

const CATEGORY_OPTIONS: CategoryKey[] = ['전체', '커뮤니티', '회원']

function getLogTypes(category: CategoryKey): AdminLogType[] | undefined {
  if (category === '전체') return undefined
  return ADMIN_LOG_CATEGORY[category] ?? undefined
}

// ── 로그 타입 뱃지 색상 ────────────────────────────────────────

function logTypeBadgeVariant(type: AdminLogType) {
  if (type === 'CONTENT_HIDE')    return 'warning' as const
  if (type === 'CONTENT_RESTORE') return 'success' as const
  if (type === 'ROLE_CHANGE')     return 'neutral' as const
  if (type === 'ACCOUNT_SUSPEND') return 'warning' as const
  if (type === 'ACCOUNT_DELETE')  return 'danger' as const
  return 'neutral' as const
}

// ── 대상 타입 표시 ─────────────────────────────────────────────

const TARGET_LABELS = { POST: '게시글', COMMENT: '댓글', USER: '회원' }

// ── 메인 페이지 ────────────────────────────────────────────────

export default function AdminLogPage() {
  const [category, setCategory] = useState<CategoryKey>('전체')
  const [actorEmail, setActorEmail] = useState('')
  const [emailInput, setEmailInput] = useState('')
  const [page, setPage] = useState(0)

  const { data, isLoading } = useAdminLogs({
    logTypes: getLogTypes(category),
    actorEmail: actorEmail || undefined,
    page,
    size: 30,
  })

  const handleSearch = () => {
    setActorEmail(emailInput.trim())
    setPage(0)
  }

  return (
    <div className="p-6 space-y-5">
      {/* 헤더 */}
      <div>
        <h1 className="text-xl font-bold text-neutral-900">변경 이력</h1>
        <p className="text-sm text-neutral-500 mt-0.5">
          커뮤니티 숨김·복구, 회원 역할 변경, 계정 정지·삭제 이력을 조회합니다.
        </p>
      </div>

      {/* 필터 */}
      <div className="bg-white rounded-xl shadow-sm p-4 flex flex-wrap items-end gap-3">
        {/* 카테고리 탭 */}
        <div>
          <p className="text-xs font-medium text-neutral-500 mb-1.5">유형</p>
          <div className="flex gap-1">
            {CATEGORY_OPTIONS.map((c) => (
              <button
                key={c}
                onClick={() => { setCategory(c); setPage(0) }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                  category === c
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'bg-white text-neutral-600 border-neutral-200 hover:border-primary-400'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* 처리자 검색 */}
        <div>
          <p className="text-xs font-medium text-neutral-500 mb-1.5">처리자 아이디</p>
          <div className="flex gap-2">
            <input
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="아이디 검색"
              className="h-9 px-3 text-sm border border-neutral-300 rounded-lg w-40
                focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
            <button
              onClick={handleSearch}
              className="h-9 px-4 text-sm font-medium rounded-lg bg-primary-600 text-white
                hover:bg-primary-700 transition-colors"
            >
              검색
            </button>
          </div>
        </div>
      </div>

      {/* 테이블 */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Spinner size="lg" className="text-primary-600" />
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  <th className="text-left px-4 py-3 text-neutral-500 font-medium">처리 일시</th>
                  <th className="text-left px-4 py-3 text-neutral-500 font-medium">유형</th>
                  <th className="text-left px-4 py-3 text-neutral-500 font-medium">처리자</th>
                  <th className="text-left px-4 py-3 text-neutral-500 font-medium">대상</th>
                  <th className="text-left px-4 py-3 text-neutral-500 font-medium">내용</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {!data || data.empty ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-neutral-400">
                      이력이 없습니다.
                    </td>
                  </tr>
                ) : (
                  data.content.map((log) => (
                    <tr key={log.id} className="hover:bg-neutral-50 transition-colors">
                      <td className="px-4 py-3 text-neutral-500 tabular-nums text-xs whitespace-nowrap">
                        {formatDate(log.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={logTypeBadgeVariant(log.logType)} size="sm">
                          {ADMIN_LOG_TYPE_LABELS[log.logType]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-medium text-neutral-800 text-xs">
                        {log.actorEmail}
                      </td>
                      <td className="px-4 py-3 text-neutral-500 text-xs">
                        <span className="px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-600 text-[11px] font-medium mr-1">
                          {TARGET_LABELS[log.targetType]}
                        </span>
                        {log.targetType === 'USER' && log.targetUserEmail
                          ? log.targetUserEmail
                          : `#${log.targetId}`}
                      </td>
                      <td className="px-4 py-3 text-neutral-600 max-w-xs truncate">
                        {log.summary}
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
              onPageChange={setPage}
            />
          )}
        </>
      )}
    </div>
  )
}
