import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminUserApi } from '@/domain/admin/api/adminUserApi'
import Spinner from '@/shared/components/Spinner'
import Pagination from '@/shared/components/Pagination'
import { formatDate } from '@/shared/utils/format'

export default function AdminNicknameBadWordPage() {
  const [page, setPage]     = useState(0)
  const [input, setInput]   = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const queryClient         = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['admin-nickname-bad-words', page],
    queryFn: () =>
      adminUserApi.getNicknameBadWords({ page, size: 50 }).then((r) => r.data.data!),
  })

  const createMutation = useMutation({
    mutationFn: (word: string) => adminUserApi.createNicknameBadWord(word),
    onSuccess: () => {
      setInput('')
      setErrorMsg('')
      queryClient.invalidateQueries({ queryKey: ['admin-nickname-bad-words'] })
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setErrorMsg(msg ?? '추가 중 오류가 발생했습니다.')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => adminUserApi.deleteNicknameBadWord(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-nickname-bad-words'] }),
  })

  const toggleMutation = useMutation({
    mutationFn: (id: number) => adminUserApi.toggleNicknameBadWord(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-nickname-bad-words'] }),
  })

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault()
    const word = input.trim()
    if (!word) return
    createMutation.mutate(word)
  }

  const handleDelete = (id: number, word: string) => {
    if (!confirm(`"${word}" 금지 단어를 삭제하시겠습니까?`)) return
    deleteMutation.mutate(id)
  }

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-neutral-900">닉네임 금지 단어 관리</h1>
        <p className="mt-1 text-sm text-neutral-500">
          회원가입 및 닉네임 변경 시 이 목록에 등록된 단어가 포함되면 사용이 차단됩니다.
        </p>
      </div>

      {/* 추가 폼 */}
      <form onSubmit={handleAdd} className="flex flex-col gap-2 p-4 bg-white rounded-xl shadow-sm">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => { setInput(e.target.value); setErrorMsg('') }}
            placeholder="금지 단어 입력..."
            maxLength={100}
            className="flex-1 px-3 py-2 text-sm border border-neutral-200 rounded-lg
              focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
          />
          <button
            type="submit"
            disabled={createMutation.isPending || !input.trim()}
            className="px-4 py-2 bg-primary-800 text-white text-sm font-medium rounded-lg
              hover:bg-primary-900 transition-colors disabled:opacity-40"
          >
            추가
          </button>
        </div>
        {errorMsg && <p className="text-xs text-red-600">{errorMsg}</p>}
      </form>

      {/* 목록 */}
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
                  <th className="text-left px-4 py-3 text-neutral-500 font-medium">금지 단어</th>
                  <th className="text-left px-4 py-3 text-neutral-500 font-medium">상태</th>
                  <th className="text-left px-4 py-3 text-neutral-500 font-medium">등록일</th>
                  <th className="text-right px-4 py-3 text-neutral-500 font-medium">액션</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {!data || data.empty ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-neutral-400">
                      등록된 금지 단어가 없습니다.
                    </td>
                  </tr>
                ) : (
                  data.content.map((bw) => (
                    <tr key={bw.id} className="hover:bg-neutral-50 transition-colors">
                      <td className="px-4 py-3 text-neutral-400 tabular-nums">{bw.id}</td>
                      <td className="px-4 py-3 font-medium text-neutral-900">{bw.word}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          bw.isActive
                            ? 'bg-green-50 text-green-700'
                            : 'bg-neutral-100 text-neutral-500'
                        }`}>
                          {bw.isActive ? '활성' : '비활성'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-neutral-500 text-xs tabular-nums whitespace-nowrap">
                        {formatDate(bw.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() => toggleMutation.mutate(bw.id)}
                            disabled={toggleMutation.isPending}
                            className="inline-flex items-center gap-1 h-7 px-2.5 text-xs font-medium
                              rounded-md border border-neutral-300 bg-white text-neutral-600
                              hover:bg-neutral-50 transition-colors whitespace-nowrap disabled:opacity-40"
                          >
                            {bw.isActive ? '비활성화' : '활성화'}
                          </button>
                          <button
                            onClick={() => handleDelete(bw.id, bw.word)}
                            disabled={deleteMutation.isPending}
                            className="inline-flex items-center gap-1 h-7 px-2.5 text-xs font-medium
                              rounded-md border border-red-200 bg-white text-red-600
                              hover:bg-red-50 transition-colors whitespace-nowrap disabled:opacity-40"
                          >
                            삭제
                          </button>
                        </div>
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
