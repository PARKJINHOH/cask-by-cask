import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { photoCardApi } from '../../api/photoCardApi'
import { PHOTO_CARD_ICONS } from '../../constants/photoCardIcons'
import type { PhotoCardEditor } from '../../hooks/usePhotoCardEditor'
import { PanelButton, Section } from './controls'
import ProducerLogoPicker from './ProducerLogoPicker'

/** 꾸미기 도구 — 아이콘·구분선·박스·이미지. 텍스트는 텍스트 도구에 따로 있다. */
export default function ElementPanel({ editor }: { editor: PhotoCardEditor }) {
  const { t } = useTranslation()
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [failed, setFailed] = useState(false)

  /**
   * 이미지는 올리는 것부터 시작한다.
   *
   * 빈 이미지 레이어를 먼저 만들면 가리킬 그림이 없어 카드에 아무것도 안 나타난다 —
   * 눌러도 아무 일이 없는 것처럼 보인다. 게다가 출처가 '업로드'인데 파일이 없으면
   * 서버가 템플릿 저장을 거부하므로, 주소를 확보한 뒤에 레이어를 만든다.
   * 증류소 로고·주류 이미지로 바꾸는 것은 얹은 뒤 선택 속성에서 한다.
   */
  const pickImage = async (file: File | undefined) => {
    if (!file) return
    setFailed(false)
    setUploading(true)
    try {
      const uploaded = await photoCardApi.uploadImage(file)
      if (!uploaded?.imageUrl) {
        setFailed(true)
        return
      }
      editor.addLayer('IMAGE', { source: 'UPLOAD', uploadUrl: uploaded.imageUrl, widthRatio: 0.2 })
    } catch {
      setFailed(true)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-5">
      <Section title={t('photoCard.iconSection')}>
        <div className="grid grid-cols-6 gap-1.5">
          {PHOTO_CARD_ICONS.map((icon) => (
            <button
              key={icon.key}
              type="button"
              title={t(icon.labelKey)}
              aria-label={t(icon.labelKey)}
              onClick={() => editor.addIcon(icon.key)}
              className="flex aspect-square items-center justify-center rounded-lg border border-neutral-200 text-neutral-600 transition-colors hover:border-primary-400 hover:bg-primary-50 hover:text-primary-700"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
                <path d={icon.path} />
              </svg>
            </button>
          ))}
        </div>
      </Section>

      <Section title={t('photoCard.addShape')} hint={t('photoCard.boxHint')}>
        <PanelButton onClick={() => editor.addLayer('DIVIDER')}>＋ {t('photoCard.addDivider')}</PanelButton>
        <PanelButton onClick={() => editor.addLayer('BOX')}>＋ {t('photoCard.addBox')}</PanelButton>
      </Section>

      <Section title={t('photoCard.addImage')} hint={t('photoCard.addImageHint')}>
        <PanelButton disabled={uploading} onClick={() => fileRef.current?.click()}>
          {uploading ? t('photoCard.uploading') : `＋ ${t('photoCard.addImage')}`}
        </PanelButton>
        {failed && (
          <p className="text-[11px] font-medium text-red-600">{t('photoCard.addImageFailed')}</p>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            void pickImage(event.target.files?.[0])
            event.target.value = ''
          }}
        />
      </Section>

      <Section title={t('photoCard.logoSection')}>
        <ProducerLogoPicker editor={editor} onUploadInstead={() => fileRef.current?.click()} />
      </Section>
    </div>
  )
}
