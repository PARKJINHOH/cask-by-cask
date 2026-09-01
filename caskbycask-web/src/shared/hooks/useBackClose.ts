import { useEffect, useRef } from 'react'

/**
 * 열려 있는 오버레이를 기기 「뒤로가기」로 닫는다.
 *
 * ── 왜 히스토리 보초(sentinel)인가 ──
 * 이 앱은 Next.js 껍데기 안에서 도는 client-only `<BrowserRouter>` SPA 라
 * `next/navigation` 이 아니라 순수 `history.pushState` + `popstate` 로 다뤄야 한다.
 * 보초는 **현재와 같은 URL** 로 밀어 넣으므로 사용자가 뒤로를 눌러 보초가 빠져도
 * `window.location` 은 그대로다 — react-router 는 같은 위치로 계산하고 아무 이동도 하지 않는다.
 * 즉 보초는 라우팅 상태를 건드리지 않고 뒤로 제스처만 한 번 흡수한다.
 * (같은 기법을 쓰는 선례: `useUnsavedChangesGuard`)
 *
 * ⚠️ `pushState` 에 `window.history.state` 를 **그대로 복사**해 넣는다.
 *    `null` 로 덮으면 react-router 의 내부 인덱스(idx)가 어긋난다.
 *
 * 알려진 한계: 오버레이가 열린 채 컴포넌트가 언마운트되면 같은 URL 의 보초가 하나 남는다.
 * 언마운트 시점에 `history.back()` 을 부르면 정상 내비게이션을 되돌릴 위험이 있어
 * `useUnsavedChangesGuard` 와 같은 선택(정리하지 않음)을 따른다.
 *
 * @param open    오버레이가 떠 있는가. `false` 면 아무것도 하지 않는다.
 * @param onClose 뒤로가기를 흡수했을 때 실행할 닫기 동작.
 */
export function useBackClose(open: boolean, onClose: () => void) {
  /** 내가 세운 보초가 히스토리에 올라가 있는가. 한 번에 하나만 세운다. */
  const armedRef = useRef(false)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  // 열릴 때 보초를 세운다.
  useEffect(() => {
    if (!open || armedRef.current) return
    window.history.pushState(window.history.state, '', window.location.href)
    armedRef.current = true
  }, [open])

  // 닫기 버튼·ESC·배경 클릭으로 닫혔으면 남은 보초를 걷어낸다.
  // 이때 발생하는 popstate 는 armedRef 가 false 라 아래 리스너를 그대로 통과한다.
  useEffect(() => {
    if (open || !armedRef.current) return
    armedRef.current = false
    window.history.back()
  }, [open])

  useEffect(() => {
    const onPopState = () => {
      // 내 보초가 빠진 것이 아니라면 평범한 뒤로 이동이다 — 건드리지 않는다.
      if (!armedRef.current) return
      armedRef.current = false
      onCloseRef.current()
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])
}
