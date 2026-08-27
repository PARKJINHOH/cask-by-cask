import { useEffect, useRef, type FocusEvent as ReactFocusEvent, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react'
import { useEditorState } from '@tiptap/react'
import type { Editor } from '@tiptap/react'
import { useTranslation } from 'react-i18next'
import EditorColorPicker from './EditorColorPicker'
import EditorHighlightPicker from './EditorHighlightPicker'
import EditorSelectMenu, { type SelectOption } from './EditorSelectMenu'
import EditorTooltip from './EditorTooltip'
import { useTouchInput } from './pointerMode'

// ── 글꼴 / 글자 크기 / 줄간격 옵션 ─────────────────────────────
// 글꼴: Pretendard(기본)만 웹폰트 로드 → 나머지는 시스템 폰트 폴백.
// family 이름은 layout.tsx 가 불러오는 가변+subset 웹폰트('Pretendard Variable')를 따른다.
const FONT_FAMILIES: SelectOption[] = [
  { value: '', label: '기본', style: { fontFamily: "'Pretendard Variable', Pretendard, sans-serif" } },
  { value: 'serif', label: '명조', style: { fontFamily: 'serif' } },
  { value: 'Arial, sans-serif', label: '고딕', style: { fontFamily: 'Arial, sans-serif' } },
  { value: 'ui-monospace, monospace', label: '모노', style: { fontFamily: 'ui-monospace, monospace' } },
]

const FONT_SIZES: SelectOption[] = [
  { value: '12px', label: '12' },
  { value: '14px', label: '14' },
  { value: '', label: '기본' },
  { value: '18px', label: '18' },
  { value: '20px', label: '20' },
  { value: '22px', label: '22' },
  { value: '24px', label: '24' },
]

// 제한형(basic) 툴바용 3단계 — 리뷰 카드 레이아웃이 깨지지 않는 범위로 좁힌다.
const BASIC_FONT_SIZES: SelectOption[] = [
  { value: '14px', label: '14' },
  { value: '', label: '기본' },
  { value: '18px', label: '18' },
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
    <EditorTooltip content={title}>
      <button
        type="button"
        data-toolbar-item=""
        aria-label={title}
        aria-pressed={isActive ?? undefined}
        disabled={disabled}
        // mousedown 은 기본동작(포커스 이동)만 막아 에디터 선택 영역을 유지하고,
        // 실제 실행은 click 에서 한다. 키보드 Enter/Space 는 click 만 발생시키므로
        // mousedown 에서 실행하면 키보드 사용자가 툴바를 전혀 쓸 수 없다.
        onMouseDown={(e) => e.preventDefault()}
        onClick={onClick}
        className={[
          'di-toolbar-button h-7 w-7 flex items-center justify-center rounded text-[15px] transition-colors',
          'disabled:opacity-40 disabled:cursor-not-allowed',
          isActive ? 'bg-primary-100 text-primary-900' : 'text-neutral-600 hover:bg-neutral-100',
        ].join(' ')}
      >
        {children}
      </button>
    </EditorTooltip>
  )
}

interface ToolbarGroupProps {
  label: string
  children: ReactNode
  className?: string
}

function ToolbarGroup({ label, children, className = '' }: ToolbarGroupProps) {
  return (
    <div role="group" aria-label={label} className={`flex shrink-0 items-center rounded-md border border-neutral-200/80 bg-white/70 p-0.5 ${className}`}>
      {children}
    </div>
  )
}

interface Props {
  editor: Editor
  /**
   * 'basic' 은 굵기·밑줄·글자색·형광펜·글자크기만 남긴 한 줄 툴바.
   * (리뷰 종합평가처럼 서식을 최소로 열어 두는 입력칸용)
   */
  variant?: 'full' | 'basic'
  /** 이미지 파일 선택 열기 (없으면 이미지 버튼 숨김) */
  onImageUpload?: () => void
  /** 동영상 파일 업로드 열기 (없으면 동영상 업로드 버튼 숨김) */
  onVideoUpload?: () => void
  /** YouTube/Vimeo URL 임베드 */
  onVideoEmbed?: () => void
  /** 본문 내 술 카드 삽입 (없으면 버튼 숨김) */
  onSpiritEmbed?: () => void
  /** 로그인 사용자의 리뷰 카드 삽입 (없으면 버튼 숨김) */
  onReviewEmbed?: () => void
}

