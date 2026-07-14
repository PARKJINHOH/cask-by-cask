import { useState, useEffect } from 'react'
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
  useAdminPopupList,
  useAdminPopupDetail,
  useDeletePopup,
  useUpdateVisibility,
  useUpdateSortOrder,
} from '@/domain/popup/hooks/useAdminPopups'
import PopupPreviewModal from '@/domain/popup/components/PopupPreviewModal'
import type { AdminPopupListItem, PopupLanguage, PopupPreviewData } from '@/domain/popup/types/popup.types'
import Button from '@/shared/components/Button'
import Modal from '@/shared/components/Modal'
import { useToast } from '@/shared/hooks/useToast'
import Toast from '@/shared/components/Toast'

type LangFilter = 'ALL' | PopupLanguage

const LANG_TABS: { label: string; value: LangFilter }[] = [
  { label: '전체', value: 'ALL' },
  { label: 'KO', value: 'KO' },
  { label: 'EN', value: 'EN' },
]

function formatDt(dt: string) {
  return new Date(dt).toLocaleString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).replace(/\. /g, '-').replace('.', '').replace(',', '')
}

function PeriodCell({ item }: { item: AdminPopupListItem }) {
  if (item.isAlwaysVisible) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
        상시 노출
      </span>
    )
  }
  if (!item.startAt && !item.endAt) return <span className="text-neutral-300">—</span>
  const isExpired = item.endAt && new Date(item.endAt) < new Date()
  const isScheduled = item.startAt && new Date(item.startAt) > new Date()
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-neutral-600 whitespace-nowrap">
        {item.startAt ? formatDt(item.startAt) : '—'} ~ {item.endAt ? formatDt(item.endAt) : '계속'}
      </p>
      {isExpired && (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-600">
          만료
        </span>
      )}
      {isScheduled && (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
          예약
        </span>
      )}
    </div>
  )
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
  popup: AdminPopupListItem
  localVisibility: Record<number, boolean>
  onToggleVisibility: (id: number) => void
  onEdit: (id: number) => void
  onPreview: (popup: AdminPopupListItem) => void
  onDelete: (popup: AdminPopupListItem) => void
  draggable?: boolean
}

function SortableRow({ popup, localVisibility, onToggleVisibility, onEdit, onPreview, onDelete }: RowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: String(popup.id),
  })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: isDragging ? 'relative' : undefined,
    zIndex: isDragging ? 10 : undefined,
    backgroundColor: isDragging ? '#f9fafb' : undefined,
  }

  return (
    <tr ref={setNodeRef} style={style} className="border-b border-neutral-50 hover:bg-neutral-50 transition-colors">
      <td className="px-3 py-3 w-10">
        <DragHandle {...attributes} {...listeners} />
      </td>
      <PopupRowCells
        popup={popup}
        localVisibility={localVisibility}
        onToggleVisibility={onToggleVisibility}
        onEdit={onEdit}
        onPreview={onPreview}
        onDelete={onDelete}
      />
    </tr>
  )
}

function StaticRow({ popup, localVisibility, onToggleVisibility, onEdit, onPreview, onDelete }: RowProps) {
  return (
    <tr className="border-b border-neutral-50 hover:bg-neutral-50 transition-colors">
      <td className="px-3 py-3 w-10">
        <span className="block w-4 h-4" />
      </td>
      <PopupRowCells
        popup={popup}
        localVisibility={localVisibility}
        onToggleVisibility={onToggleVisibility}
        onEdit={onEdit}
        onPreview={onPreview}
        onDelete={onDelete}
      />
    </tr>
  )
}

