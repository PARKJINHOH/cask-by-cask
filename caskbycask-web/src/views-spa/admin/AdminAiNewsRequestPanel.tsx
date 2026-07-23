import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { adminAiNewsApi } from '@/domain/admin/api/adminAiNewsApi'
import Pagination from '@/shared/components/Pagination'
import Spinner from '@/shared/components/Spinner'
import { formatDateTime } from '@/shared/utils/format'
import { RequiredFieldsNotice, RequiredMark } from '@/shared/components/FormFieldLabel'
import AdminAiNewsRequestStatusBadge, { summarizeAiNewsPrompt } from './AdminAiNewsRequestStatusBadge'

export default function AdminAiNewsRequestPanel() {
  const qc = useQueryClient()
  const navigate = useNavigate()
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
        <RequiredFieldsNotice admin />
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950">
          <p className="font-semibold">다음 AI 배치에서 가장 먼저 작성합니다.</p>
          <p className="mt-1 leading-6 text-blue-800">
            프롬프트와 참고 URL을 바탕으로 자료를 확인하고 원고를 작성합니다. 결과는 자동 발행하지 않고
            게시글 관리에 <strong>임시저장</strong>되므로, 내용을 검토한 뒤 직접 발행해 주세요.
          </p>
          <p className="mt-1 text-xs text-blue-700">대기 요청이 여러 개면 오래된 요청부터 배치당 1건을 처리합니다.</p>
        </div>

        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-neutral-700">AI 프롬프트 <RequiredMark /></span>
          <textarea
            required aria-required="true" maxLength={4000} rows={7} value={prompt} onChange={(event) => setPrompt(event.target.value)}
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
          <p className="mt-1 text-xs text-neutral-500">요청을 선택하면 전체 프롬프트와 처리 결과를 확인하고 취소·삭제·재요청할 수 있습니다.</p>
        </div>
        {isLoading ? (
          <div className="flex justify-center rounded-xl bg-white py-16 shadow-sm"><Spinner className="text-primary-800" /></div>
        ) : !data || data.empty ? (
          <div className="rounded-xl bg-white py-16 text-center text-sm text-neutral-400 shadow-sm">등록된 AI 작성 요청이 없습니다.</div>
        ) : (
          <div>
            <div className="hidden overflow-hidden rounded-xl bg-white shadow-sm md:block">
              <table className="w-full table-fixed text-sm">
                <thead className="border-b border-neutral-200 bg-neutral-50 text-xs font-semibold text-neutral-500">
                  <tr>
                    <th className="w-20 px-4 py-3 text-center">번호</th>
                    <th className="px-4 py-3 text-left">제목</th>
                    <th className="w-32 px-4 py-3 text-center">상태</th>
                    <th className="w-32 px-4 py-3 text-center">결과</th>
                    <th className="w-40 px-4 py-3 text-center">요청일</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {data.content.map((request, index) => {
                    const detailPath = `/admin/community/ai-news/requests/${request.id}`
                    const number = data.totalElements - (page * data.size) - index
                    return (
                      <tr key={request.id} tabIndex={0} role="link"
                        aria-label={`AI 작성 요청 ${number} 상세 보기`}
                        onClick={() => navigate(detailPath)}
                        onKeyDown={(event) => {
                          if (event.target !== event.currentTarget) return
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault()
                            navigate(detailPath)
                          }
                        }}
                        className="cursor-pointer transition-colors hover:bg-neutral-50 focus:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-300">
                        <td className="px-4 py-3 text-center text-xs tabular-nums text-neutral-400">{number}</td>
                        <td className="px-4 py-3">
                          <p title={request.prompt} className="truncate text-sm text-neutral-800">
                            {summarizeAiNewsPrompt(request.prompt)}
                          </p>
                          {request.failureReason && <p className="mt-1 truncate text-xs text-red-500">{request.failureReason}</p>}
                        </td>
                        <td className="px-4 py-3 text-center"><AdminAiNewsRequestStatusBadge status={request.status} /></td>
                        <td className="px-4 py-3 text-center">
                          {request.articleId ? (
                            <Link to={`/admin/community/ai-news/${request.articleId}/edit`}
                              onClick={(event) => event.stopPropagation()}
                              className="text-xs font-semibold text-primary-700 hover:underline">
                              원고 #{request.articleId}
                            </Link>
                          ) : <span className="text-xs text-neutral-300">-</span>}
                        </td>
                        <td className="px-4 py-3 text-center text-xs tabular-nums text-neutral-500">{formatDateTime(request.createdAt)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="space-y-2 md:hidden">
              {data.content.map((request, index) => {
                const detailPath = `/admin/community/ai-news/requests/${request.id}`
                const number = data.totalElements - (page * data.size) - index
                return (
                  <article key={request.id} tabIndex={0} role="link"
                    aria-label={`AI 작성 요청 ${number} 상세 보기`}
                    onClick={() => navigate(detailPath)}
                    onKeyDown={(event) => {
                      if (event.target !== event.currentTarget) return
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        navigate(detailPath)
                      }
                    }}
                    className="cursor-pointer rounded-xl border border-neutral-200 bg-white p-4 shadow-sm transition-colors hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-primary-300">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs tabular-nums text-neutral-400">{number}</span>
                      <AdminAiNewsRequestStatusBadge status={request.status} />
                    </div>
                    <p className="mt-3 line-clamp-2 break-words text-sm leading-5 text-neutral-800">
                      {summarizeAiNewsPrompt(request.prompt, 90)}
                    </p>
                    <div className="mt-3 flex items-center justify-between gap-3 text-xs text-neutral-400">
                      <span>{formatDateTime(request.createdAt)}</span>
                      {request.articleId && (
                        <Link to={`/admin/community/ai-news/${request.articleId}/edit`}
                          onClick={(event) => event.stopPropagation()}
                          className="shrink-0 font-semibold text-primary-700 hover:underline">
                          원고 #{request.articleId}
                        </Link>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
          </div>
        )}
        {data && data.totalPages > 1 && (
          <Pagination currentPage={page} totalPages={data.totalPages} onPageChange={setPage} />
        )}
      </section>
    </div>
  )
}

const inputCls = 'w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 disabled:bg-neutral-100'
