import { forwardRef, InputHTMLAttributes, useState } from 'react'
import FormFieldLabel from './FormFieldLabel'

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
    const [isFocused, setIsFocused] = useState(false)
    const [capsLock, setCapsLock] = useState(false)
    const [isComposing, setIsComposing] = useState(false)

    const isPassword = type === 'password'
    const inputId = id ?? (label ? `input-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined)
    const resolvedType = isPassword ? (showPassword ? 'text' : 'password') : type

    const {
      onKeyDown, onKeyUp, onFocus, onBlur,
      onCompositionStart, onCompositionEnd,
      ...restProps
    } = props

    const showWarning = isPassword && isFocused && (capsLock || isComposing)

    return (
      <div className="space-y-1">
        {label && (
          <FormFieldLabel htmlFor={inputId} required={props.required}>
            {label}
          </FormFieldLabel>
        )}

        <div className="relative">
          <input
            id={inputId}
            ref={ref}
            type={resolvedType}
            aria-required={restProps.required || undefined}
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
            onFocus={(e) => {
              setIsFocused(true)
              onFocus?.(e)
            }}
            onBlur={(e) => {
              setIsFocused(false)
              setIsComposing(false)
              onBlur?.(e)
            }}
            onKeyDown={(e) => {
              if (isPassword) setCapsLock(e.getModifierState('CapsLock'))
              onKeyDown?.(e)
            }}
            onKeyUp={(e) => {
              if (isPassword) setCapsLock(e.getModifierState('CapsLock'))
              onKeyUp?.(e)
            }}
            onCompositionStart={(e) => {
              if (isPassword) setIsComposing(true)
              onCompositionStart?.(e)
            }}
            onCompositionEnd={(e) => {
              if (isPassword) setIsComposing(false)
              onCompositionEnd?.(e)
            }}
            {...restProps}
          />

          {/* CapsLock / 한글 입력 경고 말풍선 */}
          {showWarning && (
            <div className="absolute left-0 top-full mt-2 z-50 bg-white rounded-lg shadow-md border border-neutral-200 px-3 py-2 min-w-max">
              <div className="absolute -top-[6px] left-3 w-3 h-3 bg-white border-l border-t border-neutral-200 rotate-45" />
              <div className="space-y-1">
                {capsLock && (
                  <p className="flex items-center gap-1.5 text-xs text-amber-600">
                    <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="17 11 12 6 7 11" />
                      <polyline points="17 18 12 13 7 18" />
                    </svg>
                    CapsLock이 켜져 있습니다
                  </p>
                )}
                {isComposing && (
                  <p className="flex items-center gap-1.5 text-xs text-red-500">
                    <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                    </svg>
                    한글은 비밀번호에 사용할 수 없습니다
                  </p>
                )}
              </div>
            </div>
          )}

          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
              aria-pressed={showPassword}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400
                hover:text-neutral-600 transition-colors rounded p-0.5
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
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
