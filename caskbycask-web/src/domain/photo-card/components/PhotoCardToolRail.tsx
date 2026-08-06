import { useTranslation } from 'react-i18next'
import { PHOTO_CARD_TOOLS, type PhotoCardTool } from '../constants/photoCardTools'

interface Props {
  value: PhotoCardTool
  onChange: (tool: PhotoCardTool) => void
}

/**
 * 도구 레일.
 *
 * 데스크톱은 왼쪽 세로 기둥, 모바일은 화면 맨 아래 가로 바다 —
 * 손이 닿는 자리가 다르기 때문이지, 항목이 다르기 때문이 아니다. 목록은 하나로 둔다.
 */
export default function PhotoCardToolRail({ value, onChange }: Props) {
  const { t } = useTranslation()

  return (
    <nav
      aria-label={t('photoCard.toolSection')}
      className="di-photo-card-rail order-3 flex shrink-0 gap-1 overflow-x-auto border-t border-neutral-200 bg-white p-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom))] lg:order-1 lg:w-[76px] lg:flex-col lg:overflow-x-hidden lg:overflow-y-auto lg:border-r lg:border-t-0 lg:pb-1.5"
    >
      {PHOTO_CARD_TOOLS.map((tool) => (
        <button
          key={tool.key}
          type="button"
          title={t(tool.labelKey)}
          aria-pressed={value === tool.key}
          onClick={() => onChange(tool.key)}
          className={`flex shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg px-2 py-2 text-[11.5px] font-semibold transition-colors lg:w-full ${
            tool.separated ? 'lg:mt-auto' : ''
          } ${
            value === tool.key
              ? 'bg-primary-600 text-white'
              : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800'
          }`}
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
            <path d={tool.path} />
          </svg>
          <span className="whitespace-nowrap">{t(tool.labelKey)}</span>
        </button>
      ))}
    </nav>
  )
}
