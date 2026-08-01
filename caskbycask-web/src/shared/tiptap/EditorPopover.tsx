import {
  useCallback, useEffect, useLayoutEffect, useRef, useState,
  type KeyboardEvent as ReactKeyboardEvent, type ReactNode, type RefObject,
} from 'react'
import { createPortal } from 'react-dom'

const VIEWPORT_GAP = 8
const ANCHOR_GAP = 4

interface Props {
  /** 팝오버를 붙일 기준 요소(툴바 버튼) */
  anchorRef: RefObject<HTMLButtonElement | null>
  open: boolean
  onClose: () => void
  /** 열릴 때 첫 항목으로 포커스를 옮길지 — 키보드로 열었을 때만 true */
  autoFocus?: boolean
  role?: 'listbox' | 'dialog'
  label: string
  className?: string
  children: ReactNode
}

// 툴바 드롭다운(글꼴·색상 등) 공용 팝오버.
// 모바일에서 툴바 행이 가로 스크롤 컨테이너가 되면 absolute 로 띄운 메뉴가 잘리므로,
// EditorTooltip 과 동일하게 body 포털 + fixed 좌표로 배치한다.
export default function EditorPopover({
  anchorRef, open, onClose, autoFocus = false, role = 'dialog', label, className = '', children,
}: Props) {
  const popoverRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ left: 0, top: 0, visible: false })

  const place = useCallback(() => {
    const anchor = anchorRef.current
    const popover = popoverRef.current
    if (!anchor || !popover) return

    const anchorRect = anchor.getBoundingClientRect()
    const popoverRect = popover.getBoundingClientRect()
    const left = Math.min(
      window.innerWidth - popoverRect.width - VIEWPORT_GAP,
      Math.max(VIEWPORT_GAP, anchorRect.left),
    )
    const below = anchorRect.bottom + ANCHOR_GAP
    const top = below + popoverRect.height <= window.innerHeight - VIEWPORT_GAP
      ? below
      : Math.max(VIEWPORT_GAP, anchorRect.top - popoverRect.height - ANCHOR_GAP)

    setPosition({ left, top, visible: true })
  }, [anchorRef])

  useLayoutEffect(() => {
    if (open) place()
    else setPosition((prev) => ({ ...prev, visible: false }))
  }, [open, place])

  useEffect(() => {
    if (!open) return
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open, place])

  // 바깥 클릭 닫기 — 기준 버튼은 스스로 토글하므로 제외한다.
  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node
      if (popoverRef.current?.contains(target)) return
      if (anchorRef.current?.contains(target)) return
      onClose()
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('touchstart', onPointerDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('touchstart', onPointerDown)
    }
  }, [open, onClose, anchorRef])

  // 키보드로 연 경우에만 첫 항목으로 이동한다. (마우스 사용자는 편집 흐름을 그대로 유지)
  useEffect(() => {
    if (!open || !autoFocus) return
    popoverRef.current?.querySelector<HTMLElement>('button:not([disabled])')?.focus()
  }, [open, autoFocus])

  // 포커스가 아직 기준 버튼에 있을 때(마우스로 연 경우)도 Escape 로 닫히도록 문서 단위로 듣는다.
  // 같은 이유로 툴바 방향키 이동이 시작되면 열려 있던 팝오버를 닫는다.
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (popoverRef.current?.contains(document.activeElement)) return
      if (event.key === 'Escape') {
        onClose()
        anchorRef.current?.focus()
        return
      }
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose, anchorRef])

  if (!open || typeof document === 'undefined') return null

  // 팝오버 내부 포커스일 때의 키 처리 (Escape 는 위 문서 리스너가 함께 담당)
  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape' || event.key === 'Tab') {
      event.stopPropagation()
      if (event.key === 'Escape') event.preventDefault()
      onClose()
      anchorRef.current?.focus()
      return
    }

    const items = Array.from(popoverRef.current?.querySelectorAll<HTMLElement>('button:not([disabled])') ?? [])
    const index = items.indexOf(document.activeElement as HTMLElement)
    if (index === -1) return

    const last = items.length - 1
    let next: number
    switch (event.key) {
      case 'ArrowDown': case 'ArrowRight': next = index === last ? 0 : index + 1; break
      case 'ArrowUp': case 'ArrowLeft': next = index === 0 ? last : index - 1; break
      case 'Home': next = 0; break
      case 'End': next = last; break
      default: return
    }
    event.preventDefault()
    event.stopPropagation()
    items[next]?.focus()
  }

  return createPortal(
    <div
      ref={popoverRef}
      data-editor-popover=""
      role={role}
      aria-label={label}
      onKeyDown={handleKeyDown}
      style={{ left: position.left, top: position.top, visibility: position.visible ? 'visible' : 'hidden' }}
      className={`fixed z-[70] rounded-lg border border-neutral-200 bg-white shadow-lg ${className}`}
    >
      {children}
    </div>,
    document.body,
  )
}
