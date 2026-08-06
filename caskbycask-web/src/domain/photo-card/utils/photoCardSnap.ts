import type {
  PhotoCardDataContext,
  PhotoCardLayer,
  PhotoCardLayout,
  PhotoCardPosition,
} from '../types/photoCard.types'
import {
  measureLayerBounds,
  photoRectOf,
  shortSideOf,
  textBaselineYOf,
  toPx,
  type LayerBounds,
  type PhotoCardCanvasSize,
} from './photoCardRender'
import { getDrawableLayers } from './resolveBindings'

/**
 * 오브젝트 정렬·스냅.
 *
 * ── 왜 position 을 직접 계산하지 않는가 ──
 * `layer.position` 은 요소의 중심이지만, 실제로 차지하는 넓이는 타입마다 다르게 정해진다 —
 * 글자는 내용·글꼴·자간을 재 봐야 알고, 외곽선까지 얹히면 또 달라진다.
 * 정렬할 때마다 그 계산을 다시 따라가면 반드시 어딘가 틀린다.
 *
 * 그래서 여기서는 <b>실제 경계(measureLayerBounds)를 재서 "얼마나 움직일지(델타)"만 구하고,
 * 그 델타를 position 에 더한다.</b> 앵커가 무엇인지 알 필요가 없어진다.
 */

export type SnapAxis = 'x' | 'y'

/** 자석 선의 출처. 화면에 그릴 때 색을 달리하고, baseline 은 baseline 끼리만 붙게 하는 데 쓴다. */
export type SnapKind = 'layer' | 'frame' | 'padding' | 'photo' | 'baseline'

export interface SnapLine {
  axis: SnapAxis
  /** 캔버스 좌표(px) */
  value: number
  kind: SnapKind
}

export interface SnapResult {
  dx: number
  dy: number
  /** 실제로 붙은 선만 담는다 — 화면에 이것만 그린다. */
  guides: SnapLine[]
}

export type AlignMode = 'left' | 'centerX' | 'right' | 'top' | 'middleY' | 'bottom' | 'baseline'

export const EMPTY_SNAP: SnapResult = { dx: 0, dy: 0, guides: [] }

const push = (lines: SnapLine[], axis: SnapAxis, value: number, kind: SnapKind) => {
  if (!Number.isFinite(value)) return
  // 같은 자리에 여러 선이 겹치면 화면에 같은 줄이 여러 번 그려진다. 먼저 들어온 쪽을 남긴다.
  if (lines.some((line) => line.axis === axis && Math.abs(line.value - value) < 0.5)) return
  lines.push({ axis, value, kind })
}

/**
 * 움직이지 않는 것들이 만드는 자석 선.
 * @param excludeIds 지금 끌고 있는 요소들 — 자기 자신에게 붙으면 안 된다.
 */
export const collectSnapTargets = (
  ctx: CanvasRenderingContext2D,
  size: PhotoCardCanvasSize,
  layout: PhotoCardLayout,
  context: PhotoCardDataContext,
  excludeIds: Iterable<string> = [],
): SnapLine[] => {
  const excluded = new Set(excludeIds)
  const lines: SnapLine[] = []

  // 카드 자체 — 가장자리와 한가운데
  push(lines, 'x', 0, 'frame')
  push(lines, 'x', size.width / 2, 'frame')
  push(lines, 'x', size.width, 'frame')
  push(lines, 'y', 0, 'frame')
  push(lines, 'y', size.height / 2, 'frame')
  push(lines, 'y', size.height, 'frame')

  // 여백 안쪽 경계 — 정보 밴드 가장자리에 글자를 맞출 때 쓴다
  const shortSide = shortSideOf(size)
  const padding = layout.frame.padding
  push(lines, 'x', toPx(padding.left, shortSide), 'padding')
  push(lines, 'x', size.width - toPx(padding.right, shortSide), 'padding')
  push(lines, 'y', toPx(padding.top, shortSide), 'padding')
  push(lines, 'y', size.height - toPx(padding.bottom, shortSide), 'padding')

  // 사진 액자
  const photo = photoRectOf(layout, size)
  push(lines, 'x', photo.left, 'photo')
  push(lines, 'x', photo.left + photo.width, 'photo')
  push(lines, 'y', photo.top, 'photo')
  push(lines, 'y', photo.top + photo.height, 'photo')

  getDrawableLayers(layout.layers, context).forEach((layer) => {
    if (excluded.has(layer.id)) return
    const bounds = measureLayerBounds(ctx, size, layer, context)
    push(lines, 'x', bounds.left, 'layer')
    push(lines, 'x', (bounds.left + bounds.right) / 2, 'layer')
    push(lines, 'x', bounds.right, 'layer')
    push(lines, 'y', bounds.top, 'layer')
    push(lines, 'y', (bounds.top + bounds.bottom) / 2, 'layer')
    push(lines, 'y', bounds.bottom, 'layer')

    // 글자 크기가 달라도 밑줄을 맞출 수 있게 baseline 을 따로 실어 준다.
    const baseline = textBaselineYOf(ctx, size, layer, context)
    if (baseline != null) push(lines, 'y', baseline, 'baseline')
  })

  return lines
}

