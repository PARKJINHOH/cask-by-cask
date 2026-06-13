import { Link } from 'react-router-dom'

export interface Crumb {
  label: string
  /** 링크 목적지. 생략 시 단순 텍스트로 표시 */
  to?: string
}

/**
 * 페이지 상단 위치 표시(브레드크럼) 인디케이터.
 * 예) 커뮤니티 › 자유게시판 / 요청 › 개선·문의
 */
export default function Breadcrumb({ items, className = '' }: { items: Crumb[]; className?: string }) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={`flex items-center flex-wrap gap-1.5 text-xs text-neutral-400 ${className}`}
    >
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <span className="text-neutral-300 select-none">›</span>}
          {item.to ? (
            <Link to={item.to} className="hover:text-primary-700 transition-colors">
              {item.label}
            </Link>
          ) : (
            <span className="text-neutral-500 font-medium">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}
