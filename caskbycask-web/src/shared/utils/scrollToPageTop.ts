function findScrollableAncestor(element: HTMLElement | null): HTMLElement | null {
  if (typeof window === 'undefined') return null

  let parent = element?.parentElement ?? null

  while (parent && parent !== document.body && parent !== document.documentElement) {
    const { overflowY } = window.getComputedStyle(parent)
    if (/(auto|scroll|overlay)/.test(overflowY)) return parent
    parent = parent.parentElement
  }

  return null
}

/** Scrolls the page or its nested content area to the top after pagination changes. */
export function scrollToPageTop(source: HTMLElement | null = null) {
  if (typeof window === 'undefined') return

  const scrollContainer = findScrollableAncestor(source)

  window.requestAnimationFrame(() => {
    if (scrollContainer) {
      scrollContainer.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    window.scrollTo({ top: 0, behavior: 'smooth' })
  })
}
