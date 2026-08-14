import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminCommunityApi } from '@/domain/admin/api/adminCommunityApi'
import Spinner from '@/shared/components/Spinner'
import Pagination from '@/shared/components/Pagination'
import { formatDate } from '@/shared/utils/format'
import { RequiredFieldsNotice } from '@/shared/components/FormFieldLabel'

export default function AdminBadWordPage() {
  const [page, setPage]     = useState(0)
  const [input, setInput]   = useState('')
  const queryClient         = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['admin-bad-words', page],
    queryFn: () =>
      adminCommunityApi.getBadWords({ page, size: 50 }).then((r) => r.data.data!),
  })

  const createMutation = useMutation({
    mutationFn: (word: string) => adminCommunityApi.createBadWord(word),
    onSuccess: () => {
      setInput('')
      queryClient.invalidateQueries({ queryKey: ['admin-bad-words'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => adminCommunityApi.deleteBadWord(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-bad-words'] }),
  })

  const toggleMutation = useMutation({
    mutationFn: (id: number) => adminCommunityApi.toggleBadWord(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-bad-words'] }),
  })

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault()
    const word = input.trim()
    if (!word) return
    createMutation.mutate(word)
  }

  const handleDelete = (id: number, word: string) => {
    if (!confirm(`"${word}" 금지어를 삭제하시겠습니까?`)) return
    deleteMutation.mutate(id)
  }

  return (
    <div className="p-6 space-y-5">
      <h1 className="text-xl font-bold text-neutral-900">욕설 필터 관리</h1>

      {/* 추가 폼 */}
      <form onSubmit={handleAdd} className="flex gap-2 p-4 bg-white rounded-xl shadow-sm">
        <RequiredFieldsNotice admin className="self-center whitespace-nowrap" />
        <input
          type="text"
          required
          aria-required="true"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="금지어 입력..."
          className="flex-1 px-3 py-2 text-sm border border-neutral-300 rounded-lg
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
                  <th className="text-left px-4 py-3 text-neutral-500 font-medium">금지어</th>
                  <th className="text-left px-4 py-3 text-neutral-500 font-medium">상태</th>
                  <th className="text-left px-4 py-3 text-neutral-500 font-medium">등록일</th>
                  <th className="text-right px-4 py-3 text-neutral-500 font-medium">액션</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {!data || data.empty ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-neutral-400">
                      등록된 금지어가 없습니다.
                    </td>
                  </tr>
                ) : (
                  data.content.map((bw) => (
                    <tr key={bw.id} className="hover:bg-neutral-50 transition-colors">
                      <td className="px-4 py-3 text-neutral-400 tabular-nums">{bw.id}</td>
                      <td className="max-w-[220px] px-4 py-3 font-medium text-neutral-900">{bw.word}</td>
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
