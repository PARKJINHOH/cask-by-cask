import { useEffect, useState } from 'react'

/**
 * 에디터 공용 입력 방식(터치 / 마우스) 판별.
 *
 * `(pointer: coarse)` 미디어 쿼리만으로는 일부 모바일 브라우저·인앱 웹뷰에서 터치 기기를
 * 놓치는 경우가 있어, 실제로 들어온 입력 이벤트로 값을 계속 보정한다.
 * - 최초 판단: `(pointer: coarse)` 또는 `(hover: none)`
 * - 이후 보정: touchstart 가 오면 터치, 진짜 마우스 pointerdown 이 오면 마우스
 *
 * 마우스와 터치를 함께 쓰는 기기(터치 노트북)에서도 마지막에 쓴 입력에 맞춰 동작한다.
 */

type Listener = (isTouch: boolean) => void

const listeners = new Set<Listener>()
let initialized = false

function mediaMatches(query: string) {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia(query).matches
}

function detectFromMedia() {
  return mediaMatches('(pointer: coarse)') || mediaMatches('(hover: none)')
}

let touchMode = detectFromMedia()

function setTouchMode(next: boolean) {
  if (touchMode === next) return
  touchMode = next
  listeners.forEach((listener) => listener(touchMode))
}

function ensureInitialized() {
  if (initialized || typeof document === 'undefined') return
  initialized = true
  // capture + passive — 어떤 경우에도 페이지 기본 동작(스크롤)에 개입하지 않는다.
  document.addEventListener('touchstart', () => setTouchMode(true), { capture: true, passive: true })
  document.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse') setTouchMode(false)
  }, { capture: true, passive: true })
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    window.matchMedia('(pointer: coarse)').addEventListener('change', () => setTouchMode(detectFromMedia()))
  }
}

/** 현재 입력 방식이 터치인지 여부 */
export function isTouchInput() {
  ensureInitialized()
  return touchMode
}

/** 입력 방식 변경 구독. 해제 함수를 돌려준다. */
export function subscribeTouchInput(listener: Listener) {
  ensureInitialized()
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

/**
 * React 용 훅. SSR/hydration 결과가 어긋나지 않도록 초기값은 false 로 두고 마운트 후 동기화한다.
 */
export function useTouchInput() {
  const [isTouch, setIsTouch] = useState(false)
  useEffect(() => {
    setIsTouch(isTouchInput())
    return subscribeTouchInput(setIsTouch)
  }, [])
  return isTouch
}
