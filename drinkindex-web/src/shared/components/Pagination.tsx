export interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  className?: string
}

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
}: PaginationProps) {
  if (totalPages <= 1) return null

  return (
    <nav
      role="navigation"
      aria-label="페이지 네비게이션"
      className={`flex items-center justify-center gap-1 ${className}`}
    >
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 0}
        aria-label="이전 페이지"
        className={`${navBtn} border-neutral-200 hover:bg-neutral-50 text-neutral-500 px-2`}
      >
        ‹
      </button>

      {buildPages(currentPage, totalPages).map((p, i) =>
        p === '...' ? (
          <span key={`e${i}`} className="w-8 text-center text-neutral-400 text-sm select-none">
            …
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            aria-label={`${p + 1}페이지`}
            aria-current={p === currentPage ? 'page' : undefined}
            className={[
              navBtn,
              p === currentPage
                ? 'bg-primary-800 text-white border-primary-800 font-semibold'
                : 'border-neutral-200 text-neutral-700 hover:bg-neutral-50',
            ].join(' ')}
          >
            {p + 1}
          </button>
        ),
      )}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages - 1}
        aria-label="다음 페이지"
        className={`${navBtn} border-neutral-200 hover:bg-neutral-50 text-neutral-500 px-2`}
      >
        ›
      </button>
    </nav>
  )
}
