import { useCallback, useEffect, useRef, useState } from 'react'
import type { PhotoCardCanvasSize } from '../utils/photoCardRender'

/** 화면에 보이는 배율의 한계. 1 = 카드 1픽셀이 화면 1픽셀. */
export const MIN_VIEW_ZOOM = 0.05
export const MAX_VIEW_ZOOM = 8

/** 화면 맞춤에서 남기는 여백 비율 — 카드가 벽에 붙어 보이지 않게 한다. */
const FIT_MARGIN = 0.92

/**
 * 이 표시가 붙은 요소 위에서 돌린 휠은 확대·축소가 아니다.
 *
 * 캔버스 위에 얹은 조작 UI(빠른 편집 바 등)는 제 스크롤을 갖는다.
 * 목록을 굴리려고 휠을 돌렸는데 카드가 확대되면 손이 꼬인다.
 */
export const NO_ZOOM_ATTRIBUTE = 'data-photo-card-nozoom'

interface ViewState {
  zoom: number
  offset: { x: number; y: number }
}

const clampZoom = (value: number) => Math.max(MIN_VIEW_ZOOM, Math.min(MAX_VIEW_ZOOM, value))

const distanceOf = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y)

/**
 * 중앙 캔버스의 확대/축소·이동.
 *
 * 캔버스 내부 해상도는 그대로 두고 CSS 크기만 바꾼다 — 확대해도 다시 그리지 않는다.
 * offset 은 "컨테이너 중앙에서 얼마나 밀렸는가"(화면 px)다.
 *
 * @param contentSize 카드의 캔버스 내부 크기(px)
 */
