import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
import {
  useAdminFaqList,
  useDeleteFaq,
  useUpdateFaqActive,
  useUpdateFaqSortOrder,
} from '@/domain/faq/hooks/useFaq'
import type { AdminFaqListItem, FaqLanguage, FaqCategory } from '@/domain/faq/types/faq.types'
import Button from '@/shared/components/Button'
import Modal from '@/shared/components/Modal'
import { useToast } from '@/shared/hooks/useToast'
import Toast from '@/shared/components/Toast'

const LANG_TABS: { label: string; value: FaqLanguage }[] = [
  { label: '국문 (KO)', value: 'KO' },
  { label: '영문 (EN)', value: 'EN' },
]

const CATEGORY_ORDER: FaqCategory[] = ['SERVICE', 'WHISKY', 'COGNAC', 'WINE']

const CATEGORY_LABELS: Record<FaqCategory, string> = {
  SERVICE: 'CaskByCask 이용 안내',
  WHISKY: '위스키',
  COGNAC: '꼬냑',
  WINE: '와인',
}

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

interface RowProps {
  item: AdminFaqListItem
  order: number
  active: boolean
  onEdit: (id: number) => void
  onDelete: (item: AdminFaqListItem) => void
  onToggleActive: (item: AdminFaqListItem) => void
}

function SortableFaqRow({ item, order, active, onEdit, onDelete, onToggleActive }: RowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: String(item.id),
  })
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
    backgroundColor: isDragging ? '#f9fafb' : undefined,
  }
  return (
    <tr ref={setNodeRef} style={style} className="border-b border-neutral-50 hover:bg-neutral-50 transition-colors">
      <td className="px-3 py-3 w-10">
        <DragHandle {...attributes} {...listeners} />
      </td>
      <td className="px-2 py-3 w-16 text-center">
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-md
          bg-primary-50 text-primary-800 text-xs font-semibold tabular-nums">
          {order}
        </span>
      </td>
      <td className="px-4 py-3 font-medium text-neutral-800">
        <button
          type="button"
          onClick={() => onEdit(item.id)}
          className="text-left line-clamp-1 hover:text-primary-800 hover:underline transition-colors"
        >
          {item.question}
        </button>
      </td>
      <td className="px-4 py-3 w-20">
        <button
          type="button"
          role="switch"
          aria-checked={active}
          onClick={() => onToggleActive(item)}
          className={[
            'relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full',
            'border-2 border-transparent transition-colors duration-200',
            active ? 'bg-primary-800' : 'bg-neutral-300',
          ].join(' ')}
        >
          <span className={[
            'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow',
            'transform transition-transform duration-200',
            active ? 'translate-x-4' : 'translate-x-0',
          ].join(' ')} />
        </button>
      </td>
      <td className="px-4 py-3 text-neutral-400 text-xs whitespace-nowrap w-28">
        {new Date(item.createdAt).toLocaleDateString('ko-KR')}
      </td>
      <td className="px-4 py-3 w-28">
        <div className="flex items-center gap-1 justify-end">
          <button
            type="button"
            onClick={() => onEdit(item.id)}
            className="inline-flex items-center h-7 px-2.5 text-xs font-medium whitespace-nowrap
              rounded-md border border-neutral-300 bg-white text-neutral-600
              hover:bg-neutral-50 transition-colors"
          >
            수정
          </button>
          <button
            type="button"
            onClick={() => onDelete(item)}
            className="inline-flex items-center h-7 px-2.5 text-xs font-medium whitespace-nowrap
              rounded-md border border-red-200 bg-white text-red-600
              hover:bg-red-50 transition-colors"
          >
            삭제
          </button>
        </div>
      </td>
    </tr>
  )
}

interface SectionProps {
  category: FaqCategory
  items: AdminFaqListItem[]
  localActive: Record<number, boolean>
  onEdit: (id: number) => void
  onDelete: (item: AdminFaqListItem) => void
  onToggleActive: (item: AdminFaqListItem) => void
  showToast: ReturnType<typeof useToast>['showToast']
}

