import { useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { adminAiNewsApi } from '@/domain/admin/api/adminAiNewsApi'
import AdminPageHeader from '@/shared/components/AdminPageHeader'
import Spinner from '@/shared/components/Spinner'
import { formatDateTime } from '@/shared/utils/format'
import AdminAiNewsRequestStatusBadge, { summarizeAiNewsPrompt } from './AdminAiNewsRequestStatusBadge'

const requestListPath = '/admin/community/ai-news/new?mode=ai'

export default function AdminAiNewsRequestDetailPage() {
  const { requestId: rawRequestId } = useParams<{ requestId: string }>()
  const requestId = Number(rawRequestId)
  const isValidRequestId = Number.isSafeInteger(requestId) && requestId > 0
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const queryKey = ['admin', 'ai-news', 'draft-requests', 'detail', requestId] as const
  const [error, setError] = useState('')

  const { data: request, isLoading, isError } = useQuery({
    queryKey,
    queryFn: () => adminAiNewsApi.draftRequest(requestId),
    enabled: isValidRequestId,
  })

  const cancel = useMutation({
    mutationFn: () => adminAiNewsApi.cancelDraftRequest(requestId),
    onSuccess: (next) => {
      setError('')
      queryClient.setQueryData(queryKey, next)
      queryClient.invalidateQueries({ queryKey: ['admin', 'ai-news', 'draft-requests'] })
    },
    onError: (cause) => setError(cause instanceof Error ? cause.message : '요청을 취소하지 못했습니다.'),
  })

  const retry = useMutation({
    mutationFn: () => adminAiNewsApi.retryDraftRequest(requestId),
    onSuccess: (next) => {
      setError('')
      queryClient.invalidateQueries({ queryKey: ['admin', 'ai-news', 'draft-requests'] })
      navigate(`/admin/community/ai-news/requests/${next.id}`, { replace: true })
    },
    onError: (cause) => setError(cause instanceof Error ? cause.message : '요청을 다시 등록하지 못했습니다.'),
  })

  const remove = useMutation({
    mutationFn: () => adminAiNewsApi.deleteDraftRequestHistory(requestId),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey })
      queryClient.invalidateQueries({ queryKey: ['admin', 'ai-news', 'draft-requests'] })
      navigate(requestListPath, { replace: true })
    },
    onError: (cause) => setError(cause instanceof Error ? cause.message : '요청 내역을 삭제하지 못했습니다.'),
  })

  if (isLoading) {
    return <div className="flex justify-center py-32"><Spinner size="lg" className="text-primary-800" /></div>
  }

  if (!isValidRequestId || isError || !request) {
    return (
      <div className="mx-auto max-w-4xl p-4 sm:p-6">
        <AdminPageHeader title="AI 작성 요청 상세" backTo={requestListPath} useBackToPath backLabel="요청 목록" />
        <div className="rounded-xl bg-white px-5 py-16 text-center text-sm text-neutral-500 shadow-sm">
          요청 내역을 찾을 수 없습니다.
        </div>
      </div>
    )
  }

  const isPending = request.status === 'PENDING'
  const isTerminal = ['COMPLETED', 'FAILED', 'CANCELLED'].includes(request.status)
  const isMutating = cancel.isPending || retry.isPending || remove.isPending

  const handleCancel = () => {
    if (window.confirm('이 AI 작성 요청을 취소하시겠습니까?')) cancel.mutate()
  }

  const handleRetry = () => {
    const articleNotice = request.status === 'COMPLETED'
      ? '\n기존 임시저장 글은 변경되지 않습니다.'
      : ''
    if (window.confirm(`같은 내용으로 새 AI 작성 요청을 등록하시겠습니까?${articleNotice}`)) retry.mutate()
  }

  const handleDelete = () => {
    const articleNotice = request.articleId
      ? '\n연결된 임시저장 글은 삭제되지 않습니다.'
      : ''
    if (window.confirm(`이 요청 내역을 삭제하시겠습니까?${articleNotice}`)) remove.mutate()
  }

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6">
      <AdminPageHeader
        breadcrumbs={[
          { label: '커뮤니티' },
          { label: '소식(AI)', to: '/admin/community/ai-news' },
          { label: 'AI 작성 요청', to: requestListPath },
          { label: `요청 #${request.id}` },
        ]}
        backTo={requestListPath}
        useBackToPath
        backLabel="요청 목록"
        title={summarizeAiNewsPrompt(request.prompt)}
        badge={<AdminAiNewsRequestStatusBadge status={request.status} />}
      />

      <div className="space-y-5">
        <section className="rounded-xl bg-white p-5 shadow-sm">
          <dl className="grid gap-x-8 gap-y-4 text-sm sm:grid-cols-2">
            <DetailItem label="요청 번호">#{request.id}</DetailItem>
            <DetailItem label="상태"><AdminAiNewsRequestStatusBadge status={request.status} /></DetailItem>
            <DetailItem label="요청일">{formatDateTime(request.createdAt)}</DetailItem>
            <DetailItem label="최근 변경일">{formatDateTime(request.updatedAt)}</DetailItem>
            <DetailItem label="작성 결과">
              {request.articleId ? (
                <Link to={`/admin/community/ai-news/${request.articleId}/edit`}
                  className="font-semibold text-primary-700 hover:underline">
                  임시저장 글 #{request.articleId} 열기
                </Link>
              ) : <span className="text-neutral-400">연결된 글 없음</span>}
            </DetailItem>
          </dl>
        </section>

        <section className="rounded-xl bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-neutral-800">AI 프롬프트</h2>
          <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-neutral-800">{request.prompt}</p>
        </section>

        <section className="rounded-xl bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-neutral-800">참고 URL</h2>
          {request.referenceUrls.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {request.referenceUrls.map((url) => (
                <li key={url}>
                  <a href={url} target="_blank" rel="noreferrer"
                    className="block break-all text-sm text-primary-700 hover:underline">{url}</a>
                </li>
              ))}
            </ul>
          ) : <p className="mt-3 text-sm text-neutral-400">등록된 참고 URL이 없습니다.</p>}
        </section>

        {request.failureReason && (
          <section className="rounded-xl border border-red-200 bg-red-50 p-5">
            <h2 className="text-sm font-semibold text-red-800">실패 사유</h2>
            <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-red-700">{request.failureReason}</p>
          </section>
        )}

        {error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

        <div className="flex flex-wrap justify-end gap-2">
          {isPending && (
            <button type="button" disabled={isMutating} onClick={handleCancel}
              className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50">
              요청 취소
            </button>
          )}
          {isTerminal && (
            <>
              <button type="button" disabled={isMutating} onClick={handleRetry}
                className="rounded-lg border border-primary-300 px-4 py-2 text-sm font-semibold text-primary-700 hover:bg-primary-50 disabled:opacity-50">
                {retry.isPending ? '재요청 중...' : '재요청'}
              </button>
              <button type="button" disabled={isMutating} onClick={handleDelete}
                className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50">
                {remove.isPending ? '삭제 중...' : '내역 삭제'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function DetailItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold text-neutral-400">{label}</dt>
      <dd className="mt-1.5 text-neutral-800">{children}</dd>
    </div>
  )
}
