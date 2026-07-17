import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface Props {
  content: string
  children: ReactNode
  disabled?: boolean
}

interface TooltipPosition {
  left: number
  top: number
  visible: boolean
}

const VIEWPORT_GAP = 8
const TOOLTIP_GAP = 6

// 에디터 외곽의 overflow 영향을 받지 않도록 body 포털에 즉시 표시하는 공용 툴팁.
export default function EditorTooltip({ content, children, disabled = false }: Props) {
  const id = useId()
  const anchorRef = useRef<HTMLSpanElement>(null)
  const tooltipRef = useRef<HTMLSpanElement>(null)
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState<TooltipPosition>({ left: 0, top: 0, visible: false })

  const placeTooltip = useCallback(() => {
    const anchor = anchorRef.current
    const tooltip = tooltipRef.current
    if (!anchor || !tooltip) return

    const anchorRect = anchor.getBoundingClientRect()
    const tooltipRect = tooltip.getBoundingClientRect()
    const centeredLeft = anchorRect.left + (anchorRect.width / 2) - (tooltipRect.width / 2)
    const left = Math.min(
      window.innerWidth - tooltipRect.width - VIEWPORT_GAP,
      Math.max(VIEWPORT_GAP, centeredLeft),
    )
    const belowTop = anchorRect.bottom + TOOLTIP_GAP
    const top = belowTop + tooltipRect.height <= window.innerHeight - VIEWPORT_GAP
      ? belowTop
      : Math.max(VIEWPORT_GAP, anchorRect.top - tooltipRect.height - TOOLTIP_GAP)

    setPosition({ left, top, visible: true })
  }, [])

  useLayoutEffect(() => {
    if (open && !disabled) placeTooltip()
    else setPosition((prev) => ({ ...prev, visible: false }))
  }, [disabled, open, placeTooltip])

  useEffect(() => {
    if (!open || disabled) return
    window.addEventListener('resize', placeTooltip)
    window.addEventListener('scroll', placeTooltip, true)
    return () => {
      window.removeEventListener('resize', placeTooltip)
      window.removeEventListener('scroll', placeTooltip, true)
    }
  }, [disabled, open, placeTooltip])

  return (
    <span
      ref={anchorRef}
      className="inline-flex"
      aria-describedby={open && !disabled ? id : undefined}
      onMouseEnter={() => { if (!disabled) setOpen(true) }}
      onMouseLeave={() => setOpen(false)}
      onFocusCapture={() => { if (!disabled) setOpen(true) }}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false)
      }}
    >
      {children}
      {open && !disabled && typeof document !== 'undefined' && createPortal(
        <span
          ref={tooltipRef}
          id={id}
          role="tooltip"
          style={{ left: position.left, top: position.top, visibility: position.visible ? 'visible' : 'hidden' }}
          className="pointer-events-none fixed z-[100] max-w-64 rounded-md bg-neutral-900 px-2.5 py-1.5 text-xs leading-4 text-white shadow-lg"
        >
          {content}
        </span>,
        document.body,
      )}
    </span>
  )
}