export const usePhotoCardViewport = (contentSize: PhotoCardCanvasSize) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [view, setView] = useState<ViewState>({ zoom: 0.3, offset: { x: 0, y: 0 } })
  const [panning, setPanning] = useState(false)
  const [spaceHeld, setSpaceHeld] = useState(false)

  // 휠·포인터 핸들러는 한 번만 등록하고 최신 값을 ref 로 읽는다.
  // 상태를 의존성에 넣으면 확대할 때마다 리스너를 떼었다 붙인다.
  const viewRef = useRef(view)
  const spaceRef = useRef(false)
  const gestureRef = useRef<'pan' | 'pinch' | null>(null)
  /** 사용자가 직접 확대·이동했는가. 그랬다면 컨테이너 크기가 변해도 그 값을 뺏지 않는다. */
  const adjustedRef = useRef(false)

  const applyView = useCallback((next: ViewState) => {
    viewRef.current = next
    setView(next)
  }, [])

  /** 컨테이너 중앙의 화면 좌표. 확대 기준점 계산의 원점이다. */
  const centerOf = useCallback(() => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return null
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, rect }
  }, [])

  /** 화면의 한 점 아래에 있는 카드 지점을 그대로 둔 채 배율만 바꾼다. */
  const zoomAt = useCallback((nextZoom: number, screenPoint: { x: number; y: number }) => {
    const center = centerOf()
    if (!center) return
    const { zoom, offset } = viewRef.current
    const clamped = clampZoom(nextZoom)
    if (clamped === zoom) return
    // 커서 아래의 카드 좌표(중심 기준) — 확대 전후로 이 값이 같아야 한다.
    const anchorX = (screenPoint.x - center.x - offset.x) / zoom
    const anchorY = (screenPoint.y - center.y - offset.y) / zoom
    adjustedRef.current = true
    applyView({
      zoom: clamped,
      offset: {
        x: screenPoint.x - center.x - anchorX * clamped,
        y: screenPoint.y - center.y - anchorY * clamped,
      },
    })
  }, [applyView, centerOf])

  /** 화면 한가운데를 기준으로 배율만 조절한다(버튼·단축키). */
  const zoomBy = useCallback((factor: number) => {
    const center = centerOf()
    if (!center) {
      applyView({ ...viewRef.current, zoom: clampZoom(viewRef.current.zoom * factor) })
      return
    }
    zoomAt(viewRef.current.zoom * factor, { x: center.x, y: center.y })
  }, [applyView, centerOf, zoomAt])

  const fit = useCallback(() => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect || rect.width === 0 || rect.height === 0) return
    const zoom = clampZoom(Math.min(
      (rect.width * FIT_MARGIN) / contentSize.width,
      (rect.height * FIT_MARGIN) / contentSize.height,
    ))
    adjustedRef.current = false
    applyView({ zoom, offset: { x: 0, y: 0 } })
  }, [applyView, contentSize.height, contentSize.width])

  const zoomToActual = useCallback(() => {
    adjustedRef.current = true
    applyView({ zoom: 1, offset: { x: 0, y: 0 } })
  }, [applyView])

  // 비율이 바뀌면 카드 크기가 달라지므로 다시 맞춘다.
  useEffect(() => {
    fit()
    const container = containerRef.current
    if (!container || typeof ResizeObserver === 'undefined') return
    // 창 크기·패널 접힘으로 작업 영역이 변하면 다시 맞춘다.
    // 단, 사용자가 직접 확대해 둔 상태라면 건드리지 않는다 — 보고 있던 자리를 뺏는 셈이 된다.
    const observer = new ResizeObserver(() => { if (!adjustedRef.current) fit() })
    observer.observe(container)
    return () => observer.disconnect()
  }, [fit])

  // ── 휠 확대/축소 ────────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const onWheel = (event: WheelEvent) => {
      // 캔버스 위 조작 UI 안에서 돌린 휠은 그쪽 스크롤에 맡기고 여기서는 손대지 않는다.
      const target = event.target as Element | null
      if (target?.closest?.(`[${NO_ZOOM_ATTRIBUTE}]`)) return
      // React 의 onWheel 은 루트에 passive 로 붙어 preventDefault 가 먹지 않는다.
      // 여기서 직접 등록해야 브라우저 확대·페이지 스크롤을 가로챌 수 있다.
      event.preventDefault()
      // deltaMode 1 은 '줄' 단위다. 픽셀로 환산하지 않으면 휠 한 칸에 화면이 튄다.
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : 1)
      zoomAt(viewRef.current.zoom * Math.exp(-delta * 0.0015), { x: event.clientX, y: event.clientY })
    }
    container.addEventListener('wheel', onWheel, { passive: false })
    return () => container.removeEventListener('wheel', onWheel)
  }, [zoomAt])

  // ── 스페이스 = 손바닥 도구 ──────────────────────────────
  useEffect(() => {
    const isTyping = (target: EventTarget | null) => {
      const element = target as HTMLElement | null
      const tag = element?.tagName
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || element?.isContentEditable
    }
    const down = (event: KeyboardEvent) => {
      if (event.code !== 'Space' || event.repeat || isTyping(event.target)) return
      event.preventDefault()
      spaceRef.current = true
      setSpaceHeld(true)
    }
    const up = (event: KeyboardEvent) => {
      if (event.code !== 'Space') return
      spaceRef.current = false
      setSpaceHeld(false)
    }
    // 창을 벗어난 사이 키를 떼면 keyup 이 안 온다. 눌린 채로 남지 않게 정리한다.
    const blur = () => { spaceRef.current = false; setSpaceHeld(false) }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', blur)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', blur)
    }
  }, [])

  // ── 이동(팬) · 두 손가락 ────────────────────────────────
  const pointersRef = useRef(new Map<number, { x: number; y: number }>())
  const panStartRef = useRef<{ x: number; y: number; offset: { x: number; y: number } } | null>(null)
  const pinchStartRef = useRef<{ distance: number; zoom: number } | null>(null)

  /** 캔버스가 요소 드래그를 시작하기 전에 가로채야 해서 캡처 단계에서 받는다. */
  const onPointerDownCapture = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'touch') {
      pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
      if (pointersRef.current.size === 2) {
        const [a, b] = Array.from(pointersRef.current.values())
        pinchStartRef.current = { distance: distanceOf(a, b), zoom: viewRef.current.zoom }
        panStartRef.current = {
          x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, offset: { ...viewRef.current.offset },
        }
        gestureRef.current = 'pinch'
        adjustedRef.current = true
        setPanning(true)
        event.stopPropagation()
      }
      return
    }
    // 가운데 버튼 또는 스페이스를 누른 채 = 손바닥 도구
    if (event.button !== 1 && !spaceRef.current) return
    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    panStartRef.current = {
      x: event.clientX, y: event.clientY, offset: { ...viewRef.current.offset },
    }
    gestureRef.current = 'pan'
    adjustedRef.current = true
    setPanning(true)
  }, [])

  const onPointerMoveCapture = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'touch' && pointersRef.current.has(event.pointerId)) {
      pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    }
    const start = panStartRef.current
    if (!start || !gestureRef.current) return
    event.stopPropagation()

    if (gestureRef.current === 'pinch') {
      const points = Array.from(pointersRef.current.values())
      if (points.length < 2 || !pinchStartRef.current) return
      const [a, b] = points
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
      const scale = distanceOf(a, b) / Math.max(pinchStartRef.current.distance, 1)
      // 손가락 사이가 벌어진 만큼 확대하고, 가운데가 움직인 만큼 같이 민다.
      const center = centerOf()
      if (!center) return
      const zoom = clampZoom(pinchStartRef.current.zoom * scale)
      const anchorX = (start.x - center.x - start.offset.x) / pinchStartRef.current.zoom
      const anchorY = (start.y - center.y - start.offset.y) / pinchStartRef.current.zoom
      applyView({
        zoom,
        offset: { x: mid.x - center.x - anchorX * zoom, y: mid.y - center.y - anchorY * zoom },
      })
      return
    }

    applyView({
      zoom: viewRef.current.zoom,
      offset: {
        x: start.offset.x + (event.clientX - start.x),
        y: start.offset.y + (event.clientY - start.y),
      },
    })
  }, [applyView, centerOf])

  const onPointerUpCapture = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(event.pointerId)
    if (!gestureRef.current) return
    if (pointersRef.current.size >= 2) return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    gestureRef.current = null
    panStartRef.current = null
    pinchStartRef.current = null
    setPanning(false)
  }, [])

  return {
    containerRef,
    zoom: view.zoom,
    offset: view.offset,
    /** 손바닥 도구가 켜져 있는가 — 커서 모양과 캔버스의 드래그 차단에 쓴다. */
    handMode: spaceHeld || panning,
    panning,
    fit,
    zoomBy,
    zoomAt,
    zoomToActual,
    stageHandlers: {
      onPointerDownCapture,
      onPointerMoveCapture,
      onPointerUpCapture,
      onPointerCancelCapture: onPointerUpCapture,
    },
  }
}

export type PhotoCardViewport = ReturnType<typeof usePhotoCardViewport>
