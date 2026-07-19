import { useState, useRef, useEffect } from 'react'
import type { Editor } from '@tiptap/react'
import { useTranslation } from 'react-i18next'
import EditorTooltip from './EditorTooltip'

// 글자 배경색(형광펜) 팔레트 (공통) — 연한 톤 위주
const HIGHLIGHTS = [
  '#fef08a', '#fde68a', '#fecaca', '#fbcfe8', '#e9d5ff', '#c7d2fe',
  '#bfdbfe', '#a5f3fc', '#bbf7d0', '#d9f99d', '#fed7aa', '#e5e7eb',
]

interface Props {
  editor: Editor
}

export default function EditorHighlightPicker({ editor }: Props) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const current = (editor.getAttributes('highlight').color as string | undefined) ?? undefined

  useEffect(() => {
    const onDocMouseDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocMouseDown)
    return () => document.removeEventListener('mousedown', onDocMouseDown)
  }, [])

  return (
    <div ref={ref} className="relative">
      <EditorTooltip content={t('editor.toolbar.highlight')} disabled={open}>
        <button
          type="button"
          aria-label={t('editor.toolbar.highlight')}
          aria-expanded={open}
          aria-haspopup="dialog"
          onMouseDown={(e) => { e.preventDefault(); setOpen((o) => !o) }}
          className="h-8 w-8 flex flex-col items-center justify-center rounded text-neutral-600 hover:bg-neutral-100 transition-colors"
        >
          <span
            className="text-xs font-bold leading-none px-0.5 rounded-sm"
            style={{ backgroundColor: current ?? '#fef08a' }}
          >
            A
          </span>
          <span className="block w-4 h-1 rounded-sm mt-0.5" style={{ backgroundColor: current ?? '#fef08a' }} />
        </button>
      </EditorTooltip>

      {open && (
        <div className="absolute z-30 mt-1 left-0 p-2 bg-white border border-neutral-200 rounded-lg shadow-lg w-[176px]">
          <div className="grid grid-cols-6 gap-1">
            {HIGHLIGHTS.map((c) => {
              const isActive = current?.toLowerCase() === c.toLowerCase()
              return (
                <button
                  key={c}
                  type="button"
                  title={c}
                  aria-label={c}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    editor.chain().focus().setHighlight({ color: c }).run()
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
            onMouseDown={(e) => {
              e.preventDefault()
              editor.chain().focus().unsetHighlight().run()
              setOpen(false)
            }}
            className="mt-2 w-full text-xs text-neutral-500 hover:text-neutral-700 py-1 border-t border-neutral-100"
          >
            {t('editor.toolbar.removeHighlight')}
          </button>
        </div>
      )}
    </div>
  )
}
