import { useRef } from 'react'
import type { LayerBounds, PhotoCardCanvasSize } from '../utils/photoCardRender'
import type { SnapLine } from '../utils/photoCardSnap'

/** 화면 기준 크기(px). displayScale 로 나눠 캔버스 좌표로 환산하므로 확대해도 굵기가 일정하다. */
const OUTLINE_WIDTH = 1.5
const GUIDE_WIDTH = 1
const HANDLE_RADIUS = 5
const ROTATE_ARM = 26
/** 삭제 버튼을 상자 모서리에서 얼마나 대각선으로 띄울지(화면 px) */
const REMOVE_OFFSET = 13

export type ResizeCorner = 'nw' | 'ne' | 'se' | 'sw'

export interface TransformDelta {
  /** 시작 시점 대비 크기 배수 */
  scale: number
  /** 잡은 손잡이의 대각선 반대편 모서리 — 이 점이 제자리에 있어야 자연스럽다 */
  anchor: { x: number; y: number }
}

interface Props {
  size: PhotoCardCanvasSize
  /** 화면 px ÷ 캔버스 px */
  displayScale: number
  /** 선택된 요소 각각의 경계 */
  selection: LayerBounds[]
  /** 스냅이 걸린 순간에만 채워진다 */
  guides: SnapLine[]
  /** 하나만 골랐고 잠기지 않았을 때만 손잡이를 보여 준다 */
  showHandles: boolean
  /** ✕ 를 그릴지 — 빠른 편집 바가 뜨는 글자에서는 그 바의 삭제 버튼에 자리를 넘긴다 */
  showRemove: boolean
  /** 단일 선택 요소의 현재 회전각(도) */
  rotation: number
  onResize: (delta: TransformDelta) => void
  onRotate: (degrees: number) => void
  onTransformEnd: () => void
  /** 선택 상자 옆 ✕ — 패널까지 가지 않고 그 자리에서 지운다 */
  onRemove: () => void
}

const CORNERS: { key: ResizeCorner; fromX: 'left' | 'right'; fromY: 'top' | 'bottom' }[] = [
  { key: 'nw', fromX: 'left', fromY: 'top' },
  { key: 'ne', fromX: 'right', fromY: 'top' },
  { key: 'se', fromX: 'right', fromY: 'bottom' },
  { key: 'sw', fromX: 'left', fromY: 'bottom' },
]

const CURSORS: Record<ResizeCorner, string> = {
  nw: 'nwse-resize', ne: 'nesw-resize', se: 'nwse-resize', sw: 'nesw-resize',
}

/**
 * 선택 표시·스냅 가이드선·변형 손잡이.
 *
 * 캔버스와 정확히 겹치는 SVG 다. viewBox 가 캔버스 해상도라 좌표를 그대로 쓸 수 있고,
 * 선 굵기·손잡이 크기만 displayScale 로 나눠 화면에서 늘 같은 두께로 보이게 한다.
 */
