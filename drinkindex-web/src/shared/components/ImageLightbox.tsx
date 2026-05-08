import { Fragment, useState, useEffect, useCallback } from 'react'
import { Dialog, Transition, TransitionChild, DialogPanel } from '@headlessui/react'

interface Props {
  images: string[]
  initialIndex?: number
  open: boolean
  onClose: () => void
}

export default function ImageLightbox({ images, initialIndex = 0, open, onClose }: Props) {
  const [current, setCurrent] = useState(initialIndex)

  useEffect(() => {
    if (open) setCurrent(initialIndex)
  }, [open, initialIndex])

  const prev = useCallback(
    () => setCurrent((c) => (c - 1 + images.length) % images.length),
    [images.length],
  )
  const next = useCallback(
    () => setCurrent((c) => (c + 1) % images.length),
    [images.length],
  )

  useEffect(() => {
    if (!open || images.length <= 1) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prev()
      else if (e.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, images.length, prev, next])

  if (images.length === 0) return null

  return (
    <Transition show={open} as={Fragment}>
      <Dialog onClose={onClose} className="relative z-50">
        {/* 배경 */}
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100"
          leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/85 backdrop-blur-sm" aria-hidden="true" />
        </TransitionChild>

        <div className="fixed inset-0 flex flex-col items-center justify-center p-4 overflow-hidden">
          <TransitionChild
            as={Fragment}
            enter="ease-out duration-200" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100"
            leave="ease-in duration-150" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95"
          >
            <DialogPanel className="flex flex-col items-center gap-3 w-full max-w-4xl">
              {/* 닫기 버튼 */}
              <div className="w-full flex justify-end">
                <button
                  onClick={onClose}
                  aria-label="닫기"
                  className="text-white/60 hover:text-white transition-colors p-1"
                >
                  <svg className="w-7 h-7" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              {/* 메인 이미지 + 좌우 화살표 */}
              <div className="relative flex items-center justify-center w-full">
                {images.length > 1 && (
                  <button
                    onClick={prev}
                    aria-label="이전 이미지"
                    className="absolute left-0 z-10 p-2 rounded-full bg-black/40 text-white/80
                      hover:bg-black/60 hover:text-white transition-colors"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" fill="none">
                      <polyline points="15,18 9,12 15,6" />
                    </svg>
                  </button>
                )}

                <img
                  key={current}
                  src={images[current]}
                  alt={`이미지 ${current + 1}`}
                  className="max-h-[70vh] max-w-full object-contain rounded-lg shadow-2xl"
                />

                {images.length > 1 && (
                  <button
                    onClick={next}
                    aria-label="다음 이미지"
                    className="absolute right-0 z-10 p-2 rounded-full bg-black/40 text-white/80
                      hover:bg-black/60 hover:text-white transition-colors"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" fill="none">
                      <polyline points="9,18 15,12 9,6" />
                    </svg>
                  </button>
                )}
              </div>

              {/* 카운터 + 썸네일 스트립 */}
              {images.length > 1 && (
                <>
                  <p className="text-white/50 text-xs tabular-nums">
                    {current + 1} / {images.length}
                  </p>
                  <div className="flex gap-2 max-w-full overflow-x-hidden pb-1">
                    {images.map((url, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrent(i)}
                        className={`flex-shrink-0 w-12 h-12 rounded-md overflow-hidden border-2 transition-all ${
                          i === current
                            ? 'border-white'
                            : 'border-transparent opacity-40 hover:opacity-70'
                        }`}
                      >
                        <img src={url} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </>
              )}
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  )
}
