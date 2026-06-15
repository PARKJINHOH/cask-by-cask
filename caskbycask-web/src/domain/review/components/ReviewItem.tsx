import { useTranslation } from 'react-i18next'
import { formatDate, scoreColor } from '@/shared/utils/format'
import { parseAromaNotes, WHISKY_AROMA_MAP } from '../constants/whiskyAromas'
import { WINE_AROMA_MAP } from '../constants/wineAromas'
import type { AromaNotes } from '../constants/whiskyAromas'

/** 위스키 + 와인 통합 아로마 맵 */
const ALL_AROMA_MAP = new Map([...WHISKY_AROMA_MAP, ...WINE_AROMA_MAP])
import type { ReviewItem as ReviewItemType } from '../types/review.types'

// ── 아로마 칩 목록 (전체 표시, 많으면 자동 줄바꿈) ──────────────────

interface AromaChipsProps {
  aromaNotes: AromaNotes
  isEn: boolean
}

function AromaChips({ aromaNotes, isEn }: AromaChipsProps) {
  const { ids, custom } = aromaNotes
  if (ids.length === 0 && custom.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1.5">
      {ids.map((id) => {
        const item = ALL_AROMA_MAP.get(id)
        if (!item) return null
        return (
          <span key={id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-xs text-amber-700">
            {item.icon} {isEn ? item.en : item.ko}
          </span>
        )
      })}
      {custom.map((c) => (
        <span key={c} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-neutral-100 border border-neutral-200 text-xs text-neutral-600">
          ✏️ {c}
        </span>
      ))}
    </div>
  )
}

// ── 점수 섹션 (향 / 맛 / 피니시) ────────────────────────────────────

interface ReviewSectionProps {
  label: string
  score: number
  note?: string | null
  aromaNotes: AromaNotes
  isEn: boolean
}

function ReviewSection({ label, score, note, aromaNotes, isEn }: ReviewSectionProps) {
  const color = scoreColor(score)
  return (
    <div className="space-y-2">
      {/* 라벨 + 점수 */}
      <div className="flex items-center justify-between gap-3">
        <span className="text-base font-bold text-neutral-900">{label}</span>
        <span className="text-base font-bold tabular-nums" style={{ color }}>
          {Number(score).toFixed(1)}
        </span>
      </div>

      {/* 아로마 칩 — 점수 바 상단 */}
      <AromaChips aromaNotes={aromaNotes} isEn={isEn} />

      {/* 점수 바 */}
      <div className="h-2 rounded-full bg-neutral-100 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${score}%`, backgroundColor: color }} />
      </div>

      {/* 노트 */}
      {note && <p className="text-sm text-neutral-600 leading-relaxed">{note}</p>}
    </div>
  )
}

// ── 리뷰 카드 ───────────────────────────────────────────────────

export interface ReviewItemProps {
  review: ReviewItemType
  currentUserId?: number
  onEdit: (review: ReviewItemType) => void
  onDelete: (id: number) => void
}

export default function ReviewItem({ review, currentUserId, onEdit, onDelete }: ReviewItemProps) {
  const { t, i18n } = useTranslation()
  const isEn = i18n.language === 'en'
  const isOwner = !!currentUserId && currentUserId === review.userId

  const sections = [
    { label: t('review.nose'),   score: review.noseScore,   note: review.noseNote,   aromaNotes: parseAromaNotes(review.noseAromaWheelNotes) },
    { label: t('review.taste'),  score: review.tasteScore,  note: review.tasteNote,  aromaNotes: parseAromaNotes(review.tasteAromaWheelNotes) },
    { label: t('review.finish'), score: review.finishScore, note: review.finishNote, aromaNotes: parseAromaNotes(review.finishAromaWheelNotes) },
  ]

  return (
    <article className="p-5 bg-white rounded-xl border border-neutral-100 space-y-5">
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-2 pb-3 border-b border-neutral-100">
        <div className="min-w-0">
          <span className="text-base font-semibold text-neutral-900">{review.nickname}</span>
          <span className="ml-2 text-sm text-neutral-400">{formatDate(review.createdAt, i18n.language)}</span>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-2xl font-bold tabular-nums" style={{ color: scoreColor(review.totalScore) }}>
            {Number(review.totalScore).toFixed(1)}
          </span>
          {isOwner && (
            <div className="flex gap-2">
              <button onClick={() => onEdit(review)} className="text-sm text-neutral-400 hover:text-neutral-700 transition-colors">
                {t('common.edit')}
              </button>
              <button onClick={() => onDelete(review.id)} className="text-sm text-danger-400 hover:text-danger-600 transition-colors">
                {t('common.delete')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 향 / 맛 / 피니시 */}
      <div className="space-y-5">
        {sections.map(({ label, score, note, aromaNotes }) => (
          <ReviewSection
            key={label}
            label={label}
            score={score}
            note={note}
            aromaNotes={aromaNotes}
            isEn={isEn}
          />
        ))}
      </div>

      {/* 종합평가 */}
      {review.comment && (
        <div className="border-t border-neutral-100 pt-4">
          <p className="text-base font-bold text-neutral-900 mb-1.5">{t('review.overall')}</p>
          <p className="text-sm text-neutral-700 leading-relaxed whitespace-pre-wrap">{review.comment}</p>
        </div>
      )}
    </article>
  )
}
