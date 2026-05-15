import { useCallback, useEffect } from 'react'
import { useEditor, EditorContent, Node, mergeAttributes } from '@tiptap/react'
import type { Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import TextAlign from '@tiptap/extension-text-align'
import Placeholder from '@tiptap/extension-placeholder'
import CharacterCount from '@tiptap/extension-character-count'
import DOMPurify from 'dompurify'
import { communityApi } from '../api/communityApi'

// ── 영상 임베드 커스텀 노드 ──────────────────────────────────
const VideoEmbed = Node.create({
  name: 'videoEmbed',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      src: { default: null },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-video-embed]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes({ 'data-video-embed': '' }, HTMLAttributes)]
  },

  addNodeView() {
    return ({ node }) => {
      const wrapper = document.createElement('div')
      wrapper.className = 'relative pb-[56.25%] h-0 overflow-hidden rounded-lg my-4 bg-neutral-100'
      wrapper.setAttribute('data-video-embed', '')
      const iframe = document.createElement('iframe')
      iframe.src = node.attrs.src
      iframe.className = 'absolute inset-0 w-full h-full rounded-lg'
      iframe.allowFullscreen = true
      iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture')
      wrapper.appendChild(iframe)
      return { dom: wrapper }
    }
  },
})

function toEmbedUrl(url: string): string | null {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`
  const vi = url.match(/vimeo\.com\/(\d+)/)
  if (vi) return `https://player.vimeo.com/video/${vi[1]}`
  return null
}

// ── 툴바 ────────────────────────────────────────────────────
function ToolbarBtn({ onClick, isActive, title, children }: {
  onClick: () => void; isActive?: boolean; title: string; children: React.ReactNode
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => { e.preventDefault(); onClick() }}
      className={[
        'h-7 w-7 flex items-center justify-center rounded text-sm transition-colors',
        isActive ? 'bg-primary-100 text-primary-700' : 'text-neutral-600 hover:bg-neutral-100',
      ].join(' ')}
    >
      {children}
    </button>
  )
}

function Divider() {
  return <div className="w-px h-5 bg-neutral-200 mx-0.5" />
}

function PostEditorToolbar({ editor }: { editor: Editor }) {
  const insertVideo = () => {
    const url = window.prompt('YouTube 또는 Vimeo URL을 입력하세요')
    if (!url) return
    const embedUrl = toEmbedUrl(url)
    if (!embedUrl) { alert('YouTube 또는 Vimeo URL만 지원합니다.'); return }
    editor.chain().focus().insertContent({ type: 'videoEmbed', attrs: { src: embedUrl } }).run()
  }

  const addLink = () => {
    const prev = editor.getAttributes('link').href ?? ''
    const url = window.prompt('링크 URL', prev)
    if (url === null) return
    if (!url) editor.chain().focus().unsetLink().run()
    else editor.chain().focus().setLink({ href: url }).run()
  }

  const b = editor.isActive('bold'), i = editor.isActive('italic')
  const u = editor.isActive('underline'), link = editor.isActive('link')
  const h2 = editor.isActive('heading', { level: 2 })
  const h3 = editor.isActive('heading', { level: 3 })
  const ul = editor.isActive('bulletList'), ol = editor.isActive('orderedList')

  return (
    <div className="flex flex-wrap items-center gap-0.5 p-2 border-b border-neutral-200 bg-neutral-50">
      <ToolbarBtn onClick={() => editor.chain().focus().toggleBold().run()} isActive={b} title="굵게">
        <strong className="text-xs">B</strong>
      </ToolbarBtn>
      <ToolbarBtn onClick={() => editor.chain().focus().toggleItalic().run()} isActive={i} title="기울임">
        <em className="text-xs">I</em>
      </ToolbarBtn>
      <ToolbarBtn onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={u} title="밑줄">
        <span className="text-xs underline">U</span>
      </ToolbarBtn>
      <Divider />
      <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} isActive={h2} title="제목2">
        <span className="text-xs font-bold">H2</span>
      </ToolbarBtn>
      <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} isActive={h3} title="제목3">
        <span className="text-xs font-bold">H3</span>
      </ToolbarBtn>
      <Divider />
      <ToolbarBtn onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={ul} title="불릿 목록">
        <span className="text-xs">•—</span>
      </ToolbarBtn>
      <ToolbarBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={ol} title="번호 목록">
        <span className="text-xs">1—</span>
      </ToolbarBtn>
      <Divider />
      <ToolbarBtn onClick={addLink} isActive={link} title="링크">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      </ToolbarBtn>
      <ToolbarBtn onClick={insertVideo} title="YouTube/Vimeo 삽입">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </ToolbarBtn>
    </div>
  )
}

