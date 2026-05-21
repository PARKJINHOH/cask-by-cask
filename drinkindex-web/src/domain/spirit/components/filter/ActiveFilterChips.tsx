import { useTranslation } from 'react-i18next'
import { localizeCountry } from '@/shared/utils/countryName'
import type {
  SpiritCategory, WhiskyStyle, WineType, CognacGrade,
} from '@/domain/spirit/types/spirit.types'

export interface ActiveFilterState {
  category:    SpiritCategory | ''
  whiskyStyle: WhiskyStyle | ''
  wineType:    WineType | ''
  cognacGrade: CognacGrade | ''
  country:     string
  region:      string
  minAbv:      number
  maxAbv:      number
  minScore:    number
  maxScore:    number
}

export interface ActiveFilterChipsProps {
  state: ActiveFilterState
  onClear: (key: keyof ActiveFilterState | 'abv' | 'score') => void
  onClearAll: () => void
}

interface Chip { key: string; label: string; onRemove: () => void }

export default function ActiveFilterChips({ state, onClear, onClearAll }: ActiveFilterChipsProps) {
  const { t, i18n } = useTranslation()

  const chips: Chip[] = []

  if (state.category) {
    chips.push({
      key: 'category',
      label: t(`spirit.category.${state.category}`),
      onRemove: () => onClear('category'),
    })
  }
  if (state.whiskyStyle) {
    chips.push({
      key: 'whiskyStyle',
      label: t(`spirit.whiskyStyle.${state.whiskyStyle}`),
      onRemove: () => onClear('whiskyStyle'),
    })
  }
  if (state.wineType) {
    chips.push({
      key: 'wineType',
      label: t(`spirit.wineType.${state.wineType}`),
      onRemove: () => onClear('wineType'),
    })
  }
  if (state.cognacGrade) {
    chips.push({
      key: 'cognacGrade',
      label: t(`spirit.cognacGrade.${state.cognacGrade}`),
      onRemove: () => onClear('cognacGrade'),
    })
  }
  if (state.country) {
    chips.push({
      key: 'country',
      label: localizeCountry(state.country, i18n.language),
      onRemove: () => onClear('country'),
    })
  }
  if (state.region) {
    chips.push({
      key: 'region',
      label: state.region,
      onRemove: () => onClear('region'),
    })
  }
  if (state.minAbv > 0 || state.maxAbv < 100) {
    chips.push({
      key: 'abv',
      label: `${t('spirit.filter.abv')}: ${state.minAbv}–${state.maxAbv}%`,
      onRemove: () => onClear('abv'),
    })
  }
  if (state.minScore > 0 || state.maxScore < 100) {
    chips.push({
      key: 'score',
      label: `${t('spirit.filter.score')}: ${state.minScore}–${state.maxScore}`,
      onRemove: () => onClear('score'),
    })
  }

  if (chips.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-1.5 mb-3 py-2 px-3 bg-neutral-50/70 rounded-lg">
      <span className="text-xs text-neutral-500 mr-1">
        {t('spirit.filter.activeTitle')}:
      </span>
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={chip.onRemove}
          className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-neutral-200
            rounded-full text-xs text-neutral-700 hover:border-danger-300 hover:text-danger-600
            transition-colors group"
        >
          <span>{chip.label}</span>
          <svg className="w-3 h-3 text-neutral-400 group-hover:text-danger-500"
            viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"/>
          </svg>
        </button>
      ))}
      <button
        type="button"
        onClick={onClearAll}
        className="ml-1 text-xs text-neutral-500 hover:text-danger-600 underline-offset-2
          hover:underline transition-colors"
      >
        {t('spirit.filter.resetAll')}
      </button>
    </div>
  )
}
