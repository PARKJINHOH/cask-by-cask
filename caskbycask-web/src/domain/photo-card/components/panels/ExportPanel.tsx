import { useTranslation } from 'react-i18next'
import { PHOTO_CARD_EXPORT_SIZES } from '../../constants/photoCardRatios'
import type { PhotoCardEditor } from '../../hooks/usePhotoCardEditor'
import { frameSizeOf } from '../../utils/photoCardRender'
import { PanelButton, Section, SegmentedField } from './controls'

interface Props {
  editor: PhotoCardEditor
  format: 'image/jpeg' | 'image/png'
  onFormatChange: (format: 'image/jpeg' | 'image/png') => void
  sizeKey: string
  onSizeKeyChange: (key: string) => void
  busy: boolean
  isLoggedIn: boolean
  onDownload: () => void
  /** 비회원 전용 — 마크 없는 저장은 로그인이 필요하다는 안내를 띄운다 */
  onDownloadClean: () => void
  onPublish: () => void
}

/** 내보내기 도구 — 크기·포맷을 정하고 파일로 뽑거나 갤러리에 올린다. */
export default function ExportPanel({
  editor, format, onFormatChange, sizeKey, onSizeKeyChange,
  busy, isLoggedIn, onDownload, onDownloadClean, onPublish,
}: Props) {
  const { t } = useTranslation()
  const hasPhoto = Boolean(editor.photoImage)
  const maxEdge = PHOTO_CARD_EXPORT_SIZES.find((size) => size.key === sizeKey)?.maxEdge ?? undefined
  const preview = frameSizeOf(editor.layout.frame.ratio, maxEdge ?? editor.nativeMaxEdge)

  return (
    <div className="space-y-5">
      <Section
        title={t('photoCard.outputSize')}
        hint={t('photoCard.outputSizeHint', { width: preview.width, height: preview.height })}
      >
        <div className="flex overflow-hidden rounded-lg border border-neutral-300">
          {PHOTO_CARD_EXPORT_SIZES.map((size) => (
            <button
              key={size.key}
              type="button"
              onClick={() => onSizeKeyChange(size.key)}
              className={`flex-1 border-r border-neutral-200 py-2 text-[11px] font-semibold transition-colors last:border-r-0 ${
                sizeKey === size.key ? 'bg-primary-600 text-white' : 'text-neutral-500 hover:bg-neutral-50'
              }`}
            >
              {t(size.labelKey)}
            </button>
          ))}
        </div>
      </Section>

      <Section title={t('photoCard.format')} hint={t('photoCard.qualityHint')}>
        <SegmentedField<'image/jpeg' | 'image/png'>
          value={format}
          options={[
            { value: 'image/jpeg', label: t('photoCard.formatJpg') },
            { value: 'image/png', label: t('photoCard.formatPng') },
          ]}
          onChange={onFormatChange}
        />
      </Section>

      <Section title={t('photoCard.exportSection')} hint={t('photoCard.publishHint')}>
        <PanelButton tone="primary" disabled={!hasPhoto || busy} onClick={onDownload}>
          {busy ? t('photoCard.rendering')
            : isLoggedIn ? t('photoCard.download') : t('photoCard.downloadWithMark')}
        </PanelButton>
        {/* 비회원 저장본에는 브랜드 마크가 얹힌다. 받고 나서 알면 늦으므로 누르기 전에 알린다. */}
        {!isLoggedIn && (
          <>
            <p className="text-[11px] font-medium leading-relaxed text-neutral-500">
              {t('photoCard.guestMarkHint')}
            </p>
            <PanelButton disabled={!hasPhoto || busy} onClick={onDownloadClean}>
              {t('photoCard.downloadClean')}
            </PanelButton>
          </>
        )}
        <PanelButton disabled={!hasPhoto || busy} onClick={onPublish}>
          {t('photoCard.publishToGallery')}
        </PanelButton>
        {!hasPhoto && <p className="text-[11px] font-medium text-neutral-500">{t('photoCard.needPhoto')}</p>}
      </Section>
    </div>
  )
}
