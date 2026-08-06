import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { PhotoCardEditor } from '../../hooks/usePhotoCardEditor'
import type { PhotoCardBinding } from '../../types/photoCard.types'
import { resolveLayerText } from '../../utils/resolveBindings'
import { Section } from './controls'

interface Props {
  editor: PhotoCardEditor
  onOpenSpiritPicker: () => void
}

/** EXIF·주류·직접 입력 — 카드에 얹을 "내용"을 모아 두는 도구. */
export default function DataPanel({ editor, onOpenSpiritPicker }: Props) {
  const { t } = useTranslation()

  const exifRows = useMemo(() => ([
    { key: 'EXIF_CAMERA' as const, label: t('photoCard.exifCamera') },
    { key: 'EXIF_LENS' as const, label: t('photoCard.exifLens') },
    { key: 'EXIF_APERTURE' as const, label: t('photoCard.exifAperture') },
    { key: 'EXIF_SHUTTER' as const, label: t('photoCard.exifShutter') },
    { key: 'EXIF_ISO' as const, label: t('photoCard.exifIso') },
    { key: 'EXIF_FOCAL_LENGTH' as const, label: t('photoCard.exifFocalLength') },
    { key: 'EXIF_FOCAL_LENGTH_35' as const, label: t('photoCard.exifFocalLength35') },
    { key: 'EXIF_SHOT_AT' as const, label: t('photoCard.exifShotAt') },
    { key: 'EXIF_GPS' as const, label: t('photoCard.exifGps') },
  ]), [t])

  /** 값이 있는 항목만 ＋ 를 띄운다 — 빈 값을 얹으면 카드에 아무것도 안 보인다. */
  const valueOf = (binding: PhotoCardBinding) => resolveLayerText(
    { id: 'probe', type: 'TEXT', position: { x: 0, y: 0 }, binding },
    editor.dataContext,
  )

  const addButton = (label: string, binding: PhotoCardBinding) => (
    <button
      type="button"
      onClick={() => editor.addBoundText(binding)}
      title={t('photoCard.addToCard')}
      aria-label={`${label} ${t('photoCard.addToCard')}`}
      className="shrink-0 rounded-md border border-primary-300 px-1.5 py-0.5 text-[11px] font-bold leading-none text-primary-700 hover:bg-primary-50"
    >
      ＋
    </button>
  )

  return (
    <div className="space-y-5">
      <Section title={t('photoCard.exifSection')} hint={t('photoCard.gpsNotice')}>
        {!editor.exif && (
          <p className="rounded-lg bg-neutral-50 px-3 py-3 text-[11px] font-medium leading-relaxed text-neutral-500">
            {t('photoCard.noExif')}
          </p>
        )}
        {editor.exif && (
          <div className="overflow-hidden rounded-lg border border-neutral-200">
            {exifRows.map((row) => {
              const value = valueOf(row.key)
              return (
                <div key={row.key} className="flex items-center gap-2 border-b border-neutral-100 px-3 py-1.5 text-xs last:border-b-0">
                  <span className="w-16 shrink-0 text-neutral-500">{row.label}</span>
                  <span className="min-w-0 flex-1 truncate font-semibold text-neutral-800">{value || '—'}</span>
                  {value && addButton(row.label, row.key)}
                </div>
              )
            })}
          </div>
        )}
      </Section>

      <Section title={t('photoCard.spiritSection')} hint={t('photoCard.spiritHint')}>
        <div className="flex gap-2">
          <input
            readOnly
            value={editor.spirit?.nameKo ?? ''}
            placeholder={t('photoCard.searchSpirit')}
            className="min-w-0 flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={onOpenSpiritPicker}
            className="shrink-0 rounded-lg border border-primary-300 px-3 py-2 text-xs font-bold text-primary-700 hover:bg-primary-50"
          >
            {t('photoCard.searchSpirit')}
          </button>
        </div>
        {editor.spirit && (
          <div className="space-y-2">
            {([
              ['nameKo', t('photoCard.spiritName')],
              ['nameEn', t('photoCard.spiritNameEn')],
              ['abv', t('photoCard.spiritAbv')],
              ['volumeMl', t('photoCard.spiritVolume')],
              ['producerNameKo', t('photoCard.producerName')],
            ] as const).map(([field, label]) => (
              <label key={field} className="block">
                <span className="mb-1 block text-[11px] font-medium text-neutral-500">{label}</span>
                <input
                  value={editor.spirit?.[field] ?? ''}
                  onChange={(event) => editor.setSpirit((current) => (
                    current ? { ...current, [field]: event.target.value } : current
                  ))}
                  className="w-full rounded-lg border border-neutral-300 px-2.5 py-1.5 text-xs"
                />
              </label>
            ))}
            <button
              type="button"
              onClick={() => editor.setSpirit(null)}
              className="text-[11px] font-semibold text-neutral-500 hover:text-red-600"
            >
              {t('photoCard.clearSpirit')}
            </button>
          </div>
        )}
      </Section>

    </div>
  )
}
