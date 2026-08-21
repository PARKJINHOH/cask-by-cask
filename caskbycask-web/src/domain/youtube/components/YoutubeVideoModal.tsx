import { useEffect } from 'react'
import { Dialog, DialogPanel } from '@headlessui/react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import Spinner from '@/shared/components/Spinner'
import { youtubeApi } from '../api/youtubeApi'
import type { YoutubeVideo } from '../types/youtube.types'
import YoutubeVideoView from './YoutubeVideoView'

interface Props {
  videoKey: string | null
  /** 목록에서 이미 받아 둔 영상 — 상세 응답이 오기 전에도 바로 재생을 띄우기 위해 쓴다. */
  fallback?: YoutubeVideo
  onClose: () => void
  onPrev?: () => void
  onNext?: () => void
}

/**
 * 갤러리 위에 그대로 뜨는 영상 팝업 — 이미지 갤러리와 같은 방식으로 목록을 벗어나지 않는다.
 *
 * ESC·바깥 클릭 닫기와 포커스 트랩은 Dialog(headlessui) 가 처리한다.
 * 좌우 방향키로 앞뒤 영상으로 넘어가되, 입력 중에는 가로채지 않는다.
 */
export default function YoutubeVideoModal({ videoKey, fallback, onClose, onPrev, onNext }: Props) {
  const { t } = useTranslation()

  // 주류 태그는 상세 응답에만 담겨 있어 목록 데이터만으로는 채울 수 없다.
  const { data } = useQuery({
    queryKey: ['youtubeVideo', videoKey],
    queryFn: () => youtubeApi.getVideo(videoKey!),
    enabled: videoKey !== null,
    staleTime: 5 * 60_000,
  })

  useEffect(() => {
    if (videoKey === null) return
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
  }, [videoKey, onPrev, onNext])

  if (videoKey === null) return null

  const video = data ?? fallback

  return (
    <Dialog open onClose={onClose} className="relative z-50" aria-label={t('youtube.title')}>
      <div className="fixed inset-0 bg-neutral-950/85 backdrop-blur-[2px]" aria-hidden="true" />
      <div className="fixed inset-0 overflow-y-auto p-0 sm:p-4 lg:p-6">
        <div className="flex min-h-full items-center justify-center">
          <DialogPanel className="flex w-full max-w-[1000px] flex-col overflow-hidden bg-white shadow-2xl sm:rounded-2xl max-h-[92vh]">
            {video ? (
              <YoutubeVideoView
                key={video.videoKey}
                video={video}
                onClose={onClose}
                onPrev={onPrev}
                onNext={onNext}
                fill
              />
            ) : (
              <div className="flex h-64 items-center justify-center">
                <Spinner className="text-primary-800" />
              </div>
            )}
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  )
}
