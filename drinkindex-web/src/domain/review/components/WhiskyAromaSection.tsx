import { useTranslation } from 'react-i18next'
import { WHISKY_AROMA_CATEGORIES } from '../constants/whiskyAromas'

interface WhiskyAromaSectionProps {
  selected: string[]
  onChange: (selected: string[]) => void
}

export default function WhiskyAromaSection({ selected, onChange }: WhiskyAromaSectionProps) {
  const { t, i18n } = useTranslation()
  const isEn = i18n.language === 'en'

  const toggle = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id))
    } else {
      onChange([...selected, id])
    }
  }

  return (
    <div className="bg-neutral-50 rounded-2xl p-4 space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-neutral-700">
          {t('review.aromaWheel')}
        </span>
        <span className="text-xs text-neutral-400">({t('review.optional')})</span>
      </div>

      <div className="space-y-3">
        {WHISKY_AROMA_CATEGORIES.map((category) => (
          <div key={category.id}>
            <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-2">
              {isEn ? category.en : category.ko}
            </p>
            <div className="flex flex-wrap gap-2">
              {category.items.map((item) => {
                const isSelected = selected.includes(item.id)
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggle(item.id)}
                    className={[
                      'flex flex-col items-center justify-center',
                      'w-[4.5rem] py-2 rounded-xl border transition-all',
                      'touch-manipulation select-none active:scale-95',
                      isSelected
                        ? 'border-amber-400 bg-amber-50 shadow-sm ring-1 ring-amber-300'
                        : 'border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50',
                    ].join(' ')}
                  >
                    <span className="text-xl leading-none">{item.icon}</span>
                    <span className={[
                      'text-[11px] font-medium mt-1 leading-tight text-center',
                      isSelected ? 'text-amber-700' : 'text-neutral-700',
                    ].join(' ')}>
                      {item.ko}
                    </span>
                    <span className="text-[9px] text-neutral-400 leading-tight text-center">
                      {item.en}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {selected.length > 0 && (
        <p className="text-xs text-amber-700 font-medium">
          {t('review.aromaSelected', { count: selected.length })}
        </p>
      )}
    </div>
  )
}
