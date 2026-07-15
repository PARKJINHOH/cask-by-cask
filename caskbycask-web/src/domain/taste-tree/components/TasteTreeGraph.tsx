import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { useTranslation } from 'react-i18next'
import type { TasteTreeContent } from '../types/tasteTree.types'

interface TasteTreeGraphProps {
  content: TasteTreeContent
  activeNodeKeys?: string[]
  focusNodeKey?: string
  compact?: boolean
  onNodeClick?: (nodeKey: string) => void
}

const NODE_WIDTH = 184
const NODE_HEIGHT = 76
const VIEW_PADDING = 20
const MAX_ZOOM = 1.8

interface GraphView {
  scale: number
  x: number
  y: number
}

interface DragStart {
  pointerId: number
  startX: number
  startY: number
  viewX: number
  viewY: number
}

export default function TasteTreeGraph({
  content,
  activeNodeKeys = [],
  focusNodeKey,
  compact = false,
  onNodeClick,
}: TasteTreeGraphProps) {
  const { i18n, t } = useTranslation()
  const isEn = i18n.language === 'en'
  const viewportRef = useRef<HTMLDivElement>(null)
  const dragStartRef = useRef<DragStart | null>(null)
  const draggedRef = useRef(false)
  const previousFocusKeyRef = useRef(focusNodeKey)
  const [fitScale, setFitScale] = useState(1)
  const [view, setView] = useState<GraphView>({ scale: 1, x: VIEW_PADDING, y: VIEW_PADDING })
  const [dragging, setDragging] = useState(false)
  const active = useMemo(() => new Set(activeNodeKeys), [activeNodeKeys])
  const nodes = content.nodes ?? []
  const positions = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>()
    nodes.forEach((node, index) => {
      map.set(node.key, {
        x: node.positionX ?? 40 + (index % 4) * 230,
        y: node.positionY ?? 30 + Math.floor(index / 4) * 150,
      })
    })
    return map
  }, [nodes])
  const width = Math.max(760, ...Array.from(positions.values()).map((p) => p.x + NODE_WIDTH + 60))
  const height = Math.max(440, ...Array.from(positions.values()).map((p) => p.y + NODE_HEIGHT + 60))

  const centeredView = useCallback((scale: number) => {
    const viewport = viewportRef.current
    if (!viewport) return { scale, x: VIEW_PADDING, y: VIEW_PADDING }
    return {
      scale,
      x: Math.max(VIEW_PADDING, (viewport.clientWidth - width * scale) / 2),
      y: Math.max(VIEW_PADDING, (viewport.clientHeight - height * scale) / 2),
    }
  }, [height, width])

  const fitView = useCallback(() => {
    const viewport = viewportRef.current
    if (!viewport) return
    const nextScale = Math.min(
      1,
      Math.max(0.1, (viewport.clientWidth - VIEW_PADDING * 2) / width),
      Math.max(0.1, (viewport.clientHeight - VIEW_PADDING * 2) / height),
    )
    setFitScale(nextScale)
    setView(centeredView(nextScale))
  }, [centeredView, height, width])

  useLayoutEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return
    fitView()
    const observer = new ResizeObserver(fitView)
    observer.observe(viewport)
    return () => observer.disconnect()
  }, [fitView])

  const zoomAt = useCallback((nextScale: number, focusX: number, focusY: number) => {
    const clampedScale = Math.min(MAX_ZOOM, Math.max(fitScale, nextScale))
    if (clampedScale <= fitScale + 0.001) {
      setView(centeredView(fitScale))
      return
    }
    setView((previous) => {
      const contentX = (focusX - previous.x) / previous.scale
      const contentY = (focusY - previous.y) / previous.scale
      return {
        scale: clampedScale,
        x: focusX - contentX * clampedScale,
        y: focusY - contentY * clampedScale,
      }
    })
  }, [centeredView, fitScale])

  const zoomFromCenter = (factor: number) => {
    const viewport = viewportRef.current
    if (!viewport) return
    zoomAt(view.scale * factor, viewport.clientWidth / 2, viewport.clientHeight / 2)
  }

  const handleWheel = useCallback((event: WheelEvent) => {
    const viewport = viewportRef.current
    if (!viewport) return
    event.preventDefault()
    const bounds = viewport.getBoundingClientRect()
    zoomAt(
      view.scale * (event.deltaY < 0 ? 1.12 : 1 / 1.12),
      event.clientX - bounds.left,
      event.clientY - bounds.top,
    )
  }, [view.scale, zoomAt])

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return
    viewport.addEventListener('wheel', handleWheel, { passive: false })
    return () => viewport.removeEventListener('wheel', handleWheel)
  }, [handleWheel])

  useEffect(() => {
    if (!focusNodeKey || previousFocusKeyRef.current === focusNodeKey) return
    previousFocusKeyRef.current = focusNodeKey

    const viewport = viewportRef.current
    const position = positions.get(focusNodeKey)
    if (!viewport || !position) return

    const nextScale = Math.min(MAX_ZOOM, Math.max(0.62, Math.min(1.15, fitScale * 1.7)))
    const nodeCenterX = position.x + NODE_WIDTH / 2
    const nodeCenterY = position.y + NODE_HEIGHT / 2
    setView({
      scale: nextScale,
      x: viewport.clientWidth / 2 - nodeCenterX * nextScale,
      y: viewport.clientHeight / 2 - nodeCenterY * nextScale,
    })
  }, [fitScale, focusNodeKey, positions])

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    draggedRef.current = false
    dragStartRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      viewX: view.x,
      viewY: view.y,
    }
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = dragStartRef.current
    if (!start || start.pointerId !== event.pointerId) return
    const deltaX = event.clientX - start.startX
    const deltaY = event.clientY - start.startY
    if (!draggedRef.current && Math.hypot(deltaX, deltaY) < 4) return

    if (!draggedRef.current) {
      draggedRef.current = true
      event.currentTarget.setPointerCapture(event.pointerId)
      setDragging(true)
    }
    event.preventDefault()
    setView((previous) => ({
      ...previous,
      x: start.viewX + deltaX,
      y: start.viewY + deltaY,
    }))
  }

  const finishDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragStartRef.current?.pointerId !== event.pointerId) return
    const wasDragged = draggedRef.current
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    dragStartRef.current = null
    setDragging(false)
    if (wasDragged) {
      window.setTimeout(() => {
        draggedRef.current = false
      }, 0)
    }
  }

  const suppressClickAfterDrag = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (!draggedRef.current) return
    event.preventDefault()
    event.stopPropagation()
    draggedRef.current = false
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-stone-50">
      <div className="flex items-center justify-between border-b border-neutral-200 bg-white px-3 py-2">
        <p className="text-xs font-bold text-neutral-700">{t('tasteTree.fullTree')}</p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => zoomFromCenter(1 / 1.12)}
            className="h-7 rounded-md border border-neutral-300 px-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-50"
            aria-label={t('tasteTree.zoomOut')}
          >
            {t('tasteTree.zoomOut')}
          </button>
          <button
            type="button"
            onClick={() => zoomFromCenter(1.12)}
            className="h-7 rounded-md border border-neutral-300 px-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-50"
            aria-label={t('tasteTree.zoomIn')}
          >
            {t('tasteTree.zoomIn')}
          </button>
          <button
            type="button"
            onClick={fitView}
            className="h-7 rounded-md border border-neutral-300 px-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-50"
          >
            {t('tasteTree.resetView')}
          </button>
        </div>
      </div>
      <div
        ref={viewportRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
        onClickCapture={suppressClickAfterDrag}
        className={`${compact ? 'h-[390px]' : 'h-[560px]'} relative touch-none select-none overflow-hidden overscroll-contain ${dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      >
        <div
          className={`absolute left-0 top-0 origin-top-left will-change-transform ${dragging ? '' : 'transition-transform duration-300 ease-out'}`}
          style={{ width, height, transform: `translate3d(${view.x}px, ${view.y}px, 0) scale(${view.scale})` }}
        >
          <svg className="absolute inset-0 h-full w-full" viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
            {nodes.flatMap((node) =>
              (node.options ?? []).map((option) => {
                const source = positions.get(node.key)
                const target = positions.get(option.targetNodeKey)
                if (!source || !target) return null
                const highlighted = active.has(node.key) && active.has(option.targetNodeKey)
                const x1 = source.x + NODE_WIDTH / 2
                const y1 = source.y + NODE_HEIGHT
                const x2 = target.x + NODE_WIDTH / 2
                const y2 = target.y
                const midY = y1 + (y2 - y1) / 2
                return (
                  <path
                    key={`${node.key}-${option.key}`}
                    d={`M ${x1} ${y1} V ${midY} H ${x2} V ${y2}`}
                    fill="none"
                    stroke={highlighted ? '#b45309' : '#d6d3d1'}
                    strokeWidth={highlighted ? 4 : 2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={highlighted ? 1 : 0.6}
                  />
                )
              }),
            )}
          </svg>
          {nodes.map((node) => {
            const position = positions.get(node.key)!
            const highlighted = active.has(node.key)
            const title = isEn ? node.titleEn || node.titleKo : node.titleKo
            return (
              <button
                key={node.key}
                type="button"
                onClick={() => onNodeClick?.(node.key)}
                disabled={!onNodeClick}
                className={`absolute flex flex-col items-center justify-center rounded-2xl border px-3 text-center shadow-sm transition-colors ${
                  highlighted
                    ? 'border-amber-600 bg-amber-50 text-amber-950 shadow-amber-100'
                    : node.type === 'RESULT'
                      ? 'border-stone-300 bg-stone-100 text-stone-700'
                      : 'border-neutral-200 bg-white text-neutral-600'
                } ${onNodeClick ? 'cursor-pointer hover:border-amber-400' : 'pointer-events-none cursor-default'}`}
                style={{ left: position.x, top: position.y, width: NODE_WIDTH, minHeight: NODE_HEIGHT }}
              >
                <span className="mb-1 text-[10px] font-bold uppercase tracking-wider text-amber-700">
                  {node.type}
                </span>
                <span className="line-clamp-2 text-xs font-bold leading-4">{title}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
