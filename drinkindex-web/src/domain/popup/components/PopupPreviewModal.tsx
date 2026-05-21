import { createPortal } from 'react-dom'
import DOMPurify from 'dompurify'
import type { PopupPreviewData } from '../types/popup.types'

interface Props {
  isOpen: boolean
  onClose: () => void
  popupData: PopupPreviewData
}

export default function PopupPreviewModal({ isOpen, onClose, popupData }: Props) {
  if (!isOpen) return null

  const handleBackdropClick = () => {
    if (popupData.closeOnOverlay !== false) onClose()
  }

  const sanitizedContent = DOMPurify.sanitize(popupData.content ?? '', {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 's', 'code', 'pre', 'blockquote',
      'h1', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'a', 'img',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
    ],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'class', 'colspan', 'rowspan',
      'rel', 'target', 'style', 'width', 'height'],
    FORCE_BODY: true,
  })

  return createPortal(
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center p-4">
      {/* 배경 */}
      <div
        className="absolute inset-0 bg-black/70"
        onClick={handleBackdropClick}
      />

      {/* 미리보기 배너 */}
      <div className="relative z-10 mb-3 px-4 py-2 bg-amber-500 text-white text-sm font-medium
        rounded-lg flex items-center gap-2 shadow-lg">
        <span>👁</span>
        <span>미리보기 모드 — 실제 노출 화면입니다</span>
      </div>

      {/* 팝업 본문 — IMAGE는 이미지 자연 크기에 맞춰 폭이 줄어듦 */}
      <div
        className={[
          'relative z-10 bg-white rounded-xl shadow-2xl overflow-hidden',
          'max-w-[min(90vw,_560px)] max-h-[90vh]',
          popupData.popupType === 'IMAGE' ? 'w-fit' : 'w-full max-w-lg',
        ].join(' ')}
      >
        {/* 닫기 버튼 (항상 표시 — 미리보기이므로 closeOnOverlay 무관) */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-2 right-2 z-20 w-8 h-8 flex items-center justify-center
            rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors text-lg leading-none"
          aria-label="닫기"
        >
          ×
        </button>

        {/* 이미지형 */}
        {popupData.popupType === 'IMAGE' && (
          <>
            {popupData.mainImageUrl ? (
              popupData.linkUrl ? (
                <a
                  href={popupData.linkUrl}
                  target={popupData.linkTargetBlank ? '_blank' : '_self'}
                  rel="noopener noreferrer"
                  className="block"
                  onClick={(e) => e.preventDefault()}  // 미리보기에서 이동 차단
                >
                  <img
                    src={popupData.mainImageUrl}
                    alt="팝업 이미지"
                    className="block w-auto h-auto max-w-full max-h-[70vh] mx-auto"
                  />
                </a>
              ) : (
                <img
                  src={popupData.mainImageUrl}
                  alt="팝업 이미지"
                  className="block w-auto h-auto max-w-full max-h-[70vh] mx-auto"
                />
              )
            ) : (
              <div className="h-56 flex flex-col items-center justify-center bg-neutral-100">
                <svg className="w-10 h-10 text-neutral-300 mb-2" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                <p className="text-sm text-neutral-400">이미지가 업로드되지 않았습니다</p>
              </div>
            )}
            {popupData.linkUrl && (
              <div className="px-4 py-2 bg-neutral-50 border-t border-neutral-100">
                <p className="text-xs text-neutral-500 truncate">
                  🔗 {popupData.linkUrl}
                  {popupData.linkTargetBlank && <span className="ml-1 text-neutral-400">(새 탭)</span>}
                </p>
              </div>
            )}
          </>
        )}

        {/* HTML형 */}
        {popupData.popupType === 'HTML' && (
          <div className="p-6 max-h-[70vh] overflow-y-auto">
            {sanitizedContent ? (
              <div
                className="notice-editor prose max-w-none text-sm"
                dangerouslySetInnerHTML={{ __html: sanitizedContent }}
              />
            ) : (
              <p className="text-neutral-400 text-sm text-center py-8">내용이 없습니다</p>
            )}
          </div>
        )}

        {popupData.closeOnOverlay === false && (
          <div className="px-4 py-2 bg-neutral-50 border-t border-neutral-100">
            <p className="text-xs text-neutral-400 text-center">X 버튼으로만 닫을 수 있습니다</p>
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
