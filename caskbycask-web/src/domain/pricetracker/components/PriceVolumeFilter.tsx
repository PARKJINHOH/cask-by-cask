import { useTranslation } from 'react-i18next'
import type { PriceVolumeOption, VolumeSelection } from '../types/pricetracker.types'

interface Props {
  options: PriceVolumeOption[] | undefined
  value: VolumeSelection | null
  onChange: (value: VolumeSelection) => void
  isLoading?: boolean
}

export default function PriceVolumeFilter({ options, value, onChange, isLoading }: Props) {
  const { t } = useTranslation()

  if (isLoading) {
    return <div className="h-9 rounded-lg bg-neutral-100 animate-pulse" />
  }
  if (!options?.length) return null

  return (
    <div className="rounded-xl border border-neutral-200 bg-neutral-50/70 p-2.5">
      <div className="flex items-center gap-2">
        <span className="shrink-0 text-xs font-semibold text-neutral-500">
          {t('price.volume.filterLabel')}
        </span>
        <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:thin]">
          {options.map((option) => {
            const optionValue: VolumeSelection = option.volumeMl ?? 'UNKNOWN'
            const selected = value === optionValue
            return (
              <button
                key={optionValue}
                type="button"
                onClick={() => onChange(optionValue)}
                className={`inline-flex shrink-0 items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  selected
                    ? 'border-primary-700 bg-primary-700 text-white'
                    : 'border-neutral-200 bg-white text-neutral-600 hover:border-primary-300 hover:text-primary-700'
                }`}
              >
                <span>{option.volumeMl == null ? t('price.volume.unknown') : `${option.volumeMl.toLocaleString()}ml`}</span>
                <span className={selected ? 'text-white/70' : 'text-neutral-400'}>{option.count}</span>
              </button>
            )
          })}
        </div>
      </div>
      <p className="mt-1.5 text-[11px] text-neutral-400">{t('price.volume.filterHint')}</p>
    </div>
  )
}
