import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * 작성 중인 내용을 잃지 않도록 화면을 떠나는 길목을 막는다.
 *
 * ── 왜 useBlocker 를 쓰지 않는가 ──
 * react-router 의 `useBlocker` 는 데이터 라우터(`RouterProvider`) 전용이다.
 * 이 앱은 `<BrowserRouter>` 를 쓰므로 호출 즉시 예외가 난다. 그래서 떠나는 경로를
 * 세 갈래로 나눠 각각 직접 막는다.
 *
 *   1. 새로고침·탭 닫기  → `beforeunload`
 *   2. 화면 안의 나가기 버튼(「뒤로」·「취소」) → `requestLeave()` 를 거치게 한다
 *   3. 하드웨어 백·엣지 스와이프 → 히스토리 보초(sentinel) + `popstate`
 *
 * ── 보초(sentinel)가 안전한 이유 ──
 * 보초는 **현재와 같은 URL** 로 밀어 넣는다. 사용자가 뒤로를 눌러 보초가 빠져도
 * `window.location` 은 그대로라, react-router 는 같은 위치로 계산하고 아무 이동도 하지 않는다.
 * 즉 보초는 react-router 의 라우팅 상태를 건드리지 않고 뒤로 제스처만 한 번 흡수한다.
 * 되돌린 뒤에는 보초를 다시 세워 다음 뒤로도 계속 잡는다.
 *
 * 사용자가 "나가기"를 고르면 히스토리 산술(`go(-2)` 등)로 되짚지 않고,
 * 화면이 알려 준 `exitTo` 로 명시적으로 이동한다 — 보초 개수에 의존하지 않아 어긋날 일이 없다.
 */

/** 나가기 요청을 가로챌 화면이 등록해 두는 자리. 한 번에 한 화면만 작성 중이므로 하나면 충분하다. */
type LeaveInterceptor = (proceed: () => void) => boolean
let activeInterceptor: LeaveInterceptor | null = null

/**
 * 작성 중인 화면이 있으면 확인을 거치고, 없으면 곧바로 실행한다.
 *
 * 화면 밖(예: 공용 PageIndicator)에서 이동시킬 때 이 함수를 거치면
 * 어느 폼이 열려 있는지 몰라도 작성 내용을 지킬 수 있다.
 */
export function requestLeave(proceed: () => void) {
  if (activeInterceptor?.(proceed)) return
  proceed()
}

interface Options {
  /** 지킬 내용이 있는가. false 면 아무것도 막지 않는다. */
  dirty: boolean
  /** "나가기"를 골랐을 때 실제로 수행할 이동. 하드웨어 백에서도 이 경로를 쓴다. */
  onLeave: () => void
}

export function useUnsavedChangesGuard({ dirty, onLeave }: Options) {
  /** 확인 창이 떠 있는 동안 붙잡아 둔 "확인하면 할 일". null 이면 창이 닫힌 상태다. */
  const [pendingLeave, setPendingLeave] = useState<{ run: () => void } | null>(null)

  // 리스너는 한 번만 붙이고 최신 값은 ref 로 읽는다.
  const dirtyRef = useRef(dirty)
  dirtyRef.current = dirty
  const onLeaveRef = useRef(onLeave)
  onLeaveRef.current = onLeave
  /** 나가기로 결론난 뒤에는 보초를 다시 세우지 않는다. */
  const leavingRef = useRef(false)

  // ── 1. 새로고침·탭 닫기 ──
  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      // 최신 브라우저는 문구를 무시하고 자체 확인창을 띄운다. 값 설정 자체가 신호다.
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  // ── 2. 화면 안의 나가기 버튼 ──
  useEffect(() => {
    if (!dirty) return
    const mine: LeaveInterceptor = (proceed) => {
      setPendingLeave({ run: proceed })
      return true
    }
    activeInterceptor = mine
    // 내가 등록한 것일 때만 비운다 — 남의 것을 지우면 그 화면이 무방비가 된다.
    return () => { if (activeInterceptor === mine) activeInterceptor = null }
  }, [dirty])

  // ── 3. 하드웨어 백 · 엣지 스와이프 ──
  // 보초는 **한 번에 하나만** 세운다. dirty 가 오갈 때마다 새로 밀어 넣으면
  // 같은 URL 항목이 히스토리에 쌓여, 나중에 뒤로를 여러 번 눌러야 빠져나가게 된다.
  const armedRef = useRef(false)

  useEffect(() => {
    if (!dirty || armedRef.current) return
    // react-router 가 히스토리 항목에 심어 둔 상태(idx 등)를 그대로 복사해 넣는다.
    // null 로 덮으면 react-router 의 내부 인덱스가 어긋난다.
    window.history.pushState(window.history.state, '', window.location.href)
    armedRef.current = true
  }, [dirty])

  useEffect(() => {
    const onPopState = () => {
      // 내가 세운 보초가 빠진 것이 아니라면 평범한 뒤로 이동이다 — 건드리지 않는다.
      if (!armedRef.current) return
      armedRef.current = false

      if (leavingRef.current || !dirtyRef.current) {
        // 지킬 것이 없어졌는데 보초만 남아 있었다 — 흡수한 뒤로를 사용자에게 돌려준다.
        // (이때 발생하는 popstate 는 armedRef 가 false 라 그대로 통과한다)
        window.history.back()
        return
      }

      // 뒤로를 한 번 흡수했다. 보초를 다시 세워 두고 물어본다.
      window.history.pushState(window.history.state, '', window.location.href)
      armedRef.current = true
      setPendingLeave({ run: () => onLeaveRef.current() })
    }

    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  /** 화면 안의 나가기 버튼에서 쓴다. 지킬 내용이 없으면 그대로 실행된다. */
  const guard = useCallback((proceed: () => void) => {
    if (!dirtyRef.current) {
      proceed()
      return
    }
    setPendingLeave({ run: proceed })
  }, [])

  /** 확인 창에서 "계속 쓰기". */
  const cancelLeave = useCallback(() => setPendingLeave(null), [])

  /**
   * 확인 창에서 "나가기". 붙잡아 둔 이동을 그대로 실행한다.
   *
   * @param before 이동 직전에 끝내야 할 일(임시저장 등).
   *   **`false` 를 돌려주면 나가지 않는다** — 임시저장이 실패했는데 그대로 내보내면
   *   지키려던 내용을 오히려 확실하게 잃는다. 창을 열어 둔 채로 다시 고르게 한다.
   *   (실패 안내 자체는 호출부가 토스트 등으로 맡는다)
   */
  const confirmLeave = useCallback(async (
    before?: () => Promise<boolean | void> | boolean | void,
  ) => {
    const action = pendingLeave?.run
    if (before) {
      let ok: boolean | void
      try {
        ok = await before()
      } catch {
        ok = false
      }
      if (ok === false) return
    }
    leavingRef.current = true
    setPendingLeave(null)
    action?.()
  }, [pendingLeave])

  return {
    /** 확인 창을 띄워야 하는가. */
    leaveDialogOpen: pendingLeave !== null,
    guard,
    cancelLeave,
    confirmLeave,
  }
}
