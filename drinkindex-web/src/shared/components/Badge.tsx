type Variant = 'primary' | 'neutral' | 'success' | 'danger'
type Size = 'sm' | 'md'

interface BadgeProps {
  variant?: Variant
  size?: Size
  children: React.ReactNode
  className?: string
}

const variantClasses: Record<Variant, string> = {
  primary: 'bg-primary-100 text-primary-700',
  neutral: 'bg-neutral-100 text-neutral-700',
  success: 'bg-green-100 text-green-700',
  danger:  'bg-danger-100 text-danger-700',
}

const sizeClasses: Record<Size, string> = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
}

export default function Badge({
  variant = 'neutral',
  size = 'md',
  children,
  className = '',
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center font-medium rounded-full
        ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
    >
      {children}
    </span>
  )
}
