import { useState, useEffect } from 'react'
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

export default function AdminNoticeOrderModal({ open, onClose, showToast }: AdminNoticeOrderModalProps) {
  // 노출 중인 공지사항 조회 (페이지네이션 없이 100개 확보)
  const { data, isLoading } = useAdminNoticeList({
    isPublished: true,
    page: 0,
    size: 100,
  })

  const [items, setItems] = useState<NoticeListItem[]>([])
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null)
  
  const updateOrdersMutation = useUpdateNoticeDisplayOrders()

  useEffect(() => {
    if (data?.content) {
      setItems(data.content)
    }
  }, [data])

  // 드래그앤드롭 이벤트 핸들러
  const handleDragStart = (index: number) => {
    setDraggedIdx(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIdx === null || draggedIdx === index) return

    const nextItems = [...items]
    const draggedItem = nextItems[draggedIdx]
    // 드래그 대상 항목을 기존 위치에서 제거하고 새 위치에 삽입
    nextItems.splice(draggedIdx, 1)
    nextItems.splice(index, 0, draggedItem)

    setDraggedIdx(index)
    setItems(nextItems)
  }

  const handleDragEnd = () => {
    setDraggedIdx(null)
  }

  // 순서 위로 이동
  const moveUp = (index: number) => {
    if (index === 0) return
    const nextItems = [...items]
    const temp = nextItems[index]
    nextItems[index] = nextItems[index - 1]
    nextItems[index - 1] = temp
    setItems(nextItems)
  }

  // 순서 아래로 이동
  const moveDown = (index: number) => {
    if (index === items.length - 1) return
    const nextItems = [...items]
    const temp = nextItems[index]
    nextItems[index] = nextItems[index + 1]
    nextItems[index + 1] = temp
    setItems(nextItems)
  }

  // 변경된 순서 저장
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
        <div className="flex items-center justify-end gap-2 w-full">
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
      <div className="flex flex-col h-[55vh] -mx-6 -my-4">
        {/* 설명 영역 */}
        <div className="px-6 py-3 bg-neutral-50 border-b border-neutral-100">
          <p className="text-xs text-neutral-500 leading-relaxed">
            * 현재 노출(발행) 상태인 공지만 목록에 표시됩니다.
            <br />
            * 항목을 마우스로 드래그하여 원하는 위치에 놓거나, 오른쪽의 화살표(▲/▼) 버튼으로 순서를 변경할 수 있습니다.
            <br />
            * 상단 고정(고정 뱃지)된 공지는 고정되지 않은 공지보다 항상 상단에 노출됩니다.
          </p>
        </div>

        {/* 목록 영역 */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
          {isLoading ? (
            <div className="flex items-center justify-center h-full text-sm text-neutral-400">
              불러오는 중...
            </div>
          ) : items.length === 0 ? (
            <div className="flex items-center justify-center h-full text-sm text-neutral-400">
              노출 중인 공지사항이 없습니다.
            </div>
          ) : (
            items.map((notice, idx) => {
              const isDragging = draggedIdx === idx
              return (
                <div
                  key={notice.id}
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center justify-between p-3 border rounded-xl bg-white transition-all duration-200 select-none
                    ${isDragging 
                      ? 'border-primary-500 bg-primary-50/50 shadow-md scale-[1.01] opacity-70' 
                      : 'border-neutral-200 hover:border-neutral-300 hover:shadow-sm'
                    }`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* 드래그 핸들러 아이콘 */}
                    <div className="cursor-grab active:cursor-grabbing text-neutral-400 hover:text-neutral-600 transition-colors p-1">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                      </svg>
                    </div>

                    <div className="flex flex-col min-w-0 gap-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {notice.isPinned && (
                          <span className="inline-block text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded font-semibold whitespace-nowrap">
                            고정
                          </span>
                        )}
                        <span className="inline-block text-[10px] px-1.5 py-0.5 bg-neutral-100 text-neutral-600 rounded font-medium whitespace-nowrap">
                          {NOTICE_CATEGORY_LABELS[notice.category]}
                        </span>
                        <span className="text-xs text-neutral-400">
                          ID: {notice.id}
                        </span>
                      </div>
                      <span className="text-sm font-semibold text-neutral-800 truncate pr-4">
                        {notice.title}
                      </span>
                    </div>
                  </div>

                  {/* 정렬 버튼 영역 */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => moveUp(idx)}
                      className="p-1.5 rounded-lg border border-neutral-200 bg-white text-neutral-500 hover:bg-neutral-50 hover:text-neutral-700 disabled:opacity-30 disabled:hover:bg-white transition-colors"
                      title="위로 이동"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      disabled={idx === items.length - 1}
                      onClick={() => moveDown(idx)}
                      className="p-1.5 rounded-lg border border-neutral-200 bg-white text-neutral-500 hover:bg-neutral-50 hover:text-neutral-700 disabled:opacity-30 disabled:hover:bg-white transition-colors"
                      title="아래로 이동"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </Modal>
  )
}
