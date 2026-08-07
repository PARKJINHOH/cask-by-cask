import { useMemo, useRef, useState, type RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import useIsDesktop from '@/shared/hooks/useIsDesktop'
import type { PhotoCardEditor } from '../hooks/usePhotoCardEditor'
import type { PhotoCardViewport } from '../hooks/usePhotoCardViewport'
import type { PhotoCardLayer, PhotoCardPosition } from '../types/photoCard.types'
import { normalizeLayer } from '../utils/layoutSchema'
import {
  findLayerAtPoint,
  measureLayerBounds,
  photoPlacementOf,
  photoRectOf,
  textBaselineYOf,
  type LayerBounds,
  type PhotoCardCanvasSize,
} from '../utils/photoCardRender'
import {
  applySnap, collectSnapTargets, type SnapLine,
} from '../utils/photoCardSnap'
import PhotoCardCanvas from './PhotoCardCanvas'
import PhotoCardNudgePad from './PhotoCardNudgePad'
import PhotoCardOverlay, { type TransformDelta } from './PhotoCardOverlay'
import PhotoCardQuickBar, { showsQuickBar } from './PhotoCardQuickBar'

interface Props {
  editor: PhotoCardEditor
  viewport: PhotoCardViewport
  size: PhotoCardCanvasSize
  /** 페이지가 들고 있다 — 정렬 도구도 같은 캔버스로 글자 폭을 재야 결과가 어긋나지 않는다. */
  canvasRef: RefObject<HTMLCanvasElement | null>
  onRequestPhoto: () => void
}

/** 손끝으로도 집을 수 있는 여유(화면 px). 확대율로 나눠 캔버스 좌표로 환산한다. */
const HIT_PADDING = 10
/** 자석이 걸리는 거리(화면 px) */
const SNAP_TOLERANCE = 6
/**
 * 이만큼(화면 px) 움직이기 전에는 끌기로 보지 않는다.
 *
 * 없으면 '클릭'이 곧 미세한 끌기가 된다 — 누르고 떼는 사이에 손이 2~3px 흔들리는 것은 정상인데,
 * 그때마다 사진이나 요소가 조금씩 밀려 카드가 어느새 한쪽으로 치우친다.
 * 윈도우의 기본 끌기 문턱(4px)보다 조금 넉넉하게 잡는다.
 */
const DRAG_THRESHOLD = 5

/** 작업 영역 아래 겹쳐 놓는 것들(안내 문구·미세 이동 패드)이 바닥에서 띄우는 거리(화면 px). */
const OVERLAY_GAP = 12
/** 빠른 편집 바가 아래에 붙어 있을 때 그 위로 비켜서는 거리(화면 px). */
const DOCKED_BAR_GAP = 58

interface DragBase {
  pointerId: number
  origin: { x: number; y: number }
  /** 문턱을 넘어 실제 끌기가 시작됐는가 */
  armed: boolean
}

interface LayerDrag extends DragBase {
  kind: 'layer'
  ids: string[]
  startPositions: Map<string, PhotoCardPosition>
  startBox: LayerBounds
  startBaselineY: number | null
  targets: SnapLine[]
}

interface PhotoDrag extends DragBase {
  kind: 'photo'
  startOffset: { x: number; y: number }
  slackX: number
  slackY: number
}

/**
 * 중앙 작업 영역.
 *
 * 캔버스(그림) · 오버레이(선택·가이드·손잡이) · 뷰포트(확대·이동)를 한자리에 묶고,
 * 포인터 입력을 해석해 편집기 상태로 옮긴다.
 */
export default function PhotoCardStage({
  editor, viewport, size, canvasRef, onRequestPhoto,
}: Props) {
  const { t } = useTranslation()
  // 빠른 편집 바를 카드 위에 띄울지(넓은 화면), 작업 영역 아래에 붙일지(좁은 화면).
  // 어디에 그리느냐의 문제라 CSS 로는 나눌 수 없다 — 붙임 형태는 카드가 아니라 작업 영역의 자식이다.
  const isDesktop = useIsDesktop()
  const dragRef = useRef<LayerDrag | PhotoDrag | null>(null)
  const resizeBaseRef = useRef<{ layer: PhotoCardLayer; bounds: LayerBounds } | null>(null)
  const [guides, setGuides] = useState<SnapLine[]>([])

  const displayWidth = size.width * viewport.zoom
  const displayHeight = size.height * viewport.zoom
  /** 화면 px ÷ 캔버스 px. 확대율과 같지만 의미가 다르므로 이름을 나눠 둔다. */
  const displayScale = viewport.zoom

  const measureContext = () => canvasRef.current?.getContext('2d') ?? null

  const toCanvasPoint = (event: React.PointerEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return null
    return {
      x: ((event.clientX - rect.left) / rect.width) * size.width,
      y: ((event.clientY - rect.top) / rect.height) * size.height,
    }
  }

  // 선택 표시는 매 렌더 다시 잰다 — 글자를 고치면 상자도 따라와야 한다.
  const selectionBounds = useMemo(() => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return [] as LayerBounds[]
    return editor.selectedLayers
      .filter((layer) => layer.visible !== false)
      .map((layer) => measureLayerBounds(ctx, size, layer, editor.dataContext))
    // layout 이 바뀌면 경계도 바뀐다. fontsReady 는 값으로 쓰이진 않지만, 글꼴이 붙기 전 폴백으로 잰
    // 글자 폭이 선택 상자에 그대로 남지 않게 다시 재기 위한 신호다.
  }, [editor.dataContext, editor.fontsReady, editor.layout, editor.selectedLayers, size])

  // ── 포인터 ──────────────────────────────────────────────
  const handlePointerDown = (event: React.PointerEvent) => {
    const ctx = measureContext()
    const point = toCanvasPoint(event)
    if (!ctx || !point) return

    const padding = HIT_PADDING / Math.max(displayScale, 0.01)
    const pickable = editor.layout.layers.filter((layer) => !editor.lockedIds.has(layer.id))
    const hit = findLayerAtPoint(ctx, size, pickable, editor.dataContext, point, padding)

    if (!hit) {
      if (!event.shiftKey) editor.selectLayer(null)
      startPhotoDrag(event, point)
      return
    }

    if (event.shiftKey) {
      editor.selectLayer(hit.id, true)
      return
    }

    // 이미 여럿을 골라 둔 상태에서 그중 하나를 잡으면 묶음 전체를 끈다.
    const ids = editor.selectedLayerIds.includes(hit.id) ? editor.selectedLayerIds : [hit.id]
    if (!editor.selectedLayerIds.includes(hit.id)) editor.selectLayer(hit.id)

    const moving = editor.layout.layers.filter((layer) => ids.includes(layer.id))
    if (moving.length === 0) return
    const boxes = moving.map((layer) => measureLayerBounds(ctx, size, layer, editor.dataContext))
    const startBox = boxes.reduce((acc, bounds) => ({
      left: Math.min(acc.left, bounds.left),
      top: Math.min(acc.top, bounds.top),
      right: Math.max(acc.right, bounds.right),
      bottom: Math.max(acc.bottom, bounds.bottom),
    }), { ...boxes[0] })

    event.preventDefault();
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
    dragRef.current = {
      kind: 'layer',
      pointerId: event.pointerId,
      origin: point,
      armed: false,
      ids,
      startPositions: new Map(moving.map((layer) => [layer.id, { ...layer.position }])),
      startBox,
      // 하나만 끌 때는 밑줄도 자석 대상이다. 여럿이면 어느 줄을 기준할지 알 수 없어 끈다.
      startBaselineY: moving.length === 1
        ? textBaselineYOf(ctx, size, moving[0], editor.dataContext)
        : null,
      targets: collectSnapTargets(ctx, size, editor.layout, editor.dataContext, ids),
    }
  }

  /** 요소가 없는 곳을 끌면 사진을 민다. 확대해 둔 사진의 보여 줄 부분을 고르는 조작이다. */
  const startPhotoDrag = (event: React.PointerEvent, point: { x: number; y: number }) => {
    const photo = editor.photoImage
    if (!photo) return
    const rect = photoRectOf(editor.layout, size)
    const inside = point.x >= rect.left && point.x <= rect.left + rect.width
      && point.y >= rect.top && point.y <= rect.top + rect.height
    if (!inside) return

    const placement = photoPlacementOf(
      editor.layout, size,
      { width: photo.naturalWidth, height: photo.naturalHeight },
      editor.photoTransform,
    )
    // 넘치는 부분이 없으면 밀어도 움직일 곳이 없다.
    if (placement.slackX < 1 && placement.slackY < 1) return

    event.preventDefault();
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
    dragRef.current = {
      kind: 'photo',
      pointerId: event.pointerId,
      origin: point,
      armed: false,
      startOffset: { x: editor.photoTransform.offsetX, y: editor.photoTransform.offsetY },
      slackX: placement.slackX,
      slackY: placement.slackY,
    }
  }

  const handlePointerMove = (event: React.PointerEvent) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    const point = toCanvasPoint(event)
    if (!point) return

    // 문턱을 넘기 전까지는 아무것도 건드리지 않는다. 넘고 나면 그 뒤로는 계속 끌기다.
    if (!drag.armed) {
      const moved = Math.hypot(point.x - drag.origin.x, point.y - drag.origin.y)
      if (moved * displayScale < DRAG_THRESHOLD) return
      drag.armed = true
    }
    event.preventDefault()

    if (drag.kind === 'photo') {
      editor.patchPhotoTransform({
        offsetX: drag.slackX < 1 ? drag.startOffset.x
          : drag.startOffset.x + (point.x - drag.origin.x) / drag.slackX,
        offsetY: drag.slackY < 1 ? drag.startOffset.y
          : drag.startOffset.y + (point.y - drag.origin.y) / drag.slackY,
      }, 'photo:pan')
      return
    }

    let dx = point.x - drag.origin.x
    let dy = point.y - drag.origin.y

    // Alt 를 누르고 있는 동안은 자석을 끈다 — 일부러 살짝 어긋나게 두고 싶을 때가 있다.
    if (!event.altKey) {
      const moved = {
        left: drag.startBox.left + dx,
        top: drag.startBox.top + dy,
        right: drag.startBox.right + dx,
        bottom: drag.startBox.bottom + dy,
      }
      const snap = applySnap(
        moved,
        drag.startBaselineY == null ? null : drag.startBaselineY + dy,
        drag.targets,
        SNAP_TOLERANCE / Math.max(displayScale, 0.01),
      )
      dx += snap.dx
      dy += snap.dy
      setGuides(snap.guides)
    } else {
      setGuides([])
    }

    const positions = new Map<string, PhotoCardPosition>()
    drag.startPositions.forEach((start, id) => {
      positions.set(id, { x: start.x + dx / size.width, y: start.y + dy / size.height })
    })
    editor.moveLayersTo(positions, `drag:${drag.ids.join(',')}`)
  }

  const endDrag = (event: React.PointerEvent) => {
    if (dragRef.current?.pointerId !== event.pointerId) return
    if ((event.currentTarget as HTMLElement).hasPointerCapture(event.pointerId)) {
      (event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId)
    }
    dragRef.current = null
    setGuides([])
    editor.endGesture()
  }

  // ── 손잡이(크기·회전) ───────────────────────────────────
  const handleResize = ({ scale, anchor }: TransformDelta) => {
    const ctx = measureContext()
    const layer = editor.selectedLayer
    if (!ctx || !layer) return
    // 첫 호출의 scale 은 1 이다 — 이때의 모습을 기준으로 삼아야 드래그 내내 값이 튀지 않는다.
    if (!resizeBaseRef.current || resizeBaseRef.current.layer.id !== layer.id) {
      const bounds = measureLayerBounds(ctx, size, layer, editor.dataContext)
      resizeBaseRef.current = { layer: JSON.parse(JSON.stringify(layer)) as PhotoCardLayer, bounds }
    }
    const base = resizeBaseRef.current.layer
    const patch: Partial<PhotoCardLayer> = base.type === 'TEXT'
      ? { fontSizeRatio: (base.fontSizeRatio ?? 0.04) * scale }
      : base.type === 'BOX'
        ? {
          widthRatio: (base.widthRatio ?? 0.5) * scale,
          heightRatio: (base.heightRatio ?? 0.2) * scale,
        }
        : { widthRatio: (base.widthRatio ?? 0.15) * scale }

    // 크기를 바꾸면 앵커 규칙 때문에 상자가 엉뚱한 쪽으로 자란다.
    // 잡은 손잡이의 반대편 모서리가 제자리에 오도록 위치를 되민다.
    const scaled = normalizeLayer({ ...base, ...patch })
    const bounds = measureLayerBounds(ctx, size, scaled, editor.dataContext)
    const start = resizeBaseRef.current.bounds
    const keepLeft = Math.abs(anchor.x - start.left) <= Math.abs(anchor.x - start.right)
    const keepTop = Math.abs(anchor.y - start.top) <= Math.abs(anchor.y - start.bottom)
    const dx = anchor.x - (keepLeft ? bounds.left : bounds.right)
    const dy = anchor.y - (keepTop ? bounds.top : bounds.bottom)

    editor.patchLayer(layer.id, {
      ...patch,
      position: {
        x: scaled.position.x + dx / size.width,
        y: scaled.position.y + dy / size.height,
      },
    }, `resize:${layer.id}`)
  }

  const handleRotate = (degrees: number) => {
    const layer = editor.selectedLayer
    if (!layer) return
    // -180~180 으로 접는다. 스키마가 이 범위만 받는다.
    const folded = ((degrees + 180) % 360 + 360) % 360 - 180
    editor.patchLayer(layer.id, { rotation: folded }, `rotate:${layer.id}`)
  }

  const endTransform = () => {
    resizeBaseRef.current = null
    editor.endGesture()
  }

  const selectedIsLocked = editor.selectedLayer
    ? editor.lockedIds.has(editor.selectedLayer.id)
    : false
  const quickBarLayer = showsQuickBar(editor.selectedLayer, selectedIsLocked)
    && selectionBounds.length === 1
  /** 좁은 화면에서 빠른 편집 바가 바닥을 차지하고 있는가 — 위에 얹은 것들이 그만큼 비켜선다. */
  const dockedBar = !isDesktop && quickBarLayer && Boolean(editor.photoImage)
  const overlayBottom = dockedBar ? DOCKED_BAR_GAP : OVERLAY_GAP

  return (
    <div
      ref={viewport.containerRef}
      className="relative order-1 min-h-0 min-w-0 flex-1 touch-none overflow-hidden bg-neutral-800 lg:order-2"
      style={{ cursor: viewport.handMode ? (viewport.panning ? 'grabbing' : 'grab') : 'default' }}
      {...viewport.stageHandlers}
    >
      {editor.photoImage ? (
        <div
          className="absolute left-1/2 top-1/2"
          style={{ transform: `translate(-50%, -50%) translate(${viewport.offset.x}px, ${viewport.offset.y}px)` }}
        >
          <div
            className="di-photo-card-checker group relative shadow-2xl"
            style={{ width: `${displayWidth}px`, height: `${displayHeight}px` }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          >
            <PhotoCardCanvas
              canvasRef={canvasRef}
              size={size}
              layout={editor.layout}
              context={editor.dataContext}
              photo={editor.photoImage}
              images={editor.images}
              photoTransform={editor.photoTransform}
              fontsReady={editor.fontsReady}
              watermark={editor.watermarkImage}
            />
            <PhotoCardOverlay
              size={size}
              displayScale={displayScale}
              selection={selectionBounds}
              guides={guides}
              showHandles={Boolean(editor.selectedLayer) && !selectedIsLocked}
              // 글자는 빠른 편집 바에 삭제 버튼이 있다. ✕ 를 같이 두면 서로 가린다.
              showRemove={!showsQuickBar(editor.selectedLayer, selectedIsLocked)}
              rotation={editor.selectedLayer?.rotation ?? 0}
              onResize={handleResize}
              onRotate={handleRotate}
              onTransformEnd={endTransform}
              onRemove={() => {
                if (editor.selectedLayer) editor.removeLayer(editor.selectedLayer.id)
              }}
            />
            {/* 고른 글자 바로 위에 뜨는 빠른 편집 바. 끌고 있는 동안은 방해되므로 감춘다.
                좁은 화면에서는 여기 띄우지 않고 작업 영역 아래에 붙인다(아래 참조). */}
            {isDesktop && !dragRef.current && (
              <PhotoCardQuickBar
                editor={editor}
                bounds={selectionBounds.length === 1 ? selectionBounds[0] : null}
                displayScale={displayScale}
                displayWidth={displayWidth}
              />
            )}

            {/* 카드에 마우스를 올리면 마크가 왜 있는지 알려 준다. 마크 바로 위에 붙여
                무엇에 대한 말인지 한눈에 이어지게 하고, 클릭은 캔버스로 그대로 지나가게 둔다. */}
            {editor.watermarkImage && (
              <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
                <p className="absolute bottom-[10%] right-[3%] max-w-[80%] translate-y-2 truncate rounded-full bg-neutral-900/80 px-3 py-1.5 text-[11px] font-semibold text-white opacity-0 shadow-lg backdrop-blur transition-all duration-150 group-hover:translate-y-0 group-hover:opacity-100">
                  {t('photoCard.guestMarkHoverHint')}
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex h-full w-full items-center justify-center p-6">
          <button
            type="button"
            onClick={onRequestPhoto}
            className="rounded-2xl border-2 border-dashed border-neutral-600 px-10 py-16 text-center transition-colors hover:border-primary-500"
          >
            <span className="block text-sm font-bold text-neutral-100">{t('photoCard.uploadPhoto')}</span>
            <span className="mt-1 block text-xs text-neutral-400">{t('photoCard.uploadHint')}</span>
          </button>
        </div>
      )}

      {editor.photoImage && (
        <>
          {/* 좁은 화면의 빠른 편집 바. 카드가 아니라 작업 영역에 붙는다 —
              카드가 화면 밖으로 밀려 있어도 바는 늘 손이 닿는 자리에 있어야 한다. */}
          {!isDesktop && (
            <PhotoCardQuickBar
              editor={editor}
              bounds={selectionBounds.length === 1 ? selectionBounds[0] : null}
              displayScale={displayScale}
              displayWidth={displayWidth}
              docked
            />
          )}

          {/* 미세 이동 패드 — 요소를 골랐을 때만. 손가락이 요소를 가리지 않는 자리에서 옮긴다. */}
          <PhotoCardNudgePad
            editor={editor}
            size={size}
            displayScale={displayScale}
            className="absolute right-3 z-20 lg:hidden"
            style={{ bottom: overlayBottom }}
          />
        </>
      )}

      {/* 조작 안내 — 캔버스 위에 얹어 자리를 차지하지 않는다.
          바탕이 비치면 사진 위에서 글자가 읽히지 않아 불투명하게 깔고,
          좁은 화면에서는 요소를 고른 순간 감춘다(패드·편집 바와 자리를 다툰다). */}
      <p
        className={`pointer-events-none absolute left-1/2 max-w-[calc(100%-1.5rem)] -translate-x-1/2 truncate rounded-full bg-neutral-900 px-3 py-1 text-[11px] font-medium text-neutral-200 shadow-lg ${
          editor.selectedLayerIds.length === 0 ? '' : 'hidden lg:block'
        }`}
        style={{ bottom: overlayBottom }}
      >
        <span className="lg:hidden">{t('photoCard.stageHintTouch')}</span>
        <span className="hidden lg:inline">{t('photoCard.stageHint')}</span>
      </p>
    </div>
  )
}
