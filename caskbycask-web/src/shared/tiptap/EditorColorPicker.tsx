import { useRef, useState } from 'react'
import type { Editor } from '@tiptap/react'
import { useTranslation } from 'react-i18next'
import EditorPopover from './EditorPopover'
import EditorTooltip from './EditorTooltip'

// 글자 색상 팔레트 (공통)
const COLORS = [
  '#000000', '#374151', '#6b7280', '#9ca3af', '#d1d5db', '#ffffff',
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e',
  '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
  '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#92400e', '#78350f',
]

interface Props {
  editor: Editor
}

export default function EditorColorPicker({ editor }: Props) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [autoFocus, setAutoFocus] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const current = (editor.getAttributes('textStyle').color as string | undefined) ?? undefined

  return (
    <>
      <EditorTooltip content={t('editor.toolbar.textColor')} disabled={open}>
        <button
          ref={triggerRef}
          type="button"
          data-toolbar-item=""
          aria-label={t('editor.toolbar.textColor')}
          aria-expanded={open}
          aria-haspopup="dialog"
          // 동작은 click 에서 처리 — 키보드(Enter/Space)로도 열 수 있어야 한다.
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => {
            setAutoFocus(e.detail === 0)
            setOpen((o) => !o)
          }}
          className="h-7 w-7 flex flex-col items-center justify-center rounded text-neutral-600 hover:bg-neutral-100 transition-colors"
        >
          <span className="text-xs font-bold leading-none">A</span>
          <span className="block w-4 h-1 rounded-sm mt-0.5" style={{ backgroundColor: current ?? '#111827' }} />
        </button>
      </EditorTooltip>

      <EditorPopover
        anchorRef={triggerRef}
        open={open}
        onClose={() => setOpen(false)}
        autoFocus={autoFocus}
        label={t('editor.toolbar.textColor')}
        className="w-[176px] p-2"
      >
        <div className="grid grid-cols-6 gap-1">
          {COLORS.map((c) => {
            const isActive = current?.toLowerCase() === c.toLowerCase()
            return (
              <button
                key={c}
                type="button"
                title={c}
                aria-label={c}
                aria-pressed={isActive}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  editor.chain().focus().setColor(c).run()
                  setOpen(false)
                }}
                className={[
                  'w-5 h-5 rounded transition-transform hover:scale-110',
                  isActive ? 'ring-2 ring-offset-1 ring-primary-500' : 'border border-neutral-200',
                ].join(' ')}
                style={{ backgroundColor: c }}
              />
            )
          })}
        </div>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            editor.chain().focus().unsetColor().run()
            setOpen(false)
          }}
          className="mt-2 w-full text-xs text-neutral-600 hover:text-neutral-800 py-1 border-t border-neutral-100"
        >
          {t('editor.toolbar.removeTextColor')}
        </button>
      </EditorPopover>
    </>
  )
}
