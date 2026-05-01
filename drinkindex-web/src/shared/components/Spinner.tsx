type Size = 'sm' | 'md' | 'lg'

interface SpinnerProps {
  size?: Size
  className?: string
}

const sizeClasses: Record<Size, string> = {
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-10 h-10 border-3',
}

export default function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  return (
    <div
      className={`animate-spin rounded-full border-current border-t-transparent
        ${sizeClasses[size]} ${className}`}
      role="status"
      aria-label="로딩 중"
    />
  )
}
