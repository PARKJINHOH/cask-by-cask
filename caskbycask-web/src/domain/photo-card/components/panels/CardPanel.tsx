import { useTranslation } from 'react-i18next'
import { PHOTO_CARD_RATIOS } from '../../constants/photoCardRatios'
import type { PhotoCardEditor } from '../../hooks/usePhotoCardEditor'
import { ColorField, Section, SliderField } from './controls'

/** 카드 도구 — 비율·배경·모서리처럼 카드 전체에 걸리는 것. */
export default function CardPanel({ editor }: { editor: PhotoCardEditor }) {
  const { t } = useTranslation()
  const { frame } = editor.layout

  return (
    <div className="space-y-5">
      <Section title={t('photoCard.ratio')}>
        <div className="grid grid-cols-5 gap-1">
          {PHOTO_CARD_RATIOS.map((ratio) => (
            <button
              key={ratio.value}
              type="button"
              title={t(ratio.hintKey)}
              onClick={() => editor.changeRatio(ratio.value)}
              className={`rounded-lg border py-1.5 text-[11px] font-semibold transition-colors ${
                frame.ratio === ratio.value
                  ? 'border-primary-500 bg-primary-600 text-white'
                  : 'border-neutral-300 text-neutral-500 hover:bg-neutral-50'
              }`}
            >
              {ratio.label}
            </button>
          ))}
        </div>
      </Section>

      <Section title={t('photoCard.backgroundSection')} hint={t('photoCard.backgroundHint')}>
        <ColorField
          label={t('photoCard.backgroundColor')}
          value={frame.backgroundColor}
          presets
          onChange={editor.setBackgroundColor}
        />
      </Section>

      <Section title={t('photoCard.cornerSection')} hint={t('photoCard.cornerHint')}>
        <SliderField
          label={t('photoCard.cardCorner')}
          display={`${((frame.radius ?? 0) * 100).toFixed(1)}%`}
          min={0} max={200}
          value={Math.round((frame.radius ?? 0) * 1000)}
          onChange={(value) => editor.setFrameRadius(value / 1000)}
          onCommit={editor.endGesture}
        />
      </Section>
    </div>
  )
}