interface SnapHit {
  delta: number
  guide: SnapLine
}

const nearest = (
  anchors: number[],
  targets: SnapLine[],
  axis: SnapAxis,
  tolerance: number,
  accept: (kind: SnapKind) => boolean,
): SnapHit | null => {
  let bestDelta = Number.POSITIVE_INFINITY
  let bestGuide: SnapLine | null = null
  for (const target of targets) {
    if (target.axis !== axis || !accept(target.kind)) continue
    for (const anchor of anchors) {
      const delta = target.value - anchor
      if (Math.abs(delta) > tolerance || Math.abs(delta) >= Math.abs(bestDelta)) continue
      bestDelta = delta
      bestGuide = target
    }
  }
  return bestGuide ? { delta: bestDelta, guide: bestGuide } : null
}

/**
 * 이동 중인 경계를 가장 가까운 자석 선에 붙인다.
 *
 * baseline 은 baseline 끼리만 붙는다 — 글자 밑줄이 남의 상자 모서리에 들러붙으면
 * 왜 여기서 멈췄는지 알 수 없는 움직임이 된다.
 *
 * @param tolerance 캔버스 좌표 기준 허용 오차. 화면 px 를 확대율로 나눠 넘긴다.
 */
export const applySnap = (
  bounds: LayerBounds,
  baselineY: number | null,
  targets: SnapLine[],
  tolerance: number,
): SnapResult => {
  const horizontal = nearest(
    [bounds.left, (bounds.left + bounds.right) / 2, bounds.right],
    targets, 'x', tolerance, () => true,
  )

  const edges = nearest(
    [bounds.top, (bounds.top + bounds.bottom) / 2, bounds.bottom],
    targets, 'y', tolerance, (kind) => kind !== 'baseline',
  )
  const baseline = baselineY == null ? null : nearest(
    [baselineY], targets, 'y', tolerance, (kind) => kind === 'baseline',
  )
  // 둘 다 걸리면 더 가까운 쪽을 택한다.
  const vertical = !baseline ? edges
    : !edges ? baseline
      : Math.abs(baseline.delta) <= Math.abs(edges.delta) ? baseline : edges

  return {
    dx: horizontal?.delta ?? 0,
    dy: vertical?.delta ?? 0,
    guides: [horizontal?.guide, vertical?.guide].filter((guide): guide is SnapLine => Boolean(guide)),
  }
}

// ── 정렬 · 분배 ────────────────────────────────────────────────

interface Measured {
  layer: PhotoCardLayer
  bounds: LayerBounds
  baselineY: number | null
}

const measureAll = (
  ctx: CanvasRenderingContext2D,
  size: PhotoCardCanvasSize,
  layers: PhotoCardLayer[],
  context: PhotoCardDataContext,
): Measured[] => layers.map((layer) => ({
  layer,
  bounds: measureLayerBounds(ctx, size, layer, context),
  baselineY: textBaselineYOf(ctx, size, layer, context),
}))

const shifted = (
  layer: PhotoCardLayer,
  size: PhotoCardCanvasSize,
  dx: number,
  dy: number,
): PhotoCardPosition => ({
  x: layer.position.x + dx / size.width,
  y: layer.position.y + dy / size.height,
})

