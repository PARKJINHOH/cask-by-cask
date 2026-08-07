import { useEffect, useState } from 'react'
import { Dialog, DialogPanel } from '@headlessui/react'
import { useTranslation } from 'react-i18next'
import PhotoPostView from './PhotoPostView'

interface Props {
  postId: number | null
  onClose: () => void
  onPrev?: () => void
  onNext?: () => void
  onDeleted?: () => void
}

/**
 * 갤러리 목록 위에 그대로 뜨는 사진 상세 — 인스타처럼 목록을 벗어나지 않고 본다.
 *
 * ESC·바깥 클릭 닫기와 포커스 트랩은 Dialog(headlessui) 가 처리한다.
 * 좌우 방향키로 앞뒤 사진으로 넘어가되, 댓글을 쓰는 중에는 가로채지 않는다.
 */
export default function PhotoPostModal({ postId, onClose, onPrev, onNext, onDeleted }: Props) {
  const { t } = useTranslation()
  // 이미지 뷰어가 떠 있는 동안 ← → 는 뷰어(사진 넘기기)의 몫이다.
  const [viewerOpen, setViewerOpen] = useState(false)

  useEffect(() => {
    if (postId === null || viewerOpen) return
    const isTyping = (target: EventTarget | null) => {
      const element = target as HTMLElement | null
      if (!element) return false
      const tag = element.tagName
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || element.isContentEditable
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || isTyping(event.target)) return
      if (event.key === 'ArrowLeft' && onPrev) onPrev()
      if (event.key === 'ArrowRight' && onNext) onNext()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [postId, viewerOpen, onPrev, onNext])

  if (postId === null) return null

  return (
    <Dialog open onClose={onClose} className="relative z-50" aria-label={t('photoGallery.title')}>
      <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-[2px]" aria-hidden="true" />
      <div className="fixed inset-0 overflow-y-auto p-0 sm:p-4 lg:p-6">
        <div className="flex min-h-full items-center justify-center">
          <DialogPanel className="w-full max-w-[1280px] overflow-hidden bg-white shadow-2xl sm:rounded-2xl lg:h-[min(88vh,900px)]">
            <PhotoPostView
              key={postId}
              postId={postId}
              onClose={onClose}
              onPrev={onPrev}
              onNext={onNext}
              onDeleted={onDeleted}
              onViewerOpenChange={setViewerOpen}
              fill
            />
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  )
}
