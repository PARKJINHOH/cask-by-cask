import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { sanitizeHtml } from '@/shared/utils/sanitize'
import { hidePopupToday } from '@/shared/utils/popupStorage'
import type { PopupResponse } from '../types/popup.types'

const AUTOPLAY_MS = 5000

// ─── 슬라이드 콘텐츠 ──────────────────────────────────────────
function SlideContent({ popup, onLinkClick }: { popup: PopupResponse; onLinkClick?: () => void }) {
  if (popup.popupType === 'IMAGE') {
    const img = (
      <img
        src={popup.mainImage?.imageUrl ?? ''}
        alt=""
        className="block w-auto h-auto max-w-full max-h-[70vh] mx-auto"
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
          onClick={onLinkClick}
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
function IconPrev({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}
function IconNext({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}
function IconPause({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="4" width="4" height="16" rx="1" />
      <rect x="14" y="4" width="4" height="16" rx="1" />
    </svg>
  )
}
function IconPlay({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <polygon points="5,3 19,12 5,21" />
    </svg>
  )
}

// ─── 좌/우 내비게이션 화살표 (이미지 위 오버레이, hover 시 표시) ──
function NavArrows({ onPrev, onNext }: { onPrev: () => void; onNext: () => void }) {
  const btnCls =
    'absolute top-1/2 -translate-y-1/2 z-20 w-9 h-9 flex items-center justify-center ' +
    'rounded-full bg-black/35 text-white hover:bg-black/55 backdrop-blur-sm ' +
    'opacity-0 group-hover:opacity-100 transition-all duration-200 focus:outline-none'

  return (
    <>
      <button type="button" onClick={onPrev} aria-label="이전" className={`${btnCls} left-2`}>
        <IconPrev />
      </button>
      <button type="button" onClick={onNext} aria-label="다음" className={`${btnCls} right-2`}>
        <IconNext />
      </button>
    </>
  )
}

// ─── 카운터 + 재생/일시정지 (우측 하단 캡슐) ───────────────────
function SlideCounter({
  total,
  activeIndex,
  isPlaying,
  onTogglePlay,
}: {
  total: number
  activeIndex: number
  isPlaying: boolean
  onTogglePlay: () => void
}) {
  return (
    <div
      className="absolute bottom-2.5 right-2.5 z-20 flex items-center gap-1.5 pl-3 pr-1.5 py-1
        rounded-full bg-black/50 backdrop-blur-sm text-white text-xs font-medium select-none"
    >
      <span className="tabular-nums tracking-wide">
        {activeIndex + 1}
        <span className="mx-0.5 text-white/50">/</span>
        {total}
      </span>
      <button
        type="button"
        onClick={onTogglePlay}
        aria-label={isPlaying ? '일시정지' : '재생'}
        className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-white/20
          transition-colors focus:outline-none"
      >
        {isPlaying ? <IconPause className="w-3 h-3" /> : <IconPlay className="w-3 h-3" />}
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
  const [isHovering, setIsHovering]   = useState(false)
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)

  // 직전 슬라이드 인덱스 — 전환 중 불투명 배경으로 깔아 흰 배경 번쩍임 방지
  const prevIndexRef = useRef(0)
  const prevIndex = prevIndexRef.current
  useEffect(() => {
    prevIndexRef.current = activeIndex
  }, [activeIndex])

  if (popups.length === 0) return null

  const isMultiple      = popups.length > 1
  const currentPopup    = popups[activeIndex] ?? popups[0]
  const canCloseOverlay = currentPopup.closeOnOverlay !== false

  // ── 오토플레이 ────────────────────────────────────────────
  // activeIndex를 deps에 포함 → 수동 이동 후에도 타이머 리셋 (4초 재시작)
  // isHovering=true이면 일시정지
  useEffect(() => {
    if (!isPlaying || !isMultiple || isHovering) return
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % popups.length)
    }, AUTOPLAY_MS)
    return () => clearInterval(timer)
  }, [isPlaying, isMultiple, activeIndex, popups.length, isHovering])

  // ── ESC 키로 닫기 ─────────────────────────────────────────
  useEffect(() => {
    if (isPreview) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isHideToday) hidePopupToday()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isPreview, isHideToday, onClose])

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

      {/* 팝업 컨테이너 — IMAGE 팝업은 현재 이미지 비율에 맞춰 폭이 줄어듦(흰 여백 제거) */}
      <div
        className={[
          'group relative z-10 flex flex-col bg-white rounded-xl shadow-2xl',
          'max-w-[min(90vw,_560px)] max-h-[90vh] overflow-hidden',
          currentPopup.popupType === 'IMAGE' ? 'w-fit' : 'w-[min(90vw,_560px)]',
        ].join(' ')}
        onClick={(e) => e.stopPropagation()}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
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
          <SlideContent popup={popups[0]} onLinkClick={isPreview ? undefined : handleClose} />
        ) : (
          <div
            className="relative overflow-hidden"
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            {popups.map((popup, i) => {
              // active: 박스 크기 결정 + 위에서 페이드인 / prev: 불투명 배경으로 깔림 / 그 외: 숨김
              const slideCls =
                i === activeIndex
                  ? 'relative z-20 opacity-100 pointer-events-auto'
                  : i === prevIndex
                    ? 'absolute inset-0 z-10 opacity-100 pointer-events-none'
                    : 'absolute inset-0 z-0 opacity-0 pointer-events-none'
              return (
                <div
                  key={popup.id}
                  className={`bg-white transition-opacity duration-500 ease-in-out ${slideCls}`}
                >
                  <SlideContent popup={popup} onLinkClick={isPreview ? undefined : handleClose} />
                </div>
              )
            })}

            {/* 좌/우 화살표 (hover 시 표시) */}
            <NavArrows onPrev={goPrev} onNext={goNext} />

            {/* 우측 하단 카운터 + 재생/일시정지 */}
            <SlideCounter
              total={popups.length}
              activeIndex={activeIndex}
              isPlaying={isPlaying}
              onTogglePlay={() => setIsPlaying((p) => !p)}
            />
          </div>
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
                className="w-4 h-4 accent-primary-800 rounded"
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
