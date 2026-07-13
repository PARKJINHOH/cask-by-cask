import { useCallback, useEffect, useRef, useState } from 'react'
import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import TextAlign from '@tiptap/extension-text-align'
import Placeholder from '@tiptap/extension-placeholder'
import CharacterCount from '@tiptap/extension-character-count'
import { TextStyle, Color, FontFamily, FontSize, LineHeight } from '@tiptap/extension-text-style'
import Highlight from '@tiptap/extension-highlight'
import { TaskList, TaskItem } from '@tiptap/extension-list'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import DOMPurify from 'dompurify'
import { ResizableImage } from './ResizableImage'
import { VideoEmbed, toEmbedUrl, handleVideoEnter } from './VideoEmbed'
import { UploadedVideo } from './UploadedVideo'
import { SpiritEmbed, type SpiritEmbedAttrs } from './SpiritEmbed'
import RichTextToolbar from './RichTextToolbar'
import SpiritEmbedDialog from './SpiritEmbedDialog'
import ImageEditorModal from '../components/ImageEditorModal'
import './rich-text.css'
import './editor-image.css'

// [보안] 에디터가 생성한 HTML을 클라이언트에서 1차 정제(서버 jsoup 가 최종 정제).
const ALLOWED_TAGS = [
  'p', 'br', 'span', 'mark', 'strong', 'em', 'u', 's', 'code', 'pre', 'blockquote',
  'h1', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'hr', 'a', 'img',
  'table', 'thead', 'tbody', 'tr', 'th', 'td', 'div', 'iframe', 'video',
]
const ALLOWED_ATTR = [
  'href', 'src', 'alt', 'class', 'rel', 'target', 'style', 'width', 'height',
  'data-image-layout', 'data-image-pair',
  'colspan', 'rowspan', 'scope', 'data-color',
  'data-type', 'data-checked',
  'data-spirit-id', 'data-spirit-name', 'data-spirit-name-en', 'data-spirit-category',
  'data-spirit-thumbnail', 'data-spirit-abv', 'data-spirit-review-count',
  'data-spirit-width',
  'data-video-embed', 'data-uploaded-video',
  'allowfullscreen', 'allow', 'frameborder', 'controls', 'preload', 'type',
  'start',
  'id',
]

// 미디어 업로드 정책 — 백엔드(PostService.validateMediaPolicy / NoticeImageValidator / PostVideoValidator)와
// 동기화 유지. 소규모 서버 디스크 보호용 한도로, 서버 증설 시 양쪽을 함께 상향한다.
const MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 이미지 개당 10MB
const MAX_IMAGE_COUNT = 20 // 문서(게시글)당 이미지 최대 장수
const MAX_VIDEO_SIZE = 50 * 1024 * 1024 // 동영상 개당 50MB
const MAX_VIDEO_COUNT = 2 // 문서(게시글)당 동영상 최대 개수
const MAX_MEDIA_TOTAL = 100 * 1024 * 1024 // 이미지+동영상 합계 100MB

// 문서 내 업로드 미디어 현황 집계. 합계 용량(knownBytes)은 이 세션에서 업로드한 파일 크기만
// 합산하는 최선 추정치(수정 모드에서 기존 미디어 크기는 알 수 없음) — 최종 검증은 저장 시 백엔드가 수행.
function collectMediaUsage(editor: Editor, sizes: Map<string, number>) {
  let imageCount = 0
  let videoCount = 0
  let knownBytes = 0
  editor.state.doc.descendants((node) => {
    if (node.type.name !== 'image' && node.type.name !== 'uploadedVideo') return
    if (node.type.name === 'image') imageCount++
    else videoCount++
    knownBytes += sizes.get(node.attrs.src as string) ?? 0
  })
  return { imageCount, videoCount, knownBytes }
}

interface Props {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  maxChars?: number
  /** 이미지 업로드 (없으면 이미지 버튼/붙여넣기 비활성) */
  uploadImage?: (file: File, onProgress?: (p: number) => void) => Promise<string | null>
  /** 동영상 업로드 (없으면 동영상 업로드 버튼 비활성) */
  uploadVideo?: (file: File, onProgress?: (p: number) => void) => Promise<{ videoUrl: string; mimeType: string } | null>
  onImageError?: (msg: string) => void
  onVideoError?: (msg: string) => void
  /** 본문 내 술 카드 삽입 기능 (기본 true) */
  enableSpiritEmbed?: boolean
}

