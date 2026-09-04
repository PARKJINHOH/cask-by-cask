'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

export type SheetSnap = 'peek' | 'half' | 'full'

interface Props {
  snap: SheetSnap
  onSnapChange: (snap: SheetSnap) => void
  /** 시트가 차지하는 높이(px)를 알려 준다 — 지도가 이만큼 여백을 두고 중심을 잡는다. */
  onHeightChange?: (height: number) => void
  children: ReactNode
}

const SNAP_ORDER: SheetSnap[] = ['peek', 'half', 'full']

/** 스냅 지점별 높이. peek 은 이름·액션 한 줄이 보이는 최소 높이다. */
function snapHeight(snap: SheetSnap, viewportHeight: number): number {
  switch (snap) {
    case 'peek':
      return 128
    case 'half':
      return Math.round(viewportHeight * 0.5)
    case 'full':
      // 상단 바가 보일 만큼은 남긴다 — 지도가 완전히 가려지면 방향 감각을 잃는다.
      return Math.max(viewportHeight - 56, 200)
  }
}

/**
 * 모바일 바텀시트 — 3단 스냅.
 *
 * <h3>제스처 충돌을 어떻게 푸는가</h3>
 * 지도 위에 시트가 떠 있으므로 두 개의 드래그가 겹친다. 규칙은 이렇다:
 * <ul>
 *   <li>핸들에만 {@code touch-action: none} — 여기서 시작한 드래그는 시트가 가져간다</li>
 *   <li>본문은 {@code touch-action: pan-y} — 평소에는 목록 스크롤이다</li>
 *   <li>본문이 <b>스크롤 최상단일 때만</b> 아래로 끄는 동작을 시트가 가져간다.
 *       이게 없으면 댓글을 위로 읽어 올리다가 시트가 닫힌다</li>
 * </ul>
 */
export default function VenueBottomSheet({ snap, onSnapChange, onHeightChange, children }: Props) {
  const { t } = useTranslation()
  const sheetRef = useRef<HTMLDivElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const [viewportHeight, setViewportHeight] = useState(() =>
    typeof window === 'undefined' ? 800 : window.innerHeight,
  )
  const [dragOffset, setDragOffset] = useState(0)
  const dragState = useRef<{ startY: number; fromBody: boolean } | null>(null)

  useEffect(() => {
    const update = () => setViewportHeight(window.innerHeight)
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  const height = snapHeight(snap, viewportHeight)

  useEffect(() => {
    onHeightChange?.(height)
  }, [height, onHeightChange])

  const settle = useCallback(
    (delta: number) => {
      // 임계치를 넘긴 방향으로 한 칸 이동한다. 관성까지 흉내 내면 조작이 예측 불가능해진다.
      const threshold = 60
      const index = SNAP_ORDER.indexOf(snap)
      if (delta < -threshold && index < SNAP_ORDER.length - 1) {
        onSnapChange(SNAP_ORDER[index + 1])
      } else if (delta > threshold && index > 0) {
        onSnapChange(SNAP_ORDER[index - 1])
      }
      setDragOffset(0)
    },
    [snap, onSnapChange],
  )

  const startDrag = (clientY: number, fromBody: boolean) => {
    dragState.current = { startY: clientY, fromBody }
  }

  const moveDrag = (clientY: number) => {
    const state = dragState.current
    if (!state) return
    const delta = clientY - state.startY
    // 본문에서 시작한 드래그는 "아래로 끌기"만 시트가 가져간다.
    if (state.fromBody && delta < 0) return
    setDragOffset(delta)
  }

  const endDrag = () => {
    const state = dragState.current
    if (!state) return
    dragState.current = null
    settle(dragOffset)
  }

  const cycleSnap = () => {
    const index = SNAP_ORDER.indexOf(snap)
    onSnapChange(SNAP_ORDER[(index + 1) % SNAP_ORDER.length])
  }

  return (
    <div
      ref={sheetRef}
      role={snap === 'full' ? 'dialog' : undefined}
      aria-modal={snap === 'full' ? false : undefined}
      style={{
        height: `${height}px`,
        transform: `translateY(${Math.max(dragOffset, 0)}px)`,
        transition: dragState.current ? 'none' : 'height 220ms ease, transform 220ms ease',
        // iOS 홈 인디케이터를 피한다.
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
      className="pointer-events-auto fixed inset-x-0 bottom-0 z-30 flex flex-col rounded-t-2xl
        bg-white shadow-[0_-8px_24px_rgba(0,0,0,0.12)] lg:hidden"
    >
      {/* 핸들 — 드래그는 여기서만 시작한다 */}
      <button
        type="button"
        onClick={cycleSnap}
        aria-label={t('venue.sheet.toggle', '패널 높이 조절')}
        aria-expanded={snap !== 'peek'}
        style={{ touchAction: 'none' }}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          startDrag(e.clientY, false)
        }}
        onPointerMove={(e) => moveDrag(e.clientY)}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className="flex h-8 w-full shrink-0 items-center justify-center"
      >
        <span className="h-1 w-10 rounded-full bg-neutral-300" />
      </button>

      <div
        ref={bodyRef}
        style={{ touchAction: 'pan-y' }}
        onPointerDown={(e) => {
          // 스크롤 최상단일 때만 시트 드래그로 넘긴다.
          if ((bodyRef.current?.scrollTop ?? 0) <= 0) startDrag(e.clientY, true)
        }}
        onPointerMove={(e) => moveDrag(e.clientY)}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
      >
        {children}
      </div>
    </div>
  )
}
