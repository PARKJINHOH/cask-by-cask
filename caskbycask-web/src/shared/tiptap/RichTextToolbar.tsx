import type { ReactNode } from 'react'
import { useEditorState } from '@tiptap/react'
import type { Editor } from '@tiptap/react'
import EditorColorPicker from './EditorColorPicker'
import EditorHighlightPicker from './EditorHighlightPicker'
import EditorSelectMenu, { type SelectOption } from './EditorSelectMenu'

// ── 글꼴 / 글자 크기 / 줄간격 옵션 ─────────────────────────────
// 글꼴: Pretendard(기본)만 웹폰트 로드 → 나머지는 시스템 폰트 폴백.
const FONT_FAMILIES: SelectOption[] = [
  { value: '', label: '기본', style: { fontFamily: 'Pretendard, sans-serif' } },
  { value: 'serif', label: '명조', style: { fontFamily: 'serif' } },
  { value: 'Arial, sans-serif', label: '고딕', style: { fontFamily: 'Arial, sans-serif' } },
  { value: 'ui-monospace, monospace', label: '모노', style: { fontFamily: 'ui-monospace, monospace' } },
]

const FONT_SIZES: SelectOption[] = [
  { value: '', label: '기본' },
  { value: '12px', label: '12' },
  { value: '14px', label: '14' },
  { value: '16px', label: '16' },
  { value: '18px', label: '18' },
  { value: '20px', label: '20' },
  { value: '24px', label: '24' },
  { value: '30px', label: '30' },
]

const LINE_HEIGHTS: SelectOption[] = [
  { value: '', label: '기본' },
  { value: '1', label: '1.0' },
  { value: '1.4', label: '1.4' },
  { value: '1.6', label: '1.6' },
  { value: '2', label: '2.0' },
  { value: '2.5', label: '2.5' },
]

