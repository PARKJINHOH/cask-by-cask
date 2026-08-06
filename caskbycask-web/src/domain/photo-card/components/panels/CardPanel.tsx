import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  designBaseSizeOf, PHOTO_CARD_DESIGN_SHORT_SIDE, PHOTO_CARD_RATIOS,
} from '../../constants/photoCardRatios'
import type { PhotoCardEditor } from '../../hooks/usePhotoCardEditor'
import type { PhotoCardPadding } from '../../types/photoCard.types'
import { PHOTO_CARD_MAX_EXTEND } from '../../utils/layoutSchema'
import { ColorField, NumberField, PanelButton, Section, SliderField } from './controls'

type ExtendSide = keyof PhotoCardPadding

const SIDES: { key: ExtendSide; labelKey: string }[] = [
  { key: 'top', labelKey: 'photoCard.extendTop' },
  { key: 'right', labelKey: 'photoCard.extendRight' },
  { key: 'bottom', labelKey: 'photoCard.extendBottom' },
  { key: 'left', labelKey: 'photoCard.extendLeft' },
]

const NO_EXTEND: PhotoCardPadding = { top: 0, right: 0, bottom: 0, left: 0 }

/** 확장 입력은 px 로 받고 저장은 비율로 한다 — 기준은 짧은 변 PHOTO_CARD_DESIGN_SHORT_SIDE px. */
const toPx = (value: number) => Math.round(value * PHOTO_CARD_DESIGN_SHORT_SIDE)
const toRatio = (px: number) => px / PHOTO_CARD_DESIGN_SHORT_SIDE

/** 카드 도구 — 비율·크기·배경·모서리처럼 카드 전체에 걸리는 것. */
export default function CardPanel({ editor }: { editor: PhotoCardEditor }) {
  const { t } = useTranslation()
  const [linked, setLinked] = useState(false)
  const { frame } = editor.layout

  const extend = frame.extend ?? NO_EXTEND
  const extended = SIDES.some((side) => (extend[side.key] ?? 0) > 0)
  const base = designBaseSizeOf(frame.ratio)
  const cardWidth = base.width + toPx(extend.left) + toPx(extend.right)
  const cardHeight = base.height + toPx(extend.top) + toPx(extend.bottom)

  const setExtend = (side: ExtendSide, px: number) => {
    const value = toRatio(px)
    editor.setFrameExtend(
      linked ? { top: value, right: value, bottom: value, left: value } : { [side]: value },
    )
  }

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

      {/* 카드 크기 — 비율 프리셋 바깥으로 카드를 넓힌다.
          사진 여백(사진 도구)과 다르다: 여백은 사진을 줄이고, 이쪽은 카드를 키운다. */}
      <Section title={t('photoCard.cardSizeSection')} hint={t('photoCard.cardSizeHint')}>
        <p className="flex justify-between text-[11px] font-medium text-neutral-500">
          {t('photoCard.cardSizeCurrent')}
          <span className="font-mono text-neutral-600">{`${cardWidth} × ${cardHeight} px`}</span>
        </p>
        <label className="flex items-center gap-1.5 text-[11px] font-medium text-neutral-500">
          <input
            type="checkbox"
            checked={linked}
            onChange={(event) => setLinked(event.target.checked)}
            className="h-3.5 w-3.5 accent-primary-600"
          />
          {t('photoCard.extendLinked')}
        </label>
        <div className="grid grid-cols-2 gap-2">
          {SIDES.map((side) => (
            <NumberField
              key={side.key}
              label={t(side.labelKey)}
              suffix="px"
              min={0}
              max={toPx(PHOTO_CARD_MAX_EXTEND)}
              step={10}
              value={toPx(extend[side.key] ?? 0)}
              onChange={(value) => setExtend(side.key, value)}
              onCommit={editor.endGesture}
            />
          ))}
        </div>
        <PanelButton
          onClick={() => editor.setFrameExtend(NO_EXTEND)}
          disabled={!extended}
        >
          {t('photoCard.cardSizeReset')}
        </PanelButton>
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
