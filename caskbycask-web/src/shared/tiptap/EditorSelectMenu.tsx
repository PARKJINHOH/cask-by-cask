import { useEffect, useRef, useState, type ReactNode } from 'react'

export interface SelectOption {
  value: string
  label: string
  /** 미리보기용 인라인 스타일 (글꼴/크기 등) */
  style?: React.CSSProperties
}

interface Props {
  title: string
  /** 버튼에 표시할 현재 라벨 */
  current: string
  options: SelectOption[]
  /** 현재 선택된 값 (활성 표시용) */
  activeValue?: string
  onSelect: (value: string) => void
  /** 버튼 최소 폭 (px) */
  width?: number
  icon?: ReactNode
}

// 툴바용 공통 드롭다운 (글꼴 / 글자 크기 / 줄간격 선택).
export default function EditorSelectMenu({
  title, current, options, activeValue, onSelect, width = 84, icon,
}: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onDocMouseDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocMouseDown)
    return () => document.removeEventListener('mousedown', onDocMouseDown)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        title={title}
        onMouseDown={(e) => { e.preventDefault(); setOpen((o) => !o) }}
        style={{ minWidth: width }}
        className="h-7 px-2 flex items-center justify-between gap-1 rounded text-xs text-neutral-700 hover:bg-neutral-100 transition-colors border border-transparent hover:border-neutral-200"
      >
        <span className="flex items-center gap-1 truncate">
          {icon}
          <span className="truncate">{current}</span>
        </span>
        <svg className="w-3 h-3 text-neutral-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-30 mt-1 left-0 py-1 bg-white border border-neutral-200 rounded-lg shadow-lg min-w-[140px] max-h-72 overflow-y-auto">
          {options.map((opt) => {
            const isActive = activeValue != null && activeValue === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault()
                  onSelect(opt.value)
                  setOpen(false)
                }}
                style={opt.style}
                className={[
                  'w-full text-left px-3 py-1.5 text-sm hover:bg-neutral-100 transition-colors whitespace-nowrap',
                  isActive ? 'bg-primary-50 text-primary-900 font-medium' : 'text-neutral-700',
                ].join(' ')}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
