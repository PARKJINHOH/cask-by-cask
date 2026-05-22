import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { formatDate, scoreColor } from '@/shared/utils/format'
import Modal from '@/shared/components/Modal'
import { parseAromaNotes, WHISKY_AROMA_MAP } from '../constants/whiskyAromas'
import { WINE_AROMA_MAP } from '../constants/wineAromas'
import type { AromaNotes } from '../constants/whiskyAromas'

/** 위스키 + 와인 통합 아로마 맵 */
const ALL_AROMA_MAP = new Map([...WHISKY_AROMA_MAP, ...WINE_AROMA_MAP])
import type { ReviewItem as ReviewItemType } from '../types/review.types'

// ── 점수 바 ────────────────────────────────────────────────────

interface ScoreBarProps {
  label: string
  value: number
  note?: string | null
}

function ScoreBar({ label, value, note }: ScoreBarProps) {
  const color = scoreColor(value)
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <span className="w-14 text-xs text-neutral-400 flex-shrink-0">{label}</span>
        <div className="flex-1 h-1.5 rounded-full bg-neutral-100 overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${value}%`, backgroundColor: color }} />
        </div>
        <span className="w-9 text-xs font-semibold text-right tabular-nums" style={{ color }}>
          {Number(value).toFixed(1)}
        </span>
      </div>
      {note && <p className="text-xs text-neutral-500 leading-relaxed pl-16 line-clamp-2">{note}</p>}
    </div>
  )
}

// ── 아로마 칩 목록 ─────────────────────────────────────────────

interface AromaChipsProps {
  aromaNotes: AromaNotes
  isEn: boolean
  max?: number
  rest?: number
}

function AromaChips({ aromaNotes, isEn, max, rest }: AromaChipsProps) {
  const { ids, custom } = aromaNotes
  const allEmpty = ids.length === 0 && custom.length === 0
  if (allEmpty) return null
  const shownIds    = max ? ids.slice(0, max) : ids
  const shownCustom = max ? custom.slice(0, Math.max(0, max - shownIds.length)) : custom
  return (
    <div className="flex flex-wrap gap-1 pl-16">
      {shownIds.map((id) => {
        const item = ALL_AROMA_MAP.get(id)
        if (!item) return null
        return (
          <span key={id} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-[10px] text-amber-700">
            {item.icon} {isEn ? item.en : item.ko}
          </span>
        )
      })}
      {shownCustom.map((c) => (
        <span key={c} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-neutral-100 border border-neutral-200 text-[10px] text-neutral-600">
          ✏️ {c}
        </span>
      ))}
      {rest != null && rest > 0 && (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-neutral-100 text-[10px] text-neutral-500">
          +{rest}
        </span>
      )}
    </div>
  )
}

// ── 상세 모달 내 섹션 ──────────────────────────────────────────

interface DetailScoreSectionProps {
  label: string
  score: number
  note: string | null
  aromaNotes: AromaNotes
  isEn: boolean
}

