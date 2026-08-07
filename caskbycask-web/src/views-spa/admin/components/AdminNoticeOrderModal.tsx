import { useState, useEffect } from 'react'
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
import { useAdminNoticeList, useUpdateNoticeDisplayOrders } from '@/domain/notice/hooks/useAdminNotices'
import { NOTICE_CATEGORY_LABELS } from '@/domain/notice/types/notice.types'
import type { NoticeListItem } from '@/domain/notice/types/notice.types'
import Button from '@/shared/components/Button'
import Modal from '@/shared/components/Modal'

interface AdminNoticeOrderModalProps {
  open: boolean
  onClose: () => void
  showToast: (message: string, type: 'success' | 'error') => void
}

function SortableNoticeRow({ notice }: { notice: NoticeListItem }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: String(notice.id),
  })
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex select-none items-center justify-between rounded-xl border bg-white p-3 transition-colors ${
        isDragging
          ? 'border-primary-500 bg-primary-50/50 shadow-md'
          : 'border-neutral-200 hover:border-neutral-300 hover:shadow-sm'
      }`}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label="순서 변경"
          className="cursor-grab touch-none p-1 text-neutral-400 transition-colors hover:text-neutral-600 active:cursor-grabbing"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            {notice.isPinned && (
              <span className="inline-block whitespace-nowrap rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                고정
              </span>
            )}
            <span className="inline-block whitespace-nowrap rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-600">
              {NOTICE_CATEGORY_LABELS[notice.category]}
            </span>
            <span className="text-xs text-neutral-400">ID: {notice.id}</span>
          </div>
          <span className="truncate pr-4 text-sm font-semibold text-neutral-800">
            {notice.title}
          </span>
        </div>
      </div>
    </div>
  )
}

export default function AdminNoticeOrderModal({ open, onClose, showToast }: AdminNoticeOrderModalProps) {
  // 노출 중인 공지사항 조회 (페이지네이션 없이 100개 확보)
  const { data, isLoading } = useAdminNoticeList({
    isPublished: true,
    page: 0,
    size: 100,
  })

  const [items, setItems] = useState<NoticeListItem[]>([])

  const updateOrdersMutation = useUpdateNoticeDisplayOrders()

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  useEffect(() => {
    if (data?.content) {
      setItems(data.content)
    }
  }, [data])

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setItems((arr) => {
      const oldIndex = arr.findIndex((i) => String(i.id) === active.id)
      const newIndex = arr.findIndex((i) => String(i.id) === over.id)
      return arrayMove(arr, oldIndex, newIndex)
    })
  }

  // 변경된 순서 저장 — 배열 index 가 그대로 노출 순서가 된다(위가 먼저).
  const handleSave = async () => {
    try {
      const noticeIds = items.map((item) => item.id)
      await updateOrdersMutation.mutateAsync(noticeIds)
      showToast('노출 순서가 성공적으로 변경되었습니다.', 'success')
      onClose()
    } catch {
      showToast('순서 변경 중 오류가 발생했습니다.', 'error')
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="노출 공지 순서 변경"
      size="md"
      footer={
        <div className="flex w-full items-center justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            취소
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            isLoading={updateOrdersMutation.isPending}
            disabled={items.length === 0}
          >
            순서 저장
          </Button>
        </div>
      }
    >
      <div className="-mx-6 -my-4 flex h-[55vh] flex-col">
        {/* 설명 영역 */}
        <div className="border-b border-neutral-100 bg-neutral-50 px-6 py-3">
          <p className="text-xs leading-relaxed text-neutral-500">
            * 현재 노출(발행) 상태인 공지만 목록에 표시됩니다.
            <br />
            * 상단부터 순서대로 노출됩니다. 왼쪽 손잡이를 드래그해 순서를 바꾸세요.
            <br />
            * 상단 고정(고정 뱃지)된 공지는 고정되지 않은 공지보다 항상 상단에 노출됩니다.
          </p>
        </div>

        {/* 목록 영역 */}
        <div className="flex-1 space-y-2 overflow-y-auto px-6 py-4">
          {isLoading ? (
            <div className="flex h-full items-center justify-center text-sm text-neutral-400">
              불러오는 중...
            </div>
          ) : items.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-neutral-400">
              노출 중인 공지사항이 없습니다.
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext
                items={items.map((notice) => String(notice.id))}
                strategy={verticalListSortingStrategy}
              >
                {items.map((notice) => (
                  <SortableNoticeRow key={notice.id} notice={notice} />
                ))}
              </SortableContext>
            </DndContext>
          )}
        </div>
      </div>
    </Modal>
  )
}