export default function RichTextToolbar({
  editor, variant = 'full', onImageUpload, onVideoUpload, onVideoEmbed, onSpiritEmbed, onReviewEmbed,
}: Props) {
  const { t } = useTranslation()
  const isBasic = variant === 'basic'
  // 터치 기기에서 숨기는 도구 — 셀 단위 커서 이동이 필요한 표, 드래그로 폭을 잡는 이미지 크기.
  // (이미지 모서리 핸들·2단 분할 divider 는 ResizableImage 가 DOM 에서 제거한다)
  const isTouch = useTouchInput()
  const showTableTools = !isTouch
  const showImageSizeTools = !isTouch
  const localizedFontFamilies = FONT_FAMILIES.map((option) => ({
    ...option,
    label: option.value === ''
      ? t('editor.fontPretendardDefault')
      : option.value === 'serif'
        ? t('editor.fontSerif')
        : option.value === 'Arial, sans-serif'
          ? t('editor.fontSans')
          : t('editor.fontMono'),
  }))
  const localizedFontSizes = (isBasic ? BASIC_FONT_SIZES : FONT_SIZES).map((option) => option.value === ''
    ? { ...option, label: t('editor.fontSize16Default') }
    : { ...option, label: `${option.label}px` })
  const localizedLineHeights = LINE_HEIGHTS.map((option) => option.value === ''
    ? { ...option, label: t('editor.fontDefault') }
    : option)
  const s = useEditorState({
    editor,
    selector: (ctx) => {
      const e = ctx.editor
      // 마운트 직전(에디터 view 미준비) 패스에서는 isActive/can/getAttributes 가
      // editor.view.state 접근으로 throw 할 수 있어, 안전 기본값으로 방어한다.
      try {
        if (!e || !e.view) return DEFAULT_TOOLBAR_STATE
        // variant 에 따라 확장이 통째로 빠진다 — 스키마에 없는 이름으로 isActive 를 부르면
        // throw 해서 아래 catch 가 전부 false 인 기본값을 돌려주고, 남아 있는 버튼의
        // 활성 표시까지 함께 죽는다. 이름이 스키마에 있을 때만 묻는다.
        const mark = (name: string) => !!e.schema.marks[name] && e.isActive(name)
        const node = (name: string, attrs?: Record<string, unknown>) =>
          !!e.schema.nodes[name] && e.isActive(name, attrs)
        const ts = e.schema.marks.textStyle ? e.getAttributes('textStyle') : {}
        return {
          isBold: mark('bold'),
          isItalic: mark('italic'),
          isUnderline: mark('underline'),
          isStrike: mark('strike'),
          isCode: mark('code'),
          isH1: node('heading', { level: 1 }),
          isH2: node('heading', { level: 2 }),
          isH3: node('heading', { level: 3 }),
          isBulletList: node('bulletList'),
          isOrderedList: node('orderedList'),
          isTaskList: node('taskList'),
          isBlockquote: node('blockquote'),
          isCodeBlock: node('codeBlock'),
          isLink: mark('link'),
          isAlignLeft: e.isActive({ textAlign: 'left' }),
          isAlignCenter: e.isActive({ textAlign: 'center' }),
          isAlignRight: e.isActive({ textAlign: 'right' }),
          isAlignJustify: e.isActive({ textAlign: 'justify' }),
          isTable: node('table'),
          isImage: node('image'),
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

  // ── 툴바 키보드 이동 (roving tabindex) ──────────────────────────
  // Tab 은 툴바 전체를 한 번만 지나가고(본문에 닿기까지 25번 Tab 하지 않도록),
  // 버튼 사이 이동은 방향키/Home/End 로 한다. WAI-ARIA toolbar 패턴.
  const toolbarRef = useRef<HTMLDivElement>(null)
  const activeItemRef = useRef<HTMLElement | null>(null)

  const toolbarItems = () =>
    Array.from(toolbarRef.current?.querySelectorAll<HTMLElement>('[data-toolbar-item]:not([disabled])') ?? [])

  const syncRovingTabIndex = (next?: HTMLElement | null) => {
    const items = toolbarItems()
    if (items.length === 0) return
    const active = next && items.includes(next)
      ? next
      : (activeItemRef.current && items.includes(activeItemRef.current) ? activeItemRef.current : items[0])
    activeItemRef.current = active
    items.forEach((item) => { item.tabIndex = item === active ? 0 : -1 })
  }

  // 버튼 활성/비활성(실행취소 등)이나 행 노출이 바뀔 때마다 다시 맞춘다.
  useEffect(syncRovingTabIndex)

  const handleToolbarFocus = (event: ReactFocusEvent<HTMLDivElement>) => {
    const item = (event.target as HTMLElement).closest<HTMLElement>('[data-toolbar-item]')
    // 포털로 띄운 팝오버 내부의 포커스도 React 트리를 타고 올라오므로 제외한다.
    if (!item || !toolbarRef.current?.contains(item)) return
    syncRovingTabIndex(item)
  }

  const handleToolbarKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement
    if (target.closest('[data-editor-popover]')) return
    const current = target.closest<HTMLElement>('[data-toolbar-item]')
    if (!current || !toolbarRef.current?.contains(current)) return

    const items = toolbarItems()
    const index = items.indexOf(current)
    if (index === -1) return

    const last = items.length - 1
    let next: number
    switch (event.key) {
      case 'ArrowRight': case 'ArrowDown': next = index === last ? 0 : index + 1; break
      case 'ArrowLeft': case 'ArrowUp': next = index === 0 ? last : index - 1; break
      case 'Home': next = 0; break
      case 'End': next = last; break
      default: return
    }
    event.preventDefault()
    items[next]?.focus()
  }

  const addLink = () => {
    const prev = editor.getAttributes('link').href ?? ''
    const url = window.prompt(t('editor.toolbar.linkPrompt'), prev)
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

  const fontName = localizedFontFamilies.find((f) => f.value === s.fontFamily)?.label ?? t('editor.fontPretendardDefault')
  // 기존 게시글에 명시적으로 저장된 16px도 기본 크기와 같은 항목으로 표시한다.
  const normalizedFontSize = s.fontSize === '16px' ? '' : s.fontSize
  const sizeLabel = (localizedFontSizes.find((f) => f.value === normalizedFontSize)?.label) ?? t('editor.fontSize16Default')
  const lineLabel = s.lineHeight
    ? (localizedLineHeights.find((f) => f.value === s.lineHeight)?.label ?? s.lineHeight)
    : t('editor.toolbar.lineHeightLabel')

  // 제한형 툴바 — 실행 이력 / 글자 크기 / 문자 서식만 한 줄에 둔다.
  if (isBasic) {
    return (
      <div
        ref={toolbarRef}
        role="toolbar"
        aria-label={t('editor.toolbar.label')}
        aria-orientation="horizontal"
        onFocus={handleToolbarFocus}
        onKeyDown={handleToolbarKeyDown}
        className="rich-text-toolbar border-b border-neutral-200 bg-neutral-50"
      >
        <div className="di-toolbar-row flex flex-wrap items-center gap-1 px-1.5 py-1.5">
          <ToolbarGroup label={t('editor.toolbar.groups.history')}>
            <ToolbarButton title={t('editor.toolbar.undo')} onClick={() => editor.chain().focus().undo().run()} disabled={!s.canUndo}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 7v6h6" /><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
              </svg>
            </ToolbarButton>
            <ToolbarButton title={t('editor.toolbar.redo')} onClick={() => editor.chain().focus().redo().run()} disabled={!s.canRedo}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 7v6h-6" /><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13" />
              </svg>
            </ToolbarButton>
          </ToolbarGroup>

          <ToolbarGroup label={t('editor.toolbar.groups.font')}>
            <EditorSelectMenu
              title={t('editor.toolbar.fontSize')} current={sizeLabel} options={localizedFontSizes}
              activeValue={normalizedFontSize} onSelect={setFontSize} width={74}
            />
          </ToolbarGroup>

          <ToolbarGroup label={t('editor.toolbar.groups.textStyle')}>
            <ToolbarButton title={t('editor.toolbar.bold')} onClick={() => editor.chain().focus().toggleBold().run()} isActive={s.isBold}>
              <strong className="font-bold text-xs">B</strong>
            </ToolbarButton>
            <ToolbarButton title={t('editor.toolbar.underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={s.isUnderline}>
              <span className="underline text-xs">U</span>
            </ToolbarButton>
            <EditorColorPicker editor={editor} />
            <EditorHighlightPicker editor={editor} />
          </ToolbarGroup>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={toolbarRef}
      role="toolbar"
      aria-label={t('editor.toolbar.label')}
      aria-orientation="horizontal"
      onFocus={handleToolbarFocus}
      onKeyDown={handleToolbarKeyDown}
      className="rich-text-toolbar border-b border-neutral-200 bg-neutral-50"
    >
      {/* 1행: 실행 이력 / 글꼴 / 문자 서식 / 제목 */}
      <div className="di-toolbar-row flex flex-wrap items-center gap-1 px-1.5 pt-1.5 pb-1">
        <ToolbarGroup label={t('editor.toolbar.groups.history')}>
          <ToolbarButton title={t('editor.toolbar.undo')} onClick={() => editor.chain().focus().undo().run()} disabled={!s.canUndo}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 7v6h6" /><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
            </svg>
          </ToolbarButton>
          <ToolbarButton title={t('editor.toolbar.redo')} onClick={() => editor.chain().focus().redo().run()} disabled={!s.canRedo}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 7v6h-6" /><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13" />
            </svg>
          </ToolbarButton>
        </ToolbarGroup>

        <ToolbarGroup label={t('editor.toolbar.groups.font')}>
          <EditorSelectMenu
            title={t('editor.toolbar.font')} current={fontName} options={localizedFontFamilies}
            activeValue={s.fontFamily} onSelect={setFontFamily} width={84}
          />
          <EditorSelectMenu
            title={t('editor.toolbar.fontSize')} current={sizeLabel} options={localizedFontSizes}
            activeValue={normalizedFontSize} onSelect={setFontSize} width={74}
          />
        </ToolbarGroup>

        <ToolbarGroup label={t('editor.toolbar.groups.textStyle')}>
          <ToolbarButton title={t('editor.toolbar.bold')} onClick={() => editor.chain().focus().toggleBold().run()} isActive={s.isBold}>
            <strong className="font-bold text-xs">B</strong>
          </ToolbarButton>
          <ToolbarButton title={t('editor.toolbar.italic')} onClick={() => editor.chain().focus().toggleItalic().run()} isActive={s.isItalic}>
            <em className="italic text-xs">I</em>
          </ToolbarButton>
          <ToolbarButton title={t('editor.toolbar.underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={s.isUnderline}>
            <span className="underline text-xs">U</span>
          </ToolbarButton>
          <ToolbarButton title={t('editor.toolbar.strike')} onClick={() => editor.chain().focus().toggleStrike().run()} isActive={s.isStrike}>
            <span className="line-through text-xs">S</span>
          </ToolbarButton>
          <EditorColorPicker editor={editor} />
          <EditorHighlightPicker editor={editor} />
        </ToolbarGroup>

        <ToolbarGroup label={t('editor.toolbar.groups.heading')}>
          {([1, 2, 3] as const).map((level) => (
            <ToolbarButton
              key={level}
              title={t('editor.toolbar.heading', { level })}
              onClick={() => editor.chain().focus().toggleHeading({ level }).run()}
              isActive={level === 1 ? s.isH1 : level === 2 ? s.isH2 : s.isH3}
            >
              <span className="text-xs font-semibold">H{level}</span>
            </ToolbarButton>
          ))}
          <ToolbarButton title={t('editor.toolbar.inlineCode')} onClick={() => editor.chain().focus().toggleCode().run()} isActive={s.isCode}>
            <span className="font-mono text-xs">{'<>'}</span>
          </ToolbarButton>
        </ToolbarGroup>
      </div>

      {/* 2행: 삽입 / 사이트 전용 카드 / 문단 / 목록 / 블록 */}
      <div className="di-toolbar-row flex flex-wrap items-center gap-1 px-1.5 pb-1.5">
        {/* 사진 → 영상 → 유튜브 → 링크 → 표 순 */}
        <ToolbarGroup label={t('editor.toolbar.groups.insert')}>
          {onImageUpload && (
            <ToolbarButton title={t('editor.toolbar.imageAdd')} onClick={onImageUpload}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
              </svg>
            </ToolbarButton>
          )}
          {onVideoUpload && (
            <ToolbarButton title={t('editor.toolbar.videoUpload')} onClick={onVideoUpload}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
              </svg>
            </ToolbarButton>
          )}
          {onVideoEmbed && (
            <ToolbarButton title={t('editor.toolbar.videoEmbed')} onClick={onVideoEmbed}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 000-1.664z" /><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </ToolbarButton>
          )}
          <ToolbarButton title={t('editor.toolbar.link')} onClick={addLink} isActive={s.isLink}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
          </ToolbarButton>
          {showTableTools && (
            <ToolbarButton title={t('editor.toolbar.tableInsert')} onClick={addTable}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="3" y1="15" x2="21" y2="15" /><line x1="9" y1="3" x2="9" y2="21" /><line x1="15" y1="3" x2="15" y2="21" />
              </svg>
            </ToolbarButton>
          )}
        </ToolbarGroup>

        {/* 사이트 전용 카드 — 일반 서식 도구와 구분되도록 별도 그룹(강조 테두리)으로 둔다. */}
        {(onSpiritEmbed || onReviewEmbed) && (
          <ToolbarGroup label={t('editor.toolbar.groups.siteCards')} className="di-toolbar-site-group">
            {onSpiritEmbed && (
              <ToolbarButton title={t('editor.toolbar.spiritCard')} onClick={onSpiritEmbed}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M8 3h8l-1 6a4 4 0 0 1-3 3 4 4 0 0 1-3-3L8 3z" /><line x1="12" y1="12" x2="12" y2="19" /><line x1="8" y1="21" x2="16" y2="21" />
                </svg>
              </ToolbarButton>
            )}
            {onReviewEmbed && (
              <ToolbarButton title={t('editor.toolbar.reviewCard')} onClick={onReviewEmbed}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 3h11a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2V3z" />
                  <path d="M18 7h1a2 2 0 0 1 2 2v10H9" /><path d="M8 8h7M8 12h5" />
                </svg>
              </ToolbarButton>
            )}
          </ToolbarGroup>
        )}

        <ToolbarGroup label={t('editor.toolbar.groups.paragraph')}>
          <EditorSelectMenu
            title={t('editor.toolbar.lineHeight')}
            current={lineLabel}
            options={localizedLineHeights}
            activeValue={s.lineHeight}
            onSelect={setLineHeight}
            width={70}
            icon={
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="10" y1="6" x2="21" y2="6" /><line x1="10" y1="12" x2="21" y2="12" /><line x1="10" y1="18" x2="21" y2="18" />
                <path d="M3 4v16M1 6l2-2 2 2M1 18l2 2 2-2" />
              </svg>
            }
          />
          <ToolbarButton title={t('editor.toolbar.alignLeft')} onClick={() => editor.chain().focus().setTextAlign('left').run()} isActive={s.isAlignLeft}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="15" y2="12" /><line x1="3" y1="18" x2="18" y2="18" />
            </svg>
          </ToolbarButton>
          <ToolbarButton title={t('editor.toolbar.alignCenter')} onClick={() => editor.chain().focus().setTextAlign('center').run()} isActive={s.isAlignCenter}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" /><line x1="6" y1="12" x2="18" y2="12" /><line x1="4" y1="18" x2="20" y2="18" />
            </svg>
          </ToolbarButton>
          <ToolbarButton title={t('editor.toolbar.alignRight')} onClick={() => editor.chain().focus().setTextAlign('right').run()} isActive={s.isAlignRight}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" /><line x1="9" y1="12" x2="21" y2="12" /><line x1="6" y1="18" x2="21" y2="18" />
            </svg>
          </ToolbarButton>
          <ToolbarButton title={t('editor.toolbar.alignJustify')} onClick={() => editor.chain().focus().setTextAlign('justify').run()} isActive={s.isAlignJustify}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </ToolbarButton>
        </ToolbarGroup>

        <ToolbarGroup label={t('editor.toolbar.groups.list')}>
          <ToolbarButton title={t('editor.toolbar.bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={s.isBulletList}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="9" y1="6" x2="20" y2="6" /><line x1="9" y1="12" x2="20" y2="12" /><line x1="9" y1="18" x2="20" y2="18" />
              <circle cx="4" cy="6" r="1.5" fill="currentColor" stroke="none" /><circle cx="4" cy="12" r="1.5" fill="currentColor" stroke="none" /><circle cx="4" cy="18" r="1.5" fill="currentColor" stroke="none" />
            </svg>
          </ToolbarButton>
          <ToolbarButton title={t('editor.toolbar.orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={s.isOrderedList}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="10" y1="6" x2="21" y2="6" /><line x1="10" y1="12" x2="21" y2="12" /><line x1="10" y1="18" x2="21" y2="18" />
              <text x="1" y="8" fontSize="7" fill="currentColor" stroke="none">1.</text>
              <text x="1" y="14" fontSize="7" fill="currentColor" stroke="none">2.</text>
              <text x="1" y="20" fontSize="7" fill="currentColor" stroke="none">3.</text>
            </svg>
          </ToolbarButton>
          <ToolbarButton title={t('editor.toolbar.taskList')} onClick={() => editor.chain().focus().toggleTaskList().run()} isActive={s.isTaskList}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="10" y1="6" x2="21" y2="6" /><line x1="10" y1="12" x2="21" y2="12" /><line x1="10" y1="18" x2="21" y2="18" />
              <polyline points="3 6 4 7 6 5" /><rect x="2.5" y="10.5" width="4" height="4" rx="0.5" /><rect x="2.5" y="16.5" width="4" height="4" rx="0.5" />
            </svg>
          </ToolbarButton>
        </ToolbarGroup>

        <ToolbarGroup label={t('editor.toolbar.groups.block')}>
          <ToolbarButton title={t('editor.toolbar.blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()} isActive={s.isBlockquote}>
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" />
              <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z" />
            </svg>
          </ToolbarButton>
          <ToolbarButton title={t('editor.toolbar.codeBlock')} onClick={() => editor.chain().focus().toggleCodeBlock().run()} isActive={s.isCodeBlock}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
            </svg>
          </ToolbarButton>
          <ToolbarButton title={t('editor.toolbar.horizontalRule')} onClick={() => editor.chain().focus().setHorizontalRule().run()}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="12" x2="21" y2="12" /><line x1="6" y1="6" x2="18" y2="6" opacity="0.35" /><line x1="6" y1="18" x2="18" y2="18" opacity="0.35" />
            </svg>
          </ToolbarButton>
        </ToolbarGroup>

      </div>

      {/* 3행: 현재 선택 대상에 필요한 기능만 노출 */}
      {((s.isTable && showTableTools) || (s.isImage && showImageSizeTools)) && (
        <div className="di-toolbar-row flex flex-wrap items-center gap-1 border-t border-neutral-200 bg-primary-50/40 px-1.5 py-1">
          {s.isTable && showTableTools && (
            <ToolbarGroup label={t('editor.toolbar.groups.tableEdit')}>
              <span className="px-1 text-xs font-medium text-neutral-500">{t('editor.toolbar.tableLabel')}</span>
              <ToolbarButton title={t('editor.toolbar.rowBefore')} onClick={() => editor.chain().focus().addRowBefore().run()}>
                <span className="text-xs">⬆+</span>
              </ToolbarButton>
              <ToolbarButton title={t('editor.toolbar.rowAfter')} onClick={() => editor.chain().focus().addRowAfter().run()}>
                <span className="text-xs">⬇+</span>
              </ToolbarButton>
              <ToolbarButton title={t('editor.toolbar.columnBefore')} onClick={() => editor.chain().focus().addColumnBefore().run()}>
                <span className="text-xs">⬅+</span>
              </ToolbarButton>
              <ToolbarButton title={t('editor.toolbar.columnAfter')} onClick={() => editor.chain().focus().addColumnAfter().run()}>
                <span className="text-xs">➡+</span>
              </ToolbarButton>
              <ToolbarButton title={t('editor.toolbar.deleteRow')} onClick={() => editor.chain().focus().deleteRow().run()}>
                <span className="text-xs text-red-500">⬓</span>
              </ToolbarButton>
              <ToolbarButton title={t('editor.toolbar.deleteColumn')} onClick={() => editor.chain().focus().deleteColumn().run()}>
                <span className="text-xs text-red-500">◧</span>
              </ToolbarButton>
              <ToolbarButton title={t('editor.toolbar.deleteTable')} onClick={() => editor.chain().focus().deleteTable().run()}>
                <span className="text-xs text-red-500">✕</span>
              </ToolbarButton>
            </ToolbarGroup>
          )}
          {s.isImage && showImageSizeTools && (
            <ToolbarGroup label={t('editor.toolbar.groups.imageEdit')} className="di-toolbar-image-size">
              <span className="px-1 text-xs font-medium text-neutral-500">{t('editor.image')}</span>
              {(['25%', '50%', '75%', '100%'] as const).map((width) => (
                <ToolbarButton
                  key={width}
                  title={t('editor.imageWidth', { width })}
                  onClick={() => editor.chain().focus().updateAttributes('image', { width }).run()}
                >
                  <span className="text-xs">{width}</span>
                </ToolbarButton>
              ))}
            </ToolbarGroup>
          )}
        </div>
      )}
    </div>
  )
}
