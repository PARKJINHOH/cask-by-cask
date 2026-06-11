import { useTranslation } from 'react-i18next'
import type {
  SpiritCategory, WhiskyStyle, WineType, CognacGrade,
} from '@/domain/spirit/types/spirit.types'

const WHISKY_STYLES: WhiskyStyle[] = [
  'SINGLE_MALT', 'BLENDED_MALT', 'BLENDED_WHISKY',
  'BOURBON', 'TENNESSEE', 'RYE', 'POT_STILL', 'GRAIN_CORN',
]
const WINE_TYPES: WineType[] = ['RED', 'WHITE', 'ROSE', 'SPARKLING', 'DESSERT', 'ORANGE', 'FORTIFIED']
const COGNAC_GRADES: CognacGrade[] = ['VS', 'NAPOLEON', 'VSOP', 'XO', 'XXO', 'HORS_DAGE']

const CATEGORIES: SpiritCategory[] = ['WHISKY', 'COGNAC', 'WINE', 'OTHER']

export interface CategoryTreeProps {
  category:     SpiritCategory | ''
  whiskyStyle:  WhiskyStyle[]
  wineType:     WineType[]
  cognacGrade:  CognacGrade[]
  onCategory:   (v: SpiritCategory | '') => void
  onWhiskyStyle: (v: WhiskyStyle[]) => void
  onWineType:   (v: WineType[]) => void
  onCognacGrade: (v: CognacGrade[]) => void
}

function toggle<T>(arr: T[], v: T): T[] {
  return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]
}

export default function CategoryTree(p: CategoryTreeProps) {
  const { t } = useTranslation()

  const handleCategoryClick = (cat: SpiritCategory) => {
    // 부모의 onCategory 가 단일 setParam 에서 category + 서브타입 + region 을 함께 갱신.
    p.onCategory(p.category === cat ? '' : cat)
  }

  return (
    <div>
      <h3 className="text-sm font-bold text-neutral-900 mb-2">
        {t('spirit.filter.category')}
      </h3>
      <div className="space-y-1">
        {CATEGORIES.map((cat) => {
          const isExpanded = p.category === cat
          const hasSub = cat !== 'OTHER'
          return (
            <div key={cat} className={`rounded-xl ${isExpanded ? 'bg-primary-50' : ''}`}>
              <button
                type="button"
                onClick={() => handleCategoryClick(cat)}
                aria-expanded={isExpanded}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm
                  font-medium transition-colors
                  ${isExpanded ? 'text-primary-900' : 'text-neutral-700 hover:bg-neutral-50'}`}
              >
                <span>{t(`spirit.category.${cat}`)}</span>
                {hasSub && (
                  <svg
                    className={`w-4 h-4 text-neutral-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round"
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                )}
              </button>

              {isExpanded && cat === 'WHISKY' && (
                <SubChips
                  values={WHISKY_STYLES}
                  current={p.whiskyStyle}
                  onToggle={(v) => p.onWhiskyStyle(toggle(p.whiskyStyle, v))}
                  labelKey="spirit.whiskyStyle"
                />
              )}
              {isExpanded && cat === 'WINE' && (
                <SubChips
                  values={WINE_TYPES}
                  current={p.wineType}
                  onToggle={(v) => p.onWineType(toggle(p.wineType, v))}
                  labelKey="spirit.wineType"
                />
              )}
              {isExpanded && cat === 'COGNAC' && (
                <SubChips
                  values={COGNAC_GRADES}
                  current={p.cognacGrade}
                  onToggle={(v) => p.onCognacGrade(toggle(p.cognacGrade, v))}
                  labelKey="spirit.cognacGrade"
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

interface SubChipsProps<T extends string> {
  values: T[]
  current: T[]
  onToggle: (v: T) => void
  labelKey: string
}

function SubChips<T extends string>({ values, current, onToggle, labelKey }: SubChipsProps<T>) {
  const { t } = useTranslation()
  return (
    <div className="px-3 pb-3 pt-1 flex flex-wrap gap-1.5">
      {values.map((v) => {
        const active = current.includes(v)
        return (
          <button
            key={v}
            type="button"
            onClick={() => onToggle(v)}
            aria-pressed={active}
            className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors
              ${active
                ? 'bg-primary-800 border-primary-800 text-white'
                : 'bg-white border-neutral-200 text-neutral-600 hover:border-primary-300'}`}
          >
            {t(`${labelKey}.${v}`)}
          </button>
        )
      })}
    </div>
  )
}
