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
      <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">
        {t('spirit.filter.category')}
      </h3>
      <ul className="space-y-1">
        {CATEGORIES.map((cat) => {
          const isExpanded = p.category === cat
          return (
            <li key={cat}>
              <button
                type="button"
                onClick={() => handleCategoryClick(cat)}
                className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md text-sm
                  transition-colors group
                  ${isExpanded
                    ? 'bg-primary-50 text-primary-900 font-medium'
                    : 'text-neutral-700 hover:bg-neutral-50'}`}
                aria-expanded={isExpanded}
              >
                <span className="flex items-center gap-2">
                  <svg
                    className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-90' : ''}
                      text-neutral-400 group-hover:text-neutral-600`}
                    viewBox="0 0 20 20" fill="currentColor"
                  >
                    <path fillRule="evenodd"
                      d="M7.293 4.293a1 1 0 011.414 0L14 9.586l-5.293 5.293a1 1 0 01-1.414-1.414L11.172 9.586 7.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"/>
                  </svg>
                  {t(`spirit.category.${cat}`)}
                </span>
              </button>

              {isExpanded && cat === 'WHISKY' && (
                <SubList
                  values={WHISKY_STYLES}
                  current={p.whiskyStyle}
                  onToggle={(v) => p.onWhiskyStyle(toggle(p.whiskyStyle, v))}
                  labelKey="spirit.whiskyStyle"
                />
              )}
              {isExpanded && cat === 'WINE' && (
                <SubList
                  values={WINE_TYPES}
                  current={p.wineType}
                  onToggle={(v) => p.onWineType(toggle(p.wineType, v))}
                  labelKey="spirit.wineType"
                />
              )}
              {isExpanded && cat === 'COGNAC' && (
                <SubList
                  values={COGNAC_GRADES}
                  current={p.cognacGrade}
                  onToggle={(v) => p.onCognacGrade(toggle(p.cognacGrade, v))}
                  labelKey="spirit.cognacGrade"
                />
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

interface SubListProps<T extends string> {
  values: T[]
  current: T[]
  onToggle: (v: T) => void
  labelKey: string
}

function SubList<T extends string>({ values, current, onToggle, labelKey }: SubListProps<T>) {
  const { t } = useTranslation()
  return (
    <ul className="mt-1 ml-5 space-y-0.5 border-l border-neutral-200 pl-2">
      {values.map((v) => {
        const checked = current.includes(v)
        return (
          <li key={v}>
            <label className="flex items-center gap-2 px-2 py-1 rounded-md cursor-pointer
              hover:bg-neutral-50 group">
              <input
                type="checkbox"
                className="w-3.5 h-3.5 rounded border-neutral-300 text-primary-800
                  focus:ring-primary-400 focus:ring-offset-0"
                checked={checked}
                onChange={() => onToggle(v)}
              />
              <span className={`text-sm ${checked
                ? 'text-primary-900 font-medium' : 'text-neutral-600 group-hover:text-neutral-900'}`}>
                {t(`${labelKey}.${v}`)}
              </span>
            </label>
          </li>
        )
      })}
    </ul>
  )
}
