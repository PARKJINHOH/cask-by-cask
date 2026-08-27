import { memo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Spinner from '@/shared/components/Spinner'
import { useChromeTop } from '@/shared/hooks/useChromeTop'
import { formatScore, optionalScoreColor } from '@/shared/utils/format'
import type { SpiritCategory } from '@/domain/spirit/types/spirit.types'
import { useMyReviews } from '../hooks/useReviews'
import type { ReviewItem } from '../types/review.types'
import { reviewCommentToText } from '../utils/reviewRichText'
import { reviewSpiritLabel } from '../utils/reviewDisplay'
import MyPastReviewDetailModal from './MyPastReviewDetailModal'

const MY_REVIEWS_PATH = '/mypage?tab=reviews'

export interface MyPastReviewsPanelProps {
  /** 지금 작성 중인 주류의 카테고리 — 같은 카테고리 리뷰만 보여준다. */
  spiritCategory?: SpiritCategory | null
  /** 수정 중인 리뷰 자신은 참고 목록에서 뺀다. */
  excludeReviewId?: number | null
  /**
   * 지금 폼에 입력 중인 점수 — 상세 모달에서 과거 점수와 나란히 비교한다.
   * 객체가 아니라 낱개 숫자로 받는다: memo 의 얕은 비교가 통해야 노트 타이핑마다 다시 그리지 않는다.
   */
  currentNoseScore?: number | null
  currentTasteScore?: number | null
  currentFinishScore?: number | null
}

function PastReviewRow({
  review, isEn, onSelect,
}: {
  review: ReviewItem
  isEn: boolean
  onSelect: (review: ReviewItem) => void
}) {
  const { title, editionValue } = reviewSpiritLabel(review, isEn)
  // 한 줄 미리보기라 서식을 살릴 자리가 없다 — 본문만 뽑아 쓴다.
  const snippet = reviewCommentToText(review.comment).trim()
    || review.tasteNote
    || review.noseNote
    || review.finishNote
    || ''

  return (
    <button
      type="button"
      onClick={() => onSelect(review)}
      className="block w-full rounded-lg border border-neutral-100 px-3 py-2 text-left transition-colors
        hover:border-primary-200 hover:bg-primary-50/40"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="min-w-0 flex-1 truncate text-xs font-semibold text-neutral-800">
          {title}{editionValue ? ` · ${editionValue}` : ''}
        </p>
        <span
          className="flex-shrink-0 text-sm font-bold tabular-nums"
          style={{ color: optionalScoreColor(review.totalScore) }}
        >
          {formatScore(review.totalScore)}
        </span>
      </div>
      {snippet && (
        <p className="mt-0.5 line-clamp-1 text-[11px] leading-relaxed text-neutral-400">{snippet}</p>
      )}
    </button>
  )
}

/**
 * 리뷰 작성·수정 중 참고용으로 띄우는 내 과거 점수 목록.
 *
 * 점수는 내가 다른 주류에 매긴 점수를 기준으로 상대적으로 정해지므로, 페이지를 벗어나지 않고
 * 곧바로 비교할 수 있어야 한다. 이동을 유발하는 링크를 두지 않는 것도 같은 이유다.
 */
function MyPastReviewsPanel({
  spiritCategory,
  excludeReviewId,
  currentNoseScore,
  currentTasteScore,
  currentFinishScore,
}: MyPastReviewsPanelProps) {
  const { t, i18n } = useTranslation()
  const isEn = i18n.language === 'en'
  const chromeTop = useChromeTop() + 24
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<ReviewItem | null>(null)

  const { data, isLoading } = useMyReviews(0, spiritCategory ?? null)

  const fetched = data?.content ?? []
  const rows = fetched.filter((review) => review.id !== excludeReviewId)

  const categoryLabel = spiritCategory ? t(`spirit.category.${spiritCategory}`) : null

  const list = isLoading ? (
    <div className="flex justify-center py-6">
      <Spinner size="sm" />
    </div>
  ) : rows.length === 0 ? (
    // 수정 중인 리뷰 하나만 있었던 경우엔 "리뷰가 없다"고 하면 화면과 모순된다.
    <p className="px-1 py-4 text-center text-xs leading-relaxed text-neutral-400">
      {fetched.length > 0 ? t('review.pastReviews.emptySelfOnly') : t('review.pastReviews.empty')}
    </p>
  ) : (
    rows.map((review) => (
      <PastReviewRow key={review.id} review={review} isEn={isEn} onSelect={setSelected} />
    ))
  )

  const heading = (
    <>
      <span className="text-sm font-bold text-neutral-900">{t('review.pastReviews.title')}</span>
      {categoryLabel && (
        <span className="rounded-full bg-primary-50 px-2 py-0.5 text-[11px] font-semibold text-primary-800">
          {categoryLabel}
        </span>
      )}
    </>
  )

  const viewAllLink = (
    <a
      href={MY_REVIEWS_PATH}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-3 block text-center text-xs font-semibold text-neutral-500 hover:text-primary-800"
    >
      {t('review.pastReviews.viewAll')}
    </a>
  )

  return (
    <>
      {/* PC — 폼을 스크롤하는 동안에도 헤더·GNB 아래에 붙어 계속 보인다. */}
      <aside
        className="hidden lg:block lg:sticky rounded-2xl border border-neutral-100 bg-white p-4 shadow-sm
          overflow-y-auto overscroll-contain"
        style={{ top: chromeTop, maxHeight: `calc(100dvh - ${chromeTop + 24}px)` }}
      >
        <div className="flex items-center gap-2">{heading}</div>
        <p className="mt-0.5 text-[11px] text-neutral-400">{t('review.pastReviews.hint')}</p>
        <div className="mt-3 max-h-80 space-y-1.5 overflow-y-auto pr-0.5">{list}</div>
        {rows.length > 0 && viewAllLink}
      </aside>

      {/* 모바일·태블릿 — 입력 공간을 잡아먹지 않도록 기본은 접어 둔다. */}
      <div className="lg:hidden mb-4 rounded-xl border border-neutral-100 bg-white shadow-sm">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={open}
          className="flex w-full items-center gap-2 px-4 py-3 text-left"
        >
          {heading}
          <svg
            className={`ml-auto h-4 w-4 flex-shrink-0 text-neutral-400 transition-transform ${open ? 'rotate-180' : ''}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
        {open && (
          <div className="border-t border-neutral-100 px-4 py-3">
            <div className="max-h-64 space-y-1.5 overflow-y-auto">{list}</div>
            {rows.length > 0 && viewAllLink}
          </div>
        )}
      </div>

      {/* PC·모바일 목록이 같은 상태를 공유하므로 모달은 한 번만 건다. */}
      <MyPastReviewDetailModal
        review={selected}
        onClose={() => setSelected(null)}
        currentNoseScore={currentNoseScore}
        currentTasteScore={currentTasteScore}
        currentFinishScore={currentFinishScore}
      />
    </>
  )
}

export default memo(MyPastReviewsPanel)
