import { useCallback, useEffect, useRef, type PointerEvent as ReactPointerEvent } from 'react'

/** 단추를 이만큼(ms) 누르고 있으면 '꾹 누름'으로 보고 값이 이어서 바뀐다. */
export const HOLD_DELAY = 400
/** 꾹 누르는 동안 값이 바뀌는 간격(ms) */
export const HOLD_INTERVAL = 70

/** 한 칸 옮긴다. 더 갈 곳이 없어 값이 그대로면 false — 거기서 반복을 멈춘다. */
type HoldStep = () => boolean | void

interface HoldRepeatOptions {
  delay?: number
  interval?: number
  /** 손을 뗄 때 한 번 — 되돌리기 한 단계로 묶어 끊는 자리(gesture 커밋). */
  onRelease?: () => void
}

/**
 * 꾹 누르면 이어서 눌리는 ± 단추.
 *
 * 한 칸씩 옮기는 단추로 20칸을 가려면 스무 번을 눌러야 한다. 누르는 순간 한 칸 옮기고,
 * 계속 누르고 있으면 HOLD_DELAY 뒤부터 HOLD_INTERVAL 마다 이어서 옮긴다 —
 * 뜸을 두는 것은 한 번 톡 누르는 것과 구별하기 위해서다(누르자마자 이어지면 한 칸만 옮길 수 없다).
 *
 * ── 왜 onClick 이 아닌가 ──
 * 누르고 있는 <b>동안</b>을 알아야 하므로 pointerdown 에서 시작한다.
 * onClick 을 함께 두면 뗄 때 한 칸이 더 가므로, 옮기는 길은 여기 하나로만 둔다.
 * pointerdown 의 기본 동작은 막는다 — 옆 입력 칸의 초점(과 모바일 자판)을 뺏지 않는다.
 * 포인터는 잡아 두어(setPointerCapture) 누른 채 손이 단추 밖으로 나가도 이어진다.
 *
 * ── 한계에 닿으면 스스로 멈춘다 ──
 * 값이 최대·최소에 닿으면 단추는 대개 비활성이 되는데, 비활성 단추에는 pointerup 이 오지 않아
 * 반복만 남는다. step 이 false(더 옮길 곳이 없음)를 돌려주면 그 자리에서 끊는다.
 */
export function useHoldRepeat({
  delay = HOLD_DELAY, interval = HOLD_INTERVAL, onRelease,
}: HoldRepeatOptions = {}) {
  const holdRef = useRef<{ timeout?: number; interval?: number }>({})
  // 손을 뗄 때 부를 것은 그림마다 달라질 수 있다 — 늘 마지막 것을 부른다.
  const releaseRef = useRef(onRelease)
  useEffect(() => { releaseRef.current = onRelease })

  const stop = useCallback(() => {
    window.clearTimeout(holdRef.current.timeout)
    window.clearInterval(holdRef.current.interval)
    holdRef.current = {}
  }, [])
  useEffect(() => stop, [stop])

  const end = useCallback(() => {
    if (holdRef.current.timeout === undefined && holdRef.current.interval === undefined) return
    stop()
    releaseRef.current?.()
  }, [stop])

  const begin = (event: ReactPointerEvent<HTMLElement>, step: HoldStep) => {
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    end() // 앞선 누름이 남아 있으면 먼저 끊는다(다른 단추로 손가락이 옮겨 간 경우)
    step()
    holdRef.current.timeout = window.setTimeout(() => {
      holdRef.current.interval = window.setInterval(() => {
        if (step() === false) end()
      }, interval)
    }, delay)
  }

  /** 단추에 그대로 펼쳐 넣는다 — {...hold(() => stepSize(1))} */
  return (step: HoldStep) => ({
    onPointerDown: (event: ReactPointerEvent<HTMLElement>) => begin(event, step),
    onPointerUp: end,
    onPointerCancel: end,
  })
}
