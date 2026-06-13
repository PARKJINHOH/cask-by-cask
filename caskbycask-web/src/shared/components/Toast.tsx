import type { Toast as ToastItem } from '@/shared/hooks/useToast'

type ToastPosition = 'bottom-right' | 'top-center'

interface Props {
  toasts: ToastItem[]
  onRemove: (id: string) => void
  position?: ToastPosition
}

const variantClasses: Record<ToastItem['type'], string> = {
  success: 'bg-green-600 text-white',
  error: 'bg-danger-600 text-white',
  info: 'bg-neutral-800 text-white',
}

const containerClasses: Record<ToastPosition, string> = {
  'bottom-right': 'bottom-6 right-6 items-end',
  'top-center': 'top-6 left-1/2 -translate-x-1/2 items-center',
}

const animClasses: Record<ToastPosition, string> = {
  'bottom-right': 'slide-in-from-bottom-2',
  'top-center': 'slide-in-from-top-2',
}

export default function Toast({ toasts, onRemove, position = 'bottom-right' }: Props) {
  if (toasts.length === 0) return null

  return (
    <div
      className={`fixed z-50 flex flex-col gap-2 pointer-events-none ${containerClasses[position]}`}
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role={toast.type === 'error' ? 'alert' : 'status'}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium
            pointer-events-auto animate-in fade-in duration-200 ${animClasses[position]}
            ${variantClasses[toast.type]}`}
        >
          <span className="flex-1">{toast.message}</span>
          <button
            type="button"
            onClick={() => onRemove(toast.id)}
            aria-label="닫기"
            className="opacity-70 hover:opacity-100 transition-opacity ml-1"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  )
}
