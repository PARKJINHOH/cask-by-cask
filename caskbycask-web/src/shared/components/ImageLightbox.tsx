import { Fragment, useState, useEffect, useCallback, useRef } from 'react'
import { Dialog, Transition, TransitionChild, DialogPanel } from '@headlessui/react'

interface Props {
  images: string[]
  initialIndex?: number
  open: boolean
  onClose: () => void
}

const MIN_SCALE = 1
const MAX_SCALE = 5
const SWIPE_THRESHOLD = 60 // px — 확대 안 한 상태에서 좌우 스와이프로 이전/다음
const TAP_MOVE_TOLERANCE = 10 // px — 이 이하로 움직이면 '탭'으로 간주
const DOUBLE_TAP_MS = 300

type View = { scale: number; tx: number; ty: number }

export default function ImageLightbox({ images, initialIndex = 0, open, onClose }: Props) {
  const [current, setCurrent] = useState(initialIndex)
  const [view, setView] = useState<View>({ scale: 1, tx: 0, ty: 0 })
  const [smooth, setSmooth] = useState(true)

  const stageRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<View>(view)

  // 제스처 추적용 ref (렌더 트리거 없이 좌표 누적)
  const g = useRef({
    mode: 'none' as 'none' | 'pan' | 'pinch' | 'swipe',
    startX: 0,
    startY: 0,
    startTx: 0,
    startTy: 0,
    startScale: 1,
    startDist: 0,
    midX: 0,
    midY: 0,
    swipeDx: 0,
    moved: false,
    lastTapAt: 0,
  })

  const apply = useCallback((v: View) => {
    viewRef.current = v
    setView(v)
  }, [])

  const resetZoom = useCallback(() => {
    setSmooth(true)
    apply({ scale: 1, tx: 0, ty: 0 })
  }, [apply])

  useEffect(() => {
    if (open) {
      setCurrent(initialIndex)
      resetZoom()
    }
  }, [open, initialIndex, resetZoom])

  const goTo = useCallback(
    (i: number) => {
      setCurrent(((i % images.length) + images.length) % images.length)
      resetZoom()
    },
    [images.length, resetZoom],
  )
  const prev = useCallback(() => goTo(current - 1), [goTo, current])
  const next = useCallback(() => goTo(current + 1), [goTo, current])

  useEffect(() => {
    if (!open || images.length <= 1) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prev()
      else if (e.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, images.length, prev, next])

  const clampScale = (s: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s))

  // 화면 좌표(clientX/Y) 기준점을 고정한 채 배율을 factor 만큼 변경
  const zoomAt = useCallback(
    (clientX: number, clientY: number, factor: number, base?: View) => {
      const stage = stageRef.current
      if (!stage) return
      const rect = stage.getBoundingClientRect()
      const cx = clientX - rect.left - rect.width / 2
      const cy = clientY - rect.top - rect.height / 2
      const old = base ?? viewRef.current
      const nextScale = clampScale(old.scale * factor)
      const ratio = nextScale / old.scale
      if (nextScale === 1) {
        apply({ scale: 1, tx: 0, ty: 0 })
        return
      }
      apply({
        scale: nextScale,
        tx: cx * (1 - ratio) + ratio * old.tx,
        ty: cy * (1 - ratio) + ratio * old.ty,
      })
    },
    [apply],
  )

  const onWheel = useCallback(
    (e: React.WheelEvent) => {
      setSmooth(true)
      zoomAt(e.clientX, e.clientY, e.deltaY < 0 ? 1.18 : 1 / 1.18)
    },
    [zoomAt],
  )

  const onDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      setSmooth(true)
      if (viewRef.current.scale > 1) resetZoom()
      else zoomAt(e.clientX, e.clientY, 2.4)
    },
    [zoomAt, resetZoom],
  )

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const st = g.current
    if (e.touches.length === 2) {
      const [a, b] = [e.touches[0], e.touches[1]]
      st.mode = 'pinch'
      st.startDist = Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY) || 1
      st.startScale = viewRef.current.scale
      st.startTx = viewRef.current.tx
      st.startTy = viewRef.current.ty
      st.midX = (a.clientX + b.clientX) / 2
      st.midY = (a.clientY + b.clientY) / 2
      setSmooth(false)
    } else if (e.touches.length === 1) {
      const t = e.touches[0]
      st.startX = t.clientX
      st.startY = t.clientY
      st.startTx = viewRef.current.tx
      st.startTy = viewRef.current.ty
      st.swipeDx = 0
      st.moved = false
      st.mode = viewRef.current.scale > 1 ? 'pan' : 'swipe'
      setSmooth(false)
    }
  }, [])

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      const st = g.current
      if (st.mode === 'pinch' && e.touches.length === 2) {
        // 핀치 시작 시점(startScale/startTx/startTy) 기준으로 계산 — 누적 오차 방지
        const [a, b] = [e.touches[0], e.touches[1]]
        const dist = Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY) || 1
        const stage = stageRef.current
        if (stage) {
          const rect = stage.getBoundingClientRect()
          const cx = st.midX - rect.left - rect.width / 2
          const cy = st.midY - rect.top - rect.height / 2
          const nextScale = clampScale(st.startScale * (dist / st.startDist))
          const ratio = nextScale / st.startScale
          apply({
            scale: nextScale,
            tx: cx * (1 - ratio) + ratio * st.startTx,
            ty: cy * (1 - ratio) + ratio * st.startTy,
          })
        }
      } else if (st.mode === 'pan' && e.touches.length === 1) {
        const t = e.touches[0]
        const dx = t.clientX - st.startX
        const dy = t.clientY - st.startY
        if (Math.abs(dx) > TAP_MOVE_TOLERANCE || Math.abs(dy) > TAP_MOVE_TOLERANCE) st.moved = true
        apply({ scale: viewRef.current.scale, tx: st.startTx + dx, ty: st.startTy + dy })
      } else if (st.mode === 'swipe' && e.touches.length === 1) {
        const t = e.touches[0]
        st.swipeDx = t.clientX - st.startX
        if (Math.abs(st.swipeDx) > TAP_MOVE_TOLERANCE) st.moved = true
      }
    },
    [apply],
  )

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const st = g.current
      const wasSwipe = st.mode === 'swipe'
      const tapPoint = { x: st.startX, y: st.startY }

      if (wasSwipe && images.length > 1 && Math.abs(st.swipeDx) > SWIPE_THRESHOLD) {
        st.swipeDx < 0 ? next() : prev()
      } else if (!st.moved && (st.mode === 'swipe' || st.mode === 'pan')) {
        // 탭 — 더블탭이면 줌 토글
        const now = Date.now()
        if (now - st.lastTapAt < DOUBLE_TAP_MS) {
          setSmooth(true)
          if (viewRef.current.scale > 1) resetZoom()
          else zoomAt(tapPoint.x, tapPoint.y, 2.4)
          st.lastTapAt = 0
        } else {
          st.lastTapAt = now
        }
      }

      if (e.touches.length === 0) {
        if (viewRef.current.scale <= MIN_SCALE + 0.01) resetZoom()
        st.mode = 'none'
      }
    },
    [images.length, next, prev, zoomAt, resetZoom],
  )

  if (images.length === 0) return null

  const zoomed = view.scale > 1

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

                {/* 줌/팬 스테이지 — touch-action: none 으로 브라우저 기본 제스처 차단 */}
                <div
                  ref={stageRef}
                  className="relative flex items-center justify-center overflow-hidden rounded-lg select-none bg-white"
                  style={{ touchAction: 'none' }}
                  onWheel={onWheel}
                  onDoubleClick={onDoubleClick}
                  onTouchStart={onTouchStart}
                  onTouchMove={onTouchMove}
                  onTouchEnd={onTouchEnd}
                >
                  <img
                    key={current}
                    src={images[current]}
                    alt={`이미지 ${current + 1}`}
                    draggable={false}
                    className="max-h-[78vh] max-w-full object-contain shadow-2xl"
                    style={{
                      transform: `translate(${view.tx}px, ${view.ty}px) scale(${view.scale})`,
                      transition: smooth ? 'transform 0.15s ease-out' : 'none',
                      cursor: zoomed ? 'grab' : 'zoom-in',
                    }}
                  />
                </div>

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
                        onClick={() => goTo(i)}
                        className={`flex-shrink-0 w-12 h-12 rounded-md overflow-hidden border-2 bg-white transition-all ${
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
