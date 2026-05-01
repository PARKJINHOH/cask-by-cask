import { forwardRef, InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s/g, '-')
    return (
      <div className="space-y-1">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-neutral-700">
            {label}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          className={`w-full px-3 py-2 border rounded-lg text-sm transition-colors
            focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
            disabled:bg-neutral-50 disabled:cursor-not-allowed
            ${error ? 'border-danger-500' : 'border-neutral-300'}
            ${className}`}
          {...props}
        />
        {error && <p className="text-xs text-danger-600">{error}</p>}
      </div>
    )
  },
)

Input.displayName = 'Input'
export default Input
