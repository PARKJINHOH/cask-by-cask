import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminCommunityApi } from '@/domain/admin/api/adminCommunityApi'
import { POST_REPORT_PENDING_COUNT_KEY } from '@/domain/admin/constants/queryKeys'
import type { PostReportAdmin, PostReportAdminStatus } from '@/domain/admin/types/admin.types'
import Spinner from '@/shared/components/Spinner'
import Pagination from '@/shared/components/Pagination'
import { formatDate } from '@/shared/utils/format'

const STATUS_OPTIONS: Array<{ value: PostReportAdminStatus | ''; label: string }> = [
  { value: '',           label: '전체' },
  { value: 'PENDING',   label: '대기 중' },
  { value: 'RESOLVED',  label: '처리됨' },
  { value: 'DISMISSED', label: '무시됨' },
]

const boardPath = (bt: PostReportAdmin['boardType']) => (bt === 'NOTICE' ? 'notice' : 'free')

// 게시글/댓글 대상 이동 URL (게시글이 삭제됐으면 null)
function targetUrl(r: PostReportAdmin): string | null {
  if (!r.postId || !r.boardType) return null
  const base = `/community/${boardPath(r.boardType)}/${r.postId}`
  return r.targetType === 'COMMENT' && r.commentId ? `${base}?comment=${r.commentId}` : base
}

// 상태 배지 — 신고 상태가 아니라 대상의 실제 처리 상태(숨김/삭제/잠금)를 우선 표시
function stateBadge(r: PostReportAdmin): { label: string; cls: string } {
  if (r.targetType === 'COMMENT') {
    if (r.commentDeleted) return { label: '삭제됨', cls: 'bg-neutral-200 text-neutral-600' }
    if (r.commentHidden)  return { label: '숨김',   cls: 'bg-amber-100 text-amber-700' }
  } else {
    if (r.postHidden) return { label: '숨김',   cls: 'bg-amber-100 text-amber-700' }
    if (r.postLocked) return { label: '잠금됨', cls: 'bg-neutral-800 text-white' }
  }
  switch (r.status) {
    case 'PENDING':   return { label: '대기 중', cls: 'bg-blue-100 text-blue-700' }
    case 'RESOLVED':  return { label: '처리됨', cls: 'bg-green-100 text-green-700' }
    case 'DISMISSED': return { label: '무시됨', cls: 'bg-neutral-100 text-neutral-500' }
  }
}

