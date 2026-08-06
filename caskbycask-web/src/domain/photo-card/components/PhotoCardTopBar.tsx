import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { PhotoCardEditor } from '../hooks/usePhotoCardEditor'
import type { PhotoCardViewport } from '../hooks/usePhotoCardViewport'

interface Props {
  editor: PhotoCardEditor
  viewport: PhotoCardViewport
  busy: boolean
  /** 곧바로 내려받지 않고 내보내기 화면을 연다 — 크기·형식을 고르고 나서 받는다. */
  onOpenExport: () => void
  onPublish: () => void
}

const iconButton = 'inline-flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 disabled:opacity-30 disabled:hover:bg-transparent'

/**
 * 편집기 상단 바.
 *
 * 사이트 GNB·검색은 없다 — 편집 중에 필요한 것만 둔다.
 * 나가기 / 되돌리기 / 확대율 / 내보내기, 이 넷이 전부다.
 */
export default function PhotoCardTopBar({ editor, viewport, busy, onOpenExport, onPublish }: Props) {
  const { t } = useTranslation()
  const hasPhoto = Boolean(editor.photoImage)

  return (
    <header className="flex h-12 shrink-0 items-center gap-1 border-b border-neutral-200 bg-white px-2 sm:gap-2 sm:px-3">
      <Link
        to="/community/photo"
        title={t('photoCard.exitEditor')}
        className="flex shrink-0 items-center gap-1.5 rounded-lg px-1.5 py-1 transition-colors hover:bg-neutral-100"
      >
        <img src="/logo.png" alt="CaskByCask" className="h-7 w-auto" />
        <span className="hidden text-sm font-bold text-primary-800 sm:inline">{t('photoCard.title')}</span>
      </Link>

      <div className="mx-1 hidden h-5 w-px bg-neutral-200 sm:block" />

      <button type="button" className={iconButton} title={`${t('photoCard.undo')} (Ctrl+Z)`}
        disabled={!editor.canUndo} onClick={editor.undo}>
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 8h11a5 5 0 010 10h-6" /><polyline points="7 4 3 8 7 12" />
        </svg>
      </button>
      <button type="button" className={iconButton} title={`${t('photoCard.redo')} (Ctrl+Shift+Z)`}
        disabled={!editor.canRedo} onClick={editor.redo}>
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 8H10a5 5 0 000 10h6" /><polyline points="17 4 21 8 17 12" />
        </svg>
      </button>

      <div className="mx-1 hidden h-5 w-px bg-neutral-200 sm:block" />

      <div className="hidden items-center gap-0.5 sm:flex">
        <button type="button" className={iconButton} title={t('photoCard.zoomOut')}
          onClick={() => viewport.zoomBy(1 / 1.25)}>
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><path d="M5 11h14v2H5z" /></svg>
        </button>
        <button
          type="button"
          onClick={viewport.fit}
          title={`${t('photoCard.zoomFit')} (Ctrl+0)`}
          className="min-w-[3.25rem] rounded-lg px-1 py-1 text-center font-mono text-xs text-neutral-600 transition-colors hover:bg-neutral-100"
        >
          {Math.round(viewport.zoom * 100)}%
        </button>
        <button type="button" className={iconButton} title={t('photoCard.zoomIn')}
          onClick={() => viewport.zoomBy(1.25)}>
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z" /></svg>
        </button>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          disabled={!hasPhoto || busy}
          onClick={onOpenExport}
          className="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-primary-500 disabled:opacity-40"
        >
          {busy ? t('photoCard.rendering') : t('photoCard.download')}
        </button>
        <button
          type="button"
          disabled={!hasPhoto || busy}
          onClick={onPublish}
          className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-bold text-neutral-700 transition-colors hover:bg-neutral-50 disabled:opacity-40"
        >
          {t('photoCard.publish')}
        </button>
      </div>
    </header>
  )
}
