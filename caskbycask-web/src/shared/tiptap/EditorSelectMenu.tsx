import { useRef, useState, type ReactNode } from 'react'
import EditorPopover from './EditorPopover'
import EditorTooltip from './EditorTooltip'

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
  const [autoFocus, setAutoFocus] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)

  return (
    <>
      <EditorTooltip content={title} disabled={open}>
        <button
          ref={triggerRef}
          type="button"
          data-toolbar-item=""
          aria-label={title}
          aria-expanded={open}
          aria-haspopup="listbox"
          // mousedown 기본동작만 막아 에디터 선택 영역을 지키고, 실제 동작은 click 에서 처리한다.
          // (키보드 Enter/Space 는 click 만 발생시키므로 mousedown 에서 처리하면 조작 자체가 불가능하다)
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => {
            setAutoFocus(e.detail === 0) // detail 0 == 키보드로 활성화
            setOpen((o) => !o)
          }}
          style={{ minWidth: width }}
          className="h-7 px-1.5 flex items-center justify-between gap-0.5 rounded text-[13px] text-neutral-700 hover:bg-neutral-100 transition-colors border border-transparent hover:border-neutral-200"
        >
          <span className="flex items-center gap-1 truncate">
            {icon}
            <span className="truncate">{current}</span>
          </span>
          <svg className="w-3 h-3 text-neutral-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </EditorTooltip>

      <EditorPopover
        anchorRef={triggerRef}
        open={open}
        onClose={() => setOpen(false)}
        autoFocus={autoFocus}
        role="listbox"
        label={title}
        className="min-w-[140px] max-h-72 overflow-y-auto py-1"
      >
        {options.map((opt) => {
          const isActive = activeValue != null && activeValue === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              role="option"
              aria-selected={isActive}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
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
      </EditorPopover>
    </>
  )
}
