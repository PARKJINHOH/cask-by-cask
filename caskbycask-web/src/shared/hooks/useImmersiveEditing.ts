import { useEffect, useState } from 'react'

/** 헤더·GNB 를 접는 화면 폭 상한. Tailwind `lg`(1024px) 미만 = 모바일/태블릿. */
const MOBILE_QUERY = '(max-width: 1023.98px)'

/**
 * 지금 포커스가 '긴 글을 쓰는 입력'에 있는가.
 *
 * 한 줄 입력(검색창 등)은 제외한다 — 헤더 안의 검색창에 포커스가 갔다고 헤더를 숨기면
 * 방금 누른 입력이 사라진다. 늘어나는 편집 영역(textarea·리치텍스트)만 대상으로 한다.
 * 화면을 접으면 안 되는 입력은 `data-keep-chrome="true"` 로 빠져나갈 수 있다.
 */
const isEditingTarget = (target: Element | null): boolean => {
  if (!(target instanceof HTMLElement)) return false
  if (target.closest('[data-keep-chrome="true"]')) return false
  return target.tagName === 'TEXTAREA' || target.isContentEditable
}

/**
 * 모바일에서 글을 쓰는 동안 헤더·GNB·하단 탭을 접기 위한 상태.
 *
 * 모바일은 헤더(64px)+GNB(약 48px)+하단 탭(64px)이 세로 공간의 상당 부분을 먹는다.
 * 여기에 가상 키보드가 화면 절반을 덮으면 정작 쓰고 있는 글은 몇 줄만 보인다.
 * 그래서 편집 영역에 포커스가 있는 동안만 이 껍데기들을 걷어낸다.
 *
 * `focus`/`blur` 가 아니라 document 의 `focusin`/`focusout` 을 쓴다 —
 * 어느 화면의 어떤 입력이든 레이아웃 한 곳에서 받으려면 버블링되는 쪽이어야 한다.
 *
 * @returns 헤더·GNB·하단 탭을 숨겨야 하면 true.
 */
export function useImmersiveEditing(): boolean {
  const [immersive, setImmersive] = useState(false)

  useEffect(() => {
    const media = window.matchMedia(MOBILE_QUERY)
    let timer = 0

    const sync = () => {
      setImmersive(media.matches && isEditingTarget(document.activeElement))
    }

    // focusout 직후에는 activeElement 가 잠시 body 다. 한 틱 뒤에 확인해야
    // 옆 입력으로 옮겨 갈 때 헤더가 한 번 나타났다 사라지지 않는다.
    // requestAnimationFrame 은 탭이 보이지 않으면 아예 돌지 않아 쓰지 않는다.
    const schedule = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(sync, 0)
    }

    document.addEventListener('focusin', schedule)
    document.addEventListener('focusout', schedule)
    media.addEventListener('change', schedule)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('focusin', schedule)
      document.removeEventListener('focusout', schedule)
      media.removeEventListener('change', schedule)
    }
  }, [])

  return immersive
}

export default useImmersiveEditing
