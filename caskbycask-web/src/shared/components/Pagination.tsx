export interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  className?: string
  scrollToTopOnChange?: boolean
  /**
   * 페이지 변경 후 스크롤 목표 위치.
   * - `'list'` (기본): 목록 컨테이너 상단 — 댓글·마이페이지 탭처럼 페이지 중간에 있는 목록용
   * - `'page'`: 페이지(또는 스크롤 컨테이너) 최상단 — 페이지 레벨 목록용
   */
  scrollTarget?: 'list' | 'page'
  /**
   * 0-based 페이지 번호를 실제 주소로 바꾼다. 넘기면 버튼 대신 {@code <a href>} 로 그린다.
   * <p>
   * 크롤러는 버튼을 클릭하지 않고 href 만 따라간다. 색인 대상 목록이 이 값을 넘기지 않으면
   * 하이드레이션 이후 DOM 에 뒤 페이지로 가는 링크가 하나도 남지 않아, 1페이지 밖의 항목이
   * 유입 경로를 잃는다(페이지 주소는 sitemap 에도 넣지 않는다).
   * <p>
   * 반대로 댓글·마이페이지 탭처럼 고유 주소가 없는 목록은 넘기지 않는다 — 기존처럼 버튼으로 그린다.
   */
  buildHref?: (page: number) => string
}

import { useRef, type MouseEvent, type ReactNode } from 'react'
import { scrollToElementTop, scrollToPageTop } from '@/shared/utils/scrollToPageTop'

/** Returns at most 5 page numbers with '...' where needed. */
function buildPages(current: number, total: number): (number | '...')[] {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i)

  const lo = Math.max(1, Math.min(current - 1, total - 4))
  const hi = Math.min(total - 2, Math.max(current + 1, 3))

  const result: (number | '...')[] = [0]
  if (lo > 1) result.push('...')
  for (let i = lo; i <= hi; i++) result.push(i)
  if (hi < total - 2) result.push('...')
  result.push(total - 1)
  return result
}

const navBtn =
  'h-8 min-w-[2rem] px-1 text-sm rounded-lg border transition-colors ' +
  'disabled:opacity-40 disabled:cursor-not-allowed'

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  className = '',
  scrollToTopOnChange = true,
  scrollTarget = 'list',
  buildHref,
}: PaginationProps) {
  const navRef = useRef<HTMLElement>(null)

  if (totalPages <= 1) return null

  const handlePageChange = (page: number) => {
    if (page === currentPage || page < 0 || page >= totalPages) return
    onPageChange(page)
    if (!scrollToTopOnChange) return

    if (scrollTarget === 'page') {
      scrollToPageTop(navRef.current)
      return
    }
    scrollToElementTop(navRef.current?.parentElement ?? null, navRef.current)
  }

  /**
   * 주소가 있는 목록은 앵커로, 없는 목록은 버튼으로 그린다.
   * 앵커여도 평범한 클릭은 가로채 SPA 이동을 유지한다 — 새 탭 열기(수식키·가운데 버튼)는
   * 브라우저 기본 동작에 맡겨야 사용자가 페이지를 새 탭으로 열 수 있다.
   */
  function cell(page: number, label: ReactNode, cls: string, ariaLabel: string, disabled = false) {
    const current = page === currentPage
    if (!buildHref || disabled) {
      return (
        <button
          onClick={() => handlePageChange(page)}
          disabled={disabled}
          aria-label={ariaLabel}
          aria-current={current ? 'page' : undefined}
          className={cls}
        >
          {label}
        </button>
      )
    }
    return (
      <a
        href={buildHref(page)}
        aria-label={ariaLabel}
        aria-current={current ? 'page' : undefined}
        className={`${cls} inline-flex items-center justify-center`}
        onClick={(event: MouseEvent<HTMLAnchorElement>) => {
          if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
          event.preventDefault()
          handlePageChange(page)
        }}
      >
        {label}
      </a>
    )
  }

  const plain = `${navBtn} border-neutral-200 hover:bg-neutral-50 text-neutral-500 px-2`

  return (
    <nav
      ref={navRef}
      role="navigation"
      aria-label="페이지 네비게이션"
      className={`flex items-center justify-center gap-1 ${className}`}
    >
      {cell(currentPage - 1, '‹', plain, '이전 페이지', currentPage === 0)}

      {buildPages(currentPage, totalPages).map((p, i) =>
        p === '...' ? (
          <span key={`e${i}`} className="w-8 text-center text-neutral-400 text-sm select-none">
            …
          </span>
        ) : (
          <span key={p} className="contents">
            {cell(p, p + 1, [
              navBtn,
              p === currentPage
                ? 'bg-primary-800 text-white border-primary-800 font-semibold'
                : 'border-neutral-200 text-neutral-700 hover:bg-neutral-50',
            ].join(' '), `${p + 1}페이지`)}
          </span>
        ),
      )}

      {cell(currentPage + 1, '›', plain, '다음 페이지', currentPage === totalPages - 1)}
    </nav>
  )
}
