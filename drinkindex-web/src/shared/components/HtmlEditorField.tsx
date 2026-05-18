import { useEffect, useRef, useState } from 'react'
import NoticeEditor from '@/domain/notice/components/NoticeEditor'
import { sanitizeHtml } from '@/shared/utils/sanitize'

interface HtmlEditorFieldProps {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  uploadImage?: (file: File) => Promise<string | null>
  onImageUploadError?: (msg: string) => void
}

// ── HTML 모드 토글 버튼 ──────────────────────────────────────
function HtmlModeToggle({ isHtml, onToggle }: { isHtml: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={[
        'inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border transition-colors',
        isHtml
          ? 'border-primary-400 bg-primary-50 text-primary-700'
          : 'border-neutral-300 text-neutral-500 hover:bg-neutral-50',
      ].join(' ')}
      title={isHtml ? '비주얼 에디터로 전환' : 'HTML 직접 편집 모드로 전환'}
    >
      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
      {isHtml ? 'HTML 편집 중' : 'HTML 편집'}
    </button>
  )
}

// HTML 모드에서 한 번이라도 편집하면 TipTap으로 되돌리지 않음
// (div/class 등 TipTap 스키마 미지원 구조가 손상되지 않도록)
export default function HtmlEditorField({
  value,
  onChange,
  placeholder,
  uploadImage,
  onImageUploadError,
}: HtmlEditorFieldProps) {
  const [isHtmlMode, setIsHtmlMode] = useState(false)
  const [htmlModeEverUsed, setHtmlModeEverUsed] = useState(false)
  const hasAutoDetected = useRef(false)

  // 편집 모드: 기존 내용에 div/class가 있으면 HTML 모드로 자동 전환 (최초 1회)
  useEffect(() => {
    if (hasAutoDetected.current || !value) return
    hasAutoDetected.current = true
    if (/<div|class=/.test(value)) {
      setIsHtmlMode(true)
      setHtmlModeEverUsed(true)
    }
  }, [value])

  const handleToggle = () => {
    if (!isHtmlMode) setHtmlModeEverUsed(true)
    setIsHtmlMode((v) => !v)
  }

  return (
    <div>
      {/* 라벨 + HTML 토글 버튼 영역 — 부모에서 label을 따로 렌더할 수도 있으나,
          토글 버튼은 컴포넌트 내부 상태이므로 여기서 같이 표시 */}
      <div className="flex items-center justify-between mb-1.5">
        <div />
        <HtmlModeToggle isHtml={isHtmlMode} onToggle={handleToggle} />
      </div>

      {isHtmlMode ? (
        /* ── HTML 직접 편집 ──────────────────────── */
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={20}
          spellCheck={false}
          placeholder={placeholder ?? '<h2>제목</h2><p>내용을 입력하세요...</p>'}
          className="w-full px-3 py-2.5 font-mono text-xs text-neutral-700 leading-relaxed
            border border-neutral-300 rounded-lg resize-y
            focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
        />
      ) : htmlModeEverUsed ? (
        /* ── HTML 모드 사용 후 — 미리보기만 (TipTap 변환 방지) ── */
        <div className="border border-neutral-300 rounded-lg overflow-hidden">
          <div className="px-3 py-1.5 bg-amber-50 border-b border-amber-200 flex items-center gap-2">
            <svg className="w-3.5 h-3.5 text-amber-600 shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            </svg>
            <span className="text-xs text-amber-700">
              HTML 편집 모드를 사용 중입니다. 내용 수정은 위 <strong>HTML 편집</strong> 버튼을 클릭하세요.
            </span>
          </div>
          <div
            className="px-4 py-3 min-h-24 text-sm text-neutral-700"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(value) }}
          />
        </div>
      ) : (
        /* ── WYSIWYG 에디터 ──────────────────────── */
        <NoticeEditor
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          uploadImage={uploadImage}
          onImageUploadError={onImageUploadError}
        />
      )}
    </div>
  )
}
