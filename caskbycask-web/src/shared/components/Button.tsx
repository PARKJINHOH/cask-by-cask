import { ButtonHTMLAttributes } from 'react'
import Spinner from './Spinner'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'
type Size = 'sm' | 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  isLoading?: boolean
  fullWidth?: boolean
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-primary-800 text-white shadow-sm hover:bg-primary-900 hover:shadow-md active:bg-primary-900 ' +
    'disabled:bg-neutral-200 disabled:text-neutral-400',
  secondary:
    'bg-white text-neutral-700 border border-neutral-300 shadow-xs ' +
    'hover:bg-neutral-50 hover:border-neutral-400 hover:shadow-sm active:bg-neutral-100 disabled:opacity-50',
  danger:
    'bg-danger-600 text-white shadow-sm hover:bg-danger-700 hover:shadow-md active:bg-danger-800 ' +
    'disabled:bg-neutral-200 disabled:text-neutral-400',
  ghost:
    'text-neutral-600 hover:bg-neutral-100 active:bg-neutral-200 disabled:opacity-40',
}

const sizeClasses: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-md',
  // 모바일에선 터치 최소치(44px) 확보, sm(≥640px) 데스크톱에선 기존 밀집 높이(36px)
  md: 'h-11 sm:h-9 px-4 text-sm gap-2 rounded-lg',
  lg: 'h-11 px-5 text-sm gap-2 rounded-lg',
}

export default function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  fullWidth = false,
  disabled,
  children,
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      className={[
        'inline-flex items-center justify-center font-medium select-none',
        // 색·그림자·변형을 함께 부드럽게 전환 + 누름 시 살짝 눌리는 촉감(press feedback)
        'transition-[transform,background-color,border-color,box-shadow,color,opacity] duration-150 ease-out',
        'active:scale-[0.97] motion-reduce:active:scale-100',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
        // 비활성 시 인터랙션 효과(그림자/누름) 제거
        'disabled:cursor-not-allowed disabled:shadow-none disabled:active:scale-100',
        variantClasses[variant],
        sizeClasses[size],
        fullWidth ? 'w-full' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {isLoading && <Spinner size="sm" className="text-current opacity-80" />}
      {children}
    </button>
  )
}
