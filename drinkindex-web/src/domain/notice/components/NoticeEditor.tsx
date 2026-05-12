import { useCallback, useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import TextAlign from '@tiptap/extension-text-align'
import Placeholder from '@tiptap/extension-placeholder'
import CharacterCount from '@tiptap/extension-character-count'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import DOMPurify from 'dompurify'
import { noticeApi } from '../api/noticeApi'
import NoticeEditorToolbar from './NoticeEditorToolbar'
import './NoticeEditor.css'

// width 속성을 지원하도록 Image 확장 (이미지 크기 조절)
const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (element) => element.getAttribute('width'),
        renderHTML: (attributes) => {
          if (!attributes.width) return {}
          return { width: attributes.width }
        },
      },
    }
  },
})

const MAX_FILE_SIZE = 5 * 1024 * 1024
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp']
const MAX_CHARS = 50000

interface Props {
  value: string
  onChange: (html: string) => void
  onImageUploadError?: (message: string) => void
  placeholder?: string
}

export default function NoticeEditor({ value, onChange, onImageUploadError, placeholder }: Props) {
  const handleImageUpload = useCallback(
    async (file: File): Promise<string | null> => {
      if (file.size > MAX_FILE_SIZE) {
        onImageUploadError?.('이미지 크기는 5MB 이하여야 합니다.')
        return null
      }
      const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        onImageUploadError?.('JPG, PNG, GIF, WEBP 형식만 업로드 가능합니다.')
        return null
      }

      try {
        const res = await noticeApi.uploadImage(file)
        return res.data.data?.imageUrl ?? null
      } catch (err: unknown) {
        const status = (err as { response?: { status?: number } })?.response?.status
        if (status === 429) {
          onImageUploadError?.('이미지 업로드 횟수를 초과했습니다. 잠시 후 다시 시도해주세요.')
        } else {
          onImageUploadError?.('이미지 업로드 중 오류가 발생했습니다.')
        }
        return null
      }
    },
    [onImageUploadError],
  )

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3, 4] } }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
      }),
      ResizableImage.configure({ inline: false, allowBase64: false }),
      TextAlign.configure({ types: ['heading', 'paragraph', 'image'] }),
      Placeholder.configure({ placeholder: placeholder ?? '공지 내용을 입력하세요...' }),
      CharacterCount.configure({ limit: MAX_CHARS }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: value,
    onUpdate({ editor: e }) {
      const raw = e.getHTML()
      // [보안] DOMPurify 클라이언트 2차 XSS 방어 — 서버 jsoup Sanitize가 1차
      const clean = DOMPurify.sanitize(raw, {
        ALLOWED_TAGS: [
          'p', 'br', 'strong', 'em', 'u', 's', 'code', 'pre', 'blockquote',
          'h1', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'a', 'img',
          'table', 'thead', 'tbody', 'tr', 'th', 'td',
        ],
        ALLOWED_ATTR: ['href', 'src', 'alt', 'class', 'colspan', 'rowspan', 'rel', 'target', 'style', 'width', 'height'],
        FORCE_BODY: true,
      })
      onChange(clean)
    },
  })

  const handleFileInput = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      e.target.value = ''
      if (!file || !editor) return
      const url = await handleImageUpload(file)
      if (url) {
        editor.chain().focus().setImage({ src: url }).run()
      }
    },
    [editor, handleImageUpload],
  )

  // 수정 모드에서 API 데이터 로드 후 reset() 호출 시 에디터 내용 동기화
  // (useEditor는 content를 초기화 시점에만 읽으므로 prop 변경에 직접 반응하지 않음)
  useEffect(() => {
    if (!editor) return
    if (value !== editor.getHTML()) {
      editor.commands.setContent(value || '', { emitUpdate: false })
    }
  }, [editor, value])

  if (!editor) return null

  const charCount = editor.storage.characterCount.characters()
  const isNearLimit = charCount > MAX_CHARS * 0.9

  return (
    <div className="border border-neutral-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-primary-500 transition-shadow">
      <NoticeEditorToolbar editor={editor} />

      {/* 이미지 업로드 */}
      <div className="px-3 py-1.5 border-b border-neutral-100 bg-neutral-50 flex items-center gap-2">
        <label className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-neutral-600
          border border-neutral-300 rounded cursor-pointer hover:bg-neutral-100 transition-colors">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
          이미지 추가
          <input
            type="file"
            className="sr-only"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={handleFileInput}
          />
        </label>
        <span className="text-xs text-neutral-400">JPG · PNG · GIF · WEBP, 최대 5MB</span>
      </div>

      <EditorContent editor={editor} className="notice-editor" />

      <div className={`px-4 py-1.5 border-t border-neutral-100 text-right text-xs
        ${isNearLimit ? 'text-amber-600' : 'text-neutral-400'}`}>
        {charCount.toLocaleString()} / {MAX_CHARS.toLocaleString()}자
      </div>
    </div>
  )
}
