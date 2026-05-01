interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  className?: string
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  className = '',
}: PaginationProps) {
  if (totalPages <= 1) return null

  const range = (start: number, end: number) =>
    Array.from({ length: end - start + 1 }, (_, i) => start + i)

  const pages = (() => {
    if (totalPages <= 7) return range(0, totalPages - 1)
    if (currentPage < 4) return [...range(0, 4), -1, totalPages - 1]
    if (currentPage > totalPages - 5) return [0, -1, ...range(totalPages - 5, totalPages - 1)]
    return [0, -1, ...range(currentPage - 1, currentPage + 1), -2, totalPages - 1]
  })()

  return (
    <nav className={`flex items-center justify-center gap-1 ${className}`} aria-label="페이지 네비게이션">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 0}
        className="px-3 py-1.5 text-sm rounded border border-neutral-300 disabled:opacity-40
          hover:bg-neutral-50 transition-colors"
      >
        ‹
      </button>

      {pages.map((p, i) =>
        p < 0 ? (
          <span key={`ellipsis-${i}`} className="px-2 text-neutral-400">…</span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`min-w-[2rem] h-8 text-sm rounded border transition-colors ${
              p === currentPage
                ? 'bg-primary-600 text-white border-primary-600'
                : 'border-neutral-300 hover:bg-neutral-50 text-neutral-700'
            }`}
          >
            {p + 1}
          </button>
        ),
      )}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages - 1}
        className="px-3 py-1.5 text-sm rounded border border-neutral-300 disabled:opacity-40
          hover:bg-neutral-50 transition-colors"
      >
        ›
      </button>
    </nav>
  )
}
