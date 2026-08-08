import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
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
/**
 * 조작 안내를 띄워 두는 시간(ms).
 *
 * 한 번 읽으면 그만인 문구다. 계속 남겨 두면 카드 아래를 가리기만 하므로,
 * 들어온 직후 잠깐 보여 주고 걷는다.
 */
const STAGE_HINT_MS = 10_000

interface DragBase {
  pointerId: number
  /**
   * 손가락을 처음 짚은 자리 — <b>화면(client) 좌표</b>다.
   *
   * 캔버스 좌표로 잡아 두면, 짚은 뒤에 캔버스가 움직이거나 배율이 바뀌는 순간 기준이 어긋난다.
   * 요소를 고르면 아래 시트가 열리고 작업 영역이 줄어 화면 맞춤이 다시 걸리는데, 그러면
   * 손가락은 가만히 있어도 같은 자리가 다른 캔버스 좌표가 되어 요소가 훌쩍 뛴다.
   * 화면 좌표로 재면 움직인 것은 손가락뿐이다.
   */
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
  /** 조작 안내가 아직 떠 있는가 — 들어온 뒤 STAGE_HINT_MS 동안만 참이다. */
  const [hintVisible, setHintVisible] = useState(true)

  useEffect(() => {
    const timer = window.setTimeout(() => setHintVisible(false), STAGE_HINT_MS)
    return () => window.clearTimeout(timer)
  }, [])

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
      origin: { x: event.clientX, y: event.clientY },
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
      origin: { x: event.clientX, y: event.clientY },
      armed: false,
      startOffset: { x: editor.photoTransform.offsetX, y: editor.photoTransform.offsetY },
      slackX: placement.slackX,
      slackY: placement.slackY,
    }
  }

  const handlePointerMove = (event: React.PointerEvent) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return

    // 손가락이 화면에서 간 거리. 문턱을 넘기 전까지는 아무것도 건드리지 않는다.
    const movedX = event.clientX - drag.origin.x
    const movedY = event.clientY - drag.origin.y
    if (!drag.armed) {
      if (Math.hypot(movedX, movedY) < DRAG_THRESHOLD) return
      drag.armed = true
    }
    event.preventDefault()

    // 화면 px → 캔버스 px. 확대해 둔 상태에서도 손가락을 따라가는 거리는 같다.
    let dx = movedX / Math.max(displayScale, 0.01)
    let dy = movedY / Math.max(displayScale, 0.01)

    if (drag.kind === 'photo') {
      editor.patchPhotoTransform({
        offsetX: drag.slackX < 1 ? drag.startOffset.x : drag.startOffset.x + dx / drag.slackX,
        offsetY: drag.slackY < 1 ? drag.startOffset.y : drag.startOffset.y + dy / drag.slackY,
      }, 'photo:pan')
      return
    }

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

  return (
    <div
      ref={viewport.containerRef}
      className="relative order-1 min-h-0 min-w-0 flex-1 touch-none overflow-hidden bg-neutral-800 lg:order-2"
      style={{ cursor: viewport.handMode ? (viewport.panning ? 'grabbing' : 'grab') : 'default' }}
      // 카드 <b>바깥</b>의 빈 자리를 눌러도 선택을 푼다 — 카드 안 빈 곳과 결과가 같아야
      // "놓으려면 아무 데도 아닌 곳을 누른다"는 감각이 카드 경계에서 끊기지 않는다.
      // 여기서 시작한 입력만 본다(target === currentTarget): 카드·미세 이동 패드 위에서
      // 시작한 것은 올라오더라도 걸러진다 — 패드는 고른 요소를 옮기는 조작이라
      // 여기서 선택을 풀면 패드가 스스로 사라진다.
      // 손바닥 도구·핀치는 캡처 단계에서 전파를 끊으므로 이 자리까지 오지 않는다.
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) editor.selectLayer(null)
      }}
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
              // 넓은 화면에서는 글자 위에 빠른 편집 바가 떠 그 안에 삭제 버튼이 있다 —
              // ✕ 를 같이 두면 서로 가린다. 좁은 화면에는 그 바가 없으므로 ✕ 를 남긴다.
              showRemove={!isDesktop || !showsQuickBar(editor.selectedLayer, selectedIsLocked)}
              rotation={editor.selectedLayer?.rotation ?? 0}
              onResize={handleResize}
              onRotate={handleRotate}
              onTransformEnd={endTransform}
              onRemove={() => {
                if (editor.selectedLayer) editor.removeLayer(editor.selectedLayer.id)
              }}
            />
            {/* 고른 글자 바로 위에 뜨는 빠른 편집 바. 끌고 있는 동안은 방해되므로 감춘다.
                좁은 화면에서는 아예 띄우지 않는다 — 바가 카드보다 넓어 얹을 자리가 없고,
                같은 값(글꼴·크기·색)은 아래 속성 시트에 모두 있다. */}
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

      {/* 미세 이동 패드 — 요소를 골랐을 때만. 손가락이 요소를 가리지 않는 자리에서 옮긴다. */}
      {editor.photoImage && (
        <PhotoCardNudgePad
          editor={editor}
          size={size}
          displayScale={displayScale}
          className="absolute right-3 z-20 lg:hidden"
          style={{ bottom: OVERLAY_GAP }}
        />
      )}

      {/* 조작 안내 — 캔버스 위에 얹어 자리를 차지하지 않는다.
          한 번 읽으면 그만인 문구라 바탕은 비쳐 두고(카드를 가리지 않게), 대신 살짝 흐려
          그 위의 글자가 사진 무늬에 묻히지 않게 한다. 글자 그림자도 같은 몫이다.
          들어온 뒤 잠깐만 띄우고(STAGE_HINT_MS) 걷으며,
          좁은 화면에서는 그 사이라도 요소를 고른 순간 감춘다(패드와 자리를 다툰다). */}
      {hintVisible && (
        <p
          className={`pointer-events-none absolute left-1/2 max-w-[calc(100%-1.5rem)] -translate-x-1/2 truncate rounded-full bg-neutral-900/35 px-3 py-1 text-[11px] font-medium text-white backdrop-blur-sm ${
            editor.selectedLayerIds.length === 0 ? '' : 'hidden lg:block'
          }`}
          style={{ bottom: OVERLAY_GAP, textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}
        >
          <span className="lg:hidden">{t('photoCard.stageHintTouch')}</span>
          <span className="hidden lg:inline">{t('photoCard.stageHint')}</span>
        </p>
      )}
    </div>
  )
}
