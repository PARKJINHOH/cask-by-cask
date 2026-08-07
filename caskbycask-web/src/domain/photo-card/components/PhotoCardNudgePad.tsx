import { useRef, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import type { PhotoCardEditor } from '../hooks/usePhotoCardEditor'
import { NO_ZOOM_ATTRIBUTE } from '../hooks/usePhotoCardViewport'
import type { PhotoCardPosition } from '../types/photoCard.types'
import type { PhotoCardCanvasSize } from '../utils/photoCardRender'

interface Props {
  editor: PhotoCardEditor
  /** 카드의 캔버스 내부 크기(px) */
  size: PhotoCardCanvasSize
  /** 화면 px ÷ 캔버스 px */
  displayScale: number
  className?: string
  style?: CSSProperties
}

/** 화살표를 한 번 눌렀을 때 움직이는 거리(화면 px). 확대율과 무관하게 눈에 보이는 만큼 움직인다. */
const TAP_STEP = 3
/**
 * 패드를 끌 때 손가락이 간 거리 대비 요소가 따라가는 비율.
 *
 * 1 이면 손가락과 같은 속도다 — 그러면 캔버스에서 직접 끄는 것과 다를 바 없고,
 * 좁은 패드 위에서 손가락이 조금만 흔들려도 요소가 훌쩍 움직인다.
 * 이 패드는 '조금씩 정확히' 맞추는 자리이므로 천천히 따라오게 한다.
 */
const DRAG_GAIN = 0.35
/** 이만큼(화면 px) 움직이기 전에는 끌기로 보지 않는다 — 화살표를 톡 누르는 손떨림과 구분한다. */
const DRAG_THRESHOLD = 6

type Direction = 'up' | 'down' | 'left' | 'right'

/** 화살표 삼각형(위쪽 기준). 나머지 방향은 회전해서 쓴다. */
const ARROW_PATH = 'M12 7l6 9H6l6-9z'

const ARROWS: { key: Direction; cell: string; rotate: number; labelKey: string }[] = [
  { key: 'up', cell: 'col-start-2 row-start-1', rotate: 0, labelKey: 'photoCard.nudgeUp' },
  { key: 'left', cell: 'col-start-1 row-start-2', rotate: -90, labelKey: 'photoCard.nudgeLeft' },
  { key: 'right', cell: 'col-start-3 row-start-2', rotate: 90, labelKey: 'photoCard.nudgeRight' },
  { key: 'down', cell: 'col-start-2 row-start-3', rotate: 180, labelKey: 'photoCard.nudgeDown' },
]

/**
 * 모바일 미세 이동 패드.
 *
 * 손가락으로는 캔버스 위의 작은 요소를 정확히 집기 어렵고, 집더라도 손가락이 그 요소를 가려
 * 어디에 놓이는지 보이지 않는다. 요소를 고른 뒤에는 카드에서 떨어진 이 패드로 옮긴다 —
 * 화살표를 톡 누르면 한 칸씩, 패드 아무 데나 끌면 손가락보다 천천히 따라온다.
 *
 * 톡 누르기와 끌기는 같은 포인터 흐름에서 갈린다. 문턱(DRAG_THRESHOLD)을 넘기 전에는
 * 포인터를 잡지 않아 화살표의 click 이 그대로 살아 있고, 넘고 나면 잡아서 패드 밖까지 따라간다.
 */
export default function PhotoCardNudgePad({
  editor, size, displayScale, className = '', style,
}: Props) {
  const { t } = useTranslation()
  const dragRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    start: Map<string, PhotoCardPosition>
    armed: boolean
  } | null>(null)
  /** 방금 끌기가 있었는가 — 끌고 나서 손을 떼며 화살표가 눌리는 것을 막는다. */
  const draggedRef = useRef(false)

  // 잠긴 요소는 캔버스에서도 못 움직인다. 여기서만 움직이면 잠금이 잠금이 아니게 된다.
  const ids = editor.selectedLayerIds.filter((id) => !editor.lockedIds.has(id))
  if (ids.length === 0) return null

  /** 화면 px → 프레임 대비 비율. 확대해 둔 상태에서도 화면에서 보이는 만큼만 움직인다. */
  const toRatio = (screenPx: number, axis: 'x' | 'y') => (
    screenPx / Math.max(displayScale, 0.01) / (axis === 'x' ? size.width : size.height)
  )

  // 패드로 옮긴 것은 톡 누르든 끌든 되돌리기 한 단계로 묶는다 —
  // 3px 씩 스무 번 누른 것을 스무 번 되돌리게 하면 되돌리기가 쓸모없어진다.
  const gesture = `pad:${ids.join(',')}`

  const nudge = (direction: Direction) => {
    if (draggedRef.current) return
    const dx = direction === 'left' ? -TAP_STEP : direction === 'right' ? TAP_STEP : 0
    const dy = direction === 'up' ? -TAP_STEP : direction === 'down' ? TAP_STEP : 0
    editor.nudgeLayers(ids, toRatio(dx, 'x'), toRatio(dy, 'y'), gesture)
  }

  const beginDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    draggedRef.current = false
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      start: new Map(editor.selectedLayers
        .filter((layer) => ids.includes(layer.id))
        .map((layer) => [layer.id, { ...layer.position }])),
      armed: false,
    }
  }

  const moveDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    const dx = event.clientX - drag.startX
    const dy = event.clientY - drag.startY
    if (!drag.armed) {
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return
      drag.armed = true
      draggedRef.current = true
      // 문턱을 넘은 뒤에는 손가락이 패드 밖으로 나가도 계속 따라온다.
      event.currentTarget.setPointerCapture(event.pointerId)
    }
    // 시작 위치에서 다시 계산한다 — 더해 나가면 반올림 오차가 쌓여 손가락과 어긋난다.
    const positions = new Map<string, PhotoCardPosition>()
    drag.start.forEach((start, id) => {
      positions.set(id, {
        x: start.x + toRatio(dx * DRAG_GAIN, 'x'),
        y: start.y + toRatio(dy * DRAG_GAIN, 'y'),
      })
    })
    editor.moveLayersTo(positions, gesture)
  }

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    dragRef.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  return (
    <div
      role="group"
      aria-label={t('photoCard.nudgePad')}
      title={t('photoCard.nudgePadHint')}
      className={`grid h-[108px] w-[108px] grid-cols-3 grid-rows-3 rounded-2xl border border-neutral-200 bg-white/95 shadow-lg backdrop-blur ${className}`}
      style={{ touchAction: 'none', ...style }}
      onPointerDown={beginDrag}
      onPointerMove={moveDrag}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      {...{ [NO_ZOOM_ATTRIBUTE]: '' }}
    >
      {ARROWS.map((arrow) => (
        <button
          key={arrow.key}
          type="button"
          aria-label={t(arrow.labelKey)}
          onClick={() => nudge(arrow.key)}
          style={{ WebkitTapHighlightColor: 'transparent' }}
          className={`${arrow.cell} flex items-center justify-center rounded-lg text-neutral-500 transition-colors active:bg-primary-100 active:text-primary-700`}
        >
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="currentColor"
            aria-hidden="true"
            style={{ transform: `rotate(${arrow.rotate}deg)` }}
          >
            <path d={ARROW_PATH} />
          </svg>
        </button>
      ))}

      {/* 가운데는 '여기를 끌어도 된다'는 표시다. 누르는 자리가 아니라 손잡이라 버튼이 아니다. */}
      <span className="col-start-2 row-start-2 flex items-center justify-center text-neutral-300" aria-hidden="true">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
          <path d="M12 2l3 3h-2v5h5V8l3 3-3 3v-2h-5v5h2l-3 3-3-3h2v-5H6v2l-3-3 3-3v2h5V5H9l3-3z" />
        </svg>
      </span>
    </div>
  )
}
