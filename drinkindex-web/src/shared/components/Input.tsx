import { forwardRef, InputHTMLAttributes, useState } from 'react'

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string
  error?: string
  hint?: string
}

function EyeOpen() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function EyeOff() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, type = 'text', className = '', id, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false)
    const isPassword = type === 'password'
    const inputId = id ?? (label ? `input-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined)
    const resolvedType = isPassword ? (showPassword ? 'text' : 'password') : type

    return (
      <div className="space-y-1">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-neutral-700">
            {label}
          </label>
        )}

        <div className="relative">
          <input
            id={inputId}
            ref={ref}
            type={resolvedType}
            aria-invalid={!!error}
            aria-describedby={
              error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined
            }
            className={[
              'w-full px-3 py-2 text-sm rounded-lg border transition-colors',
              'placeholder:text-neutral-400',
              'focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent',
              'disabled:bg-neutral-50 disabled:text-neutral-400 disabled:cursor-not-allowed',
              isPassword ? 'pr-10' : '',
              error
                ? 'border-danger-400 bg-danger-50/30 focus:ring-danger-400'
                : 'border-neutral-300 bg-white',
              className,
            ]
              .filter(Boolean)
              .join(' ')}
            {...props}
          />

          {isPassword && (
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400
                hover:text-neutral-600 transition-colors rounded p-0.5"
            >
              {showPassword ? <EyeOff /> : <EyeOpen />}
            </button>
          )}
        </div>

        {error && (
          <p id={`${inputId}-error`} role="alert"
            className="flex items-start gap-1 text-xs text-danger-600">
            <svg className="w-3 h-3 flex-shrink-0 mt-px" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            </svg>
            {error}
          </p>
        )}

        {hint && !error && (
          <p id={`${inputId}-hint`} className="text-xs text-neutral-400">{hint}</p>
        )}
      </div>
    )
  },
)

Input.displayName = 'Input'
export default Input
