import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { PhotoCardEditor } from '../../hooks/usePhotoCardEditor'
import type { PhotoCardPadding, PhotoCardPhotoFit } from '../../types/photoCard.types'
import { ColorField, PanelButton, Section, SegmentedField, SliderField } from './controls'

interface Props {
  editor: PhotoCardEditor
  onPickPhoto: () => void
  onEditPhoto: () => void
}

type PaddingSide = keyof PhotoCardPadding

const SIDES: { key: PaddingSide; labelKey: string }[] = [
  { key: 'top', labelKey: 'photoCard.paddingTop' },
  { key: 'right', labelKey: 'photoCard.paddingRight' },
  { key: 'bottom', labelKey: 'photoCard.paddingBottom' },
  { key: 'left', labelKey: 'photoCard.paddingLeft' },
]

/** 사진 도구 — 원본 사진과 액자에 관한 모든 것. */
export default function PhotoPanel({ editor, onPickPhoto, onEditPhoto }: Props) {
  const { t } = useTranslation()
  const [linked, setLinked] = useState(false)
  const [showArea, setShowArea] = useState(false)

  const { frame } = editor.layout
  const hasPhoto = Boolean(editor.photoImage)
  const zoomed = editor.photoTransform.scale > 1

  const setPadding = (side: PaddingSide, value: number) => {
    editor.setFramePadding(
      linked ? { top: value, right: value, bottom: value, left: value } : { [side]: value },
    )
  }

  /**
   * 값 동기화를 켜면 그 자리에서 네 변을 '위' 값에 맞춘다.
   *
   * 켜 두기만 하고 값이 그대로면 "동기화"라는 말과 화면이 어긋난다 —
   * 슬라이더를 하나 만지기 전까지는 아무 일도 일어나지 않아 켜졌는지조차 알 수 없다.
   * 기준을 '위'로 잡는 것은 목록에서 맨 처음 보이는 값이기 때문이다(되돌리기 한 단계로 취소된다).
   */
  const toggleLinked = (next: boolean) => {
    setLinked(next)
    if (!next) return
    const base = frame.padding.top ?? 0
    editor.setFramePadding(
      { top: base, right: base, bottom: base, left: base }, 'frame:paddingLink',
    )
    editor.endGesture()
  }

  return (
    <div className="space-y-5">
      <Section title={t('photoCard.tabPhoto')}>
        <PanelButton onClick={onPickPhoto}>
          {hasPhoto ? t('photoCard.changePhoto') : t('photoCard.uploadPhoto')}
        </PanelButton>
        <PanelButton onClick={onEditPhoto} disabled={!editor.photoFile}>
          {t('photoCard.editPhoto')}
        </PanelButton>
      </Section>

      <Section title={t('photoCard.photoZoomSection')} hint={t('photoCard.photoZoomHint')}>
        <SliderField
          label={t('photoCard.photoZoom')}
          display={`${editor.photoTransform.scale.toFixed(2)}×`}
          min={100} max={400}
          disabled={!hasPhoto}
          value={Math.round(editor.photoTransform.scale * 100)}
          onChange={(value) => editor.patchPhotoTransform({ scale: value / 100 }, 'photo:zoom')}
          onCommit={editor.endGesture}
        />
        <SliderField
          label={t('photoCard.photoOffsetX')}
          display={`${Math.round(editor.photoTransform.offsetX * 100)}%`}
          min={-100} max={100}
          disabled={!hasPhoto || !zoomed}
          value={Math.round(editor.photoTransform.offsetX * 100)}
          onChange={(value) => editor.patchPhotoTransform({ offsetX: value / 100 }, 'photo:offset')}
          onCommit={editor.endGesture}
        />
        <SliderField
          label={t('photoCard.photoOffsetY')}
          display={`${Math.round(editor.photoTransform.offsetY * 100)}%`}
          min={-100} max={100}
          disabled={!hasPhoto || !zoomed}
          value={Math.round(editor.photoTransform.offsetY * 100)}
          onChange={(value) => editor.patchPhotoTransform({ offsetY: value / 100 }, 'photo:offset')}
          onCommit={editor.endGesture}
        />
        <PanelButton onClick={editor.resetPhotoTransform} disabled={!hasPhoto}>
          {t('photoCard.photoTransformReset')}
        </PanelButton>
      </Section>

      <Section title={t('photoCard.photoFitSection')} hint={t('photoCard.photoFitHint')}>
        <SegmentedField<PhotoCardPhotoFit>
          value={frame.photo.fit}
          options={[
            { value: 'COVER', label: t('photoCard.photoFitCover') },
            { value: 'CONTAIN', label: t('photoCard.photoFitContain') },
          ]}
          onChange={editor.setPhotoFit}
        />
        <PanelButton onClick={editor.fitPhotoArea} disabled={!hasPhoto}>
          {t('photoCard.fitPhotoArea')}
        </PanelButton>
        <p className="text-[11px] font-medium leading-relaxed text-neutral-500">{t('photoCard.fitPhotoAreaHint')}</p>
        <SliderField
          label={t('photoCard.photoCorner')}
          display={`${((frame.photo.radius ?? 0) * 100).toFixed(1)}%`}
          min={0} max={200}
          value={Math.round((frame.photo.radius ?? 0) * 1000)}
          onChange={(value) => editor.setPhotoRadius(value / 1000)}
          onCommit={editor.endGesture}
        />
      </Section>

      {/* 요청 5번 — 사진의 여백. 이 값이 곧 사진 아래 정보 밴드의 높이가 된다. */}
      <Section title={t('photoCard.paddingSection')} hint={t('photoCard.paddingHint')}>
        <label className="flex items-center gap-1.5 text-[11px] font-medium text-neutral-500">
          <input
            type="checkbox"
            checked={linked}
            onChange={(event) => toggleLinked(event.target.checked)}
            className="h-3.5 w-3.5 accent-primary-600"
          />
          {t('photoCard.paddingLinked')}
        </label>
        {SIDES.map((side) => (
          <SliderField
            key={side.key}
            label={t(side.labelKey)}
            display={`${((frame.padding[side.key] ?? 0) * 100).toFixed(1)}%`}
            min={0} max={500}
            value={Math.round((frame.padding[side.key] ?? 0) * 1000)}
            onChange={(value) => setPadding(side.key, value / 1000)}
            onCommit={editor.endGesture}
          />
        ))}
      </Section>

      <Section title={t('photoCard.photoAreaSection')}>
        <button
          type="button"
          onClick={() => setShowArea((current) => !current)}
          className="text-[11px] font-semibold text-primary-700 hover:underline"
        >
          {showArea ? t('photoCard.collapse') : t('photoCard.expand')}
        </button>
        {showArea && (
          <div className="space-y-2.5 rounded-lg border border-neutral-200 p-2.5">
            <p className="text-[11px] font-medium leading-relaxed text-neutral-500">{t('photoCard.photoAreaHint')}</p>
            <div className="grid grid-cols-2 gap-2">
              <SliderField
                label={t('photoCard.photoAreaWidth')}
                display={`${Math.round(frame.photo.w * 100)}%`}
                min={10} max={100}
                value={Math.round(frame.photo.w * 100)}
                onChange={(value) => editor.patchPhoto({ w: value / 100 }, 'photo:area')}
                onCommit={editor.endGesture}
              />
              <SliderField
                label={t('photoCard.photoAreaHeight')}
                display={`${Math.round(frame.photo.h * 100)}%`}
                min={10} max={100}
                value={Math.round(frame.photo.h * 100)}
                onChange={(value) => editor.patchPhoto({ h: value / 100 }, 'photo:area')}
                onCommit={editor.endGesture}
              />
              <SliderField
                label={t('photoCard.photoAreaX')}
                display={`${Math.round(frame.photo.x * 100)}%`}
                min={0} max={100}
                value={Math.round(frame.photo.x * 100)}
                onChange={(value) => editor.patchPhoto({ x: value / 100 }, 'photo:area')}
                onCommit={editor.endGesture}
              />
              <SliderField
                label={t('photoCard.photoAreaY')}
                display={`${Math.round(frame.photo.y * 100)}%`}
                min={0} max={100}
                value={Math.round(frame.photo.y * 100)}
                onChange={(value) => editor.patchPhoto({ y: value / 100 }, 'photo:area')}
                onCommit={editor.endGesture}
              />
            </div>
          </div>
        )}
      </Section>

      <Section title={t('photoCard.backgroundSection')} hint={t('photoCard.backgroundHint')}>
        <ColorField
          label={t('photoCard.backgroundColor')}
          value={frame.backgroundColor}
          presets
          onChange={editor.setBackgroundColor}
        />
      </Section>
    </div>
  )
}
