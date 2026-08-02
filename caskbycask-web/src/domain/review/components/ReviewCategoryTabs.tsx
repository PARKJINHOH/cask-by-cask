import { useTranslation } from 'react-i18next'
import type { SpiritCategory } from '@/domain/spirit/types/spirit.types'
import type { UserReviewCategoryCounts } from '../types/review.types'

const CATEGORY_TABS: SpiritCategory[] = ['WHISKY', 'COGNAC', 'WINE', 'OTHER']

interface Props {
  value: SpiritCategory | null
  onChange: (next: SpiritCategory | null) => void
  /** 카테고리별 개수 배지. 없으면 배지를 숨기고 모든 탭을 활성화한다. */
  counts?: UserReviewCategoryCounts
  className?: string
}

/** 주류 카테고리 필터 탭 — 개수가 0인 카테고리는 선택 불가로 표시한다. */
export default function ReviewCategoryTabs({ value, onChange, counts, className = '' }: Props) {
  const { t } = useTranslation()
  const hasCounts = counts !== undefined
  const total = counts?.total ?? 0

  const tabCls = (isActive: boolean, isDisabled: boolean) =>
    `flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-full transition-all duration-200
    ${isDisabled
      ? 'bg-neutral-50 text-neutral-300 cursor-not-allowed'
      : isActive
        ? 'bg-primary-800 text-white shadow-sm cursor-pointer'
        : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 hover:text-neutral-900 cursor-pointer'}`

  const badgeCls = (isActive: boolean, isDisabled: boolean) =>
    `text-xs font-bold tabular-nums ${isDisabled
      ? 'text-neutral-300'
      : isActive ? 'text-white/80' : 'text-neutral-400'}`

  return (
    <div
      role="tablist"
      aria-label={t('mypage.reviews.categoryFilter')}
      className={`flex gap-2 overflow-x-auto no-scrollbar flex-nowrap scroll-smooth lg:flex-wrap lg:overflow-visible ${className}`}
    >
      <button
        type="button"
        role="tab"
        onClick={() => onChange(null)}
        aria-selected={value === null}
        className={tabCls(value === null, false)}
      >
        {t('common.all')}
        {hasCounts && <span className={badgeCls(value === null, false)}>{total}</span>}
      </button>
      {CATEGORY_TABS.map((category) => {
        const count = counts?.counts?.[category] ?? 0
        const isActive = value === category
        const isDisabled = hasCounts && count === 0 && !isActive
        return (
          <button
            key={category}
            type="button"
            role="tab"
            disabled={isDisabled}
            onClick={() => onChange(category)}
            aria-selected={isActive}
            className={tabCls(isActive, isDisabled)}
          >
            {t(`spirit.category.${category}`)}
            {hasCounts && <span className={badgeCls(isActive, isDisabled)}>{count}</span>}
          </button>
        )
      })}
    </div>
  )
}