// 에디터 view 미준비 시 사용할 안전 기본값
const DEFAULT_TOOLBAR_STATE = {
  isBold: false, isItalic: false, isUnderline: false, isStrike: false, isCode: false,
  isH1: false, isH2: false, isH3: false,
  isBulletList: false, isOrderedList: false, isTaskList: false,
  isBlockquote: false, isCodeBlock: false, isLink: false,
  isAlignLeft: false, isAlignCenter: false, isAlignRight: false, isAlignJustify: false,
  isTable: false, isImage: false,
  fontFamily: '', fontSize: '', lineHeight: '', canUndo: false, canRedo: false,
}

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
      onMouseDown={(e) => { e.preventDefault(); onClick() }}
      className={[
        'h-7 w-7 flex items-center justify-center rounded text-sm transition-colors',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        isActive ? 'bg-primary-100 text-primary-900' : 'text-neutral-600 hover:bg-neutral-100',
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
  /** 이미지 파일 선택 열기 (없으면 이미지 버튼 숨김) */
  onImageUpload?: () => void
  /** 동영상 파일 업로드 열기 (없으면 동영상 업로드 버튼 숨김) */
  onVideoUpload?: () => void
  /** YouTube/Vimeo URL 임베드 */
  onVideoEmbed: () => void
  /** 본문 내 술 카드 삽입 (없으면 버튼 숨김) */
  onSpiritEmbed?: () => void
}

export default function RichTextToolbar({
  editor, onImageUpload, onVideoUpload, onVideoEmbed, onSpiritEmbed,
}: Props) {
  const s = useEditorState({
    editor,
    selector: (ctx) => {
      const e = ctx.editor
      // 마운트 직전(에디터 view 미준비) 패스에서는 isActive/can/getAttributes 가
      // editor.view.state 접근으로 throw 할 수 있어, 안전 기본값으로 방어한다.
      try {
        if (!e || !e.view) return DEFAULT_TOOLBAR_STATE
        const ts = e.getAttributes('textStyle')
        return {
          isBold: e.isActive('bold'),
          isItalic: e.isActive('italic'),
          isUnderline: e.isActive('underline'),
          isStrike: e.isActive('strike'),
          isCode: e.isActive('code'),
          isH1: e.isActive('heading', { level: 1 }),
          isH2: e.isActive('heading', { level: 2 }),
          isH3: e.isActive('heading', { level: 3 }),
          isBulletList: e.isActive('bulletList'),
          isOrderedList: e.isActive('orderedList'),
          isTaskList: e.isActive('taskList'),
          isBlockquote: e.isActive('blockquote'),
          isCodeBlock: e.isActive('codeBlock'),
          isLink: e.isActive('link'),
          isAlignLeft: e.isActive({ textAlign: 'left' }),
          isAlignCenter: e.isActive({ textAlign: 'center' }),
          isAlignRight: e.isActive({ textAlign: 'right' }),
          isAlignJustify: e.isActive({ textAlign: 'justify' }),
          isTable: e.isActive('table'),
          isImage: e.isActive('image'),
          fontFamily: (ts.fontFamily as string) ?? '',
          fontSize: (ts.fontSize as string) ?? '',
          lineHeight: (ts.lineHeight as string) ?? '',
          canUndo: e.can().undo(),
          canRedo: e.can().redo(),
        }
      } catch {
        return DEFAULT_TOOLBAR_STATE
      }
    },
  })

  const addLink = () => {
    const prev = editor.getAttributes('link').href ?? ''
    const url = window.prompt('링크 URL을 입력하세요', prev)
    if (url === null) return
    if (url === '') editor.chain().focus().extendMarkRange('link').unsetLink().run()
    else editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }

  const addTable = () => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
  }

  const setFontFamily = (v: string) => {
    if (!v) editor.chain().focus().unsetFontFamily().run()
    else editor.chain().focus().setFontFamily(v).run()
  }
  const setFontSize = (v: string) => {
    if (!v) editor.chain().focus().unsetFontSize().run()
    else editor.chain().focus().setFontSize(v).run()
  }
  const setLineHeight = (v: string) => {
    if (!v) editor.chain().focus().unsetLineHeight().run()
    else editor.chain().focus().setLineHeight(v).run()
  }

  const fontLabel = FONT_FAMILIES.find((f) => f.value === s.fontFamily)?.label ?? '기본'
  const sizeLabel = (FONT_SIZES.find((f) => f.value === s.fontSize)?.label) ?? '16'
  const lineLabel = s.lineHeight
    ? (LINE_HEIGHTS.find((f) => f.value === s.lineHeight)?.label ?? s.lineHeight)
    : '줄간격'

  return (
    <div className="border-b border-neutral-200 bg-neutral-50">
      {/* 1행: 사진 / 동영상 / 링크 / 술카드 | 글꼴 관련 */}
      <div className="flex flex-wrap items-center gap-0.5 p-2 pb-1">
        {onImageUpload && (
          <ToolbarButton title="이미지 추가" onClick={onImageUpload}>
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
            </svg>
          </ToolbarButton>
        )}
        <ToolbarButton title="YouTube/Vimeo 삽입" onClick={onVideoEmbed}>
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </ToolbarButton>
        {onVideoUpload && (
          <ToolbarButton title="동영상 업로드 (MP4/WebM)" onClick={onVideoUpload}>
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
            </svg>
          </ToolbarButton>
        )}
        <ToolbarButton title="링크" onClick={addLink} isActive={s.isLink}>
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
        </ToolbarButton>
        {onSpiritEmbed && (
          <ToolbarButton title="술 카드 삽입" onClick={onSpiritEmbed}>
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 3h8l-1 6a4 4 0 0 1-3 3 4 4 0 0 1-3-3L8 3z" /><line x1="12" y1="12" x2="12" y2="19" /><line x1="8" y1="21" x2="16" y2="21" />
            </svg>
          </ToolbarButton>
        )}

        <Divider />

        {/* 글꼴 관련: 글꼴 / 크기 / 줄간격 / 굵게 / 기울임 / 밑줄 / 취소선 / 색상 / 하이라이트 */}
        <EditorSelectMenu
          title="글꼴" current={fontLabel} options={FONT_FAMILIES}
          activeValue={s.fontFamily} onSelect={setFontFamily} width={62}
        />
        <EditorSelectMenu
          title="글자 크기" current={sizeLabel} options={FONT_SIZES}
          activeValue={s.fontSize} onSelect={setFontSize} width={50}
        />
        <EditorSelectMenu
          title="줄간격"
          current={lineLabel}
          options={LINE_HEIGHTS}
          activeValue={s.lineHeight}
          onSelect={setLineHeight}
          width={66}
          icon={
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="10" y1="6" x2="21" y2="6" /><line x1="10" y1="12" x2="21" y2="12" /><line x1="10" y1="18" x2="21" y2="18" />
              <polyline points="3 8 3 4 3 4" /><path d="M3 4l2 2M3 4L1 6M3 16v4M3 20l2-2M3 20l-2-2" />
            </svg>
          }
        />
        <ToolbarButton title="굵게 (Ctrl+B)" onClick={() => editor.chain().focus().toggleBold().run()} isActive={s.isBold}>
          <strong className="font-bold text-xs">B</strong>
        </ToolbarButton>
        <ToolbarButton title="기울임 (Ctrl+I)" onClick={() => editor.chain().focus().toggleItalic().run()} isActive={s.isItalic}>
          <em className="italic text-xs">I</em>
        </ToolbarButton>
        <ToolbarButton title="밑줄 (Ctrl+U)" onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={s.isUnderline}>
          <span className="underline text-xs">U</span>
        </ToolbarButton>
        <ToolbarButton title="취소선" onClick={() => editor.chain().focus().toggleStrike().run()} isActive={s.isStrike}>
          <span className="line-through text-xs">S</span>
        </ToolbarButton>
        <EditorColorPicker editor={editor} />
        <EditorHighlightPicker editor={editor} />
      </div>

      {/* 2행: 나머지 기능 */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 pb-2">
        {/* 실행 취소/다시 실행 */}
        <ToolbarButton title="실행 취소 (Ctrl+Z)" onClick={() => editor.chain().focus().undo().run()} disabled={!s.canUndo}>
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 7v6h6" /><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
          </svg>
        </ToolbarButton>
        <ToolbarButton title="다시 실행 (Ctrl+Y)" onClick={() => editor.chain().focus().redo().run()} disabled={!s.canRedo}>
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 7v6h-6" /><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13" />
          </svg>
        </ToolbarButton>

        <Divider />

        {/* 인라인 코드 */}
        <ToolbarButton title="인라인 코드" onClick={() => editor.chain().focus().toggleCode().run()} isActive={s.isCode}>
          <span className="font-mono text-xs">{'<>'}</span>
        </ToolbarButton>

        <Divider />

        {/* 헤딩 */}
        {([1, 2, 3] as const).map((level) => (
          <ToolbarButton
            key={level}
            title={`제목 ${level}`}
            onClick={() => editor.chain().focus().toggleHeading({ level }).run()}
            isActive={level === 1 ? s.isH1 : level === 2 ? s.isH2 : s.isH3}
          >
            <span className="text-xs font-semibold">H{level}</span>
          </ToolbarButton>
        ))}

        <Divider />

        {/* 정렬 */}
        <ToolbarButton title="왼쪽 정렬" onClick={() => editor.chain().focus().setTextAlign('left').run()} isActive={s.isAlignLeft}>
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="15" y2="12" /><line x1="3" y1="18" x2="18" y2="18" />
          </svg>
        </ToolbarButton>
        <ToolbarButton title="가운데 정렬" onClick={() => editor.chain().focus().setTextAlign('center').run()} isActive={s.isAlignCenter}>
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="6" x2="21" y2="6" /><line x1="6" y1="12" x2="18" y2="12" /><line x1="4" y1="18" x2="20" y2="18" />
          </svg>
        </ToolbarButton>
        <ToolbarButton title="오른쪽 정렬" onClick={() => editor.chain().focus().setTextAlign('right').run()} isActive={s.isAlignRight}>
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="6" x2="21" y2="6" /><line x1="9" y1="12" x2="21" y2="12" /><line x1="6" y1="18" x2="21" y2="18" />
          </svg>
        </ToolbarButton>
        <ToolbarButton title="양쪽 정렬" onClick={() => editor.chain().focus().setTextAlign('justify').run()} isActive={s.isAlignJustify}>
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </ToolbarButton>

        <Divider />

        {/* 목록 / 체크리스트 / 인용 / 코드블록 / 구분선 */}
        <ToolbarButton title="순서없는 목록" onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={s.isBulletList}>
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="9" y1="6" x2="20" y2="6" /><line x1="9" y1="12" x2="20" y2="12" /><line x1="9" y1="18" x2="20" y2="18" />
            <circle cx="4" cy="6" r="1.5" fill="currentColor" stroke="none" /><circle cx="4" cy="12" r="1.5" fill="currentColor" stroke="none" /><circle cx="4" cy="18" r="1.5" fill="currentColor" stroke="none" />
          </svg>
        </ToolbarButton>
        <ToolbarButton title="순서있는 목록" onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={s.isOrderedList}>
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="10" y1="6" x2="21" y2="6" /><line x1="10" y1="12" x2="21" y2="12" /><line x1="10" y1="18" x2="21" y2="18" />
            <text x="1" y="8" fontSize="7" fill="currentColor" stroke="none">1.</text>
            <text x="1" y="14" fontSize="7" fill="currentColor" stroke="none">2.</text>
            <text x="1" y="20" fontSize="7" fill="currentColor" stroke="none">3.</text>
          </svg>
        </ToolbarButton>
        <ToolbarButton title="체크리스트" onClick={() => editor.chain().focus().toggleTaskList().run()} isActive={s.isTaskList}>
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="10" y1="6" x2="21" y2="6" /><line x1="10" y1="12" x2="21" y2="12" /><line x1="10" y1="18" x2="21" y2="18" />
            <polyline points="3 6 4 7 6 5" /><rect x="2.5" y="10.5" width="4" height="4" rx="0.5" /><rect x="2.5" y="16.5" width="4" height="4" rx="0.5" />
          </svg>
        </ToolbarButton>
        <ToolbarButton title="인용문" onClick={() => editor.chain().focus().toggleBlockquote().run()} isActive={s.isBlockquote}>
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" />
            <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z" />
          </svg>
        </ToolbarButton>
        <ToolbarButton title="코드 블록" onClick={() => editor.chain().focus().toggleCodeBlock().run()} isActive={s.isCodeBlock}>
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
          </svg>
        </ToolbarButton>
        <ToolbarButton title="구분선" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="12" x2="21" y2="12" /><line x1="6" y1="6" x2="18" y2="6" opacity="0.35" /><line x1="6" y1="18" x2="18" y2="18" opacity="0.35" />
          </svg>
        </ToolbarButton>

        <Divider />

        {/* 표 */}
        <ToolbarButton title="표 삽입" onClick={addTable}>
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="3" y1="15" x2="21" y2="15" /><line x1="9" y1="3" x2="9" y2="21" /><line x1="15" y1="3" x2="15" y2="21" />
          </svg>
        </ToolbarButton>

        {/* 표 편집 메뉴 (표 안에 커서가 있을 때만) */}
        {s.isTable && (
          <>
            <Divider />
            <span className="text-xs text-neutral-400 px-1">표</span>
            <ToolbarButton title="위에 행 추가" onClick={() => editor.chain().focus().addRowBefore().run()}>
              <span className="text-xs">⬆+</span>
            </ToolbarButton>
            <ToolbarButton title="아래에 행 추가" onClick={() => editor.chain().focus().addRowAfter().run()}>
              <span className="text-xs">⬇+</span>
            </ToolbarButton>
            <ToolbarButton title="왼쪽에 열 추가" onClick={() => editor.chain().focus().addColumnBefore().run()}>
              <span className="text-xs">⬅+</span>
            </ToolbarButton>
            <ToolbarButton title="오른쪽에 열 추가" onClick={() => editor.chain().focus().addColumnAfter().run()}>
              <span className="text-xs">➡+</span>
            </ToolbarButton>
            <ToolbarButton title="행 삭제" onClick={() => editor.chain().focus().deleteRow().run()}>
              <span className="text-xs text-red-500">⬓</span>
            </ToolbarButton>
            <ToolbarButton title="열 삭제" onClick={() => editor.chain().focus().deleteColumn().run()}>
              <span className="text-xs text-red-500">◧</span>
            </ToolbarButton>
            <ToolbarButton title="표 삭제" onClick={() => editor.chain().focus().deleteTable().run()}>
              <span className="text-xs text-red-500">✕</span>
            </ToolbarButton>
          </>
        )}

        {/* 이미지 크기 (이미지 선택 시) */}
        {s.isImage && (
          <>
            <Divider />
            <span className="text-xs text-neutral-400 px-1">이미지</span>
            {(['25%', '50%', '75%', '100%'] as const).map((w) => (
              <ToolbarButton key={w} title={`이미지 폭 ${w}`} onClick={() => editor.chain().focus().updateAttributes('image', { width: w }).run()}>
                <span className="text-xs">{w}</span>
              </ToolbarButton>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
