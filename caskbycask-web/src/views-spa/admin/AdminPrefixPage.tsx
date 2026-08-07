import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { adminCommunityApi } from '@/domain/admin/api/adminCommunityApi'
import type { PostPrefixAdmin } from '@/domain/admin/types/admin.types'
import type { BoardType } from '@/domain/community/types/community.types'
import Button from '@/shared/components/Button'
import Toast from '@/shared/components/Toast'
import { useToast } from '@/shared/hooks/useToast'
import { RequiredFieldsNotice, RequiredMark } from '@/shared/components/FormFieldLabel'

const BOARD_TABS: { value: BoardType; label: string }[] = [
  { value: 'NOTICE', label: '소식' },
  { value: 'FREE',   label: '자유게시판' },
]

function DragHandle(props: React.HTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className="cursor-grab active:cursor-grabbing text-neutral-300 hover:text-neutral-500 p-1 touch-none"
      aria-label="순서 변경"
    >
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="4" y1="8" x2="20" y2="8" strokeLinecap="round" />
        <line x1="4" y1="12" x2="20" y2="12" strokeLinecap="round" />
        <line x1="4" y1="16" x2="20" y2="16" strokeLinecap="round" />
      </svg>
    </button>
  )
}

interface PrefixRowProps {
  prefix: PostPrefixAdmin
  onEdit: (prefix: PostPrefixAdmin) => void
  onToggle: (id: number) => void
  onDelete: (prefix: PostPrefixAdmin) => void
}