export default function AdminPostReportPage() {
  const [status, setStatus] = useState<PostReportAdminStatus | ''>('')
  const [page, setPage]     = useState(0)
  const [reasonModal, setReasonModal] = useState<string | null>(null)
  const queryClient         = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['admin-post-reports', status, page],
    queryFn: () =>
      adminCommunityApi
        .getPostReports({ status: status || undefined, page, size: 20 })
        .then((r) => r.data.data!),
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-post-reports'] })
    queryClient.invalidateQueries({ queryKey: POST_REPORT_PENDING_COUNT_KEY })
  }

  const deletePost = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) =>
      adminCommunityApi.deletePost(id, reason),
    onSuccess: invalidate,
  })
  const hidePost = useMutation({
    mutationFn: (id: number) => adminCommunityApi.hidePost(id),
    onSuccess: invalidate,
  })
  const restorePost = useMutation({
    mutationFn: (id: number) => adminCommunityApi.restorePost(id),
    onSuccess: invalidate,
  })
  const hideComment = useMutation({
    mutationFn: (commentId: number) => adminCommunityApi.hideComment(commentId),
    onSuccess: invalidate,
  })
  const restoreComment = useMutation({
    mutationFn: (commentId: number) => adminCommunityApi.restoreComment(commentId),
    onSuccess: invalidate,
  })
  const deleteComment = useMutation({
    mutationFn: (commentId: number) => adminCommunityApi.deleteComment(commentId),
    onSuccess: invalidate,
  })
  const updatePostCount = useMutation({
    mutationFn: ({ id, count }: { id: number; count: number }) =>
      adminCommunityApi.updatePostReportCount(id, count),
    onSuccess: invalidate,
  })
  const updateCommentCount = useMutation({
    mutationFn: ({ id, count }: { id: number; count: number }) =>
      adminCommunityApi.updateCommentReportCount(id, count),
    onSuccess: invalidate,
  })

  const handleHidePost = (id: number) => {
    if (!confirm('이 게시글을 숨김 처리하시겠습니까? 사용자에게 보이지 않게 됩니다.')) return
    hidePost.mutate(id)
  }
  const handleRestorePost = (id: number) => {
    if (!confirm('이 게시글의 숨김/잠금을 해제하시겠습니까? 다시 공개됩니다.')) return
    restorePost.mutate(id)
  }
  const handleDeletePost = (id: number, title: string | null) => {
    const reason = prompt(`"${title ?? id}" 게시글 삭제 사유 (선택):`) ?? undefined
    if (reason === undefined) return
    deletePost.mutate({ id, reason: reason || undefined })
  }
  const handleHideComment = (commentId: number) => {
    if (!confirm('이 댓글을 숨김 처리하시겠습니까? 사용자에게 "숨김 처리된 댓글입니다"로 표시됩니다.')) return
    hideComment.mutate(commentId)
  }
  const handleRestoreComment = (commentId: number) => {
    if (!confirm('이 댓글의 숨김을 해제하시겠습니까? 다시 공개됩니다.')) return
    restoreComment.mutate(commentId)
  }
  const handleDeleteComment = (commentId: number) => {
    if (!confirm('이 댓글을 삭제하시겠습니까?')) return
    deleteComment.mutate(commentId)
  }
  const handleEditCount = (report: PostReportAdmin) => {
    const cur = report.targetType === 'COMMENT' ? report.commentReportCount : report.postReportCount
    const input = prompt('신고 횟수를 입력하세요 (0 이상)', String(cur ?? 0))
    if (input === null) return
    const n = parseInt(input.trim(), 10)
    if (isNaN(n) || n < 0) { alert('0 이상의 숫자를 입력해주세요.'); return }
    if (report.targetType === 'COMMENT' && report.commentId) updateCommentCount.mutate({ id: report.commentId, count: n })
    else if (report.targetType === 'POST' && report.postId) updatePostCount.mutate({ id: report.postId, count: n })
  }

  const isActionPending =
    deletePost.isPending || hidePost.isPending || restorePost.isPending ||
    hideComment.isPending || restoreComment.isPending || deleteComment.isPending ||
    updatePostCount.isPending || updateCommentCount.isPending

  return (
    <div className="p-6 space-y-5">
      <h1 className="text-xl font-bold text-neutral-900">커뮤니티 신고 (게시글 · 댓글)</h1>

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
                  ? 'bg-primary-800 text-white'
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
          <Spinner size="lg" className="text-primary-800" />
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  <th className="text-left px-4 py-3 text-neutral-500 font-medium w-14">ID</th>
                  <th className="text-left px-4 py-3 text-neutral-500 font-medium w-20">유형</th>
                  <th className="text-left px-4 py-3 text-neutral-500 font-medium">대상</th>
                  <th className="text-left px-4 py-3 text-neutral-500 font-medium">신고자</th>
                  <th className="text-center px-4 py-3 text-neutral-500 font-medium w-20">신고 횟수</th>
                  <th className="text-left px-4 py-3 text-neutral-500 font-medium">신고 사유</th>
                  <th className="text-left px-4 py-3 text-neutral-500 font-medium w-20">상태</th>
                  <th className="text-left px-4 py-3 text-neutral-500 font-medium">신고일</th>
                  <th className="text-right px-4 py-3 text-neutral-500 font-medium">액션</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {!data || data.empty ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-neutral-400">
                      데이터가 없습니다.
                    </td>
                  </tr>
                ) : (
                  data.content.map((report) => {
                    const badge = stateBadge(report)
                    const count = report.targetType === 'COMMENT' ? report.commentReportCount : report.postReportCount
                    return (
                      <tr key={report.id} className="hover:bg-neutral-50 transition-colors">
                        <td className="px-4 py-3 text-neutral-400 tabular-nums align-top">{report.id}</td>
                        <td className="px-4 py-3 align-top">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                            report.targetType === 'COMMENT'
                              ? 'bg-violet-100 text-violet-700'
                              : 'bg-sky-100 text-sky-700'
                          }`}>
                            {report.targetType === 'COMMENT' ? '댓글' : '게시글'}
                          </span>
                        </td>
                        <td className="px-4 py-3 max-w-[260px] align-top">
                          {renderTarget(report)}
                        </td>
                        <td className="px-4 py-3 text-neutral-700 align-top">{report.reporterNickname}</td>
                        <td className="px-4 py-3 text-center align-top">
                          <button
                            onClick={() => handleEditCount(report)}
                            disabled={isActionPending}
                            title="클릭하여 신고 횟수 수정"
                            className="inline-flex items-center justify-center gap-1 min-w-[36px] px-2 py-0.5 rounded-full
                              bg-red-50 text-red-600 text-xs font-semibold tabular-nums
                              hover:bg-red-100 hover:ring-1 hover:ring-red-300 transition-colors disabled:opacity-40"
                          >
                            {count ?? 0}
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path d="M12 20h9" />
                              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
                            </svg>
                          </button>
                        </td>
                        <td className="px-4 py-3 max-w-[200px] align-top">
                          {report.reason ? (
                            <div>
                              <p className="text-xs text-neutral-600 line-clamp-2">{report.reason}</p>
                              <button
                                onClick={() => setReasonModal(report.reason)}
                                className="mt-0.5 text-[11px] text-primary-700 hover:underline"
                              >
                                전체보기
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-neutral-300">사유 없음</span>
                          )}
                        </td>
                        <td className="px-4 py-3 align-top">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${badge.cls}`}>
                            {badge.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-neutral-500 text-xs tabular-nums whitespace-nowrap align-top">
                          {formatDate(report.createdAt)}
                        </td>
                        <td className="px-4 py-3 align-top">
                          <div className="flex items-center gap-1 justify-end">
                            {/* 게시글 액션 — 잠금(자동)·숨김(수동)은 "숨김해제" 하나로 통합 해제 */}
                            {report.targetType === 'POST' && report.postId && (
                              <>
                                {report.postHidden || report.postLocked ? (
                                  <button
                                    onClick={() => handleRestorePost(report.postId!)}
                                    disabled={isActionPending}
                                    className="inline-flex items-center h-7 px-2.5 text-xs font-medium
                                      rounded-md border border-neutral-300 bg-white text-neutral-700
                                      hover:bg-neutral-50 transition-colors whitespace-nowrap disabled:opacity-40"
                                  >
                                    숨김해제
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleHidePost(report.postId!)}
                                    disabled={isActionPending}
                                    className="inline-flex items-center h-7 px-2.5 text-xs font-medium
                                      rounded-md border border-amber-200 bg-white text-amber-700
                                      hover:bg-amber-50 transition-colors whitespace-nowrap disabled:opacity-40"
                                  >
                                    숨김
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDeletePost(report.postId!, report.postTitle)}
                                  disabled={isActionPending}
                                  className="inline-flex items-center h-7 px-2.5 text-xs font-medium
                                    rounded-md border border-red-200 bg-white text-red-600
                                    hover:bg-red-50 transition-colors whitespace-nowrap disabled:opacity-40"
                                >
                                  삭제
                                </button>
                              </>
                            )}
                            {/* 댓글 액션 */}
                            {report.targetType === 'COMMENT' && report.commentId && !report.commentDeleted && (
                              <>
                                {report.commentHidden ? (
                                  <button
                                    onClick={() => handleRestoreComment(report.commentId!)}
                                    disabled={isActionPending}
                                    className="inline-flex items-center h-7 px-2.5 text-xs font-medium
                                      rounded-md border border-neutral-300 bg-white text-neutral-700
                                      hover:bg-neutral-50 transition-colors whitespace-nowrap disabled:opacity-40"
                                  >
                                    숨김해제
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleHideComment(report.commentId!)}
                                    disabled={isActionPending}
                                    className="inline-flex items-center h-7 px-2.5 text-xs font-medium
                                      rounded-md border border-amber-200 bg-white text-amber-700
                                      hover:bg-amber-50 transition-colors whitespace-nowrap disabled:opacity-40"
                                  >
                                    숨김
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDeleteComment(report.commentId!)}
                                  disabled={isActionPending}
                                  className="inline-flex items-center h-7 px-2.5 text-xs font-medium
                                    rounded-md border border-red-200 bg-white text-red-600
                                    hover:bg-red-50 transition-colors whitespace-nowrap disabled:opacity-40"
                                >
                                  삭제
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })
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

      {/* 신고 사유 전체보기 팝업 */}
      {reasonModal !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          onClick={() => setReasonModal(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-semibold mb-3 text-neutral-900">신고 사유</h3>
            <p className="text-sm text-neutral-700 whitespace-pre-wrap break-words max-h-[60vh] overflow-y-auto">
              {reasonModal}
            </p>
            <button
              onClick={() => setReasonModal(null)}
              className="mt-4 w-full py-2 text-sm border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function renderTarget(report: PostReportAdmin) {
  const url = targetUrl(report)

  if (report.targetType === 'COMMENT') {
    const body = report.commentDeleted ? (
      <span className="text-neutral-300 text-xs">삭제된 댓글</span>
    ) : (
      <p className="text-neutral-800 text-xs line-clamp-2 whitespace-pre-wrap group-hover:text-primary-800 group-hover:underline">
        {report.commentContent}
      </p>
    )
    return (
      <div>
        {url && !report.commentDeleted ? (
          <Link to={url} target="_blank" rel="noopener noreferrer" className="group block">
            {body}
          </Link>
        ) : body}
        {report.postTitle && (
          <p className="text-[11px] text-neutral-400 mt-0.5 truncate">
            ↳ {report.postTitle}{report.postId ? ` #${report.postId}` : ''}
          </p>
        )}
      </div>
    )
  }

  const title = report.postTitle ? (
    <p className="font-medium text-neutral-900 truncate group-hover:text-primary-800 group-hover:underline">
      {report.postTitle}
    </p>
  ) : (
    <span className="text-neutral-300 text-xs">삭제된 게시글</span>
  )
  return (
    <div>
      {url ? (
        <Link to={url} target="_blank" rel="noopener noreferrer" className="group block">
          {title}
        </Link>
      ) : title}
      {report.postId && <span className="text-xs text-neutral-400">#{report.postId}</span>}
    </div>
  )
}
