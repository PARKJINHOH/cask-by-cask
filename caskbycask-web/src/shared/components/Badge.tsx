import React from 'react'

// Spirit categories
type SpiritCategoryVariant =
  | 'WHISKY' | 'COGNAC' | 'WINE' | 'OTHER'

// Content / entity status
type StatusVariant =
  | 'ACTIVE' | 'PENDING' | 'HIDDEN' | 'RESOLVED' | 'DISMISSED'
  | 'APPROVED' | 'REJECTED'

// Generic variants
type GenericVariant = 'primary' | 'neutral' | 'success' | 'danger' | 'warning'

export type BadgeVariant = GenericVariant | SpiritCategoryVariant | StatusVariant

type Size = 'sm' | 'md'

export interface BadgeProps {
  variant?: BadgeVariant
  size?: Size
  children: React.ReactNode
  className?: string
}

const variantClasses: Record<BadgeVariant, string> = {
  // Generic
  primary:   'bg-primary-100 text-primary-900',
  neutral:   'bg-neutral-100 text-neutral-600',
  success:   'bg-green-100 text-green-700',
  danger:    'bg-danger-100 text-danger-700',
  warning:   'bg-yellow-100 text-yellow-700',
  // Spirit categories
  WHISKY:    'bg-amber-100 text-amber-800',
  COGNAC:    'bg-orange-100 text-orange-800',
  WINE:      'bg-rose-100 text-rose-800',
  OTHER:     'bg-neutral-100 text-neutral-600',
  // Status
  ACTIVE:    'bg-green-100 text-green-700',
  PENDING:   'bg-yellow-100 text-yellow-700',
  HIDDEN:    'bg-danger-100 text-danger-700',
  RESOLVED:  'bg-blue-100 text-blue-700',
  DISMISSED: 'bg-neutral-100 text-neutral-500',
  APPROVED:  'bg-green-100 text-green-700',
  REJECTED:  'bg-danger-100 text-danger-700',
}

const sizeClasses: Record<Size, string> = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-0.5 text-xs font-semibold',
}

export default function Badge({
  variant = 'neutral',
  size = 'md',
  children,
  className = '',
}: BadgeProps) {
  return (
    <span
      className={[
        // shrink-0 + whitespace-nowrap 이 없으면 좁은 화면의 flex 행에서 뱃지가 먼저 찌그러져
        // 한글이 한 글자씩 세로로 쌓인다. 뱃지는 줄지 않고, 옆의 본문 텍스트가 줄어야 한다.
        'inline-flex shrink-0 items-center whitespace-nowrap font-medium rounded-full',
        variantClasses[variant] ?? variantClasses.neutral,
        sizeClasses[size],
        className,
      ].join(' ')}
    >
      {children}
    </span>
  )
}
