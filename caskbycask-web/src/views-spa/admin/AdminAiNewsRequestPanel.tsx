import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { adminAiNewsApi } from '@/domain/admin/api/adminAiNewsApi'
import type { AiNewsDraftRequestStatus } from '@/domain/admin/types/aiNews.types'
import Pagination from '@/shared/components/Pagination'
import Spinner from '@/shared/components/Spinner'
import { formatDateTime } from '@/shared/utils/format'

const statusLabels: Record<AiNewsDraftRequestStatus, string> = {
  PENDING: '다음 배치 대기',
  COMPLETED: '임시저장 완료',
  FAILED: '작성 실패',
  CANCELLED: '요청 취소',
}

const statusClasses: Record<AiNewsDraftRequestStatus, string> = {
  PENDING: 'bg-blue-50 text-blue-700',
  COMPLETED: 'bg-emerald-50 text-emerald-700',
  FAILED: 'bg-red-50 text-red-700',
  CANCELLED: 'bg-neutral-100 text-neutral-500',
}

export default function AdminAiNewsRequestPanel() {
  const qc = useQueryClient()
  const [prompt, setPrompt] = useState('')
  const [urls, setUrls] = useState(['', '', ''])
  const [page, setPage] = useState(0)
  const [error, setError] = useState('')
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'ai-news', 'draft-requests', page],
    queryFn: () => adminAiNewsApi.draftRequests(page, 10),
  })

  const create = useMutation({
    mutationFn: () => adminAiNewsApi.createDraftRequest({
      prompt: prompt.trim(),
      referenceUrls: urls.map((url) => url.trim()).filter(Boolean),
    }),
    onSuccess: () => {
      setPrompt('')
      setUrls(['', '', ''])
      setError('')
      setPage(0)
      qc.invalidateQueries({ queryKey: ['admin', 'ai-news', 'draft-requests'] })
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'AI 작성 요청을 저장하지 못했습니다.'),
  })

  const cancel = useMutation({
    mutationFn: (id: number) => adminAiNewsApi.cancelDraftRequest(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'ai-news', 'draft-requests'] }),
    onError: (e) => setError(e instanceof Error ? e.message : '요청을 취소하지 못했습니다.'),
  })

  const submit = (event: FormEvent) => {
    event.preventDefault()
    setError('')
    if (!prompt.trim()) {
      setError('AI 프롬프트를 입력하세요.')
      return
    }
    const invalidUrl = urls.map((url) => url.trim()).filter(Boolean).find((url) => {
      try {
        return !['http:', 'https:'].includes(new URL(url).protocol)
      } catch {
        return true
      }
    })
    if (invalidUrl) {
      setError(`올바른 HTTP(S) 참고 URL을 입력하세요: ${invalidUrl}`)
      return
    }
    create.mutate()
  }

  return (
    <div className="space-y-5">
      <form onSubmit={submit} className="space-y-5 rounded-xl bg-white p-5 shadow-sm">
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950">
          <p className="font-semibold">다음 AI 배치에서 가장 먼저 작성합니다.</p>
          <p className="mt-1 leading-6 text-blue-800">
            프롬프트와 참고 URL을 바탕으로 자료를 확인하고 원고를 작성합니다. 결과는 자동 발행하지 않고
            게시글 관리에 <strong>임시저장</strong>되므로, 내용을 검토한 뒤 직접 발행해 주세요.
          </p>
          <p className="mt-1 text-xs text-blue-700">대기 요청이 여러 개면 오래된 요청부터 배치당 1건을 처리합니다.</p>
        </div>

        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-neutral-700">AI 프롬프트 <span className="text-red-500">*</span></span>
          <textarea
            required maxLength={4000} rows={7} value={prompt} onChange={(event) => setPrompt(event.target.value)}
            className={`${inputCls} resize-y`}
            placeholder="예: 메타베브코리아가 최근 발표한 글렌알라키 국내 출시·행사 소식을 확인하고, 확인된 사실만으로 소개 글을 작성해 주세요."
          />
          <div className="mt-1 flex items-center justify-between gap-3 text-xs text-neutral-500">
            <span>작성 방향, 반드시 확인할 내용, 독자에게 전달할 핵심을 구체적으로 적어주세요.</span>
            <span>{prompt.length}/4000</span>
          </div>
        </label>

        <div>
          <p className="text-xs font-semibold text-neutral-700">참고 URL <span className="font-normal text-neutral-400">(선택, 최대 3개)</span></p>
          <p className="mt-1 text-xs leading-5 text-neutral-500">
            공식 홈페이지·보도자료·공개 SNS 게시물의 전체 URL을 입력하세요. 로그인이 필요하거나 외부 수집을 차단한 페이지는 읽지 못할 수 있습니다.
          </p>
          <div className="mt-2 space-y-2">
            {urls.map((url, index) => (
              <input key={index} type="url" maxLength={1500} value={url}
                onChange={(event) => setUrls((current) => current.map((item, i) => i === index ? event.target.value : item))}
                className={inputCls} placeholder={`참고 URL ${index + 1} — https://...`} />
            ))}
          </div>
        </div>

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <div className="flex justify-end">
          <button disabled={create.isPending || !prompt.trim()}
            className="rounded-lg bg-primary-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-900 disabled:cursor-not-allowed disabled:opacity-50">
            {create.isPending ? '요청 저장 중...' : '다음 배치에 요청 저장'}
          </button>
        </div>
      </form>

      <section className="space-y-3">
        <div>
          <h2 className="font-semibold text-neutral-900">AI 작성 요청 내역</h2>
          <p className="mt-1 text-xs text-neutral-500">실패한 요청은 원인을 확인한 뒤 새 요청으로 다시 등록할 수 있습니다.</p>
        </div>
        {isLoading ? (
          <div className="flex justify-center rounded-xl bg-white py-16 shadow-sm"><Spinner className="text-primary-800" /></div>
        ) : !data || data.empty ? (
          <div className="rounded-xl bg-white py-16 text-center text-sm text-neutral-400 shadow-sm">등록된 AI 작성 요청이 없습니다.</div>
        ) : (
          <div className="space-y-3">
            {data.content.map((request) => (
              <article key={request.id} className="rounded-xl bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClasses[request.status]}`}>
                        {statusLabels[request.status]}
                      </span>
                      <span className="text-xs text-neutral-400">요청 #{request.id} · {formatDateTime(request.createdAt)}</span>
                    </div>
                    <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-neutral-800">{request.prompt}</p>
                    {request.referenceUrls.length > 0 && (
                      <div className="mt-3 space-y-1">
                        {request.referenceUrls.map((url) => (
                          <a key={url} href={url} target="_blank" rel="noreferrer"
                            className="block truncate text-xs text-primary-700 hover:underline">{url}</a>
                        ))}
                      </div>
                    )}
                    {request.failureReason && <p className="mt-3 rounded-lg bg-red-50 p-2 text-xs leading-5 text-red-700">{request.failureReason}</p>}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    {request.articleId && (
                      <Link to={`/admin/community/ai-news/${request.articleId}/edit`}
                        className="rounded-lg bg-primary-800 px-3 py-2 text-xs font-semibold text-white hover:bg-primary-900">
                        임시저장 글 열기
                      </Link>
                    )}
                    {request.status === 'PENDING' && (
                      <button type="button" disabled={cancel.isPending} onClick={() => {
                        if (window.confirm('이 AI 작성 요청을 취소하시겠습니까?')) cancel.mutate(request.id)
                      }} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50">
                        요청 취소
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
        {data && data.totalPages > 1 && (
          <Pagination currentPage={page} totalPages={data.totalPages} onPageChange={setPage} scrollToTopOnChange={false} />
        )}
      </section>
    </div>
  )
}

const inputCls = 'w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 disabled:bg-neutral-100'