/**
 * 선택한 요소들을 서로 맞춘다. 기준은 선택 묶음 전체의 바깥 사각형이다.
 *
 * 'baseline' 은 TEXT 만 대상으로 하고, 선택 안에서 <b>가장 큰 글자</b>의 밑줄을 기준으로 삼는다 —
 * 제목에 부제를 맞추는 것이 그 반대보다 자연스럽다.
 *
 * @returns layerId → 새 position. 움직일 필요가 없는 요소는 담기지 않는다.
 */
export const alignLayers = (
  ctx: CanvasRenderingContext2D,
  size: PhotoCardCanvasSize,
  layers: PhotoCardLayer[],
  context: PhotoCardDataContext,
  mode: AlignMode,
): Map<string, PhotoCardPosition> => {
  const result = new Map<string, PhotoCardPosition>()
  if (layers.length < 2) return result

  const measured = measureAll(ctx, size, layers, context)

  if (mode === 'baseline') {
    const texts = measured
      .map((item) => ({ ...item, baselineY: item.baselineY }))
      .filter((item): item is Measured & { baselineY: number } => item.baselineY != null)
    if (texts.length < 2) return result
    const anchor = texts.reduce((largest, item) => (
      (item.layer.fontSizeRatio ?? 0.04) > (largest.layer.fontSizeRatio ?? 0.04) ? item : largest
    ), texts[0])
    texts.forEach((item) => {
      if (item.layer.id === anchor.layer.id) return
      result.set(item.layer.id, shifted(item.layer, size, 0, anchor.baselineY - item.baselineY))
    })
    return result
  }

  const box = measured.reduce((acc, { bounds }) => ({
    left: Math.min(acc.left, bounds.left),
    top: Math.min(acc.top, bounds.top),
    right: Math.max(acc.right, bounds.right),
    bottom: Math.max(acc.bottom, bounds.bottom),
  }), { ...measured[0].bounds })

  measured.forEach(({ layer, bounds }) => {
    let dx = 0
    let dy = 0
    switch (mode) {
      case 'left': dx = box.left - bounds.left; break
      case 'centerX': dx = (box.left + box.right) / 2 - (bounds.left + bounds.right) / 2; break
      case 'right': dx = box.right - bounds.right; break
      case 'top': dy = box.top - bounds.top; break
      case 'middleY': dy = (box.top + box.bottom) / 2 - (bounds.top + bounds.bottom) / 2; break
      case 'bottom': dy = box.bottom - bounds.bottom; break
      default: break
    }
    if (dx === 0 && dy === 0) return
    result.set(layer.id, shifted(layer, size, dx, dy))
  })
  return result
}

/**
 * 양 끝은 그대로 두고 사이 간격을 똑같이 벌린다. 3개 미만이면 벌릴 사이가 없다.
 */
export const distributeLayers = (
  ctx: CanvasRenderingContext2D,
  size: PhotoCardCanvasSize,
  layers: PhotoCardLayer[],
  context: PhotoCardDataContext,
  axis: SnapAxis,
): Map<string, PhotoCardPosition> => {
  const result = new Map<string, PhotoCardPosition>()
  if (layers.length < 3) return result

  const start = (bounds: LayerBounds) => (axis === 'x' ? bounds.left : bounds.top)
  const extent = (bounds: LayerBounds) => (
    axis === 'x' ? bounds.right - bounds.left : bounds.bottom - bounds.top
  )

  const sorted = measureAll(ctx, size, layers, context)
    .sort((a, b) => start(a.bounds) - start(b.bounds))

  const first = sorted[0]
  const last = sorted[sorted.length - 1]
  const span = (start(last.bounds) + extent(last.bounds)) - start(first.bounds)
  const occupied = sorted.reduce((sum, item) => sum + extent(item.bounds), 0)
  const gap = (span - occupied) / (sorted.length - 1)

  let cursor = start(first.bounds) + extent(first.bounds) + gap
  sorted.slice(1, -1).forEach((item) => {
    const delta = cursor - start(item.bounds)
    if (delta !== 0) {
      result.set(item.layer.id, shifted(
        item.layer, size, axis === 'x' ? delta : 0, axis === 'y' ? delta : 0,
      ))
    }
    cursor += extent(item.bounds) + gap
  })
  return result
}
