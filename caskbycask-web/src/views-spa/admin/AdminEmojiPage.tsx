import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { adminCommunityApi } from '@/domain/admin/api/adminCommunityApi'
import type { EmojiAdmin, EmojiGroup } from '@/domain/admin/types/admin.types'
import Spinner from '@/shared/components/Spinner'
import { RequiredFieldsNotice, RequiredMark } from '@/shared/components/FormFieldLabel'

const UNGROUPED_ID = null

export default function AdminEmojiPage() {
  const [selectedGroupId, setSelectedGroupId] = useState<number | null | 'all'>('all')
  const [showEmojiForm, setShowEmojiForm]     = useState(false)
  const [editEmoji, setEditEmoji]             = useState<EmojiAdmin | null>(null)
  const [showGroupForm, setShowGroupForm]     = useState(false)
  const [editGroup, setEditGroup]             = useState<EmojiGroup | null>(null)
  const queryClient = useQueryClient()

  const { data: groups = [], isLoading: groupsLoading } = useQuery({
    queryKey: ['admin-emoji-groups'],
    queryFn: () => adminCommunityApi.getEmojiGroups().then((r) => r.data.data ?? []),
  })

  const emojiQueryKey = ['admin-emojis-by-group', selectedGroupId]
  const { data: emojis = [], isLoading: emojisLoading } = useQuery({
    queryKey: emojiQueryKey,
    queryFn: () => selectedGroupId === 'all'
      ? adminCommunityApi.getEmojis({ size: 200 }).then((r) => r.data.data?.content ?? [])
      : adminCommunityApi.getEmojisByGroup(selectedGroupId).then((r) => r.data.data ?? []),
  })

  const [localEmojis, setLocalEmojis] = useState<EmojiAdmin[]>([])
  const displayEmojis = localEmojis.length > 0 ? localEmojis : emojis

  // 데이터 로드 시 localEmojis 초기화
  const prevEmojiKey = useRef<string>('')
  const currentKey = JSON.stringify(emojiQueryKey)
  if (prevEmojiKey.current !== currentKey) {
    prevEmojiKey.current = currentKey
    if (localEmojis.length > 0) setLocalEmojis([])
  }

  const deleteMutation = useMutation({
    mutationFn: (id: number) => adminCommunityApi.deleteEmoji(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-emojis-by-group'] })
      setLocalEmojis([])
    },
  })

  const toggleMutation = useMutation({
    mutationFn: (id: number) => adminCommunityApi.toggleEmoji(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-emojis-by-group'] })
      setLocalEmojis([])
    },
  })

  const reorderMutation = useMutation({
    mutationFn: (ids: number[]) => adminCommunityApi.reorderEmojis(ids),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-emojis-by-group'] }),
  })

  const deleteGroupMutation = useMutation({
    mutationFn: (id: number) => adminCommunityApi.deleteEmojiGroup(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-emoji-groups'] }),
    onError: () => alert('그룹에 속한 이모지가 있어 삭제할 수 없습니다.'),
  })

  const sensors = useSensors(useSensor(PointerSensor))

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const base = localEmojis.length > 0 ? localEmojis : emojis
    const oldIdx = base.findIndex((e) => e.id === active.id)
    const newIdx = base.findIndex((e) => e.id === over.id)
    const reordered = arrayMove(base, oldIdx, newIdx)
    setLocalEmojis(reordered)
    reorderMutation.mutate(reordered.map((e) => e.id))
  }

  const handleSaved = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-emojis-by-group'] })
    queryClient.invalidateQueries({ queryKey: ['admin-emoji-groups'] })
    setLocalEmojis([])
    setShowEmojiForm(false)
    setEditEmoji(null)
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-neutral-900">이모지 관리</h1>
        <button
          onClick={() => { setEditEmoji(null); setShowEmojiForm(true) }}
          className="px-4 py-2 bg-primary-800 text-white text-sm font-medium rounded-lg hover:bg-primary-900 transition-colors"
        >
          + 이모지 추가
        </button>
      </div>

      {/* 이모지 인라인 폼 (추가/수정) */}
      {showEmojiForm && (
        <EmojiForm
          initial={editEmoji}
          groups={groups}
          defaultGroupId={typeof selectedGroupId === 'number' ? selectedGroupId : null}
          onClose={() => { setShowEmojiForm(false); setEditEmoji(null) }}
          onSaved={handleSaved}
        />
      )}

      {/* 그룹 관리 섹션 */}
      <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-700">이모지 그룹</h2>
          <button
            onClick={() => { setEditGroup(null); setShowGroupForm(true) }}
            className="text-xs px-3 py-1.5 border border-primary-300 text-primary-800 rounded-lg
              hover:bg-primary-50 transition-colors font-medium"
          >
            + 그룹 추가
          </button>
        </div>

        {groupsLoading ? (
          <div className="flex justify-center py-4"><Spinner size="sm" className="text-primary-800" /></div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedGroupId('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                selectedGroupId === 'all'
                  ? 'bg-primary-800 text-white'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              전체
            </button>
            <button
              onClick={() => setSelectedGroupId(UNGROUPED_ID)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                selectedGroupId === UNGROUPED_ID
                  ? 'bg-primary-800 text-white'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              그룹 없음
            </button>
            {groups.map((group) => (
              <div key={group.id} className="relative group/grp flex items-center gap-1">
                <button
                  onClick={() => setSelectedGroupId(group.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    selectedGroupId === group.id
                      ? 'bg-primary-800 text-white'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  {group.name}
                </button>
                <div className="hidden group-hover/grp:flex items-center gap-0.5">
                  <button
                    onClick={() => { setEditGroup(group); setShowGroupForm(true) }}
                    className="inline-flex items-center h-6 px-2 text-[10px] font-medium
                      rounded border border-neutral-300 bg-white text-neutral-600
                      hover:bg-neutral-50 transition-colors whitespace-nowrap"
                  >
                    수정
                  </button>
                  <button
                    onClick={() => {
                      if (!confirm(`"${group.name}" 그룹을 삭제하시겠습니까?\n(그룹 내 이모지가 없어야 합니다)`)) return
                      deleteGroupMutation.mutate(group.id)
                    }}
                    className="inline-flex items-center h-6 px-2 text-[10px] font-medium
                      rounded border border-red-200 bg-white text-red-600
                      hover:bg-red-50 transition-colors whitespace-nowrap"
                  >
                    삭제
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 그룹 인라인 폼 (추가/수정) */}
        {showGroupForm && (
          <GroupForm
            initial={editGroup}
            onClose={() => { setShowGroupForm(false); setEditGroup(null) }}
            onSaved={() => {
              queryClient.invalidateQueries({ queryKey: ['admin-emoji-groups'] })
              setShowGroupForm(false)
              setEditGroup(null)
            }}
          />
        )}
      </div>

      {/* 이모지 목록 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-neutral-100 flex items-center justify-between">
          <span className="text-xs text-neutral-500 font-medium">
            {selectedGroupId === 'all'
              ? '전체 이모지'
              : selectedGroupId === null
              ? '그룹 없는 이모지'
              : `${groups.find((g) => g.id === selectedGroupId)?.name ?? ''} 그룹`}
            {' '}· {displayEmojis.length}개
          </span>
          {selectedGroupId !== 'all' && (
            <span className="text-[10px] text-neutral-400">드래그하여 순서 변경</span>
          )}
        </div>

        {emojisLoading ? (
          <div className="flex justify-center py-16">
            <Spinner size="lg" className="text-primary-800" />
          </div>
        ) : displayEmojis.length === 0 ? (
          <div className="py-14 text-center text-neutral-400 text-sm">이모지가 없습니다.</div>
        ) : selectedGroupId === 'all' ? (
          // 전체 보기: 일반 테이블 (DnD 없음)
          <EmojiTable
            emojis={displayEmojis}
            onEdit={(e) => { setEditEmoji(e); setShowEmojiForm(true) }}
            onToggle={(id) => toggleMutation.mutate(id)}
            onDelete={(id, label) => {
              if (!confirm(`"${label}" 이모지를 삭제하시겠습니까?`)) return
              deleteMutation.mutate(id)
            }}
          />
        ) : (
          // 그룹별 보기: DnD 테이블
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={displayEmojis.map((e) => e.id)} strategy={verticalListSortingStrategy}>
              <table className="w-full text-sm">
                <thead className="bg-neutral-50 border-b border-neutral-200">
                  <tr>
                    <th className="w-8 px-3 py-3" />
                    <th className="text-left px-4 py-3 text-neutral-500 font-medium">미리보기</th>
                    <th className="text-left px-4 py-3 text-neutral-500 font-medium">레이블</th>
                    <th className="text-left px-4 py-3 text-neutral-500 font-medium">코드</th>
                    <th className="text-left px-4 py-3 text-neutral-500 font-medium">상태</th>
                    <th className="text-right px-4 py-3 text-neutral-500 font-medium">액션</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {displayEmojis.map((emoji) => (
                    <SortableEmojiRow
                      key={emoji.id}
                      emoji={emoji}
                      onEdit={() => { setEditEmoji(emoji); setShowEmojiForm(true) }}
                      onToggle={() => toggleMutation.mutate(emoji.id)}
                      onDelete={() => {
                        if (!confirm(`"${emoji.label}" 이모지를 삭제하시겠습니까?`)) return
                        deleteMutation.mutate(emoji.id)
                      }}
                    />
                  ))}
                </tbody>
              </table>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  )
}

// ── 일반 테이블 (전체 보기용) ────────────────────────────────────

function EmojiTable({
  emojis,
  onEdit,
  onToggle,
  onDelete,
}: {
  emojis: EmojiAdmin[]
  onEdit: (e: EmojiAdmin) => void
  onToggle: (id: number) => void
  onDelete: (id: number, label: string) => void
}) {
  return (
    <table className="w-full text-sm">
      <thead className="bg-neutral-50 border-b border-neutral-200">
        <tr>
          <th className="text-left px-4 py-3 text-neutral-500 font-medium">미리보기</th>
          <th className="text-left px-4 py-3 text-neutral-500 font-medium">레이블</th>
          <th className="text-left px-4 py-3 text-neutral-500 font-medium">그룹</th>
          <th className="text-left px-4 py-3 text-neutral-500 font-medium">코드</th>
          <th className="text-left px-4 py-3 text-neutral-500 font-medium">상태</th>
          <th className="text-right px-4 py-3 text-neutral-500 font-medium">액션</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-neutral-100">
        {emojis.map((emoji) => (
          <tr key={emoji.id} className="hover:bg-neutral-50 transition-colors">
            <td className="px-4 py-3">
              <EmojiPreview emoji={emoji} />
            </td>
            <td className="max-w-[200px] px-4 py-3 font-medium text-neutral-900">{emoji.label}</td>
            <td className="px-4 py-3 text-neutral-500 text-xs">
              {emoji.groupName ?? <span className="text-neutral-300">없음</span>}
            </td>
            <td className="px-4 py-3 text-neutral-500 font-mono text-xs">{emoji.code}</td>
            <td className="px-4 py-3">
              <ActiveBadge active={emoji.isActive} />
            </td>
            <td className="px-4 py-3">
              <EmojiActions
                emoji={emoji}
                onEdit={() => onEdit(emoji)}
                onToggle={() => onToggle(emoji.id)}
                onDelete={() => onDelete(emoji.id, emoji.label)}
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ── 드래그 가능한 이모지 행 ──────────────────────────────────────

function SortableEmojiRow({
  emoji,
  onEdit,
  onToggle,
  onDelete,
}: {
  emoji: EmojiAdmin
  onEdit: () => void
  onToggle: () => void
  onDelete: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: emoji.id,
  })

  return (
    <tr
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`transition-colors ${isDragging ? 'bg-primary-50 opacity-75' : 'hover:bg-neutral-50'}`}
    >
      <td className="px-3 py-3 cursor-grab active:cursor-grabbing text-neutral-300 hover:text-neutral-500"
        {...attributes} {...listeners}>
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M7 2a2 2 0 110 4 2 2 0 010-4zm6 0a2 2 0 110 4 2 2 0 010-4zM7 8a2 2 0 110 4 2 2 0 010-4zm6 0a2 2 0 110 4 2 2 0 010-4zM7 14a2 2 0 110 4 2 2 0 010-4zm6 0a2 2 0 110 4 2 2 0 010-4z" />
        </svg>
      </td>
      <td className="px-4 py-3"><EmojiPreview emoji={emoji} /></td>
      <td className="max-w-[200px] px-4 py-3 font-medium text-neutral-900">{emoji.label}</td>
      <td className="px-4 py-3 text-neutral-500 font-mono text-xs">{emoji.code}</td>
      <td className="px-4 py-3"><ActiveBadge active={emoji.isActive} /></td>
      <td className="px-4 py-3">
        <EmojiActions emoji={emoji} onEdit={onEdit} onToggle={onToggle} onDelete={onDelete} />
      </td>
    </tr>
  )
}

// ── 공통 서브컴포넌트 ────────────────────────────────────────────

function EmojiPreview({ emoji }: { emoji: EmojiAdmin }) {
  if (emoji.unicode) return <span className="text-2xl">{emoji.unicode}</span>
  if (emoji.imageUrl) return <img src={emoji.imageUrl} alt={emoji.label} className="w-8 h-8 object-contain" />
  return <span className="text-neutral-300 text-xs">없음</span>
}

function ActiveBadge({ active }: { active: boolean }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
      active ? 'bg-green-50 text-green-700' : 'bg-neutral-100 text-neutral-500'
    }`}>
      {active ? '활성' : '비활성'}
    </span>
  )
}

function EmojiActions({
  emoji,
  onEdit,
  onToggle,
  onDelete,
}: {
  emoji: EmojiAdmin
  onEdit: () => void
  onToggle: () => void
  onDelete: () => void
}) {
  return (
    <div className="flex items-center gap-1 justify-end">
      <button
        onClick={onEdit}
        className="inline-flex items-center gap-1 h-7 px-2.5 text-xs font-medium
          rounded-md border border-neutral-300 bg-white text-neutral-600
          hover:bg-neutral-50 transition-colors whitespace-nowrap"
      >
        수정
      </button>
      <button
        onClick={onToggle}
        className="inline-flex items-center gap-1 h-7 px-2.5 text-xs font-medium
          rounded-md border border-neutral-300 bg-white text-neutral-600
          hover:bg-neutral-50 transition-colors whitespace-nowrap"
      >
        {emoji.isActive ? '비활성화' : '활성화'}
      </button>
      <button
        onClick={onDelete}
        className="inline-flex items-center gap-1 h-7 px-2.5 text-xs font-medium
          rounded-md border border-red-200 bg-white text-red-600
          hover:bg-red-50 transition-colors whitespace-nowrap"
      >
        삭제
      </button>
    </div>
  )
}

// ── 이모지 추가/수정 폼 모달 ─────────────────────────────────────

function EmojiForm({
  initial,
  groups,
  defaultGroupId,
  onClose,
  onSaved,
}: {
  initial: EmojiAdmin | null
  groups: EmojiGroup[]
  defaultGroupId: number | null
  onClose: () => void
  onSaved: () => void
}) {
  const [unicode,   setUnicode]   = useState(initial?.unicode ?? '')
  const [imageUrl,  setImageUrl]  = useState(initial?.imageUrl ?? '')
  const [label,     setLabel]     = useState(initial?.label ?? '')
  const [groupId,   setGroupId]   = useState<number | null>(initial?.groupId ?? defaultGroupId)
  const [uploading, setUploading] = useState(false)
  const [preview,   setPreview]   = useState<string | null>(initial?.imageUrl ?? null)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const res = await adminCommunityApi.uploadEmojiImage(file)
      const url = res.data.data?.imageUrl ?? ''
      setImageUrl(url)
      setPreview(url)
      setUnicode('')
    } catch {
      alert('이미지 업로드에 실패했습니다.')
    } finally {
      setUploading(false)
    }
  }

  const createMutation = useMutation({
    mutationFn: () =>
      adminCommunityApi.createEmoji({
        unicode: unicode || undefined,
        imageUrl: imageUrl || undefined,
        label,
        groupId: groupId ?? undefined,
      }),
    onSuccess: onSaved,
  })

  const updateMutation = useMutation({
    mutationFn: () =>
      adminCommunityApi.updateEmoji(initial!.id, {
        unicode: unicode || undefined,
        imageUrl: imageUrl || undefined,
        label,
        groupId,
      }),
    onSuccess: onSaved,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!label.trim()) return
    if (!unicode.trim() && !imageUrl.trim()) return
    if (initial) updateMutation.mutate()
    else createMutation.mutate()
  }

  const isPending = createMutation.isPending || updateMutation.isPending || uploading

  return (
    <form
      onSubmit={handleSubmit}
      className={`bg-white rounded-xl shadow-sm p-5 space-y-4 max-w-lg border ${initial ? 'border-amber-100' : 'border-primary-100'}`}
    >
        <h2 className="text-sm font-semibold text-neutral-700">
          {initial ? '이모지 수정' : '이모지 추가'}
        </h2>
        <RequiredFieldsNotice admin />

        <div className="space-y-3">
          {/* 레이블 */}
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">
              레이블 <RequiredMark />
            </label>
            <input
              type="text"
              required
              aria-required="true"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="좋아요, 웃음..."
              className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
          </div>

          {/* 그룹 */}
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">그룹</label>
            <select
              value={groupId ?? ''}
              onChange={(e) => setGroupId(e.target.value ? Number(e.target.value) : null)}
              className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white"
            >
              <option value="">그룹 없음</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>

          {/* 유니코드 */}
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">
              유니코드/이미지 <RequiredMark /> <span className="text-neutral-400 font-normal">(둘 중 하나)</span>
            </label>
            <input
              type="text"
              aria-required="true"
              value={unicode}
              onChange={(e) => { setUnicode(e.target.value); if (e.target.value) { setImageUrl(''); setPreview(null) } }}
              placeholder="👍"
              className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
          </div>

          {/* 이미지 업로드 */}
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">이미지 업로드</label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="px-3 py-2 text-xs border border-neutral-200 rounded-lg text-neutral-600 hover:bg-neutral-50 transition-colors disabled:opacity-40"
              >
                {uploading ? '업로드 중...' : '파일 선택'}
              </button>
              {preview && !unicode && (
                <div className="flex items-center gap-2">
                  <img src={preview} alt="preview" className="w-10 h-10 object-contain rounded border border-neutral-200" />
                  <button
                    type="button"
                    onClick={() => { setImageUrl(''); setPreview(null) }}
                    className="text-[10px] text-red-400 hover:text-red-600"
                  >
                    제거
                  </button>
                </div>
              )}
              <input
                ref={fileRef}
                type="file"
                aria-required="true"
                accept="image/jpeg,image/png,image/gif,image/webp"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
            <p className="text-[10px] text-neutral-400 mt-1">JPG, PNG, GIF, WEBP · 최대 10MB</p>
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
            disabled={isPending || !label.trim() || (!unicode.trim() && !imageUrl.trim())}
            className="flex-1 px-4 py-2 bg-primary-800 text-white text-sm font-medium rounded-lg hover:bg-primary-900 transition-colors disabled:opacity-40"
          >
            {isPending ? '저장 중...' : '저장'}
          </button>
        </div>
    </form>
  )
}

// ── 그룹 추가/수정 폼 모달 ──────────────────────────────────────

function GroupForm({
  initial,
  onClose,
  onSaved,
}: {
  initial: EmojiGroup | null
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState(initial?.name ?? '')

  const createMutation = useMutation({
    mutationFn: () => adminCommunityApi.createEmojiGroup(name),
    onSuccess: onSaved,
  })

  const updateMutation = useMutation({
    mutationFn: () => adminCommunityApi.updateEmojiGroup(initial!.id, name),
    onSuccess: onSaved,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    if (initial) updateMutation.mutate()
    else createMutation.mutate()
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <form
      onSubmit={handleSubmit}
      className={`rounded-lg p-4 space-y-4 max-w-sm border ${initial ? 'border-amber-200 bg-amber-50/40' : 'border-primary-200 bg-primary-50/40'}`}
    >
        <h2 className="text-sm font-semibold text-neutral-700">
          {initial ? '그룹 수정' : '그룹 추가'}
        </h2>
        <RequiredFieldsNotice admin />
        <div>
          <label className="block text-xs font-medium text-neutral-600 mb-1">
            그룹 이름 <RequiredMark />
          </label>
          <input
            type="text"
            required
            aria-required="true"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="네이버 이모지, 다음 이모지..."
            className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400"
            autoFocus
          />
        </div>
        <div className="flex gap-2">
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
