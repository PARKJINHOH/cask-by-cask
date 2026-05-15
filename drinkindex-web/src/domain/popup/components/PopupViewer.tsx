import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { sanitizeHtml } from '@/shared/utils/sanitize'
import { hidePopupToday } from '@/shared/utils/popupStorage'
import type { PopupResponse } from '../types/popup.types'

const AUTOPLAY_MS = 3000

// ─── 슬라이드 콘텐츠 ──────────────────────────────────────────
function SlideContent({ popup }: { popup: PopupResponse }) {
  if (popup.popupType === 'IMAGE') {
    const img = (
      <img
        src={popup.mainImage?.imageUrl ?? ''}
        alt=""
        className="block max-w-full h-auto mx-auto"
        draggable={false}
      />
    )
    if (popup.linkUrl) {
      return (
        <a
          href={popup.linkUrl}
          target={popup.linkTargetBlank ? '_blank' : '_self'}
          rel="noopener noreferrer"
          className="block"
        >
          {img}
        </a>
      )
    }
    return img
  }

  return (
    <div
      className="popup-content notice-editor prose prose-sm sm:prose p-4 max-h-[60vh] overflow-y-auto"
      dangerouslySetInnerHTML={{ __html: sanitizeHtml(popup.contentSanitized ?? '') }}
    />
  )
}

// ─── SVG 아이콘 ───────────────────────────────────────────────
function IconPrev() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}
function IconNext() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}
function IconPause() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="4" width="4" height="16" rx="1" />
      <rect x="14" y="4" width="4" height="16" rx="1" />
    </svg>
  )
}
function IconPlay() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="5,3 19,12 5,21" />
    </svg>
  )
}

// ─── 컨트롤 바 (◀ ●○○ ⏸/▶ ▶) ────────────────────────────────
function Controls({
  total,
  activeIndex,
  isPlaying,
  onPrev,
  onNext,
  onDotClick,
  onTogglePlay,
}: {
  total: number
  activeIndex: number
  isPlaying: boolean
  onPrev: () => void
  onNext: () => void
  onDotClick: (i: number) => void
  onTogglePlay: () => void
}) {
  const btnCls =
    'w-7 h-7 flex items-center justify-center rounded-full text-neutral-500 ' +
    'hover:bg-neutral-100 hover:text-neutral-800 transition-colors focus:outline-none'

  return (
    <div className="flex items-center justify-center gap-2 py-2.5 border-t border-neutral-100">
      {/* 이전 */}
      <button type="button" onClick={onPrev} aria-label="이전" className={btnCls}>
        <IconPrev />
      </button>

      {/* 도트 인디케이터 */}
      <div className="flex items-center gap-1.5 mx-1">
        {Array.from({ length: total }).map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onDotClick(i)}
            aria-label={`${i + 1}번째 팝업`}
            aria-current={i === activeIndex ? 'true' : undefined}
            className={[
              'rounded-full transition-all duration-300 ease-in-out focus:outline-none',
              i === activeIndex
                ? 'w-2.5 h-2.5 bg-neutral-700'
                : 'w-2 h-2 bg-neutral-300 hover:bg-neutral-400',
            ].join(' ')}
          />
        ))}
      </div>

      {/* 재생 / 일시정지 */}
      <button
        type="button"
        onClick={onTogglePlay}
        aria-label={isPlaying ? '일시정지' : '재생'}
        className={btnCls}
      >
        {isPlaying ? <IconPause /> : <IconPlay />}
      </button>

      {/* 다음 */}
      <button type="button" onClick={onNext} aria-label="다음" className={btnCls}>
        <IconNext />
      </button>
    </div>
  )
}

// ─── PopupViewer ──────────────────────────────────────────────
interface Props {
  popups: PopupResponse[]
  onClose: () => void
  isPreview?: boolean
}

export function PopupViewer({ popups, onClose, isPreview = false }: Props) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [isHideToday, setIsHideToday] = useState(false)
  const [isPlaying, setIsPlaying]     = useState(true)
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)

  if (popups.length === 0) return null

  const isMultiple      = popups.length > 1
  const currentPopup    = popups[activeIndex] ?? popups[0]
  const canCloseOverlay = currentPopup.closeOnOverlay !== false

  // ── 오토플레이 ────────────────────────────────────────────
  // activeIndex를 deps에 포함 → 수동 이동 후에도 타이머 리셋 (3초 재시작)
  useEffect(() => {
    if (!isPlaying || !isMultiple) return
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % popups.length)
    }, AUTOPLAY_MS)
    return () => clearInterval(timer)
  }, [isPlaying, isMultiple, activeIndex, popups.length])

  // ── 내비게이션 ────────────────────────────────────────────
  const goTo   = (i: number) => setActiveIndex((i + popups.length) % popups.length)
  const goPrev = () => goTo(activeIndex - 1)
  const goNext = () => goTo(activeIndex + 1)

  // ── 터치 스와이프 ─────────────────────────────────────────
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    const dx = touchStartX.current - e.changedTouches[0].clientX
    const dy = Math.abs(touchStartY.current - e.changedTouches[0].clientY)
    if (Math.abs(dx) > 50 && Math.abs(dx) > dy) {
      dx > 0 ? goNext() : goPrev()
    }
  }

  const handleClose = () => {
    if (isHideToday && !isPreview) hidePopupToday()
    onClose()
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 오버레이 */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={canCloseOverlay ? handleClose : undefined}
        aria-hidden="true"
      />

      {/* 팝업 컨테이너 */}
      <div
        className="relative z-10 flex flex-col bg-white rounded-xl shadow-2xl
          w-[min(90vw,_560px)] max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* X 닫기 버튼 */}
        <button
          type="button"
          onClick={!isPreview ? handleClose : undefined}
          disabled={isPreview}
          aria-label="닫기"
          className="absolute top-3 right-3 z-20 w-8 h-8 flex items-center justify-center
            rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors text-xl
            leading-none disabled:opacity-40 disabled:cursor-not-allowed"
        >
          ×
        </button>

        {/* 슬라이드 영역 */}
        {!isMultiple ? (
          <SlideContent popup={popups[0]} />
        ) : (
          <div
            className="relative w-full"
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            {popups.map((popup, i) => (
              <div
                key={popup.id}
                className={`transition-opacity duration-300 ease-in-out ${
                  i === activeIndex
                    ? 'relative opacity-100 pointer-events-auto'
                    : 'absolute inset-0 opacity-0 pointer-events-none'
                }`}
              >
                <SlideContent popup={popup} />
              </div>
            ))}
          </div>
        )}

        {/* 컨트롤 바 (복수 팝업 전용) */}
        {isMultiple && (
          <Controls
            total={popups.length}
            activeIndex={activeIndex}
            isPlaying={isPlaying}
            onPrev={goPrev}
            onNext={goNext}
            onDotClick={goTo}
            onTogglePlay={() => setIsPlaying((p) => !p)}
          />
        )}

        {/* 하단 바 — 하루 안보기 + 닫기 */}
        {!isPreview && (
          <div
            className="flex flex-col sm:flex-row items-start sm:items-center
              justify-between px-4 py-3 border-t border-neutral-100 gap-2 flex-shrink-0"
          >
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isHideToday}
                onChange={(e) => setIsHideToday(e.target.checked)}
                className="w-4 h-4 accent-primary-600 rounded"
              />
              <span className="text-sm text-neutral-600">오늘 하루 보지 않기</span>
            </label>
            <button
              type="button"
              onClick={handleClose}
              className="text-sm font-medium text-neutral-500 hover:text-neutral-800
                transition-colors self-end sm:self-auto"
            >
              닫기
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
