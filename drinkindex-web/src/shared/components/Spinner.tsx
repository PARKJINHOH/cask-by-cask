type Size = 'sm' | 'md' | 'lg'

export interface SpinnerProps {
  size?: Size
  fullscreen?: boolean
  className?: string
  label?: string
}

const sizeClasses: Record<Size, string> = {
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-10 h-10 border-[3px]',
}

function SpinnerIcon({ size = 'md', className = '', label = '로딩 중' }: Omit<SpinnerProps, 'fullscreen'>) {
  return (
    <div
      role="status"
      aria-label={label}
      className={[
        'animate-spin rounded-full border-current border-t-transparent text-primary-800',
        sizeClasses[size],
        className,
      ].join(' ')}
    >
      <span className="sr-only">{label}</span>
    </div>
  )
}

export default function Spinner({ fullscreen = false, size = 'md', className = '', label }: SpinnerProps) {
  if (fullscreen) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-white/70 backdrop-blur-sm"
        aria-live="polite"
      >
        <SpinnerIcon size="lg" label={label} />
      </div>
    )
  }
  return <SpinnerIcon size={size} className={className} label={label} />
}