function SortablePrefixRow({ prefix, onEdit, onToggle, onDelete }: PrefixRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: String(prefix.id),
  })
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
    backgroundColor: isDragging ? '#f9fafb' : undefined,
  }

  return (
    <tr ref={setNodeRef} style={style} className="hover:bg-neutral-50 transition-colors">
      <td className="px-3 py-3 w-10">
        <DragHandle {...attributes} {...listeners} />
      </td>
      <td className="px-4 py-3">
        <span
          className="inline-flex items-center px-3 py-1 rounded-full border text-sm font-medium"
          style={prefix.colorHex
            ? { color: prefix.colorHex, borderColor: prefix.colorHex, backgroundColor: `${prefix.colorHex}15` }
            : { color: '#374151', borderColor: '#d1d5db' }}
        >
          {prefix.name}
        </span>
      </td>
      <td className="px-4 py-3">
        {prefix.colorHex ? (
          <div className="flex items-center gap-2">
            <span
              className="w-5 h-5 rounded-full border border-neutral-200 flex-shrink-0"
              style={{ backgroundColor: prefix.colorHex }}
            />
            <span className="text-neutral-500 font-mono text-xs">{prefix.colorHex}</span>
          </div>
        ) : (
          <span className="text-neutral-300 text-xs">없음</span>
        )}
      </td>
      <td className="px-4 py-3">
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
          prefix.isActive ? 'bg-green-50 text-green-700' : 'bg-neutral-100 text-neutral-500'
        }`}>
          {prefix.isActive ? '활성' : '비활성'}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1 justify-end">
          <button
            onClick={() => onEdit(prefix)}
            className="h-7 px-2.5 text-xs font-medium rounded-md border border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-50 transition-colors"
          >
            수정
          </button>
          <button
            onClick={() => onToggle(prefix.id)}
            className="h-7 px-2.5 text-xs font-medium rounded-md border border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-50 transition-colors"
          >
            {prefix.isActive ? '비활성화' : '활성화'}
          </button>
          <button
            onClick={() => onDelete(prefix)}
            className="h-7 px-2.5 text-xs font-medium rounded-md border border-red-200 bg-white text-red-600 hover:bg-red-50 transition-colors"
          >
            삭제
          </button>
        </div>
      </td>
    </tr>
  )
}

export default function AdminPrefixPage() {
  const [boardType, setBoardType] = useState<BoardType>('NOTICE')
  const [showForm, setShowForm]   = useState(false)
  const [editItem, setEditItem]   = useState<PostPrefixAdmin | null>(null)
  const [ordered, setOrdered]     = useState<PostPrefixAdmin[]>([])
  const [isSortDirty, setIsSortDirty] = useState(false)
  const queryClient = useQueryClient()
  const { toasts, showToast, removeToast } = useToast()

  const { data, isLoading } = useQuery({
    queryKey: ['admin-prefixes', boardType],
    queryFn: () => adminCommunityApi.getPrefixes(boardType).then((r) => r.data.data ?? []),
  })

  // 서버 응답은 이미 sortOrder 오름차순 — 위에서 아래가 곧 노출 순서다.
  // data 를 그대로 의존성에 둔다(기본값 [] 을 쓰면 매 렌더 새 배열이라 effect 가 반복된다).
  useEffect(() => {
    if (!data) return
    setOrdered(data)
    setIsSortDirty(false)
  }, [data])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const reorderMutation = useMutation({
    mutationFn: (ids: number[]) => adminCommunityApi.reorderPrefixes(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-prefixes', boardType] })
      queryClient.invalidateQueries({ queryKey: ['post-prefixes', boardType] })
      showToast('순서가 저장되었습니다.', 'success')
      setIsSortDirty(false)
    },
    onError: () => showToast('순서 저장 중 오류가 발생했습니다.', 'error'),
  })

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setOrdered((items) => {
      const oldIndex = items.findIndex((i) => String(i.id) === active.id)
      const newIndex = items.findIndex((i) => String(i.id) === over.id)
      setIsSortDirty(true)
      return arrayMove(items, oldIndex, newIndex)
    })
  }

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
      <Toast toasts={toasts} onRemove={removeToast} />

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-neutral-900">말머리 관리</h1>
        <button
          onClick={() => { setEditItem(null); setShowForm(true) }}
          className="px-4 py-2 bg-primary-800 text-white text-sm font-medium rounded-lg hover:bg-primary-900 transition-colors"
        >
          + 말머리 추가
        </button>
      </div>

      {/* 인라인 폼 (추가/수정) */}
      {showForm && (
        <PrefixForm
          initial={editItem}
          boardType={boardType}
          onClose={() => { setShowForm(false); setEditItem(null) }}
          onSaved={handleSaved}
        />
      )}

      {/* 게시판 탭 */}
      <div className="flex gap-1 border-b border-neutral-200">
        {BOARD_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setBoardType(tab.value)}
            className={[
              'px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
              boardType === tab.value
                ? 'border-primary-800 text-primary-800'
                : 'border-transparent text-neutral-500 hover:text-neutral-700',
            ].join(' ')}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 목록 — 위에서 아래가 곧 노출 순서, 드래그로 변경 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded-full">
            {ordered.length}건
          </span>
          {ordered.length > 1 && (
            <span className="text-xs text-neutral-400">· 상단부터 순서대로 노출 · 드래그로 순서 변경</span>
          )}
        </div>
        {isSortDirty && (
          <Button
            variant="primary"
            isLoading={reorderMutation.isPending}
            onClick={() => reorderMutation.mutate(ordered.map((p) => p.id))}
          >
            순서 저장
          </Button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-neutral-400 text-sm">불러오는 중...</div>
        ) : ordered.length === 0 ? (
          <div className="py-16 text-center text-neutral-400 text-sm">말머리가 없습니다.</div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  <th className="w-10 px-3 py-3" />
                  <th className="text-left px-4 py-3 text-neutral-500 font-medium">이름</th>
                  <th className="text-left px-4 py-3 text-neutral-500 font-medium">색상</th>
                  <th className="text-left px-4 py-3 text-neutral-500 font-medium">상태</th>
                  <th className="text-right px-4 py-3 text-neutral-500 font-medium">액션</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                <SortableContext
                  items={ordered.map((p) => String(p.id))}
                  strategy={verticalListSortingStrategy}
                >
                  {ordered.map((p) => (
                    <SortablePrefixRow
                      key={p.id}
                      prefix={p}
                      onEdit={(item) => { setEditItem(item); setShowForm(true) }}
                      onToggle={(id) => toggleMutation.mutate(id)}
                      onDelete={(item) => {
                        if (!confirm(`"${item.name}" 말머리를 삭제하시겠습니까?`)) return
                        deleteMutation.mutate(item.id)
                      }}
                    />
                  ))}
                </SortableContext>
              </tbody>
            </table>
          </DndContext>
        )}
      </div>
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
  const [name,     setName]     = useState(initial?.name ?? '')
  const [colorHex, setColorHex] = useState(initial?.colorHex ?? '')

  // 순서 입력은 없다 — 신규는 목록 맨 아래에 붙고, 변경은 목록에서 드래그로 한다.
  const createMutation = useMutation({
    mutationFn: () => adminCommunityApi.createPrefix({
      boardType,
      name: name.trim(),
      colorHex: colorHex.trim() || undefined,
    }),
    onSuccess: onSaved,
  })

  const updateMutation = useMutation({
    mutationFn: () => adminCommunityApi.updatePrefix(initial!.id, {
      name: name.trim(),
      colorHex: colorHex.trim() || undefined,
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
    <form
      onSubmit={handleSubmit}
      className={`bg-white rounded-xl shadow-sm p-5 space-y-4 max-w-lg border ${initial ? 'border-amber-100' : 'border-primary-100'}`}
    >
      <h2 className="text-sm font-semibold text-neutral-700">
        {initial ? '말머리 수정' : '말머리 추가'}
      </h2>
      <RequiredFieldsNotice admin />

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">
              이름 <RequiredMark />
            </label>
            <input
              type="text"
              required
              aria-required="true"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="일반, 이벤트, 질문..."
              maxLength={20}
              className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400"
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
                className="w-9 h-9 rounded border border-neutral-300 cursor-pointer p-0.5"
              />
              <input
                type="text"
                value={colorHex}
                onChange={(e) => setColorHex(e.target.value)}
                placeholder="#f59e0b"
                maxLength={7}
                className="flex-1 px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400 font-mono"
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

        </div>

        {!initial && (
          <p className="text-xs text-neutral-400">
            새 말머리는 목록 맨 아래에 추가됩니다. 순서는 목록에서 드래그로 변경하세요.
          </p>
        )}

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
            className="flex-1 px-4 py-2 bg-primary-800 text-white text-sm font-medium rounded-lg hover:bg-primary-900 transition-colors disabled:opacity-40"
          >
            {isPending ? '저장 중...' : '저장'}
          </button>
        </div>
    </form>
  )
}
