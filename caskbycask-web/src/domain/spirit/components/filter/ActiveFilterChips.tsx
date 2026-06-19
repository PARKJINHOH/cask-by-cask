import { useTranslation } from 'react-i18next'
import { localizeCountry } from '@/shared/utils/countryName'
import type {
  SpiritCategory, WhiskyStyle, WineType, CognacGrade,
  WineSweetness, WineBody, WineIntensity,
} from '@/domain/spirit/types/spirit.types'

export interface ActiveFilterState {
  category:    SpiritCategory | ''
  whiskyStyle: WhiskyStyle[]
  wineType:    WineType[]
  cognacGrade: CognacGrade[]
  wineSweetness: WineSweetness[]
  wineBody:    WineBody[]
  wineAcidity: WineIntensity[]
  wineTannin:  WineIntensity[]
  country:     string
  region:      string
  minAbv:      number
  maxAbv:      number
  minScore:    number
  maxScore:    number
}

export interface ActiveFilterChipsProps {
  state: ActiveFilterState
  // value: 다중선택 키(whiskyStyle/wineType/cognacGrade)에서 특정 항목 1개만 제거할 때 사용.
  // 생략 시 해당 키 전체 클리어.
  onClear: (key: keyof ActiveFilterState | 'abv' | 'score', value?: string) => void
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
  state.whiskyStyle.forEach((v) => {
    chips.push({
      key: `whiskyStyle:${v}`,
      label: t(`spirit.whiskyStyle.${v}`),
      onRemove: () => onClear('whiskyStyle', v),
    })
  })
  state.wineType.forEach((v) => {
    chips.push({
      key: `wineType:${v}`,
      label: t(`spirit.wineType.${v}`),
      onRemove: () => onClear('wineType', v),
    })
  })
  state.cognacGrade.forEach((v) => {
    chips.push({
      key: `cognacGrade:${v}`,
      label: t(`spirit.cognacGrade.${v}`),
      onRemove: () => onClear('cognacGrade', v),
    })
  })
  state.wineSweetness.forEach((v) => {
    chips.push({
      key: `wineSweetness:${v}`,
      label: `${t('spirit.filter.sweetness')}: ${t(`spirit.wineSweetness.${v}`)}`,
      onRemove: () => onClear('wineSweetness', v),
    })
  })
  state.wineBody.forEach((v) => {
    chips.push({
      key: `wineBody:${v}`,
      label: `${t('spirit.filter.body')}: ${t(`spirit.wineBody.${v}`)}`,
      onRemove: () => onClear('wineBody', v),
    })
  })
  state.wineAcidity.forEach((v) => {
    chips.push({
      key: `wineAcidity:${v}`,
      label: `${t('spirit.filter.acidity')}: ${t(`spirit.wineIntensity.${v}`)}`,
      onRemove: () => onClear('wineAcidity', v),
    })
  })
  state.wineTannin.forEach((v) => {
    chips.push({
      key: `wineTannin:${v}`,
      label: `${t('spirit.filter.tannin')}: ${t(`spirit.wineIntensity.${v}`)}`,
      onRemove: () => onClear('wineTannin', v),
    })
  })
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
    <div className="mb-4 flex flex-wrap items-center gap-2 bg-neutral-50/70 border border-neutral-200
      rounded-lg px-3 py-2.5">
      <span className="text-xs font-medium text-neutral-500 mr-1">
        {t('spirit.filter.activeTitle')}
      </span>
      <div className="flex flex-wrap gap-1.5">
        {chips.map((chip) => (
          <span
            key={chip.key}
            className="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-1 rounded-full bg-white
              border border-neutral-200 text-xs font-medium text-neutral-700"
          >
            {chip.label}
            <button
              type="button"
              onClick={chip.onRemove}
              aria-label={chip.label}
              className="w-4 h-4 rounded-full flex items-center justify-center text-neutral-400
                hover:bg-neutral-100 hover:text-danger-600 transition-colors"
            >
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </span>
        ))}
      </div>
      <button
        type="button"
        onClick={onClearAll}
        className="ml-auto text-xs font-medium text-danger-600 hover:text-danger-700
          hover:underline transition-colors"
      >
        {t('spirit.filter.resetAll')}
      </button>
    </div>
  )
}
