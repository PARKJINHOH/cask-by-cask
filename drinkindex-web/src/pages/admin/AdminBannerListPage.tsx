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
  useAdminBannerList,
  useDeleteBanner,
  useUpdateBannerVisibility,
  useUpdateBannerSortOrder,
} from '@/domain/banner/hooks/useAdminBanners'
import type { AdminBannerListItem, BannerLanguage } from '@/domain/banner/types/banner.types'
import Button from '@/shared/components/Button'
import Modal from '@/shared/components/Modal'
import { useToast } from '@/shared/hooks/useToast'
import Toast from '@/shared/components/Toast'

type LangFilter = 'ALL' | BannerLanguage

const LANG_TABS: { label: string; value: LangFilter }[] = [
  { label: '전체', value: 'ALL' },
  { label: 'KO', value: 'KO' },
  { label: 'EN', value: 'EN' },
]

function formatDt(dt: string) {
  return new Date(dt)
    .toLocaleString('ko-KR', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false,
    })
    .replace(/\. /g, '-').replace('.', '').replace(',', '')
}

function PeriodCell({ item }: { item: AdminBannerListItem }) {
  if (item.isAlwaysVisible) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
        상시 노출
      </span>
    )
  }
  if (!item.startAt && !item.endAt) return <span className="text-neutral-300">—</span>
  const isExpired = item.endAt && new Date(item.endAt) < new Date()
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-neutral-600 whitespace-nowrap">
        {item.startAt ? formatDt(item.startAt) : '—'} ~ {item.endAt ? formatDt(item.endAt) : '—'}
      </p>
      {isExpired && (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-600">
          만료
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

interface RowCellsProps {
  banner: AdminBannerListItem
  localVisibility: Record<number, boolean>
  onToggleVisibility: (id: number) => void
  onEdit: (id: number) => void
  onDelete: (banner: AdminBannerListItem) => void
  order?: number
}

function BannerRowCells({ banner, localVisibility, onToggleVisibility, onEdit, onDelete, order }: RowCellsProps) {
  const visible = localVisibility[banner.id] ?? banner.isVisible
  return (
    <>
      <td className="px-4 py-3 w-16 text-neutral-500 font-medium">{banner.language}</td>
      <td className="px-4 py-3 font-medium text-neutral-800">
        <button
          type="button"
          onClick={() => onEdit(banner.id)}
          className="text-left line-clamp-1 hover:text-primary-800 hover:underline transition-colors"
        >
          {banner.adminTitle}
        </button>
      </td>
      <td className="px-4 py-3 w-20">
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
          banner.bannerType === 'IMAGE' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
        }`}>
          {banner.bannerType === 'IMAGE' ? '이미지' : 'HTML'}
        </span>
      </td>
      <td className="px-4 py-3 w-20">
        <button
          type="button"
          role="switch"
          aria-checked={visible}
          onClick={() => onToggleVisibility(banner.id)}
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
      <td className="px-4 py-3 w-52">
        <PeriodCell item={banner} />
      </td>
      <td className="px-4 py-3 text-neutral-400 text-xs whitespace-nowrap w-28">
        {new Date(banner.createdAt).toLocaleDateString('ko-KR')}
      </td>
      <td className="px-4 py-3 w-20 text-center">
        {order != null ? (
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-md
            bg-primary-50 text-primary-800 text-xs font-semibold tabular-nums">
            {order}
          </span>
        ) : (
          <span className="text-neutral-300">—</span>
        )}
      </td>
      <td className="px-4 py-3 w-28">
        <div className="flex items-center gap-1 justify-end">
          <button
            type="button"
            onClick={() => onEdit(banner.id)}
            className="inline-flex items-center gap-1 h-7 px-2.5 text-xs font-medium
              rounded-md border border-neutral-300 bg-white text-neutral-600
              hover:bg-neutral-50 transition-colors whitespace-nowrap"
          >
            수정
          </button>
          <button
            type="button"
            onClick={() => onDelete(banner)}
            className="inline-flex items-center gap-1 h-7 px-2.5 text-xs font-medium
              rounded-md border border-red-200 bg-white text-red-600
              hover:bg-red-50 transition-colors whitespace-nowrap"
          >
            삭제
          </button>
        </div>
      </td>
    </>
  )
}

function SortableRow({ banner, ...props }: RowCellsProps & { banner: AdminBannerListItem }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: String(banner.id),
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
      <BannerRowCells banner={banner} {...props} />
    </tr>
  )
}

function StaticRow({ banner, ...props }: RowCellsProps & { banner: AdminBannerListItem }) {
  return (
    <tr className="border-b border-neutral-50 hover:bg-neutral-50 transition-colors">
      <td className="px-3 py-3 w-10"><span className="block w-4 h-4" /></td>
      <BannerRowCells banner={banner} {...props} />
    </tr>
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
      <th className="text-center px-4 py-3 font-medium text-neutral-500 w-20">노출 순서</th>
      <th className="px-4 py-3 w-28" />
    </tr>
  </thead>
)

export default function AdminBannerListPage() {
  const navigate = useNavigate()
  const { toasts, showToast, removeToast } = useToast()

  const [langFilter, setLangFilter] = useState<LangFilter>('ALL')
  const [deleteTarget, setDeleteTarget] = useState<AdminBannerListItem | null>(null)
  const [localVisibility, setLocalVisibility] = useState<Record<number, boolean>>({})
  const [orderedVisible, setOrderedVisible] = useState<AdminBannerListItem[]>([])
  const [isSortDirty, setIsSortDirty] = useState(false)
  const [isSavingSort, setIsSavingSort] = useState(false)

  const { data, isLoading } = useAdminBannerList({
    language: langFilter === 'ALL' ? undefined : langFilter,
    page: 0,
    size: 200,
  })

  const deleteMutation = useDeleteBanner()
  const visibilityMutation = useUpdateBannerVisibility()
  const sortOrderMutation = useUpdateBannerSortOrder()

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  useEffect(() => {
    if (!data) return
    const visMap: Record<number, boolean> = {}
    data.content.forEach((b) => { visMap[b.id] = b.isVisible })
    setLocalVisibility(visMap)
    setOrderedVisible(
      data.content.filter((b) => b.isVisible).sort((a, b) => a.sortOrder - b.sortOrder),
    )
    setIsSortDirty(false)
  }, [data])

  const hiddenBanners = (data?.content ?? []).filter((b) => !b.isVisible)

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
        .filter((u) => data?.content.find((b) => b.id === u.id)?.sortOrder !== u.sortOrder)
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
      showToast('배너가 삭제되었습니다.', 'success')
    } catch {
      showToast('삭제 중 오류가 발생했습니다.', 'error')
    } finally {
      setDeleteTarget(null)
    }
  }

  const commonRowProps = {
    localVisibility,
    onToggleVisibility: handleToggleVisibility,
    onEdit: (id: number) => navigate(`/admin/banners/${id}/edit`),
    onDelete: setDeleteTarget,
  }

  return (
    <div className="p-8">
      <Toast toasts={toasts} onRemove={removeToast} />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-neutral-900">배너 관리</h1>
          <p className="text-sm text-neutral-500 mt-0.5">총 {data?.totalElements ?? 0}건</p>
        </div>
        <Button onClick={() => navigate('/admin/banners/new')}>+ 배너 등록</Button>
      </div>

      <div className="flex gap-3 mb-6">
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
          {/* 노출 중인 배너 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-neutral-700">현재 노출 중인 배너</h2>
                <span className="text-xs text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded-full">
                  {orderedVisible.length}건
                </span>
                <span className="text-xs text-neutral-400">· 드래그로 순서 변경</span>
              </div>
              {isSortDirty && (
                <Button variant="primary" isLoading={isSavingSort} onClick={handleSaveSortOrder}>
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
                        <td colSpan={9} className="px-4 py-10 text-center text-neutral-400">
                          노출 중인 배너가 없습니다.
                        </td>
                      </tr>
                    ) : (
                      <SortableContext
                        items={orderedVisible.map((b) => String(b.id))}
                        strategy={verticalListSortingStrategy}
                      >
                        {orderedVisible.map((banner, index) => (
                          <SortableRow key={banner.id} banner={banner} order={index + 1} {...commonRowProps} />
                        ))}
                      </SortableContext>
                    )}
                  </tbody>
                </table>
              </div>
            </DndContext>
          </div>

          {/* 대기 배너 */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-sm font-semibold text-neutral-700">배너 대기 목록</h2>
              <span className="text-xs text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded-full">
                {hiddenBanners.length}건
              </span>
            </div>
            <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                {TABLE_HEAD}
                <tbody>
                  {hiddenBanners.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-10 text-center text-neutral-400">
                        대기 중인 배너가 없습니다.
                      </td>
                    </tr>
                  ) : (
                    hiddenBanners.map((banner) => (
                      <StaticRow key={banner.id} banner={banner} {...commonRowProps} />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <Modal
        open={deleteTarget != null}
        onClose={() => setDeleteTarget(null)}
        title="배너 삭제"
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
          <span className="font-medium">"{deleteTarget?.adminTitle}"</span> 배너를 삭제하시겠습니까?
          <br />
          <span className="text-neutral-500 text-xs mt-1 block">
            연결된 이미지도 함께 삭제되며 복구할 수 없습니다.
          </span>
        </p>
      </Modal>
    </div>
  )
}
