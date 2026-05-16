import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminCommunityApi } from '@/domain/admin/api/adminCommunityApi'
import type { PostPrefixAdmin } from '@/domain/admin/types/admin.types'
import type { BoardType } from '@/domain/community/types/community.types'

const BOARD_TABS: { value: BoardType; label: string }[] = [
  { value: 'NOTICE', label: '소식' },
  { value: 'FREE',   label: '자유게시판' },
]

export default function AdminPrefixPage() {
  const [boardType, setBoardType] = useState<BoardType>('NOTICE')
  const [showForm, setShowForm]   = useState(false)
  const [editItem, setEditItem]   = useState<PostPrefixAdmin | null>(null)
  const queryClient = useQueryClient()

  const { data: prefixes = [], isLoading } = useQuery({
    queryKey: ['admin-prefixes', boardType],
    queryFn: () => adminCommunityApi.getPrefixes(boardType).then((r) => r.data.data ?? []),
  })

  const toggleMutation = useMutation({
    mutationFn: (id: number) => adminCommunityApi.togglePrefix(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-prefixes', boardType] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => adminCommunityApi.deletePrefix(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-prefixes', boardType] })
      queryClient.invalidateQueries({ queryKey: ['post-prefixes', boardType] })
    },
  })

  const handleSaved = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-prefixes', boardType] })
    queryClient.invalidateQueries({ queryKey: ['post-prefixes', boardType] })
    setShowForm(false)
    setEditItem(null)
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-neutral-900">말머리 관리</h1>
        <button
          onClick={() => { setEditItem(null); setShowForm(true) }}
          className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
        >
          + 말머리 추가
        </button>
      </div>

      {/* 게시판 탭 */}
      <div className="flex gap-1 border-b border-neutral-200">
        {BOARD_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setBoardType(tab.value)}
            className={[
              'px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
              boardType === tab.value
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-neutral-500 hover:text-neutral-700',
            ].join(' ')}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 목록 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-neutral-400 text-sm">불러오는 중...</div>
        ) : prefixes.length === 0 ? (
          <div className="py-16 text-center text-neutral-400 text-sm">말머리가 없습니다.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 border-b border-neutral-200">
              <tr>
                <th className="text-left px-4 py-3 text-neutral-500 font-medium">이름</th>
                <th className="text-left px-4 py-3 text-neutral-500 font-medium">색상</th>
                <th className="text-left px-4 py-3 text-neutral-500 font-medium">순서</th>
                <th className="text-left px-4 py-3 text-neutral-500 font-medium">상태</th>
                <th className="text-right px-4 py-3 text-neutral-500 font-medium">액션</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {prefixes.map((p) => (
                <tr key={p.id} className="hover:bg-neutral-50 transition-colors">
                  <td className="px-4 py-3">
                    <span
                      className="inline-flex items-center px-3 py-1 rounded-full border text-sm font-medium"
                      style={p.colorHex
                        ? { color: p.colorHex, borderColor: p.colorHex, backgroundColor: `${p.colorHex}15` }
                        : { color: '#374151', borderColor: '#d1d5db' }}
                    >
                      {p.name}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {p.colorHex ? (
                      <div className="flex items-center gap-2">
                        <span
                          className="w-5 h-5 rounded-full border border-neutral-200 flex-shrink-0"
                          style={{ backgroundColor: p.colorHex }}
                        />
                        <span className="text-neutral-500 font-mono text-xs">{p.colorHex}</span>
                      </div>
                    ) : (
                      <span className="text-neutral-300 text-xs">없음</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-neutral-500">{p.sortOrder}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      p.isActive ? 'bg-green-50 text-green-700' : 'bg-neutral-100 text-neutral-500'
                    }`}>
                      {p.isActive ? '활성' : '비활성'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => { setEditItem(p); setShowForm(true) }}
                        className="h-7 px-2.5 text-xs font-medium rounded-md border border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-50 transition-colors"
                      >
                        수정
                      </button>
                      <button
                        onClick={() => toggleMutation.mutate(p.id)}
                        className="h-7 px-2.5 text-xs font-medium rounded-md border border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-50 transition-colors"
                      >
                        {p.isActive ? '비활성화' : '활성화'}
                      </button>
                      <button
                        onClick={() => {
                          if (!confirm(`"${p.name}" 말머리를 삭제하시겠습니까?`)) return
                          deleteMutation.mutate(p.id)
                        }}
                        className="h-7 px-2.5 text-xs font-medium rounded-md border border-red-200 bg-white text-red-600 hover:bg-red-50 transition-colors"
                      >
                        삭제
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <PrefixForm
          initial={editItem}
          boardType={boardType}
          onClose={() => { setShowForm(false); setEditItem(null) }}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}

function PrefixForm({
  initial,
  boardType,
  onClose,
  onSaved,
}: {
  initial: PostPrefixAdmin | null
  boardType: BoardType
  onClose: () => void
  onSaved: () => void
}) {
  const [name,      setName]      = useState(initial?.name ?? '')
  const [colorHex,  setColorHex]  = useState(initial?.colorHex ?? '')
  const [sortOrder, setSortOrder] = useState(String(initial?.sortOrder ?? 0))

  const createMutation = useMutation({
    mutationFn: () => adminCommunityApi.createPrefix({
      boardType,
      name: name.trim(),
      colorHex: colorHex.trim() || undefined,
      sortOrder: Number(sortOrder),
    }),
    onSuccess: onSaved,
  })

  const updateMutation = useMutation({
    mutationFn: () => adminCommunityApi.updatePrefix(initial!.id, {
      name: name.trim(),
      colorHex: colorHex.trim() || undefined,
      sortOrder: Number(sortOrder),
    }),
    onSuccess: onSaved,
  })

  const isPending = createMutation.isPending || updateMutation.isPending

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    if (initial) updateMutation.mutate()
    else createMutation.mutate()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6 space-y-4"
      >
        <h2 className="text-base font-semibold text-neutral-900">
          {initial ? '말머리 수정' : '말머리 추가'}
        </h2>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">
              이름 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="일반, 이벤트, 질문..."
              maxLength={20}
              className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">
              색상 <span className="text-neutral-400 font-normal">(선택, 예: #f59e0b)</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={colorHex || '#000000'}
                onChange={(e) => setColorHex(e.target.value)}
                className="w-9 h-9 rounded border border-neutral-200 cursor-pointer p-0.5"
              />
              <input
                type="text"
                value={colorHex}
                onChange={(e) => setColorHex(e.target.value)}
                placeholder="#f59e0b"
                maxLength={7}
                className="flex-1 px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400 font-mono"
              />
              {colorHex && (
                <button
                  type="button"
                  onClick={() => setColorHex('')}
                  className="text-xs text-neutral-400 hover:text-neutral-600"
                >
                  초기화
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">정렬 순서</label>
            <input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              min={0}
              className="w-24 px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-neutral-200 text-sm font-medium text-neutral-600 rounded-lg hover:bg-neutral-50 transition-colors"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={isPending || !name.trim()}
            className="flex-1 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-40"
          >
            {isPending ? '저장 중...' : '저장'}
          </button>
        </div>
      </form>
    </div>
  )
}
