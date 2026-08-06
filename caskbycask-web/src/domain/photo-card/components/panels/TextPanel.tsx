import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { PhotoCardEditor } from '../../hooks/usePhotoCardEditor'
import PhotoCardSpiritPicker from '../PhotoCardSpiritPicker'
import { PanelButton, Section } from './controls'

/**
 * 텍스트 도구.
 *
 * 빈 텍스트를 얹거나, 주류를 골라 이름을 통째로 얹는다.
 * 글꼴·크기·색·자간은 얹은 뒤 선택 속성에서 고친다.
 */
export default function TextPanel({ editor }: { editor: PhotoCardEditor }) {
  const { t } = useTranslation()
  const [pickerOpen, setPickerOpen] = useState(false)

  return (
    <div className="space-y-5">
      <Section title={t('photoCard.tabText')} hint={t('photoCard.addTextHint')}>
        <PanelButton tone="primary" onClick={() => editor.addLayer('TEXT')}>
          ＋ {t('photoCard.addText')}
        </PanelButton>
      </Section>

      <Section title={t('photoCard.spiritSection')} hint={t('photoCard.addSpiritNameHint')}>
        <PanelButton onClick={() => setPickerOpen(true)}>
          {t('photoCard.searchSpirit')}
        </PanelButton>
        {editor.spirit?.nameKo && (
          <p className="text-[11px] font-medium text-neutral-500">
            {editor.spirit.nameKo}
            {editor.spirit.nameEn && ` · ${editor.spirit.nameEn}`}
          </p>
        )}
      </Section>

      <PhotoCardSpiritPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(info) => {
          editor.setSpirit(info)
          // 고른 그 자리에서 이름을 카드에 얹는다 — 국문·영문을 각각 따로 둬야
          // 크기·글꼴을 다르게 주고 위아래로 쌓는 흔한 배치를 만들 수 있다.
          editor.addBoundText('SPIRIT_NAME_KO')
          if (info.nameEn) editor.addBoundText('SPIRIT_NAME_EN')
        }}
      />
    </div>
  )
}
