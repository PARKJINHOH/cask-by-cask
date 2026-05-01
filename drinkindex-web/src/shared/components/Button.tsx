import { ButtonHTMLAttributes } from 'react'
import Spinner from './Spinner'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  isLoading?: boolean
}

const variantClasses: Record<Variant, string> = {
  primary:   'bg-primary-600 text-white hover:bg-primary-700 disabled:bg-primary-300',
  secondary: 'bg-white text-neutral-700 border border-neutral-300 hover:bg-neutral-50 disabled:opacity-50',
  danger:    'bg-danger-600 text-white hover:bg-danger-700 disabled:bg-danger-300',
  ghost:     'text-neutral-600 hover:bg-neutral-100 disabled:opacity-50',
}

const sizeClasses: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-2.5 text-base',
}

export default function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled,
  children,
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-colors
        focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
        disabled:cursor-not-allowed
        ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {isLoading && <Spinner size="sm" className="text-current" />}
      {children}
    </button>
  )
}
