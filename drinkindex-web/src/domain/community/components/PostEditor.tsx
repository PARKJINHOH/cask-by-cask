import { useCallback, useEffect, useRef, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import type { Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import TextAlign from '@tiptap/extension-text-align'
import Placeholder from '@tiptap/extension-placeholder'
import CharacterCount from '@tiptap/extension-character-count'
import { TextStyle, Color } from '@tiptap/extension-text-style'
import Highlight from '@tiptap/extension-highlight'
import DOMPurify from 'dompurify'
import { communityApi } from '../api/communityApi'
import { ResizableImage } from '@/shared/tiptap/ResizableImage'
import { VideoEmbed, toEmbedUrl, handleVideoEnter } from '@/shared/tiptap/VideoEmbed'
import { UploadedVideo } from '@/shared/tiptap/UploadedVideo'
import EditorColorPicker from '@/shared/tiptap/EditorColorPicker'
import EditorHighlightPicker from '@/shared/tiptap/EditorHighlightPicker'
import '@/shared/tiptap/editor-image.css'

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

function PostEditorToolbar({ editor, onVideoUpload }: { editor: Editor; onVideoUpload: () => void }) {
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
      <EditorColorPicker editor={editor} />
      <EditorHighlightPicker editor={editor} />
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
      <ToolbarBtn onClick={onVideoUpload} title="동영상 업로드 (MP4/WebM, 50MB 이하)">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 12v-1m0 0V9m0 2H9m3 0h3" />
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
  onVideoError?: (msg: string) => void
}

export default function PostEditor({ value, onChange, placeholder, onImageError, onVideoError }: Props) {
  // 이미지/동영상 업로드 진행률 (null = 업로드 중 아님)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [uploadLabel, setUploadLabel] = useState<'이미지' | '동영상'>('이미지')
  const videoInputRef = useRef<HTMLInputElement>(null)

  const handleUpload = useCallback(async (file: File): Promise<string | null> => {
    if (file.size > 5 * 1024 * 1024) {
      onImageError?.('이미지 크기는 5MB 이하여야 합니다.')
      return null
    }
    setUploadLabel('이미지')
    setUploadProgress(0)
    try {
      const res = await communityApi.uploadPostImage(file, setUploadProgress)
      return res.data.data?.imageUrl ?? null
    } catch {
      onImageError?.('이미지 업로드 중 오류가 발생했습니다.')
      return null
    } finally {
      setUploadProgress(null)
    }
  }, [onImageError])

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3, 4] } }),
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      Link.configure({ openOnClick: false, HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' } }),
      ResizableImage.configure({ inline: false, allowBase64: false }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder: placeholder ?? '내용을 입력하세요...' }),
      CharacterCount.configure({ limit: MAX_CHARS }),
      VideoEmbed,
      UploadedVideo,
    ],
    content: value,
    onUpdate({ editor: e }) {
      const clean = DOMPurify.sanitize(e.getHTML(), {
        ALLOWED_TAGS: ['p','br','span','mark','strong','em','u','s','code','pre','blockquote','h1','h2','h3','h4','ul','ol','li','a','img','div','iframe','video'],
        ALLOWED_ATTR: ['href','src','alt','class','rel','target','style','width','height','data-color','data-video-embed','data-uploaded-video','allowfullscreen','allow','frameborder','controls','preload','type'],
        FORCE_BODY: true,
      })
      onChange(clean)
    },
    editorProps: {
      handleKeyDown(_view, event) {
        // 영상 URL 한 줄 입력 후 Enter → 임베드 변환
        if ((event.key === 'Enter') && !event.shiftKey && editor) {
          if (handleVideoEnter(editor)) return true
        }
        return false
      },
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

  const handleVideoUpload = useCallback(async (file: File) => {
    const allowedTypes = ['video/mp4', 'video/webm']
    if (!allowedTypes.includes(file.type)) {
      onVideoError?.('MP4 또는 WebM 형식의 동영상만 업로드할 수 있습니다.')
      return
    }
    if (file.size > 50 * 1024 * 1024) {
      onVideoError?.('동영상 크기는 50MB 이하여야 합니다.')
      return
    }
    setUploadLabel('동영상')
    setUploadProgress(0)
    try {
      const res = await communityApi.uploadPostVideo(file, setUploadProgress)
      const data = res.data.data
      if (data && editor) {
        editor.chain().focus().insertContent({
          type: 'uploadedVideo',
          attrs: { src: data.videoUrl, mimeType: data.mimeType },
        }).run()
      }
    } catch {
      onVideoError?.('동영상 업로드 중 오류가 발생했습니다.')
    } finally {
      setUploadProgress(null)
      if (videoInputRef.current) videoInputRef.current.value = ''
    }
  }, [onVideoError, editor])

  const charCount = editor?.storage.characterCount?.characters() ?? 0

  return (
    <div className="border border-neutral-300 rounded-xl overflow-hidden bg-white focus-within:ring-2 focus-within:ring-primary-300 focus-within:border-primary-400">
      {/* 동영상 파일 선택 input (숨김) */}
      <input
        ref={videoInputRef}
        type="file"
        accept="video/mp4,video/webm,.mp4,.webm"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleVideoUpload(file)
        }}
      />

      {editor && (
        <PostEditorToolbar
          editor={editor}
          onVideoUpload={() => videoInputRef.current?.click()}
        />
      )}

      {/* 업로드 진행률 */}
      {uploadProgress !== null && (
        <div className="px-4 py-2 border-b border-neutral-100 bg-primary-50/60">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-primary-800">{uploadLabel} 업로드 중...</span>
            <span className="text-xs text-primary-800 tabular-nums">{uploadProgress}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-primary-100 overflow-hidden">
            <div
              className="h-full bg-primary-600 transition-all duration-150"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      <EditorContent
        editor={editor}
        className="prose prose-sm max-w-none p-4 focus:outline-none notice-content [&_.ProseMirror]:min-h-[200px] [&_.ProseMirror]:cursor-text [&_.ProseMirror]:outline-none"
      />
      <div className="flex justify-end px-3 py-1.5 bg-neutral-50 border-t border-neutral-100">
        <span className="text-xs text-neutral-400 tabular-nums">{charCount.toLocaleString()} / {MAX_CHARS.toLocaleString()}</span>
      </div>
    </div>
  )
}
