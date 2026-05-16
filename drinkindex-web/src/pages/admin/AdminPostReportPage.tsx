import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminCommunityApi } from '@/domain/admin/api/adminCommunityApi'
import type { PostReportAdminStatus } from '@/domain/admin/types/admin.types'
import Badge from '@/shared/components/Badge'
import Spinner from '@/shared/components/Spinner'
import Pagination from '@/shared/components/Pagination'
import { formatDate } from '@/shared/utils/format'

const STATUS_OPTIONS: Array<{ value: PostReportAdminStatus | ''; label: string }> = [
  { value: '',           label: '전체' },
  { value: 'PENDING',   label: '대기 중' },
  { value: 'RESOLVED',  label: '삭제됨' },
  { value: 'DISMISSED', label: '무시됨' },
]

export default function AdminPostReportPage() {
  const [status, setStatus] = useState<PostReportAdminStatus | ''>('PENDING')
  const [page, setPage]     = useState(0)
  const queryClient         = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['admin-post-reports', status, page],
    queryFn: () =>
      adminCommunityApi
        .getPostReports({ status: status || undefined, page, size: 20 })
        .then((r) => r.data.data!),
  })

  const deletePost = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) =>
      adminCommunityApi.deletePost(id, reason),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-post-reports'] }),
  })

  const unlockPost = useMutation({
    mutationFn: (id: number) => adminCommunityApi.unlockPost(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-post-reports'] }),
  })

  const handleDelete = (id: number, title: string | null) => {
    const reason = prompt(`"${title ?? id}" 게시글 삭제 사유 (선택):`) ?? undefined
    if (reason === undefined) return
    deletePost.mutate({ id, reason: reason || undefined })
  }

  const handleUnlock = (id: number | null) => {
    if (!id) return
    if (!confirm('이 게시글의 잠금을 해제하시겠습니까?')) return
    unlockPost.mutate(id)
  }

  const isActionPending = deletePost.isPending || unlockPost.isPending

  return (
    <div className="p-6 space-y-5">
      <h1 className="text-xl font-bold text-neutral-900">커뮤니티 게시글 신고</h1>

      {/* 필터 */}
      <div className="p-4 bg-white rounded-xl shadow-sm">
        <p className="text-xs text-neutral-500 mb-1.5">상태</p>
        <div className="flex gap-1.5">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { setStatus(opt.value as PostReportAdminStatus | ''); setPage(0) }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                status === opt.value
                  ? 'bg-primary-600 text-white'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
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
                  <th className="text-left px-4 py-3 text-neutral-500 font-medium w-14">ID</th>
                  <th className="text-left px-4 py-3 text-neutral-500 font-medium">게시글</th>
                  <th className="text-left px-4 py-3 text-neutral-500 font-medium">신고자</th>
                  <th className="text-left px-4 py-3 text-neutral-500 font-medium">신고 사유</th>
                  <th className="text-left px-4 py-3 text-neutral-500 font-medium">상태</th>
                  <th className="text-left px-4 py-3 text-neutral-500 font-medium">신고일</th>
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
                  data.content.map((report) => (
                    <tr key={report.id} className="hover:bg-neutral-50 transition-colors">
                      <td className="px-4 py-3 text-neutral-400 tabular-nums">{report.id}</td>
                      <td className="px-4 py-3 max-w-[240px]">
                        {report.postTitle ? (
                          <p className="font-medium text-neutral-900 truncate">{report.postTitle}</p>
                        ) : (
                          <span className="text-neutral-300 text-xs">삭제된 게시글</span>
                        )}
                        {report.postId && (
                          <p className="text-xs text-neutral-400 mt-0.5">#{report.postId}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-neutral-700">{report.reporterNickname}</td>
                      <td className="px-4 py-3 max-w-[180px]">
                        {report.reason ? (
                          <p className="text-xs text-neutral-600 line-clamp-2">{report.reason}</p>
                        ) : (
                          <span className="text-xs text-neutral-300">사유 없음</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={report.status}
                          size="sm"
                        >
                          {STATUS_OPTIONS.find((s) => s.value === report.status)?.label ?? report.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-neutral-500 text-xs tabular-nums whitespace-nowrap">
                        {formatDate(report.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        {report.status === 'PENDING' && report.postId && (
                          <div className="flex items-center gap-1 justify-end">
                            <button
                              onClick={() => handleUnlock(report.postId)}
                              disabled={isActionPending}
                              className="inline-flex items-center gap-1 h-7 px-2.5 text-xs font-medium
                                rounded-md border border-neutral-300 bg-white text-neutral-600
                                hover:bg-neutral-50 transition-colors whitespace-nowrap disabled:opacity-40"
                            >
                              잠금해제
                            </button>
                            <button
                              onClick={() => handleDelete(report.postId!, report.postTitle)}
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
              onPageChange={setPage}
            />
          )}
        </>
      )}
    </div>
  )
}