function DetailScoreSection({ label, score, note, aromaNotes, isEn }: DetailScoreSectionProps) {
  const color = scoreColor(score)
  const hasAroma = aromaNotes.ids.length > 0 || aromaNotes.custom.length > 0
  return (
    <div className="space-y-2">
      {/* 점수 바 */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold text-neutral-500 w-24 flex-shrink-0">{label}</span>
        <div className="flex-1 h-1.5 rounded-full bg-neutral-100 overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${score}%`, backgroundColor: color }} />
        </div>
        <span className="text-sm font-bold tabular-nums w-9 text-right" style={{ color }}>
          {Number(score).toFixed(1)}
        </span>
      </div>

      {/* 아로마 칩 */}
      {hasAroma && (
        <div className="pl-[6.5rem] flex flex-wrap gap-1.5">
          {aromaNotes.ids.map((id) => {
            const item = ALL_AROMA_MAP.get(id)
            if (!item) return null
            return (
              <span key={id} className="inline-flex flex-col items-center px-2.5 py-1.5 rounded-xl bg-amber-50 border border-amber-200">
                <span className="text-sm">{item.icon}</span>
                <span className="text-[10px] font-medium text-amber-700 mt-0.5">{isEn ? item.en : item.ko}</span>
                <span className="text-[9px] text-neutral-400">{isEn ? item.ko : item.en}</span>
              </span>
            )
          })}
          {aromaNotes.custom.map((c) => (
            <span key={c} className="inline-flex flex-col items-center px-2.5 py-1.5 rounded-xl bg-neutral-100 border border-neutral-200">
              <span className="text-sm">✏️</span>
              <span className="text-[10px] text-neutral-700 mt-0.5">{c}</span>
            </span>
          ))}
        </div>
      )}

      {/* 노트 텍스트 */}
      {note && (
        <p className="text-sm text-neutral-700 leading-relaxed pl-[6.5rem]">{note}</p>
      )}
    </div>
  )
}

// ── 리뷰 상세 모달 ──────────────────────────────────────────────

interface ReviewDetailModalProps {
  review: ReviewItemType
  open: boolean
  onClose: () => void
}

function ReviewDetailModal({ review, open, onClose }: ReviewDetailModalProps) {
  const { t, i18n } = useTranslation()
  const isEn = i18n.language === 'en'

  const sections = [
    {
      label:      t('review.nose'),
      score:      review.noseScore,
      note:       review.noseNote,
      aromaNotes: parseAromaNotes(review.noseAromaWheelNotes),
    },
    {
      label:      t('review.taste'),
      score:      review.tasteScore,
      note:       review.tasteNote,
      aromaNotes: parseAromaNotes(review.tasteAromaWheelNotes),
    },
    {
      label:      t('review.finish'),
      score:      review.finishScore,
      note:       review.finishNote,
      aromaNotes: parseAromaNotes(review.finishAromaWheelNotes),
    },
  ]

  return (
    <Modal open={open} onClose={onClose} title={t('review.detailTitle')} size="md">
      <div className="space-y-5">
        {/* 작성자 / 총점 */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
          <div>
            <p className="text-sm font-semibold text-neutral-900">{review.nickname}</p>
            <p className="text-xs text-neutral-400 mt-0.5">{formatDate(review.createdAt, i18n.language)}</p>
          </div>
          <span className="text-3xl font-bold tabular-nums" style={{ color: scoreColor(review.totalScore) }}>
            {Number(review.totalScore).toFixed(1)}
          </span>
        </div>

        {/* 향 / 맛 / 피니시 */}
        <div className="space-y-5">
          {sections.map(({ label, score, note, aromaNotes }) => (
            <DetailScoreSection
              key={label}
              label={label}
              score={score}
              note={note}
              aromaNotes={aromaNotes}
              isEn={isEn}
            />
          ))}
        </div>

        {/* 총평 */}
        {review.comment && (
          <div className="border-t border-neutral-100 pt-4">
            <p className="text-xs font-semibold text-neutral-400 mb-2">{t('review.overall')}</p>
            <p className="text-sm text-neutral-700 leading-relaxed whitespace-pre-wrap">{review.comment}</p>
          </div>
        )}
      </div>
    </Modal>
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
  const [detailOpen, setDetailOpen] = useState(false)
  const isOwner = !!currentUserId && currentUserId === review.userId

  const noseAromas   = parseAromaNotes(review.noseAromaWheelNotes)
  const tasteAromas  = parseAromaNotes(review.tasteAromaWheelNotes)
  const finishAromas = parseAromaNotes(review.finishAromaWheelNotes)

  const hasAnyAroma =
    noseAromas.ids.length > 0 || noseAromas.custom.length > 0 ||
    tasteAromas.ids.length > 0 || tasteAromas.custom.length > 0 ||
    finishAromas.ids.length > 0 || finishAromas.custom.length > 0

  const hasNotes = !!(
    review.noseNote || review.tasteNote || review.finishNote ||
    review.comment || hasAnyAroma
  )

  // 카드 미리보기: 전체 아로마를 합쳐 최대 4개 표시
  const allIds    = [...noseAromas.ids, ...tasteAromas.ids, ...finishAromas.ids]
  const allCustom = [...noseAromas.custom, ...tasteAromas.custom, ...finishAromas.custom]
  const previewMax = 4
  const previewRest = allIds.length + allCustom.length - previewMax
  const previewNotes: AromaNotes = {
    ids:    allIds.slice(0, previewMax),
    custom: allCustom.slice(0, Math.max(0, previewMax - allIds.length)),
  }

  return (
    <>
      <article className="p-4 bg-white rounded-xl border border-neutral-100 space-y-3">
        {/* 헤더 */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <span className="text-sm font-semibold text-neutral-900">{review.nickname}</span>
            <span className="ml-2 text-xs text-neutral-400">{formatDate(review.createdAt, i18n.language)}</span>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <span className="text-xl font-bold tabular-nums" style={{ color: scoreColor(review.totalScore) }}>
              {Number(review.totalScore).toFixed(1)}
            </span>
            {isOwner && (
              <div className="flex gap-2">
                <button onClick={() => onEdit(review)} className="text-xs text-neutral-400 hover:text-neutral-700 transition-colors">
                  {t('common.edit')}
                </button>
                <button onClick={() => onDelete(review.id)} className="text-xs text-danger-400 hover:text-danger-600 transition-colors">
                  {t('common.delete')}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 점수 바 */}
        <div className="space-y-2.5">
          <ScoreBar label={t('review.nose')}   value={review.noseScore}   note={review.noseNote} />
          <ScoreBar label={t('review.taste')}  value={review.tasteScore}  note={review.tasteNote} />
          <ScoreBar label={t('review.finish')} value={review.finishScore} note={review.finishNote} />
        </div>

        {/* 아로마 칩 미리보기 (전체 합산, 최대 4개) */}
        {hasAnyAroma && (
          <AromaChips
            aromaNotes={previewNotes}
            isEn={isEn}
            max={previewMax}
            rest={previewRest > 0 ? previewRest : undefined}
          />
        )}

        {/* 총평 미리보기 */}
        {review.comment && (
          <p className="text-sm text-neutral-700 leading-relaxed border-t border-neutral-50 pt-2 line-clamp-2">
            {review.comment}
          </p>
        )}

        {/* 상세보기 */}
        {hasNotes && (
          <div className="pt-1">
            <button
              onClick={() => setDetailOpen(true)}
              className="text-xs text-primary-800 hover:text-primary-800 font-medium transition-colors"
            >
              {t('review.viewAll')}
            </button>
          </div>
        )}
      </article>

      <ReviewDetailModal review={review} open={detailOpen} onClose={() => setDetailOpen(false)} />
    </>
  )
}
