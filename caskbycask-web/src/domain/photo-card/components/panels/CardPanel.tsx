import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  designBaseSizeOf, formatRatio, parseRatio,
  PHOTO_CARD_DESIGN_SHORT_SIDE, PHOTO_CARD_MAX_RATIO_SIDE, PHOTO_CARD_RATIOS,
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

  /** 올려 둔 사진의 비율. 사진이 없으면 맞출 대상이 없다. */
  const photoRatio = editor.photoImage
    ? formatRatio(editor.photoImage.naturalWidth, editor.photoImage.naturalHeight)
    : null

  /**
   * 직접 적는 비율.
   *
   * 적는 동안에는 카드를 건드리지 않고 여기에만 담아 둔다 — 한 글자마다 비율이 바뀌면
   * "16" 을 적는 사이에 1:9 로 한 번, 16:9 로 또 한 번 요소가 재배치된다.
   * 중간 비율을 거쳐 옮겨진 요소는 곧바로 16:9 로 갔을 때와 자리가 다르다.
   */
  const [ratioDraft, setRatioDraft] = useState(() => parseRatio(frame.ratio) ?? { width: 4, height: 5 })
  useEffect(() => {
    const parsed = parseRatio(frame.ratio)
    if (parsed) setRatioDraft(parsed)
  }, [frame.ratio])
  // 적은 그대로가 아니라 정리된 값(8:10 → 4:5, 상·하한 밖은 잘라 낸 값)이 카드에 들어간다.
  const draftRatio = formatRatio(ratioDraft.width, ratioDraft.height)

  const setExtend = (side: ExtendSide, px: number) => {
    const value = toRatio(px)
    editor.setFrameExtend(
      linked ? { top: value, right: value, bottom: value, left: value } : { [side]: value },
    )
  }

  return (
    <div className="space-y-5">
      <Section title={t('photoCard.ratio')} hint={t('photoCard.ratioHint')}>
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

        <p className="flex justify-between text-[11px] font-medium text-neutral-500">
          {t('photoCard.ratioCurrent')}
          <span className="font-mono text-neutral-600">{frame.ratio}</span>
        </p>

        {/* 사진에 맞춤 — 액자(사진 도구의 '사진에 맞춤')가 아니라 카드 자체를 사진 비율로 만든다.
            사방에 띠가 남지 않는 대신 아래 정보 밴드 자리도 없어진다. */}
        <PanelButton
          onClick={() => { if (photoRatio) editor.changeRatio(photoRatio) }}
          disabled={!photoRatio || photoRatio === frame.ratio}
        >
          {photoRatio ? `${t('photoCard.ratioFitPhoto')} · ${photoRatio}` : t('photoCard.ratioFitPhoto')}
        </PanelButton>

        <div className="grid grid-cols-2 gap-2">
          <NumberField
            label={t('photoCard.ratioWidth')}
            min={1}
            max={PHOTO_CARD_MAX_RATIO_SIDE}
            value={ratioDraft.width}
            onChange={(width) => setRatioDraft((current) => ({ ...current, width }))}
          />
          <NumberField
            label={t('photoCard.ratioHeight')}
            min={1}
            max={PHOTO_CARD_MAX_RATIO_SIDE}
            value={ratioDraft.height}
            onChange={(height) => setRatioDraft((current) => ({ ...current, height }))}
          />
        </div>
        <PanelButton
          onClick={() => { if (draftRatio) editor.changeRatio(draftRatio) }}
          disabled={!draftRatio || draftRatio === frame.ratio}
        >
          {draftRatio ? `${t('photoCard.ratioApply')} · ${draftRatio}` : t('photoCard.ratioApply')}
        </PanelButton>
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
