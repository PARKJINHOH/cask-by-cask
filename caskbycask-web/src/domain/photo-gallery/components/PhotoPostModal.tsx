import { useEffect, useState } from 'react'
import { Dialog, DialogPanel } from '@headlessui/react'
import { useTranslation } from 'react-i18next'
import type { PostListItem } from '@/domain/community/types/community.types'
import PhotoPostView from './PhotoPostView'
import { PHOTO_DETAIL_SIZES, photoSrc, photoSrcSet } from '../utils/photoImageVariants'

interface Props {
  postId: number | null
  /** 목록 전체 — 앞뒤 사진을 미리 받아 두는 데 쓴다. */
  posts?: PostListItem[]
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
export default function PhotoPostModal({ postId, posts = [], onClose, onPrev, onNext, onDeleted }: Props) {
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

  /**
   * 앞뒤 사진 미리 받기.
   *
   * 상세 API 는 조회수 때문에 staleTime 이 0 이라 미리 받아도 다시 부른다 — 그래서 쿼리가 아니라
   * **무거운 쪽인 이미지**만 예열한다. 상세에서 쓰는 것과 같은 srcset·sizes 를 걸어야
   * 브라우저가 같은 후보를 골라 캐시가 실제로 재사용된다.
   *
   * 진행 중인 요청을 굳이 끊지 않는다 — 어차피 캐시에 남아 다음 이동에서 쓰이고,
   * img.src 를 비워 취소하는 방식은 브라우저에 따라 엉뚱한 요청을 만든다.
   */
  useEffect(() => {
    if (postId === null || posts.length === 0) return
    const index = posts.findIndex((post) => post.id === postId)
    if (index < 0) return

    for (const neighbour of [posts[index - 1], posts[index + 1]]) {
      const imageUrl = neighbour?.thumbnailImageUrl
      if (!imageUrl) continue
      const preloader = new Image()
      preloader.decoding = 'async'
      const srcSet = photoSrcSet(imageUrl)
      if (srcSet) {
        preloader.srcset = srcSet
        preloader.sizes = PHOTO_DETAIL_SIZES
      }
      preloader.src = photoSrc(imageUrl, 1280)
    }
  }, [postId, posts])

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
