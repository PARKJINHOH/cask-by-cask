import { useLayoutEffect, useState } from 'react'

/** 헤더+GNB 가 차지한 높이(px). CSS 에서 `var(--di-chrome-top, 0px)` 로 읽는다. */
const CSS_VAR = '--di-chrome-top'

/**
 * 화면 위에 늘 떠 있는 헤더 + GNB 의 높이를 잰다.
 *
 * 둘 다 sticky 라 `top: 0` 에 붙인 다른 sticky 요소(에디터 툴바 등)는 그 뒤로 숨는다.
 * 높이는 화면 폭과 로그인 여부에 따라 달라져서 상수로 둘 수 없다.
 *
 * 값은 CSS 변수로도 얹어 둔다 — 순수 CSS(rich-text.css)에서도 같은 기준을 쓸 수 있게.
 *
 * @returns 헤더+GNB 높이(px).
 */
export function useChromeTop(): number {
  const [chromeTop, setChromeTop] = useState(0)

  useLayoutEffect(() => {
    const update = () => {
      // MainLayout 의 <header> 와 GNB <nav> — 문서에서 처음 나오는 둘이다.
      const header = document.querySelector('header')
      const nav = document.querySelector('nav')
      const height = (header?.getBoundingClientRect().height ?? 0)
        + (nav?.getBoundingClientRect().height ?? 0)
      setChromeTop((current) => (current === height ? current : height))
      document.documentElement.style.setProperty(CSS_VAR, `${height}px`)
    }

    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  return chromeTop
}

export default useChromeTop
