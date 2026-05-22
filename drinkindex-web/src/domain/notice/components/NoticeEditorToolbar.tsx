import type { ReactNode } from 'react'
import { useEditorState } from '@tiptap/react'
import type { Editor } from '@tiptap/react'

interface ToolbarButtonProps {
  onClick: () => void
  isActive?: boolean
  disabled?: boolean
  title: string
  children: ReactNode
}

function ToolbarButton({ onClick, isActive, disabled, title, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onMouseDown={(e) => {
        e.preventDefault()
        onClick()
      }}
      className={[
        'h-7 w-7 flex items-center justify-center rounded text-sm transition-colors',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        isActive
          ? 'bg-primary-100 text-primary-900'
          : 'text-neutral-600 hover:bg-neutral-100',
      ].join(' ')}
    >
      {children}
    </button>
  )
}

function Divider() {
  return <div className="w-px h-5 bg-neutral-200 mx-0.5" />
}

interface Props {
  editor: Editor
}

export default function NoticeEditorToolbar({ editor }: Props) {
  const state = useEditorState({
    editor,
    selector: (ctx) => ({
      isBold: ctx.editor.isActive('bold'),
      isItalic: ctx.editor.isActive('italic'),
      isUnderline: ctx.editor.isActive('underline'),
      isStrike: ctx.editor.isActive('strike'),
      isCode: ctx.editor.isActive('code'),
      isH1: ctx.editor.isActive('heading', { level: 1 }),
      isH2: ctx.editor.isActive('heading', { level: 2 }),
      isH3: ctx.editor.isActive('heading', { level: 3 }),
      isBulletList: ctx.editor.isActive('bulletList'),
      isOrderedList: ctx.editor.isActive('orderedList'),
      isBlockquote: ctx.editor.isActive('blockquote'),
      isCodeBlock: ctx.editor.isActive('codeBlock'),
      isLink: ctx.editor.isActive('link'),
      isAlignLeft: ctx.editor.isActive({ textAlign: 'left' }),
      isAlignCenter: ctx.editor.isActive({ textAlign: 'center' }),
      isAlignRight: ctx.editor.isActive({ textAlign: 'right' }),
      isAlignJustify: ctx.editor.isActive({ textAlign: 'justify' }),
      isImage: ctx.editor.isActive('image'),
      canUndo: ctx.editor.can().undo(),
      canRedo: ctx.editor.can().redo(),
    }),
  })

  const addLink = () => {
    const prev = editor.getAttributes('link').href ?? ''
    const url = window.prompt('링크 URL을 입력하세요', prev)
    if (url === null) return
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
    } else {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
    }
  }

  const addTable = () => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
  }

  const setImageWidth = (width: string) => {
    editor.chain().focus().updateAttributes('image', { width }).run()
  }

  return (
    <div className="flex flex-wrap items-center gap-0.5 p-2 border-b border-neutral-200 bg-neutral-50">
      {/* 텍스트 스타일 */}
      <ToolbarButton
        title="굵게 (Ctrl+B)"
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={state.isBold}
      >
        <strong className="font-bold text-xs">B</strong>
      </ToolbarButton>

      <ToolbarButton
        title="기울임 (Ctrl+I)"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={state.isItalic}
      >
        <em className="italic text-xs">I</em>
      </ToolbarButton>

      <ToolbarButton
        title="밑줄 (Ctrl+U)"
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        isActive={state.isUnderline}
      >
        <span className="underline text-xs">U</span>
      </ToolbarButton>

      <ToolbarButton
        title="취소선"
        onClick={() => editor.chain().focus().toggleStrike().run()}
        isActive={state.isStrike}
      >
        <span className="line-through text-xs">S</span>
      </ToolbarButton>

      <ToolbarButton
        title="인라인 코드"
        onClick={() => editor.chain().focus().toggleCode().run()}
        isActive={state.isCode}
      >
        <span className="font-mono text-xs">`</span>
      </ToolbarButton>

      <Divider />

      {/* 헤딩 */}
      {([1, 2, 3] as const).map((level) => (
        <ToolbarButton
          key={level}
          title={`제목 ${level}`}
          onClick={() => editor.chain().focus().toggleHeading({ level }).run()}
          isActive={level === 1 ? state.isH1 : level === 2 ? state.isH2 : state.isH3}
        >
          <span className="text-xs font-semibold">H{level}</span>
        </ToolbarButton>
      ))}

      <Divider />

      {/* 정렬 */}
      <ToolbarButton
        title="왼쪽 정렬"
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
        isActive={state.isAlignLeft}
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="15" y2="12" />
          <line x1="3" y1="18" x2="18" y2="18" />
        </svg>
      </ToolbarButton>

      <ToolbarButton
        title="가운데 정렬"
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
        isActive={state.isAlignCenter}
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="6" y1="12" x2="18" y2="12" />
          <line x1="4" y1="18" x2="20" y2="18" />
        </svg>
      </ToolbarButton>

      <ToolbarButton
        title="오른쪽 정렬"
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
        isActive={state.isAlignRight}
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="9" y1="12" x2="21" y2="12" />
          <line x1="6" y1="18" x2="21" y2="18" />
        </svg>
      </ToolbarButton>

      <ToolbarButton
        title="양쪽 정렬"
        onClick={() => editor.chain().focus().setTextAlign('justify').run()}
        isActive={state.isAlignJustify}
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </ToolbarButton>

      <Divider />

      {/* 목록 */}
      <ToolbarButton
        title="순서없는 목록"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={state.isBulletList}
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="9" y1="6" x2="20" y2="6" />
          <line x1="9" y1="12" x2="20" y2="12" />
          <line x1="9" y1="18" x2="20" y2="18" />
          <circle cx="4" cy="6" r="1.5" fill="currentColor" stroke="none" />
          <circle cx="4" cy="12" r="1.5" fill="currentColor" stroke="none" />
          <circle cx="4" cy="18" r="1.5" fill="currentColor" stroke="none" />
        </svg>
      </ToolbarButton>

      <ToolbarButton
        title="순서있는 목록"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={state.isOrderedList}
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="10" y1="6" x2="21" y2="6" />
          <line x1="10" y1="12" x2="21" y2="12" />
          <line x1="10" y1="18" x2="21" y2="18" />
          <text x="1" y="8" fontSize="7" fill="currentColor" stroke="none">1.</text>
          <text x="1" y="14" fontSize="7" fill="currentColor" stroke="none">2.</text>
          <text x="1" y="20" fontSize="7" fill="currentColor" stroke="none">3.</text>
        </svg>
      </ToolbarButton>

      <ToolbarButton
        title="인용문"
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        isActive={state.isBlockquote}
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" />
          <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z" />
        </svg>
      </ToolbarButton>

      <ToolbarButton
        title="코드 블록"
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        isActive={state.isCodeBlock}
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="16 18 22 12 16 6" />
          <polyline points="8 6 2 12 8 18" />
        </svg>
      </ToolbarButton>

      <Divider />

      {/* 링크 / 표 */}
      <ToolbarButton
        title="링크"
        onClick={addLink}
        isActive={state.isLink}
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
      </ToolbarButton>

      <ToolbarButton title="표 삽입" onClick={addTable}>
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <line x1="3" y1="9" x2="21" y2="9" />
          <line x1="3" y1="15" x2="21" y2="15" />
          <line x1="9" y1="3" x2="9" y2="21" />
          <line x1="15" y1="3" x2="15" y2="21" />
        </svg>
      </ToolbarButton>

      <Divider />

      {/* 실행 취소/다시 실행 */}
      <ToolbarButton
        title="실행 취소 (Ctrl+Z)"
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!state.canUndo}
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 7v6h6" />
          <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
        </svg>
      </ToolbarButton>

      <ToolbarButton
        title="다시 실행 (Ctrl+Y)"
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!state.canRedo}
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 7v6h-6" />
          <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13" />
        </svg>
      </ToolbarButton>

      {/* 이미지 크기 조절 (이미지 선택 시 표시) */}
      {state.isImage && (
        <>
          <Divider />
          <span className="text-xs text-neutral-400 px-1">이미지</span>
          {(['25%', '50%', '75%', '100%'] as const).map((w) => (
            <ToolbarButton
              key={w}
              title={`이미지 폭 ${w}`}
              onClick={() => setImageWidth(w)}
            >
              <span className="text-xs">{w}</span>
            </ToolbarButton>
          ))}
        </>
      )}
    </div>
  )
}
