import { useEffect, useState } from 'react'

/** 키보드가 덮은 높이(px). CSS 에서 `var(--di-keyboard-inset, 0px)` 로 읽는다. */
const CSS_VAR = '--di-keyboard-inset'

/**
 * 가상 키보드가 화면 아래를 덮은 높이를 CSS 변수로 흘려 보낸다.
 *
 * `position: fixed` 로 화면 바닥에 붙인 요소는 **레이아웃 뷰포트** 기준이라,
 * 키보드가 올라와도 그 자리에 그대로 남아 키보드 뒤로 들어간다. 방금 탭한 검색창이
 * 사라지는 것이 이 때문이다. 스크롤로 끌어올릴 수도 없다(고정 요소라 스크롤 대상이 아니다).
 *
 * Android Chrome 은 viewport 메타의 `interactive-widget=resizes-content` 로 해결되지만
 * iOS Safari 는 그 값을 무시한다. 그래서 visualViewport 로 직접 잰다.
 *
 * 재는 법: 레이아웃 뷰포트 높이에서 (보이는 높이 + 위로 밀린 양)을 뺀 나머지가 키보드다.
 * 주소창 접힘 등으로 생기는 작은 오차는 임계값(60px) 아래로 버린다.
 *
 * 값은 문서 루트의 CSS 변수로도 얹어 둔다 — 리스너를 더 달지 않고 CSS 만으로 따라갈 수 있다.
 *
 * @returns 키보드가 덮은 높이(px). 키보드가 없거나 visualViewport 미지원이면 0.
 */
export function useKeyboardInset(enabled = true): number {
  const [inset, setInset] = useState(0)

  useEffect(() => {
    const viewport = typeof window !== 'undefined' ? window.visualViewport : null
    if (!enabled || !viewport) {
      setInset(0)
      return
    }

    const root = document.documentElement

    const update = () => {
      const covered = window.innerHeight - viewport.height - viewport.offsetTop
      // 60px 미만은 주소창·툴바가 접히고 펴진 정도다. 키보드로 보지 않는다.
      const next = covered > 60 ? Math.round(covered) : 0
      root.style.setProperty(CSS_VAR, `${next}px`)
      setInset((current) => (current === next ? current : next))
    }

    update()
    viewport.addEventListener('resize', update)
    viewport.addEventListener('scroll', update)
    return () => {
      viewport.removeEventListener('resize', update)
      viewport.removeEventListener('scroll', update)
      root.style.removeProperty(CSS_VAR)
      setInset(0)
    }
  }, [enabled])

  return inset
}

export default useKeyboardInset
