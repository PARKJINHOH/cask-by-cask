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

/** Scrolls a list's own content area into view without losing nested admin/modal scrolling. */
export function scrollToElementTop(
  target: HTMLElement | null,
  source: HTMLElement | null = target,
) {
  if (typeof window === 'undefined') return
  if (!target) {
    scrollToPageTop(source)
    return
  }

  const scrollContainer = findScrollableAncestor(source)

  window.requestAnimationFrame(() => {
    const targetRect = target.getBoundingClientRect()

    if (scrollContainer) {
      const containerRect = scrollContainer.getBoundingClientRect()
      const top = scrollContainer.scrollTop + targetRect.top - containerRect.top
      scrollContainer.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
      return
    }

    window.scrollTo({
      top: Math.max(0, window.scrollY + targetRect.top),
      behavior: 'smooth',
    })
  })
}