function CategorySection({
  category,
  items,
  localActive,
  onEdit,
  onDelete,
  onToggleActive,
  showToast,
}: SectionProps) {
  const sortOrderMutation = useUpdateFaqSortOrder()

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  // items 는 부모에서 useMemo 로 메모이즈된 안정 참조 → 드래그 중 리셋되지 않음.
  const [ordered, setOrdered] = useState<AdminFaqListItem[]>(items)
  const [isDirty, setIsDirty] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [syncedRef, setSyncedRef] = useState(items)

  // 서버 데이터 변경(생성/삭제/저장 후 invalidate) 시 동기화.
  if (syncedRef !== items) {
    setSyncedRef(items)
    setOrdered(items)
    setIsDirty(false)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setOrdered((arr) => {
      const oldIndex = arr.findIndex((i) => String(i.id) === active.id)
      const newIndex = arr.findIndex((i) => String(i.id) === over.id)
      setIsDirty(true)
      return arrayMove(arr, oldIndex, newIndex)
    })
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const updates = ordered
        .map((item, index) => ({ id: item.id, sortOrder: index + 1 }))
        .filter((u) => items.find((x) => x.id === u.id)?.sortOrder !== u.sortOrder)
      await Promise.all(updates.map((u) => sortOrderMutation.mutateAsync(u)))
      showToast('순서가 저장되었습니다.', 'success')
      setIsDirty(false)
    } catch {
      showToast('순서 저장 중 오류가 발생했습니다.', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-neutral-700 flex items-center gap-2">
            <span className="w-1 h-4 rounded-full bg-primary-800 inline-block" />
            {CATEGORY_LABELS[category]}
          </h2>
          <span className="text-xs text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded-full">
            {ordered.length}건
          </span>
          {ordered.length > 1 && (
            <span className="text-xs text-neutral-400">· 드래그로 순서 변경</span>
          )}
        </div>
        {isDirty && (
          <Button variant="primary" isLoading={isSaving} onClick={handleSave}>
            순서 저장
          </Button>
        )}
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100 bg-neutral-50">
                <th className="w-10 px-3 py-3" />
                <th className="text-center px-2 py-3 font-medium text-neutral-500 w-16 whitespace-nowrap">순서</th>
                <th className="text-left px-4 py-3 font-medium text-neutral-500">질문</th>
                <th className="text-left px-4 py-3 font-medium text-neutral-500 w-20">노출</th>
                <th className="text-left px-4 py-3 font-medium text-neutral-500 w-28">등록일</th>
                <th className="px-4 py-3 w-28" />
              </tr>
            </thead>
            <tbody>
              {ordered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-neutral-400 text-sm">
                    등록된 FAQ가 없습니다.
                  </td>
                </tr>
              ) : (
                <SortableContext
                  items={ordered.map((i) => String(i.id))}
                  strategy={verticalListSortingStrategy}
                >
                  {ordered.map((item, index) => (
                    <SortableFaqRow
                      key={item.id}
                      item={item}
                      order={index + 1}
                      active={localActive[item.id] ?? item.isActive}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      onToggleActive={onToggleActive}
                    />
                  ))}
                </SortableContext>
              )}
            </tbody>
          </table>
        </div>
      </DndContext>
    </div>
  )
}

export default function AdminFaqPage() {
  const navigate = useNavigate()
  const { toasts, showToast, removeToast } = useToast()

  const [langFilter, setLangFilter] = useState<FaqLanguage>('KO')
  const [deleteTarget, setDeleteTarget] = useState<AdminFaqListItem | null>(null)
  const [localActive, setLocalActive] = useState<Record<number, boolean>>({})

  const { data: rawData, isLoading } = useAdminFaqList(langFilter)
  const deleteMutation = useDeleteFaq()
  const activeMutation = useUpdateFaqActive()

  // 카테고리별로 그룹핑 (백엔드에서 이미 sortOrder 오름차순 정렬됨).
  const grouped = useMemo(() => {
    const map: Record<FaqCategory, AdminFaqListItem[]> = {
      SERVICE: [], WHISKY: [], COGNAC: [], WINE: [],
    }
    ;(rawData ?? []).forEach((item) => { map[item.category]?.push(item) })
    return map
  }, [rawData])

  const total = rawData?.length ?? 0

  const handleToggleActive = async (item: AdminFaqListItem) => {
    const next = !(localActive[item.id] ?? item.isActive)
    setLocalActive((m) => ({ ...m, [item.id]: next }))
    try {
      await activeMutation.mutateAsync({ id: item.id, isActive: next })
    } catch {
      setLocalActive((m) => ({ ...m, [item.id]: !next }))
      showToast('상태 변경에 실패했습니다.', 'error')
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteMutation.mutateAsync(deleteTarget.id)
      showToast('삭제되었습니다.', 'success')
    } catch {
      showToast('삭제에 실패했습니다.', 'error')
    } finally {
      setDeleteTarget(null)
    }
  }

  return (
    <div className="p-8">
      <Toast toasts={toasts} onRemove={removeToast} />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-neutral-900">FAQ 관리</h1>
          <p className="text-sm text-neutral-500 mt-0.5">{LANG_TABS.find((t) => t.value === langFilter)?.label} · 총 {total}건</p>
        </div>
        <Button onClick={() => navigate('/admin/faq/new')}>+ FAQ 등록</Button>
      </div>

      {/* 언어 필터 */}
      <div className="flex gap-1 mb-6">
        <div className="flex rounded-lg border border-neutral-300 overflow-hidden">
          {LANG_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setLangFilter(tab.value)}
              className={`h-9 px-4 text-sm font-medium transition-colors ${
                langFilter === tab.value
                  ? 'bg-primary-800 text-white'
                  : 'bg-white text-neutral-600 hover:bg-neutral-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-neutral-400 text-sm">
          불러오는 중...
        </div>
      ) : (
        <div className="space-y-8">
          {CATEGORY_ORDER.map((category) => (
            <CategorySection
              key={`${langFilter}-${category}`}
              category={category}
              items={grouped[category]}
              localActive={localActive}
              onEdit={(id) => navigate(`/admin/faq/${id}/edit`)}
              onDelete={setDeleteTarget}
              onToggleActive={handleToggleActive}
              showToast={showToast}
            />
          ))}
        </div>
      )}

      <Modal
        open={deleteTarget != null}
        onClose={() => setDeleteTarget(null)}
        title="FAQ 삭제"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>취소</Button>
            <Button variant="danger" isLoading={deleteMutation.isPending} onClick={handleDelete}>
              삭제
            </Button>
          </>
        }
      >
        <p className="text-sm text-neutral-700">
          이 FAQ 항목을 삭제하시겠습니까?
          <br />
          <span className="text-neutral-500 text-xs mt-1 block line-clamp-2">
            {deleteTarget?.question}
          </span>
        </p>
      </Modal>
    </div>
  )
}