export default function PhotoCardOverlay({
  size, displayScale, selection, guides, showHandles, showRemove, rotation,
  onResize, onRotate, onTransformEnd, onRemove,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const dragRef = useRef<
    | { mode: 'resize'; anchor: { x: number; y: number }; startDistance: number }
    | { mode: 'rotate'; center: { x: number; y: number }; startAngle: number; startRotation: number }
    | null
  >(null)

  const unit = (screenPx: number) => screenPx / Math.max(displayScale, 0.0001)

  const toCanvasPoint = (event: React.PointerEvent) => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect || rect.width === 0) return null
    return {
      x: ((event.clientX - rect.left) / rect.width) * size.width,
      y: ((event.clientY - rect.top) / rect.height) * size.height,
    }
  }

  const box = selection.length === 0 ? null : selection.reduce((acc, bounds) => ({
    left: Math.min(acc.left, bounds.left),
    top: Math.min(acc.top, bounds.top),
    right: Math.max(acc.right, bounds.right),
    bottom: Math.max(acc.bottom, bounds.bottom),
  }), { ...selection[0] })

  const startResize = (corner: ResizeCorner) => (event: React.PointerEvent) => {
    if (!box) return
    const point = toCanvasPoint(event)
    if (!point) return
    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    // 잡은 손잡이의 대각선 반대편을 고정점으로 삼는다.
    const anchor = {
      x: corner === 'nw' || corner === 'sw' ? box.right : box.left,
      y: corner === 'nw' || corner === 'ne' ? box.bottom : box.top,
    }
    dragRef.current = {
      mode: 'resize',
      anchor,
      // 0 으로 나누지 않게 최소값을 둔다. 손잡이를 고정점 위에 정확히 겹쳐 잡는 경우가 있다.
      startDistance: Math.max(Math.hypot(point.x - anchor.x, point.y - anchor.y), 1),
    }
  }

  const startRotate = (event: React.PointerEvent) => {
    if (!box) return
    const point = toCanvasPoint(event)
    if (!point) return
    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    const center = { x: (box.left + box.right) / 2, y: (box.top + box.bottom) / 2 }
    dragRef.current = {
      mode: 'rotate',
      center,
      startAngle: Math.atan2(point.y - center.y, point.x - center.x),
      startRotation: rotation,
    }
  }

  const handleMove = (event: React.PointerEvent) => {
    const drag = dragRef.current
    if (!drag) return
    const point = toCanvasPoint(event)
    if (!point) return
    event.preventDefault()
    event.stopPropagation()

    if (drag.mode === 'resize') {
      const distance = Math.hypot(point.x - drag.anchor.x, point.y - drag.anchor.y)
      onResize({ scale: distance / drag.startDistance, anchor: drag.anchor })
      return
    }
    const angle = Math.atan2(point.y - drag.center.y, point.x - drag.center.x)
    const degrees = drag.startRotation + ((angle - drag.startAngle) * 180) / Math.PI
    // Shift 로 15도 단위 — 수평·수직·대각선에 정확히 맞추기 위한 것이다.
    onRotate(event.shiftKey ? Math.round(degrees / 15) * 15 : degrees)
  }

  const handleUp = () => {
    if (!dragRef.current) return
    // 포인터 캡처는 손잡이(<rect>/<circle>)에 걸려 있고, 이 핸들러는 부모 <g> 에 붙어 있다.
    // 브라우저가 pointerup·pointercancel 에서 캡처를 자동으로 풀어 주므로 따로 풀지 않는다.
    dragRef.current = null
    onTransformEnd()
  }

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${size.width} ${size.height}`}
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden="true"
    >
      {/* 스냅 가이드 — 카드 밖까지 이어 그려야 어디에 붙었는지 한눈에 보인다 */}
      {guides.map((guide) => (
        <line
          key={`${guide.axis}-${guide.kind}-${Math.round(guide.value)}`}
          x1={guide.axis === 'x' ? guide.value : 0}
          x2={guide.axis === 'x' ? guide.value : size.width}
          y1={guide.axis === 'y' ? guide.value : 0}
          y2={guide.axis === 'y' ? guide.value : size.height}
          stroke={guide.kind === 'baseline' ? '#0ea5e9' : '#ec4899'}
          strokeWidth={unit(GUIDE_WIDTH)}
          strokeDasharray={guide.kind === 'baseline' ? `${unit(6)} ${unit(4)}` : undefined}
        />
      ))}

      {/* 선택 표시 — 여러 개를 골랐으면 각각 얇게, 전체를 감싸는 상자를 하나 더 */}
      {selection.map((bounds) => (
        <rect
          key={`${bounds.left}-${bounds.top}-${bounds.right}`}
          x={bounds.left}
          y={bounds.top}
          width={Math.max(bounds.right - bounds.left, 1)}
          height={Math.max(bounds.bottom - bounds.top, 1)}
          fill="none"
          stroke="rgba(217, 119, 6, 0.95)"
          strokeWidth={unit(OUTLINE_WIDTH)}
          strokeDasharray={`${unit(5)} ${unit(4)}`}
        />
      ))}
      {box && selection.length > 1 && (
        <rect
          x={box.left}
          y={box.top}
          width={Math.max(box.right - box.left, 1)}
          height={Math.max(box.bottom - box.top, 1)}
          fill="none"
          stroke="rgba(217, 119, 6, 0.45)"
          strokeWidth={unit(OUTLINE_WIDTH)}
        />
      )}

      {box && showHandles && (
        <g
          className="pointer-events-auto"
          onPointerMove={handleMove}
          onPointerUp={handleUp}
          onPointerCancel={handleUp}
        >
          <line
            x1={(box.left + box.right) / 2}
            y1={box.top}
            x2={(box.left + box.right) / 2}
            y2={box.top - unit(ROTATE_ARM)}
            stroke="rgba(217, 119, 6, 0.95)"
            strokeWidth={unit(OUTLINE_WIDTH)}
          />
          <circle
            cx={(box.left + box.right) / 2}
            cy={box.top - unit(ROTATE_ARM)}
            r={unit(HANDLE_RADIUS)}
            fill="#ffffff"
            stroke="rgba(217, 119, 6, 0.95)"
            strokeWidth={unit(OUTLINE_WIDTH)}
            style={{ cursor: 'grab' }}
            onPointerDown={startRotate}
          />
          {CORNERS.map((corner) => (
            <rect
              key={corner.key}
              x={box[corner.fromX] - unit(HANDLE_RADIUS)}
              y={box[corner.fromY] - unit(HANDLE_RADIUS)}
              width={unit(HANDLE_RADIUS * 2)}
              height={unit(HANDLE_RADIUS * 2)}
              fill="#ffffff"
              stroke="rgba(217, 119, 6, 0.95)"
              strokeWidth={unit(OUTLINE_WIDTH)}
              style={{ cursor: CURSORS[corner.key] }}
              onPointerDown={startResize(corner.key)}
            />
          ))}

          {/* 삭제 — 상자 오른쪽 위 바깥에 붙인다. 모서리 손잡이와 겹치지 않게 대각선으로 띄운다. */}
          {showRemove && (
            <g
              style={{ cursor: 'pointer' }}
              onPointerDown={(event) => {
                event.preventDefault()
                event.stopPropagation()
                onRemove()
              }}
            >
              <circle
                cx={box.right + unit(REMOVE_OFFSET)}
                cy={box.top - unit(REMOVE_OFFSET)}
                r={unit(HANDLE_RADIUS + 2)}
                fill="#ffffff"
                stroke="#dc2626"
                strokeWidth={unit(OUTLINE_WIDTH)}
              />
              <path
                d={`M${box.right + unit(REMOVE_OFFSET - 3)} ${box.top - unit(REMOVE_OFFSET + 3)}
                    l${unit(6)} ${unit(6)}
                    M${box.right + unit(REMOVE_OFFSET + 3)} ${box.top - unit(REMOVE_OFFSET + 3)}
                    l${-unit(6)} ${unit(6)}`}
                stroke="#dc2626"
                strokeWidth={unit(OUTLINE_WIDTH)}
                strokeLinecap="round"
                fill="none"
              />
            </g>
          )}
        </g>
      )}
    </svg>
  )
}