// ── 에디터 컴포넌트 ──────────────────────────────────────────
const MAX_CHARS = 100000

interface Props {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  onImageError?: (msg: string) => void
}

export default function PostEditor({ value, onChange, placeholder, onImageError }: Props) {
  const handleUpload = useCallback(async (file: File): Promise<string | null> => {
    if (file.size > 5 * 1024 * 1024) {
      onImageError?.('이미지 크기는 5MB 이하여야 합니다.')
      return null
    }
    try {
      const res = await communityApi.uploadPostImage(file)
      return res.data.data?.imageUrl ?? null
    } catch {
      onImageError?.('이미지 업로드 중 오류가 발생했습니다.')
      return null
    }
  }, [onImageError])

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3, 4] } }),
      Underline,
      Link.configure({ openOnClick: false, HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' } }),
      Image.configure({ inline: false, allowBase64: false }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder: placeholder ?? '내용을 입력하세요...' }),
      CharacterCount.configure({ limit: MAX_CHARS }),
      VideoEmbed,
    ],
    content: value,
    onUpdate({ editor: e }) {
      const clean = DOMPurify.sanitize(e.getHTML(), {
        ALLOWED_TAGS: ['p','br','strong','em','u','s','code','pre','blockquote','h1','h2','h3','h4','ul','ol','li','a','img','div','iframe'],
        ALLOWED_ATTR: ['href','src','alt','class','rel','target','style','width','height','data-video-embed','allowfullscreen','allow'],
        FORCE_BODY: true,
      })
      onChange(clean)
    },
    editorProps: {
      handleDrop(view, event) {
        const file = event.dataTransfer?.files?.[0]
        if (!file?.type.startsWith('image/')) return false
        event.preventDefault()
        handleUpload(file).then((url) => {
          if (url) view.dispatch(view.state.tr.insertText(''))
          // insert image via editor command after async
        })
        return true
      },
      handlePaste(view, event) {
        // Paste 텍스트에서 YouTube/Vimeo URL 감지
        const text = event.clipboardData?.getData('text/plain') ?? ''
        const embedUrl = toEmbedUrl(text.trim())
        if (embedUrl) {
          event.preventDefault()
          view.dispatch(view.state.tr.replaceSelectionWith(
            view.state.schema.nodes.videoEmbed?.create({ src: embedUrl }) ??
            view.state.schema.text(text)
          ))
          return true
        }
        return false
      },
    },
  })

  // 파일 붙여넣기 (이미지)
  useEffect(() => {
    if (!editor) return
    const handlePasteFile = async (e: ClipboardEvent) => {
      const file = Array.from(e.clipboardData?.files ?? []).find((f) => f.type.startsWith('image/'))
      if (!file) return
      e.preventDefault()
      const url = await handleUpload(file)
      if (url) editor.chain().focus().setImage({ src: url }).run()
    }
    const el = editor.view.dom
    el.addEventListener('paste', handlePasteFile as unknown as EventListener)
    return () => el.removeEventListener('paste', handlePasteFile as unknown as EventListener)
  }, [editor, handleUpload])

  // 외부 value 변경 시 에디터 내용 갱신 (edit 모드용)
  useEffect(() => {
    if (editor && value && editor.getHTML() !== value && editor.isEmpty) {
      editor.commands.setContent(value)
    }
  }, [editor, value])

  const charCount = editor?.storage.characterCount?.characters() ?? 0

  return (
    <div className="border border-neutral-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-primary-300 focus-within:border-primary-400">
      {editor && <PostEditorToolbar editor={editor} />}
      <EditorContent
        editor={editor}
        className="prose prose-sm max-w-none min-h-[240px] p-4 focus:outline-none notice-content"
      />
      <div className="flex justify-end px-3 py-1.5 bg-neutral-50 border-t border-neutral-100">
        <span className="text-xs text-neutral-400 tabular-nums">{charCount.toLocaleString()} / {MAX_CHARS.toLocaleString()}</span>
      </div>
    </div>
  )
}
