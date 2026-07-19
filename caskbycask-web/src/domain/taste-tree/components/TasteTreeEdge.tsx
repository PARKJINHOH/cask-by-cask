import { useCallback, useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  getStraightPath,
  useReactFlow,
  type Edge,
  type EdgeProps,
  type XYPosition,
} from '@xyflow/react'
import type { TasteTreeEdge as TasteTreeEdgeContent } from '../types/tasteTree.types'

interface TasteTreeEdgeData extends Record<string, unknown> {
  edge: TasteTreeEdgeContent
  label: string
  editable: boolean
  active: boolean
  labelMoveAria: string
  onSelectEdge?: (edgeKey: string) => void
  onUpdateEdge?: (edgeKey: string, patch: Partial<TasteTreeEdgeContent>) => void
}

export type TasteTreeFlowEdge = Edge<TasteTreeEdgeData, 'taste-tree-edge'>

const DEFAULT_LABEL_POSITION = 0.5

function clampPosition(value?: number | null) {
  if (value == null || !Number.isFinite(value)) return DEFAULT_LABEL_POSITION
  return Math.min(0.92, Math.max(0.08, value))
}

function pointAt(path: SVGPathElement | null, position: number, fallback: XYPosition): XYPosition {
  if (!path) return fallback
  const length = path.getTotalLength()
  const point = path.getPointAtLength(length * clampPosition(position))
  return { x: point.x, y: point.y }
}

function closestPositionOnPath(path: SVGPathElement, target: XYPosition) {
  const length = path.getTotalLength()
  let bestPosition = DEFAULT_LABEL_POSITION
  let bestDistance = Number.POSITIVE_INFINITY
  const samples = 72

  for (let index = 0; index <= samples; index += 1) {
    const position = index / samples
    const point = path.getPointAtLength(length * position)
    const distance = (point.x - target.x) ** 2 + (point.y - target.y) ** 2
    if (distance < bestDistance) {
      bestDistance = distance
      bestPosition = position
    }
  }

  let range = 1 / samples
  for (let round = 0; round < 3; round += 1) {
    const start = Math.max(0.08, bestPosition - range)
    const end = Math.min(0.92, bestPosition + range)
    for (let index = 0; index <= 12; index += 1) {
      const position = start + (end - start) * (index / 12)
      const point = path.getPointAtLength(length * position)
      const distance = (point.x - target.x) ** 2 + (point.y - target.y) ** 2
      if (distance < bestDistance) {
        bestDistance = distance
        bestPosition = position
      }
    }
    range /= 5
  }

  return clampPosition(bestPosition)
}

export default function TasteTreeEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  style,
  interactionWidth,
  selected,
  data,
}: EdgeProps<TasteTreeFlowEdge>) {
  const pathParams = { sourceX, sourceY, targetX, targetY }
  const [edgePath, defaultLabelX, defaultLabelY] = data?.edge.lineType === 'STRAIGHT'
    ? getStraightPath(pathParams)
    : getSmoothStepPath({
        ...pathParams,
        sourcePosition,
        targetPosition,
        borderRadius: 8,
      })
  const pathRef = useRef<SVGPathElement | null>(null)
  const positionRef = useRef(clampPosition(data?.edge.labelPosition))
  const [labelPosition, setLabelPosition] = useState(positionRef.current)
  const [labelPoint, setLabelPoint] = useState<XYPosition>({ x: defaultLabelX, y: defaultLabelY })
  const draggingRef = useRef(false)
  const { screenToFlowPosition } = useReactFlow()

  const updateLabelPoint = useCallback((position: number) => {
    setLabelPoint(pointAt(pathRef.current, position, { x: defaultLabelX, y: defaultLabelY }))
  }, [defaultLabelX, defaultLabelY])

  useEffect(() => {
    const nextPosition = clampPosition(data?.edge.labelPosition)
    positionRef.current = nextPosition
    setLabelPosition(nextPosition)
  }, [data?.edge.labelPosition])

  useLayoutEffect(() => {
    updateLabelPoint(labelPosition)
  }, [edgePath, labelPosition, updateLabelPoint])

  const moveLabel = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current || !pathRef.current) return
    const flowPoint = screenToFlowPosition({ x: event.clientX, y: event.clientY })
    const nextPosition = closestPositionOnPath(pathRef.current, flowPoint)
    positionRef.current = nextPosition
    setLabelPosition(nextPosition)
    updateLabelPoint(nextPosition)
  }

  const finishDragging = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return
    draggingRef.current = false
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    data?.onUpdateEdge?.(id, { labelPosition: Math.round(positionRef.current * 10_000) / 10_000 })
  }

  return <>
    <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} style={style} interactionWidth={interactionWidth} />
    <path ref={pathRef} d={edgePath} fill="none" stroke="transparent" strokeWidth="1" pointerEvents="none" />
    <EdgeLabelRenderer>
      <div
        role={data?.editable ? 'button' : undefined}
        aria-label={data?.editable ? data.labelMoveAria : undefined}
        tabIndex={data?.editable ? 0 : undefined}
        className={`taste-tree-edge-label nodrag nopan absolute max-w-[260px] break-keep rounded-lg border px-3 py-1.5 text-center text-[13px] font-black leading-5 shadow-sm ${
          data?.active
            ? 'border-amber-300 bg-amber-100 text-amber-950'
            : selected
              ? 'border-stone-500 bg-white text-stone-950'
              : 'border-stone-200 bg-[#fafaf9] text-stone-700'
        } ${data?.editable ? 'cursor-grab select-none active:cursor-grabbing' : ''}`}
        style={{
          transform: `translate(-50%, -50%) translate(${labelPoint.x}px, ${labelPoint.y}px)`,
          pointerEvents: data?.editable ? 'all' : 'none',
          zIndex: 1,
          isolation: 'isolate',
        }}
        onPointerDown={(event) => {
          event.stopPropagation()
          data?.onSelectEdge?.(id)
          if (!data?.editable) return
          draggingRef.current = true
          event.currentTarget.setPointerCapture(event.pointerId)
        }}
        onPointerMove={moveLabel}
        onPointerUp={finishDragging}
        onPointerCancel={finishDragging}
        onClick={(event) => event.stopPropagation()}
      >
        {data?.label}
      </div>
    </EdgeLabelRenderer>
  </>
}