export default function RichTextEditor({
  value, onChange, placeholder, maxChars = 100000,
  uploadImage, uploadVideo, onImageError, onVideoError,
  enableSpiritEmbed = true,
}: Props) {
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [uploadLabel, setUploadLabel] = useState<'이미지' | '동영상'>('이미지')
  // 여러 장 동시 업로드 시 진행 위치(예: 2/5). 단일 업로드면 null.
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null)
  const [spiritOpen, setSpiritOpen] = useState(false)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const lastEmitted = useRef(value)
  // editorProps(드래그/붙여넣기) 클로저에서 최신 다중 업로드 핸들러를 참조하기 위한 ref.
  const uploadAndInsertImagesRef = useRef<(files: File[]) => void>(() => {})
  // 이 세션에서 업로드한 미디어 URL → 파일 크기. 합계 100MB 사전 검증용.
  const mediaSizesRef = useRef(new Map<string, number>())

  // 이미지 편집 모달 상태
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editImageSrc, setEditImageSrc] = useState('')
  const [editImagePos, setEditImagePos] = useState<number | null>(null)
  const [isEditingSaving, setIsEditingSaving] = useState(false)

  const handleImageUpload = useCallback(async (file: File): Promise<string | null> => {
    if (!uploadImage) return null
    if (file.size > MAX_IMAGE_SIZE) {
      onImageError?.('이미지 크기는 10MB 이하여야 합니다.')
      return null
    }
    setUploadLabel('이미지')
    setUploadProgress(0)
    try {
      return await uploadImage(file, setUploadProgress)
    } catch {
      onImageError?.('이미지 업로드 중 오류가 발생했습니다.')
      return null
    } finally {
      setUploadProgress(null)
    }
  }, [uploadImage, onImageError])

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3, 4] } }),
      Underline,
      TextStyle,
      Color,
      FontFamily,
      FontSize,
      LineHeight,
      Highlight.configure({ multicolor: true }),
      Link.configure({ openOnClick: false, HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' } }),
      ResizableImage.configure({ inline: false, allowBase64: false }),
      TextAlign.configure({ types: ['heading', 'paragraph', 'image'] }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Placeholder.configure({ placeholder: placeholder ?? '내용을 입력하세요...' }),
      CharacterCount.configure({ limit: maxChars }),
      VideoEmbed,
      UploadedVideo,
      ...(enableSpiritEmbed ? [SpiritEmbed] : []),
    ],
    content: value,
    onUpdate({ editor: e }) {
      const clean = DOMPurify.sanitize(e.getHTML(), {
        ALLOWED_TAGS, ALLOWED_ATTR, FORCE_BODY: true,
      })
      lastEmitted.current = clean
      onChange(clean)
    },
    editorProps: {
      handleDOMEvents: {
        dragover(view: any, event: any) {
          const scrollContainer = view.dom.parentElement
          if (scrollContainer && event.clientY) {
            const rect = scrollContainer.getBoundingClientRect()
            const topDist = event.clientY - rect.top
            const bottomDist = rect.bottom - event.clientY
            const threshold = 200
            if (topDist < threshold && topDist > 0) {
              scrollContainer.scrollTop -= 2
            } else if (bottomDist < threshold && bottomDist > 0) {
              scrollContainer.scrollTop += 2
            }
          }
          return false
        }
      },
      handleKeyDown(_view, event) {
        if (event.key === 'Enter' && !event.shiftKey && editor) {
          if (handleVideoEnter(editor)) return true
        }
        return false
      },
      handleDrop(_view, event) {
        const files = Array.from(event.dataTransfer?.files ?? [])
        const imgFiles = files.filter((f) => f.type.startsWith('image/'))
        if (imgFiles.length === 0 || !uploadImage) return false
        event.preventDefault()
        uploadAndInsertImagesRef.current(imgFiles)
        return true
      },
      handlePaste(view, event) {
        // 이미지 파일 붙여넣기 (클립보드 이미지) — 여러 장 지원
        const imgFiles = Array.from(event.clipboardData?.files ?? []).filter((f) => f.type.startsWith('image/'))
        if (imgFiles.length > 0 && uploadImage) {
          event.preventDefault()
          uploadAndInsertImagesRef.current(imgFiles)
          return true
        }
        // YouTube/Vimeo URL 붙여넣기 → 임베드
        const text = event.clipboardData?.getData('text/plain') ?? ''
        const embedUrl = toEmbedUrl(text.trim())
        if (embedUrl) {
          event.preventDefault()
          const node = view.state.schema.nodes.videoEmbed?.create({ src: embedUrl })
          if (node) {
            view.dispatch(view.state.tr.replaceSelectionWith(node))
            return true
          }
        }
        return false
      },
    },
  })

  // 외부에서 value 가 교체된 경우에만 동기화(임시저장 불러오기/수정 모드 복원).
  // 타이핑 중 onChange→value 왕복은 lastEmitted 로 걸러 커서 점프 방지.
  useEffect(() => {
    if (!editor) return
    if (value !== lastEmitted.current && value !== editor.getHTML()) {
      editor.commands.setContent(value || '', { emitUpdate: false })
      lastEmitted.current = value
    }
  }, [editor, value])

  // 이미지 편집 요청 이벤트 리스너 등록
  useEffect(() => {
    if (!editor) return

    const handleEditRequest = (e: Event) => {
      const customEvent = e as CustomEvent<{ src: string; pos: number }>
      const { src, pos } = customEvent.detail
      setEditImageSrc(src)
      setEditImagePos(pos)
      setEditModalOpen(true)
    }

    const editorDom = editor.view.dom
    editorDom.addEventListener('image-edit-request', handleEditRequest)

    return () => {
      editorDom.removeEventListener('image-edit-request', handleEditRequest)
    }
  }, [editor])

  const handleSaveEditedImage = useCallback(async (file: File) => {
    if (!uploadImage || !editor || editImagePos === null) return
    setIsEditingSaving(true)
    try {
      const newUrl = await uploadImage(file)
      if (!newUrl) {
        onImageError?.('편집된 이미지 업로드에 실패했습니다.')
        return
      }

      mediaSizesRef.current.set(newUrl, file.size)

      const state = editor.state
      const node = state.doc.nodeAt(editImagePos)
      if (node && node.type.name === 'image') {
        editor.view.dispatch(
          state.tr.setNodeMarkup(editImagePos, undefined, {
            ...node.attrs,
            src: newUrl,
          })
        )
      }
      setEditModalOpen(false)
    } catch (err) {
      onImageError?.('편집된 이미지 저장 중 오류가 발생했습니다.')
      console.error(err)
    } finally {
      setIsEditingSaving(false)
    }
  }, [uploadImage, editor, editImagePos, onImageError])

  // 이미지 파일 여러 장을 순차 업로드하며 성공한 것부터 에디터에 삽입한다.
  // (파일 선택 / 드래그 / 붙여넣기 공용)
  const uploadAndInsertImages = useCallback(async (files: File[]) => {
    if (!uploadImage || !editor) return
    let images = files.filter((f) => f.type.startsWith('image/'))
    if (images.length === 0) return
    // 문서 내 기존 이미지 + 새 파일 합계가 장수 한도를 넘으면 초과분은 업로드하지 않는다.
    const usage = collectMediaUsage(editor, mediaSizesRef.current)
    const remaining = MAX_IMAGE_COUNT - usage.imageCount
    if (images.length > remaining) {
      onImageError?.(`이미지는 최대 ${MAX_IMAGE_COUNT}장까지 첨부할 수 있습니다.`)
      if (remaining <= 0) return
      images = images.slice(0, remaining)
    }
    let budget = MAX_MEDIA_TOTAL - usage.knownBytes
    try {
      for (let i = 0; i < images.length; i++) {
        if (images[i].size > budget) {
          onImageError?.('이미지·동영상 합계 용량은 100MB를 초과할 수 없습니다.')
          break
        }
        if (images.length > 1) setBatchProgress({ current: i + 1, total: images.length })
        const url = await handleImageUpload(images[i])
        if (!url) continue
        mediaSizesRef.current.set(url, images[i].size)
        budget -= images[i].size
        editor.chain().focus().setImage({ src: url }).run()
        // setImage 직후 삽입된 이미지가 NodeSelection 으로 선택돼,
        // 다음 setImage 가 이 이미지를 덮어쓴다. 커서를 이미지 뒤로 옮겨 이어 붙인다.
        const after = editor.state.selection.to
        editor.commands.setTextSelection(after)
      }
    } finally {
      setBatchProgress(null)
    }
  }, [uploadImage, editor, handleImageUpload, onImageError])

  useEffect(() => {
    uploadAndInsertImagesRef.current = uploadAndInsertImages
  }, [uploadAndInsertImages])

  const handleVideoFile = useCallback(async (file: File) => {
    if (!uploadVideo || !editor) return
    if (!['video/mp4', 'video/webm'].includes(file.type)) {
      onVideoError?.('MP4 또는 WebM 형식의 동영상만 업로드할 수 있습니다.')
      return
    }
    if (file.size > MAX_VIDEO_SIZE) {
      onVideoError?.('동영상 크기는 50MB 이하여야 합니다.')
      return
    }
    const usage = collectMediaUsage(editor, mediaSizesRef.current)
    if (usage.videoCount >= MAX_VIDEO_COUNT) {
      onVideoError?.(`동영상은 최대 ${MAX_VIDEO_COUNT}개까지 첨부할 수 있습니다.`)
      return
    }
    if (file.size > MAX_MEDIA_TOTAL - usage.knownBytes) {
      onVideoError?.('이미지·동영상 합계 용량은 100MB를 초과할 수 없습니다.')
      return
    }
    setUploadLabel('동영상')
    setUploadProgress(0)
    try {
      const data = await uploadVideo(file, setUploadProgress)
      if (data && editor) {
        mediaSizesRef.current.set(data.videoUrl, file.size)
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
  }, [uploadVideo, onVideoError, editor])

  const insertVideoEmbed = useCallback(() => {
    if (!editor) return
    const url = window.prompt('YouTube 또는 Vimeo URL을 입력하세요')
    if (!url) return
    const embedUrl = toEmbedUrl(url)
    if (!embedUrl) { alert('YouTube 또는 Vimeo URL만 지원합니다.'); return }
    editor.chain().focus().insertContent({ type: 'videoEmbed', attrs: { src: embedUrl } }).run()
  }, [editor])

  const handleSpiritSelect = useCallback((attrs: SpiritEmbedAttrs) => {
    editor?.chain().focus().insertSpiritEmbed(attrs).run()
  }, [editor])

  const charCount = editor?.storage.characterCount?.characters() ?? 0
  const isNearLimit = charCount > maxChars * 0.9

  return (
    <div
      onClick={(e) => {
        const target = e.target as HTMLElement
        // 툴바, 버튼, 입력필드, 셀렉트박스 및 술 카드 다이얼로그 내부 클릭 시에는 포커스 동작 무시
        if (
          target.closest('.rich-text-toolbar') ||
          target.closest('button') ||
          target.closest('input') ||
          target.closest('select') ||
          target.closest('.di-spirit-embed-dialog')
        ) {
          return
        }
        editor?.commands.focus()
      }}
      className="border border-neutral-300 rounded-xl overflow-hidden bg-white focus-within:ring-2 focus-within:ring-primary-300 focus-within:border-primary-400"
    >
      {/* 숨김 파일 input */}
      {uploadImage && (
        <input
          ref={imageInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          multiple
          className="hidden"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? [])
            e.target.value = ''
            if (files.length) uploadAndInsertImages(files)
          }}
        />
      )}
      {uploadVideo && (
        <input
          ref={videoInputRef}
          type="file"
          accept="video/mp4,video/webm,.mp4,.webm"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleVideoFile(file)
          }}
        />
      )}

      {editor && (
        <RichTextToolbar
          editor={editor}
          onImageUpload={uploadImage ? () => imageInputRef.current?.click() : undefined}
          onVideoUpload={uploadVideo ? () => videoInputRef.current?.click() : undefined}
          onVideoEmbed={insertVideoEmbed}
          onSpiritEmbed={enableSpiritEmbed ? () => setSpiritOpen(true) : undefined}
        />
      )}

      {/* 업로드 진행률 */}
      {uploadProgress !== null && (
        <div className="px-4 py-2 border-b border-neutral-100 bg-primary-50/60">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-primary-800">
              {uploadLabel} 업로드 중...
              {batchProgress && ` (${batchProgress.current}/${batchProgress.total})`}
            </span>
            <span className="text-xs text-primary-800 tabular-nums">{uploadProgress}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-primary-100 overflow-hidden">
            <div className="h-full bg-primary-600 transition-all duration-150" style={{ width: `${uploadProgress}%` }} />
          </div>
        </div>
      )}

      <EditorContent editor={editor} className="di-richtext notice-content" />

      <div className={['flex justify-end px-3 py-1.5 bg-neutral-50 border-t border-neutral-100 text-xs tabular-nums', isNearLimit ? 'text-amber-600' : 'text-neutral-400'].join(' ')}>
        {charCount.toLocaleString()} / {maxChars.toLocaleString()}자
      </div>

      {enableSpiritEmbed && (
        <SpiritEmbedDialog open={spiritOpen} onClose={() => setSpiritOpen(false)} onSelect={handleSpiritSelect} />
      )}

      {uploadImage && (
        <ImageEditorModal
          open={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          imageSrc={editImageSrc}
          onSave={handleSaveEditedImage}
          isSaving={isEditingSaving}
        />
      )}
    </div>
  )
}