function PopupRowCells({ popup, localVisibility, onToggleVisibility, onEdit, onPreview, onDelete }: RowProps) {
  const visible = localVisibility[popup.id] ?? popup.isVisible
  return (
    <>
      {/* 언어 */}
      <td className="px-4 py-3 w-16 text-neutral-500 font-medium">{popup.language}</td>

      {/* 관리자 제목 — 클릭 시 수정 이동 */}
      <td className="px-4 py-3 font-medium text-neutral-800">
        <button
          type="button"
          onClick={() => onEdit(popup.id)}
          className="text-left line-clamp-1 hover:text-primary-800 hover:underline transition-colors"
        >
          {popup.adminTitle}
        </button>
      </td>

      {/* 타입 */}
      <td className="px-4 py-3 w-20">
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
          popup.popupType === 'IMAGE' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
        }`}>
          {popup.popupType === 'IMAGE' ? '이미지' : 'HTML'}
        </span>
      </td>

      {/* 노출 토글 */}
      <td className="px-4 py-3 w-20">
        <button
          type="button"
          role="switch"
          aria-checked={visible}
          onClick={() => onToggleVisibility(popup.id)}
          className={[
            'relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full',
            'border-2 border-transparent transition-colors duration-200',
            'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1',
            visible ? 'bg-primary-800' : 'bg-neutral-300',
          ].join(' ')}
        >
          <span
            className={[
              'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow',
              'transform transition-transform duration-200',
              visible ? 'translate-x-4' : 'translate-x-0',
            ].join(' ')}
          />
        </button>
      </td>

      {/* 게시기간 */}
      <td className="px-4 py-3 w-52">
        <PeriodCell item={popup} />
      </td>

      {/* 등록일 */}
      <td className="px-4 py-3 text-neutral-400 text-xs whitespace-nowrap w-28">
        {new Date(popup.createdAt).toLocaleDateString('ko-KR')}
      </td>

      {/* 액션 */}
      <td className="px-4 py-3 w-36">
        <div className="flex items-center gap-1 justify-end flex-nowrap">
          <button
            type="button"
            onClick={() => onEdit(popup.id)}
            className="inline-flex items-center gap-1 h-7 px-2.5 text-xs font-medium
              rounded-md border border-neutral-300 bg-white text-neutral-600
              hover:bg-neutral-50 hover:border-neutral-400 transition-colors whitespace-nowrap"
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            수정
          </button>
          <button
            type="button"
            onClick={() => onPreview(popup)}
            className="inline-flex items-center gap-1 h-7 px-2.5 text-xs font-medium
              rounded-md border border-neutral-300 bg-white text-neutral-600
              hover:bg-neutral-50 hover:border-neutral-400 transition-colors whitespace-nowrap"
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            미리보기
          </button>
          <button
            type="button"
            onClick={() => onDelete(popup)}
            className="inline-flex items-center gap-1 h-7 px-2.5 text-xs font-medium
              rounded-md border border-red-200 bg-white text-red-600
              hover:bg-red-50 hover:border-red-300 transition-colors whitespace-nowrap"
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6M14 11v6" />
            </svg>
            삭제
          </button>
        </div>
      </td>
    </>
  )
}

const TABLE_HEAD = (
  <thead>
    <tr className="border-b border-neutral-100 bg-neutral-50">
      <th className="w-10 px-3 py-3" />
      <th className="text-left px-4 py-3 font-medium text-neutral-500 w-16">언어</th>
      <th className="text-left px-4 py-3 font-medium text-neutral-500">관리자 제목</th>
      <th className="text-left px-4 py-3 font-medium text-neutral-500 w-20">타입</th>
      <th className="text-left px-4 py-3 font-medium text-neutral-500 w-20">노출</th>
      <th className="text-left px-4 py-3 font-medium text-neutral-500 w-52">게시기간</th>
      <th className="text-left px-4 py-3 font-medium text-neutral-500 w-28">등록일</th>
      <th className="px-4 py-3 w-36" />
    </tr>
  </thead>
)

export default function AdminPopupListPage() {
  const navigate = useNavigate()
  const { toasts, showToast, removeToast } = useToast()

  const [langFilter, setLangFilter] = useState<LangFilter>('ALL')
  const [deleteTarget, setDeleteTarget] = useState<AdminPopupListItem | null>(null)
  const [previewId, setPreviewId] = useState<number | null>(null)
  const [localVisibility, setLocalVisibility] = useState<Record<number, boolean>>({})
  const [orderedVisible, setOrderedVisible] = useState<AdminPopupListItem[]>([])
  const [isSortDirty, setIsSortDirty] = useState(false)
  const [isSavingSort, setIsSavingSort] = useState(false)

  const { data, isLoading } = useAdminPopupList({
    language: langFilter === 'ALL' ? undefined : langFilter,
    page: 0,
    size: 200,
  })

  const { data: previewDetail } = useAdminPopupDetail(previewId)

  const previewData: PopupPreviewData | null = previewDetail
    ? {
        popupType: previewDetail.popupType,
        content: previewDetail.contentSanitized ?? previewDetail.content,
        mainImageUrl: previewDetail.mainImage?.imageUrl ?? null,
        linkUrl: previewDetail.linkUrl,
        linkTargetBlank: previewDetail.linkTargetBlank,
        closeOnOverlay: previewDetail.closeOnOverlay,
      }
    : null

  const deleteMutation = useDeletePopup()
  const visibilityMutation = useUpdateVisibility()
  const sortOrderMutation = useUpdateSortOrder()

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  useEffect(() => {
    if (!data) return
    const visMap: Record<number, boolean> = {}
    data.content.forEach((p) => { visMap[p.id] = p.isVisible })
    setLocalVisibility(visMap)
    setOrderedVisible(
      data.content.filter((p) => p.isVisible).sort((a, b) => a.sortOrder - b.sortOrder),
    )
    setIsSortDirty(false)
  }, [data])

  const hiddenPopups = (data?.content ?? []).filter((p) => !p.isVisible)

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setOrderedVisible((items) => {
      const oldIndex = items.findIndex((i) => String(i.id) === active.id)
      const newIndex = items.findIndex((i) => String(i.id) === over.id)
      setIsSortDirty(true)
      return arrayMove(items, oldIndex, newIndex)
    })
  }

  const handleSaveSortOrder = async () => {
    setIsSavingSort(true)
    try {
      const updates = orderedVisible
        .map((item, index) => ({ id: item.id, sortOrder: index + 1 }))
        .filter((u) => data?.content.find((p) => p.id === u.id)?.sortOrder !== u.sortOrder)
      await Promise.all(
        updates.map((u) => sortOrderMutation.mutateAsync({ id: u.id, sortOrder: u.sortOrder })),
      )
      showToast('순서가 저장되었습니다.', 'success')
      setIsSortDirty(false)
    } catch {
      showToast('순서 저장 중 오류가 발생했습니다.', 'error')
    } finally {
      setIsSavingSort(false)
    }
  }

  const handleToggleVisibility = async (id: number) => {
    const prev = localVisibility[id] ?? false
    setLocalVisibility((m) => ({ ...m, [id]: !prev }))
    try {
      await visibilityMutation.mutateAsync({ id, isVisible: !prev })
    } catch {
      setLocalVisibility((m) => ({ ...m, [id]: prev }))
      showToast('노출 상태 변경 중 오류가 발생했습니다.', 'error')
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteMutation.mutateAsync(deleteTarget.id)
      showToast('팝업이 삭제되었습니다.', 'success')
    } catch {
      showToast('삭제 중 오류가 발생했습니다.', 'error')
    } finally {
      setDeleteTarget(null)
    }
  }

  const openPreview = (item: AdminPopupListItem) => {
    setPreviewId(item.id)
  }

  const commonRowProps = {
    localVisibility,
    onToggleVisibility: handleToggleVisibility,
    onEdit: (id: number) => navigate(`/admin/popups/${id}/edit`),
    onPreview: openPreview,
    onDelete: setDeleteTarget,
  }

  const totalCount = data?.totalElements ?? 0

  return (
    <div className="p-8">
      <Toast toasts={toasts} onRemove={removeToast} />

      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-neutral-900">팝업 관리</h1>
          <p className="text-sm text-neutral-500 mt-0.5">총 {totalCount}건</p>
        </div>
        <Button onClick={() => navigate('/admin/popups/new')}>+ 팝업 등록</Button>
      </div>

      {/* 언어 필터 */}
      <div className="flex flex-wrap gap-3 mb-6">
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
        <div className="space-y-6">

          {/* ── 현재 노출 중인 팝업 ── */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-neutral-700">현재 노출 중인 팝업</h2>
                <span className="text-xs text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded-full">
                  {orderedVisible.length}건
                </span>
                <span className="text-xs text-neutral-400">· 상단부터 순서대로 노출 · 드래그로 순서 변경</span>
              </div>
              {isSortDirty && (
                <Button
                  variant="primary"
                  isLoading={isSavingSort}
                  onClick={handleSaveSortOrder}
                >
                  순서 저장
                </Button>
              )}
            </div>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  {TABLE_HEAD}
                  <tbody>
                    {orderedVisible.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-10 text-center text-neutral-400">
                          노출 중인 팝업이 없습니다.
                        </td>
                      </tr>
                    ) : (
                      <SortableContext
                        items={orderedVisible.map((p) => String(p.id))}
                        strategy={verticalListSortingStrategy}
                      >
                        {orderedVisible.map((popup) => (
                          <SortableRow key={popup.id} popup={popup} {...commonRowProps} />
                        ))}
                      </SortableContext>
                    )}
                  </tbody>
                </table>
              </div>
            </DndContext>
          </div>

          {/* ── 팝업 대기 목록 ── */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-sm font-semibold text-neutral-700">팝업 대기 목록</h2>
              <span className="text-xs text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded-full">
                {hiddenPopups.length}건
              </span>
              <span className="text-xs text-neutral-400">· 노출 비활성 팝업</span>
            </div>

            <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                {TABLE_HEAD}
                <tbody>
                  {hiddenPopups.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center text-neutral-400">
                        대기 중인 팝업이 없습니다.
                      </td>
                    </tr>
                  ) : (
                    hiddenPopups.map((popup) => (
                      <StaticRow key={popup.id} popup={popup} {...commonRowProps} />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 삭제 확인 모달 */}
      <Modal
        open={deleteTarget != null}
        onClose={() => setDeleteTarget(null)}
        title="팝업 삭제"
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
          <span className="font-medium">"{deleteTarget?.adminTitle}"</span> 팝업을 삭제하시겠습니까?
          <br />
          <span className="text-neutral-500 text-xs mt-1 block">
            연결된 이미지도 함께 삭제되며 복구할 수 없습니다.
          </span>
        </p>
      </Modal>

      {/* 미리보기 모달 */}
      {previewData && (
        <PopupPreviewModal
          isOpen={previewId != null}
          onClose={() => setPreviewId(null)}
          popupData={previewData}
        />
      )}
    </div>
  )
}
