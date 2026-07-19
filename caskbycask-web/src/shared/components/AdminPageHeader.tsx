import { Fragment, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'

export interface Crumb {
  label: string
  /** 지정 시 클릭 가능한 링크, 미지정 시 현재 위치(굵게) */
  to?: string
}

interface AdminPageHeaderProps {
  /** 상단 경로 표시. 마지막 항목은 현재 페이지(굵게). */
  breadcrumbs?: Crumb[]
  /** 뒤로가기 버튼 이동 경로 (미지정 시 버튼 숨김) */
  backTo?: string
  useBackToPath?: boolean
  /** 뒤로가기 버튼 라벨 */
  backLabel?: string
  /** 페이지 제목 */
  title: string
  /** 제목 옆 배지 등 */
  badge?: ReactNode
  /** 우측 정렬 액션 영역 */
  actions?: ReactNode
}

/**
 * 관리자 하위(상세/폼) 페이지 공통 헤더.
 * 브레드크럼 + 뒤로가기 버튼 + 제목을 일관되게 렌더링한다.
 */
export default function AdminPageHeader({
  breadcrumbs,
  backTo,
  useBackToPath = false,
  backLabel = '목록으로',
  title,
  badge,
  actions,
}: AdminPageHeaderProps) {
  const navigate = useNavigate()

  return (
    <div className="space-y-3 mb-6">
      {/* 브레드크럼 */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-1.5 text-xs text-neutral-400">
          {breadcrumbs.map((c, i) => (
            <Fragment key={`${c.label}-${i}`}>
              {i > 0 && <span className="text-neutral-300">›</span>}
              {c.to ? (
                <Link to={c.to} className="hover:text-primary-700 transition-colors">
                  {c.label}
                </Link>
              ) : (
                <span className="text-neutral-600 font-medium">{c.label}</span>
              )}
            </Fragment>
          ))}
        </nav>
      )}

      {/* 뒤로가기 + 제목 */}
      <div className="flex items-center gap-3">
        {backTo && (
          <button
            type="button"
            onClick={() => (useBackToPath ? navigate(backTo) : navigate(-1))}
            className="inline-flex items-center gap-1 h-8 pl-2 pr-3 rounded-lg border border-neutral-200
              bg-white text-sm text-neutral-600 shadow-sm transition-colors
              hover:border-primary-300 hover:text-primary-700 hover:bg-primary-50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            {backLabel}
          </button>
        )}
        <h1 className="text-xl font-bold text-neutral-900">{title}</h1>
        {badge}
        {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  )
}
